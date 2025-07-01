import {useEffect, useRef} from "react"
import {EdgeProps, getBezierPath} from "reactflow"

function createFunnelParticleOnPath(
    pathEl: SVGPathElement,
    canvasOffset: {x: number; y: number},
    baseProgress?: number
) {
    // Prettier and ESlint conflict over this
    // eslint-disable-next-line newline-per-chained-call
    const green = getComputedStyle(document.documentElement).getPropertyValue("--bs-green").trim()
    const totalLength = pathEl.getTotalLength()
    const progressStart = baseProgress !== undefined ? baseProgress : Math.random() * 0.05
    const speed = 0.02 + Math.random() * 0.003
    const life = 100
    const initialLife = life

    let progress = progressStart
    let oscAngle = Math.random() * Math.PI * 2
    const oscSpeed = 0.1 + Math.random() * 0.05
    const maxAmp = 16 + Math.random() * 8
    let remainingLife = life

    let basePoint = pathEl.getPointAtLength(progress * totalLength)

    const update = () => {
        remainingLife -= 1
        progress += speed
        oscAngle += oscSpeed
        const _length = Math.min(progress * totalLength, totalLength)
        basePoint = pathEl.getPointAtLength(_length)
    }

    const draw = (ctx: CanvasRenderingContext2D) => {
        if (!basePoint) return

        const t = progress
        const taper = Math.max(0.75, 1 - t)
        const amp = maxAmp * taper

        const delta = 1
        const p1 = pathEl.getPointAtLength(Math.max(0, totalLength * t))
        const p2 = pathEl.getPointAtLength(Math.min(totalLength, totalLength * t + delta))
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2

        const offsetX = Math.cos(angle) * Math.sin(oscAngle) * amp
        const offsetY = Math.sin(angle) * Math.sin(oscAngle) * amp

        const x = basePoint.x + offsetX - canvasOffset.x
        const y = basePoint.y + offsetY - canvasOffset.y

        const alpha = Math.max(0, remainingLife / initialLife)
        const pulse = 0.7 + 0.3 * Math.abs(Math.sin(oscAngle * 1.5))
        ctx.save()
        ctx.beginPath()
        ctx.globalAlpha = alpha * 0.9 * pulse
        ctx.shadowBlur = 8 + 8 * pulse // Lowered for performance
        ctx.shadowColor = green
        ctx.fillStyle = green
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.shadowBlur = 0
        ctx.restore()
    }

    const isAlive = () => progress * totalLength < totalLength * 0.98
    return {update, draw, isAlive}
}

export const PlasmaEdge = ({sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition}: EdgeProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const pathRef = useRef<SVGPathElement>(null)
    const animationRef = useRef<number>()
    const particles = useRef<ReturnType<typeof createFunnelParticleOnPath>[]>([])

    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    })

    const padding = 40
    const x = Math.min(sourceX, targetX) - padding
    const y = Math.min(sourceY, targetY) - padding
    const width = Math.abs(targetX - sourceX) + padding * 2
    const height = Math.abs(targetY - sourceY) + padding * 2

    useEffect(() => {
        const canvas = canvasRef.current
        const pathEl = pathRef.current
        if (!canvas || !pathEl) return undefined

        const ctx = canvas.getContext("2d")
        const dpr = window.devicePixelRatio || 1
        canvas.width = width * dpr
        canvas.height = height * dpr
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.scale(dpr, dpr)

        const canvasOffset = {x, y}
        const MAX_PARTICLES = 250
        const PARTICLES_PER_FRAME = 25

        const animate = () => {
            ctx.clearRect(0, 0, width, height)

            for (let i = 0; i < PARTICLES_PER_FRAME; i += 1) {
                if (particles.current.length < MAX_PARTICLES) {
                    const t = Math.random()
                    if (Math.random() < 1 - t) {
                        particles.current.push(createFunnelParticleOnPath(pathEl, canvasOffset, t))
                    }
                }
            }

            particles.current.forEach((p) => {
                p.update()
                p.draw(ctx)
            })

            particles.current = particles.current.filter((p) => p.isAlive())

            animationRef.current = requestAnimationFrame(animate)
        }

        animate()
        return () => cancelAnimationFrame(animationRef.current)
    }, [edgePath, width, height, x, y])

    return (
        <>
            <foreignObject
                id={`foreign-object-${x}-${y}`}
                width={width}
                height={height}
                x={x}
                y={y}
                style={{pointerEvents: "none", overflow: "visible"}}
            >
                <canvas
                    id={`canvas-${x}-${y}`}
                    ref={canvasRef}
                />
            </foreignObject>
            <path
                id={`path-${edgePath}`}
                ref={pathRef}
                d={edgePath}
                fill="none"
                stroke="none"
                style={{position: "absolute", visibility: "hidden"}}
            />
        </>
    )
}
