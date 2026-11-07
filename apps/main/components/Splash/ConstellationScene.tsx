/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/* istanbul ignore file -- needs a real WebGL context, which jsdom lacks; mocked in the splash page tests */

// "Agent Constellation": the WebGL hero behind the splash page. An iridescent, slowly morphing glass core, orbited by
// glowing agent nodes on tilted rings, wired together by thin luminous links along which message pulses travel.
// This module pulls in three.js, so it is only ever loaded client-side via next/dynamic (see ConstellationBackdrop).

/* eslint-disable react/no-unknown-property -- react-three-fiber elements take three.js props */
import {Environment, Lightformer, MeshTransmissionMaterial, PerformanceMonitor, Sparkles} from "@react-three/drei"
import {Canvas, useFrame, useThree} from "@react-three/fiber"
import {FC, ReactNode, useEffect, useMemo, useRef, useState} from "react"
import * as THREE from "three"
import {mergeVertices} from "three/examples/jsm/utils/BufferGeometryUtils.js"

import {SHEEN_DARK, SHEEN_LIGHT} from "../../../../packages/ui-common/Theme/sheen"

// #region: Static scene description

interface Ring {
    count: number
    radius: number
    speed: number
    tilt: [number, number, number]
}

// Three tilted orbits; 20 agents in total
const RINGS: Ring[] = [
    {count: 6, radius: 2.15, speed: 0.17, tilt: [1.2, 0.1, 0.3]},
    {count: 7, radius: 2.95, speed: -0.115, tilt: [1.38, 0.55, -0.42]},
    {count: 7, radius: 3.75, speed: 0.08, tilt: [0.95, -0.6, 0.62]},
]

const CORE_RADIUS = 1.12
const WIDE_LAYOUT_PX = 1200
const MAX_PULSES = 14
const DPR_RANGE: [number, number] = [1, 1.75]
// Time to freeze at under prefers-reduced-motion: a pleasing, spread-out arrangement
const FROZEN_TIME = 14

interface Agent {
    bobPhase: number
    color: THREE.Color
    phase: number
    ring: number
}

interface Link {
    // Index of the agent at each end; -1 is the core
    from: number
    to: number
}

interface Pulse {
    // Index into links, or -1 when idle
    link: number
    progress: number
    reverse: boolean
    speed: number
}

interface ScenePalette {
    accents: [string, string, string]
    // Tint the glass picks up with depth
    attenuation: string
    background: string
    blending: THREE.Blending
    coreTint: string
    lineOpacity: number
    sparkles: string
}

// On the pale lavender background additive blending washes out, so light mode uses normal blending
const PALETTE_LIGHT: ScenePalette = {
    accents: [SHEEN_LIGHT.sheen.gradientStart, SHEEN_LIGHT.sheen.gradientEnd, SHEEN_LIGHT.sheen.gradientMid],
    attenuation: "#D9D0FF",
    background: SHEEN_LIGHT.background.default,
    blending: THREE.NormalBlending,
    coreTint: "#F3F0FF",
    lineOpacity: 0.5,
    sparkles: SHEEN_LIGHT.info,
}

const PALETTE_DARK: ScenePalette = {
    accents: [SHEEN_DARK.sheen.gradientStart, SHEEN_DARK.sheen.gradientEnd, SHEEN_DARK.sheen.gradientMid],
    attenuation: SHEEN_DARK.sheen.gradientMid,
    background: SHEEN_DARK.background.default,
    blending: THREE.AdditiveBlending,
    coreTint: "#FFFFFF",
    lineOpacity: 0.55,
    sparkles: SHEEN_DARK.sheen.gradientMid,
}

const paletteFor = (isLight: boolean): ScenePalette => (isLight ? PALETTE_LIGHT : PALETTE_DARK)

const buildAgents = (accents: string[]): Agent[] => {
    const agents: Agent[] = []
    RINGS.forEach((ring, ringIndex) => {
        for (let i = 0; i < ring.count; i += 1) {
            agents.push({
                bobPhase: (agents.length * 2.39996) % (Math.PI * 2),
                color: new THREE.Color(accents[(i + ringIndex) % accents.length]),
                phase: (i / ring.count) * Math.PI * 2 + ringIndex * 0.6,
                ring: ringIndex,
            })
        }
    })
    return agents
}

const buildLinks = (): Link[] => {
    const links: Link[] = []
    let start = 0
    RINGS.forEach((ring, ringIndex) => {
        for (let i = 0; i < ring.count; i += 1) {
            const agent = start + i
            // Inner ring talks to the core directly; outer rings only every other agent, to keep it airy
            if (ringIndex === 0 || i % 2 === 0) {
                links.push({from: -1, to: agent})
            }
            // Neighbour on the same ring
            links.push({from: agent, to: start + ((i + 1) % ring.count)})
            // Bridge to the next ring out
            if (ringIndex < RINGS.length - 1 && i % 2 === 1) {
                links.push({from: agent, to: start + ring.count + (i % RINGS[ringIndex + 1].count)})
            }
        }
        start += ring.count
    })
    return links
}

const LINKS = buildLinks()

// Soft round sprite used for node halos and pulses
const makeGlowTexture = (): THREE.Texture => {
    const size = 128
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext("2d")
    if (context) {
        const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
        gradient.addColorStop(0, "rgba(255,255,255,1)")
        gradient.addColorStop(0.1, "rgba(255,255,255,0.85)")
        gradient.addColorStop(0.32, "rgba(255,255,255,0.28)")
        gradient.addColorStop(0.65, "rgba(255,255,255,0.06)")
        gradient.addColorStop(1, "rgba(255,255,255,0)")
        context.fillStyle = gradient
        context.fillRect(0, 0, size, size)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
}

// #endregion: Static scene description

// #region: Shaders

// Molten heart inside the glass: flowing bands of the three sheen accents with a bright rim
const HEART_VERTEX = /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`

const HEART_FRAGMENT = /* glsl */ `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
        float bandA = 0.5 + 0.5 * sin(vPosition.y * 3.2 + vPosition.x * 1.7 + uTime * 0.8);
        float bandB = smoothstep(0.15, 0.95, 0.5 + 0.5 * sin(vPosition.x * 2.6 - vPosition.z * 3.1 - uTime * 0.6));
        vec3 color = mix(mix(uColorA, uColorB, bandA), uColorC, bandB);
        float rim = pow(1.0 - abs(vNormal.z), 2.2);
        gl_FragColor = vec4(color * (0.7 + rim * 0.9), 1.0);
    }
`

// #endregion: Shaders

// #region: Scene pieces

interface SceneProps {
    isLight: boolean
    reducedMotion: boolean
}

// Shared animation clock that stands still under reduced motion and doesn't jump after the loop was paused
const useSceneTime = (reducedMotion: boolean) => {
    const time = useRef(FROZEN_TIME)
    useFrame((_, delta) => {
        if (!reducedMotion) {
            time.current += Math.min(delta, 1 / 20)
        }
    }, -10)
    return time
}

const Core: FC<SceneProps & {lowPower: boolean; time: {current: number}}> = ({
    isLight,
    lowPower,
    reducedMotion,
    time,
}) => {
    const palette = paletteFor(isLight)
    const meshRef = useRef<THREE.Mesh>(null)
    const heartRef = useRef<THREE.ShaderMaterial>(null)

    // Smooth (indexed) sphere whose vertices we displace every frame for the liquid morph
    const {geometry, directions} = useMemo(() => {
        const base = new THREE.IcosahedronGeometry(1, 14)
        base.deleteAttribute("normal")
        base.deleteAttribute("uv")
        const merged = mergeVertices(base)
        base.dispose()
        const positions = merged.getAttribute("position") as THREE.BufferAttribute
        const dirs = new Float32Array(positions.array)
        merged.computeVertexNormals()
        return {geometry: merged, directions: dirs}
    }, [])

    const background = useMemo(() => new THREE.Color(palette.background), [palette.background])
    const heartUniforms = useMemo(
        () => ({
            uColorA: {value: new THREE.Color(palette.accents[0])},
            uColorB: {value: new THREE.Color(palette.accents[2])},
            uColorC: {value: new THREE.Color(palette.accents[1])},
            uTime: {value: 0},
        }),
        // Colors are updated in place below; the uniforms object must stay stable for the material
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    useEffect(() => {
        heartUniforms.uColorA.value.set(palette.accents[0])
        heartUniforms.uColorB.value.set(palette.accents[2])
        heartUniforms.uColorC.value.set(palette.accents[1])
    }, [heartUniforms, palette.accents])

    useEffect(() => () => geometry.dispose(), [geometry])

    useFrame(() => {
        const t = time.current
        const positions = geometry.getAttribute("position") as THREE.BufferAttribute
        const array = positions.array as Float32Array
        for (let i = 0; i < array.length; i += 3) {
            const x = directions[i]
            const y = directions[i + 1]
            const z = directions[i + 2]
            const wobble =
                0.075 * Math.sin(x * 2.1 + t * 0.9) * Math.sin(y * 2.7 + t * 0.7) +
                0.05 * Math.sin(z * 3.3 + x * 1.5 + t * 1.1) +
                0.025 * Math.sin(y * 5.1 - t * 1.4)
            const radius = CORE_RADIUS * (1 + wobble)
            array[i] = x * radius
            array[i + 1] = y * radius
            array[i + 2] = z * radius
        }
        positions.needsUpdate = true
        geometry.computeVertexNormals()

        if (meshRef.current) {
            meshRef.current.rotation.y = t * 0.12
            meshRef.current.rotation.x = Math.sin(t * 0.2) * 0.25
        }
        if (heartRef.current) {
            heartRef.current.uniforms["uTime"].value = t
        }
    })

    return (
        <group>
            <mesh
                geometry={geometry}
                ref={meshRef}
            >
                {lowPower ? (
                    // Cheap stand-in for struggling GPUs: iridescent, semi-opaque, no extra render pass
                    <meshPhysicalMaterial
                        clearcoat={1}
                        color={palette.coreTint}
                        envMapIntensity={1.4}
                        iridescence={0.2}
                        iridescenceIOR={1.35}
                        iridescenceThicknessRange={[380, 480]}
                        metalness={0.1}
                        opacity={0.55}
                        roughness={0.08}
                        transparent={true}
                    />
                ) : (
                    <MeshTransmissionMaterial
                        anisotropicBlur={0.05}
                        attenuationColor={palette.attenuation}
                        attenuationDistance={5}
                        background={background}
                        chromaticAberration={0.18}
                        clearcoat={1}
                        clearcoatRoughness={0.1}
                        color={palette.coreTint}
                        distortion={0.3}
                        distortionScale={0.35}
                        envMapIntensity={isLight ? 1.1 : 1.5}
                        ior={1.25}
                        iridescence={0.2}
                        iridescenceIOR={1.35}
                        iridescenceThicknessRange={[380, 480]}
                        resolution={256}
                        roughness={0.02}
                        samples={4}
                        temporalDistortion={reducedMotion ? 0 : 0.12}
                        thickness={1}
                        transmission={1}
                    />
                )}
            </mesh>
            {/* Molten heart, seen refracted through the glass */}
            <mesh scale={0.4}>
                <icosahedronGeometry args={[1, 6]} />
                <shaderMaterial
                    fragmentShader={HEART_FRAGMENT}
                    ref={heartRef}
                    toneMapped={false}
                    uniforms={heartUniforms}
                    vertexShader={HEART_VERTEX}
                />
            </mesh>
        </group>
    )
}

const OrbitGuides: FC<{isLight: boolean}> = ({isLight}) => {
    const geometries = useMemo(
        () =>
            RINGS.map((ring) => {
                const points = new THREE.EllipseCurve(0, 0, ring.radius, ring.radius).getPoints(128)
                return new THREE.BufferGeometry().setFromPoints(points)
            }),
        []
    )
    useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries])

    return (
        <>
            {RINGS.map((ring, index) => (
                <lineLoop
                    geometry={geometries[index]}
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    rotation={ring.tilt}
                >
                    <lineBasicMaterial
                        color={isLight ? SHEEN_LIGHT.info : SHEEN_DARK.sheen.gradientMid}
                        depthWrite={false}
                        opacity={isLight ? 0.16 : 0.1}
                        transparent={true}
                    />
                </lineLoop>
            ))}
        </>
    )
}

const Network: FC<SceneProps & {time: {current: number}}> = ({isLight, reducedMotion, time}) => {
    const palette = paletteFor(isLight)
    const agents = useMemo(() => buildAgents(palette.accents), [palette.accents])
    const glow = useMemo(() => makeGlowTexture(), [])
    const ringQuaternions = useMemo(
        () => RINGS.map((ring) => new THREE.Quaternion().setFromEuler(new THREE.Euler(...ring.tilt))),
        []
    )

    const nodesRef = useRef<THREE.InstancedMesh>(null)
    const haloGeometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(agents.length * 3), 3))
        geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(agents.length * 4), 4))
        return geometry
    }, [agents.length])
    const lineGeometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(LINKS.length * 6), 3))
        geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(LINKS.length * 8), 4))
        return geometry
    }, [])
    const pulseGeometry = useMemo(() => {
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_PULSES * 3), 3))
        geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(MAX_PULSES * 4), 4))
        return geometry
    }, [])

    useEffect(
        () => () => {
            glow.dispose()
            haloGeometry.dispose()
            lineGeometry.dispose()
            pulseGeometry.dispose()
        },
        [glow, haloGeometry, lineGeometry, pulseGeometry]
    )

    // Per-frame scratch state, kept out of React
    const state = useRef({
        flashes: new Float32Array(agents.length),
        nextPulseIn: 0.4,
        positions: agents.map(() => new THREE.Vector3()),
        pulses: Array.from({length: MAX_PULSES}, (): Pulse => ({link: -1, progress: 0, reverse: false, speed: 1})),
        scratch: new THREE.Vector3(),
        matrix: new THREE.Matrix4(),
    })

    // Per-instance node colors
    useEffect(() => {
        const nodes = nodesRef.current
        if (!nodes) return
        agents.forEach((agent, index) => nodes.setColorAt(index, agent.color))
        if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true
    }, [agents])

    const coreColor = useMemo(() => new THREE.Color(palette.accents[2]), [palette.accents])

    useFrame((_, delta) => {
        const t = time.current
        const s = state.current
        const step = reducedMotion ? 0 : Math.min(delta, 1 / 20)

        // 1. Agent positions: orbit on their tilted ring, with a gentle float
        agents.forEach((agent, index) => {
            const ring = RINGS[agent.ring]
            const angle = agent.phase + t * ring.speed
            const bob = Math.sin(t * 0.9 + agent.bobPhase) * 0.12
            s.positions[index]
                .set(Math.cos(angle) * ring.radius, Math.sin(angle) * ring.radius, bob)
                .applyQuaternion(ringQuaternions[agent.ring])
            s.flashes[index] = Math.max(0, s.flashes[index] - step * 1.6)
        })

        // 2. Nodes (instanced spheres) and halos (glow sprites)
        const nodes = nodesRef.current
        const haloPositions = haloGeometry.getAttribute("position") as THREE.BufferAttribute
        const haloColors = haloGeometry.getAttribute("color") as THREE.BufferAttribute
        agents.forEach((agent, index) => {
            const position = s.positions[index]
            const flash = s.flashes[index]
            const pulse = 1 + 0.12 * Math.sin(t * 2.2 + agent.bobPhase) + flash * 0.6
            if (nodes) {
                s.matrix.makeScale(pulse, pulse, pulse).setPosition(position)
                nodes.setMatrixAt(index, s.matrix)
            }
            haloPositions.setXYZ(index, position.x, position.y, position.z)
            haloColors.setXYZW(index, agent.color.r, agent.color.g, agent.color.b, 0.5 + flash * 0.5)
        })
        if (nodes) nodes.instanceMatrix.needsUpdate = true
        haloPositions.needsUpdate = true
        haloColors.needsUpdate = true

        // 3. Links: from the core's surface (or an agent) to an agent
        const linePositions = lineGeometry.getAttribute("position") as THREE.BufferAttribute
        const lineColors = lineGeometry.getAttribute("color") as THREE.BufferAttribute
        const endpoint = (agentIndex: number, other: THREE.Vector3, target: THREE.Vector3) =>
            agentIndex < 0
                ? target
                      .copy(other)
                      .normalize()
                      .multiplyScalar(CORE_RADIUS * 1.08)
                : target.copy(s.positions[agentIndex])
        LINKS.forEach((link, index) => {
            const to = s.positions[link.to]
            const from = endpoint(link.from, to, s.scratch)
            linePositions.setXYZ(index * 2, from.x, from.y, from.z)
            linePositions.setXYZ(index * 2 + 1, to.x, to.y, to.z)
            const fromColor = link.from < 0 ? coreColor : agents[link.from].color
            const toColor = agents[link.to].color
            const fromAlpha = link.from < 0 ? palette.lineOpacity * 0.35 : palette.lineOpacity * 0.6
            lineColors.setXYZW(index * 2, fromColor.r, fromColor.g, fromColor.b, fromAlpha)
            lineColors.setXYZW(index * 2 + 1, toColor.r, toColor.g, toColor.b, palette.lineOpacity)
        })
        linePositions.needsUpdate = true
        lineColors.needsUpdate = true

        // 4. Message pulses: spawn occasionally, travel along a link, light up the receiving agent
        s.nextPulseIn -= step
        if (s.nextPulseIn <= 0) {
            const idle = s.pulses.find((pulse) => pulse.link < 0)
            if (idle) {
                idle.link = Math.floor(Math.random() * LINKS.length)
                idle.progress = 0
                idle.reverse = Math.random() < 0.5
                idle.speed = 0.55 + Math.random() * 0.6
            }
            s.nextPulseIn = 0.12 + Math.random() * 0.45
        }
        const pulsePositions = pulseGeometry.getAttribute("position") as THREE.BufferAttribute
        const pulseColors = pulseGeometry.getAttribute("color") as THREE.BufferAttribute
        s.pulses.forEach((pulse, index) => {
            if (pulse.link < 0) {
                pulsePositions.setXYZ(index, 0, 0, 0)
                pulseColors.setXYZW(index, 0, 0, 0, 0)
                return
            }
            pulse.progress += step * pulse.speed
            const link = LINKS[pulse.link]
            if (pulse.progress >= 1) {
                const receiver = pulse.reverse ? link.from : link.to
                if (receiver >= 0) s.flashes[receiver] = 1
                pulse.link = -1
                pulseColors.setXYZW(index, 0, 0, 0, 0)
                return
            }
            const p = pulse.reverse ? 1 - pulse.progress : pulse.progress
            const ax = linePositions.getX(pulse.link * 2)
            const ay = linePositions.getY(pulse.link * 2)
            const az = linePositions.getZ(pulse.link * 2)
            pulsePositions.setXYZ(
                index,
                ax + (linePositions.getX(pulse.link * 2 + 1) - ax) * p,
                ay + (linePositions.getY(pulse.link * 2 + 1) - ay) * p,
                az + (linePositions.getZ(pulse.link * 2 + 1) - az) * p
            )
            const color = agents[link.to].color
            pulseColors.setXYZW(index, color.r, color.g, color.b, Math.sin(Math.PI * pulse.progress))
        })
        pulsePositions.needsUpdate = true
        pulseColors.needsUpdate = true
    })

    return (
        <group>
            <lineSegments
                frustumCulled={false}
                geometry={lineGeometry}
            >
                <lineBasicMaterial
                    blending={palette.blending}
                    depthWrite={false}
                    toneMapped={false}
                    transparent={true}
                    vertexColors={true}
                />
            </lineSegments>
            <instancedMesh
                args={[undefined, undefined, agents.length]}
                frustumCulled={false}
                ref={nodesRef}
            >
                <sphereGeometry args={[0.065, 16, 12]} />
                <meshBasicMaterial toneMapped={false} />
            </instancedMesh>
            <points
                frustumCulled={false}
                geometry={haloGeometry}
            >
                <pointsMaterial
                    blending={palette.blending}
                    depthWrite={false}
                    map={glow}
                    size={isLight ? 0.9 : 1.2}
                    sizeAttenuation={true}
                    toneMapped={false}
                    transparent={true}
                    vertexColors={true}
                />
            </points>
            <points
                frustumCulled={false}
                geometry={pulseGeometry}
            >
                <pointsMaterial
                    blending={palette.blending}
                    depthWrite={false}
                    map={glow}
                    size={isLight ? 0.5 : 0.65}
                    sizeAttenuation={true}
                    toneMapped={false}
                    transparent={true}
                    vertexColors={true}
                />
            </points>
        </group>
    )
}

// Positions the constellation (to the right of the copy on wide screens, centered behind it on narrow ones) and
// tilts it gently toward the pointer
const Rig: FC<{children: ReactNode; reducedMotion: boolean; time: {current: number}}> = ({
    children,
    reducedMotion,
    time,
}) => {
    const groupRef = useRef<THREE.Group>(null)
    const pointer = useRef({x: 0, y: 0})
    const {width, height} = useThree((three) => three.viewport)
    // Matches the page layout, which puts the copy on the left from MUI's "lg" breakpoint up
    const wide = useThree((three) => three.size.width >= WIDE_LAYOUT_PX)

    useEffect(() => {
        if (reducedMotion) return undefined
        const onMove = (event: PointerEvent) => {
            pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
            pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
        }
        window.addEventListener("pointermove", onMove, {passive: true})
        return () => window.removeEventListener("pointermove", onMove)
    }, [reducedMotion])

    const scale = wide ? 0.9 : THREE.MathUtils.clamp(width / 8, 0.55, 0.9)
    const offsetX = wide ? width * 0.24 : 0
    const offsetY = wide ? height * 0.08 : height * 0.12

    useFrame((_, delta) => {
        const group = groupRef.current
        if (!group) return
        const ease = 1 - Math.exp(-Math.min(delta, 0.1) * 2.5)
        const targetY = time.current * 0.04 + pointer.current.x * 0.35
        const targetX = 0.18 + pointer.current.y * 0.22
        group.rotation.y += (targetY - group.rotation.y) * (reducedMotion ? 1 : ease)
        group.rotation.x += (targetX - group.rotation.x) * (reducedMotion ? 1 : ease)
    })

    return (
        <group
            position={[offsetX, offsetY, 0]}
            scale={scale}
        >
            <group ref={groupRef}>{children}</group>
        </group>
    )
}

// Fires once, after the first frame has been drawn
const ReadySignal: FC<{onReady: () => void}> = ({onReady}) => {
    const fired = useRef(false)
    useFrame(() => {
        if (!fired.current) {
            fired.current = true
            // Let the frame reach the screen before revealing the canvas
            requestAnimationFrame(onReady)
        }
    })
    return null
}

const SceneContents: FC<SceneProps & {lowPower: boolean; onReady: () => void}> = ({
    isLight,
    lowPower,
    onReady,
    reducedMotion,
}) => {
    const time = useSceneTime(reducedMotion)
    const palette = paletteFor(isLight)
    const [accentStart, accentEnd, accentMid] = palette.accents

    return (
        <>
            <ambientLight intensity={isLight ? 0.9 : 0.35} />
            <pointLight
                color={accentStart}
                intensity={isLight ? 18 : 28}
                position={[-4, 2.5, 3]}
            />
            <pointLight
                color={accentEnd}
                intensity={isLight ? 16 : 26}
                position={[4, -2, 2.5]}
            />
            <pointLight
                color={accentMid}
                intensity={isLight ? 10 : 16}
                position={[0, 4, -3]}
            />

            {/* Offline studio lighting for reflections: no HDR files, just emissive light-formers */}
            <Environment
                frames={1}
                resolution={128}
            >
                {/* What the glass reflects between the light-formers: the page color, so edges never go muddy */}
                <color
                    args={[palette.background]}
                    attach="background"
                />
                <Lightformer
                    color={accentStart}
                    form="ring"
                    intensity={3}
                    position={[-3, 2, 4]}
                    scale={3}
                />
                <Lightformer
                    color={accentEnd}
                    form="rect"
                    intensity={2.5}
                    position={[4, -1, 3]}
                    scale={[4, 2, 1]}
                />
                <Lightformer
                    color={accentMid}
                    form="circle"
                    intensity={2}
                    position={[0, 5, -2]}
                    scale={2.5}
                />
                <Lightformer
                    color="#ffffff"
                    form="rect"
                    intensity={isLight ? 2 : 1.2}
                    position={[0, 0, -6]}
                    scale={[10, 2, 1]}
                />
            </Environment>

            <Rig
                reducedMotion={reducedMotion}
                time={time}
            >
                <Core
                    isLight={isLight}
                    lowPower={lowPower}
                    reducedMotion={reducedMotion}
                    time={time}
                />
                <OrbitGuides isLight={isLight} />
                <Network
                    isLight={isLight}
                    reducedMotion={reducedMotion}
                    time={time}
                />
                <Sparkles
                    color={palette.sparkles}
                    count={60}
                    opacity={isLight ? 0.5 : 0.7}
                    scale={[11, 7, 6]}
                    size={2.2}
                    speed={reducedMotion ? 0 : 0.25}
                />
            </Rig>
            <ReadySignal onReady={onReady} />
        </>
    )
}

// #endregion: Scene pieces

interface ConstellationSceneProps extends SceneProps {
    // Whether the scene is on screen (tab visible and element intersecting); the render loop stops otherwise
    active: boolean
    onError: () => void
    onReady: () => void
}

export const ConstellationScene: FC<ConstellationSceneProps> = ({active, isLight, onError, onReady, reducedMotion}) => {
    const [dpr, setDpr] = useState<number | [number, number]>(DPR_RANGE)
    const [lowPower, setLowPower] = useState(false)

    // Under reduced motion, draw on demand only (the scene is frozen); stop entirely when off screen
    let frameloop: "always" | "demand" | "never" = "never"
    if (active) {
        frameloop = reducedMotion ? "demand" : "always"
    }

    return (
        <Canvas
            camera={{fov: 40, near: 0.1, far: 60, position: [0, 0, 9]}}
            dpr={dpr}
            frameloop={frameloop}
            gl={{alpha: true, antialias: true, powerPreference: "high-performance", stencil: false}}
            onCreated={({gl}) => {
                gl.setClearColor(0x000000, 0)
                gl.domElement.addEventListener("webglcontextlost", onError, {once: true})
            }}
            style={{pointerEvents: "none"}}
        >
            {/* If the GPU struggles drop to 1x pixel ratio; if it keeps struggling, swap in a cheaper glass */}
            <PerformanceMonitor
                onDecline={() => setDpr(1)}
                onFallback={() => setLowPower(true)}
            />
            <SceneContents
                isLight={isLight}
                lowPower={lowPower}
                onReady={onReady}
                reducedMotion={reducedMotion}
            />
        </Canvas>
    )
}
