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

// Full-bleed backdrop for the splash page: a CSS gradient "constellation" that is always painted, with the WebGL
// Agent Constellation scene fading in over it once it has drawn its first frame. The 3D bundle is loaded client-side
// only, and only if WebGL is available; any failure (load error, render error, lost context) leaves the CSS layer.

import {styled, useColorScheme} from "@mui/material/styles"
import {useReducedMotion} from "motion/react"
import dynamic from "next/dynamic"
import {Component, ErrorInfo, FC, ReactNode, useCallback, useEffect, useRef, useState} from "react"

import {isWebGLAvailable} from "./webgl"
import {useLiteEffects} from "../../../../packages/ui-common/Theme/effects"
import {getSheen, sheenConic} from "../../../../packages/ui-common/Theme/sheen"

const ConstellationScene = dynamic(() => import("./ConstellationScene").then((scene) => scene.ConstellationScene), {
    loading: () => null,
    ssr: false,
})

// #region: Error boundary

interface BoundaryProps {
    children: ReactNode
    onError: () => void
}

// Contains any failure in the 3D scene so the page itself can never crash because of it
class SceneErrorBoundary extends Component<BoundaryProps, {failed: boolean}> {
    static getDerivedStateFromError() {
        return {failed: true}
    }

    constructor(props: BoundaryProps) {
        super(props)
        this.state = {failed: false}
    }

    override componentDidCatch(error: Error, info: ErrorInfo) {
        console.warn("Splash 3D scene unavailable, using fallback", error, info.componentStack)
        this.props.onError()
    }

    override render() {
        return this.state.failed ? null : this.props.children
    }
}

// #endregion: Error boundary

// #region: Styled components

const Layer = styled("div")({
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none",
    position: "absolute",
    zIndex: 0,
})

// CSS fallback: a soft iridescent orb on the right, where the 3D core sits. Static: animating a heavily blurred layer
// repaints it every frame, which is very expensive without a GPU.
const FallbackOrb = styled("div")(({theme}) => ({
    aspectRatio: "1",
    backgroundImage: sheenConic(theme),
    borderRadius: "50%",
    filter: "blur(70px)",
    left: "72%",
    opacity: 0.5,
    position: "absolute",
    top: "48%",
    transform: "translate(-50%, -50%)",
    transition: "opacity 1.2s ease",
    width: "min(52vmax, 760px)",
    "&[data-scene-ready='true']": {opacity: 0.16},
    ...theme.applyStyles("light", {opacity: 0.38}),
    [theme.breakpoints.down("lg")]: {left: "50%", top: "38%", width: "90vmin"},
}))

// Faint dot grid, fading out radially around the constellation
const FallbackGrid = styled("div")(({theme}) => {
    const fade = "radial-gradient(ellipse 60% 65% at 65% 45%, #000 0%, transparent 75%)"
    const dot = (theme.vars ?? theme).palette.text.primary
    return {
        backgroundImage: `radial-gradient(circle at 1px 1px, ${dot} 1px, transparent 0)`,
        backgroundSize: "28px 28px",
        inset: 0,
        mask: fade,
        opacity: 0.1,
        position: "absolute",
        WebkitMask: fade,
    }
})

const CanvasLayer = styled("div")(({theme}) => ({
    inset: 0,
    opacity: 0,
    position: "absolute",
    transition: "opacity 1.6s cubic-bezier(0.22, 1, 0.36, 1)",
    "&[data-scene-ready='true']": {opacity: 1},
    // In the centered (narrower) layout the constellation sits behind the copy, so recede it
    [theme.breakpoints.down("lg")]: {"&[data-scene-ready='true']": {opacity: 0.5}},
}))

// Darkens / lightens the left side so the copy always reads over the scene
const Scrim = styled("div")(({theme}) => {
    const {glassBg} = getSheen(theme)
    return {
        background: `linear-gradient(90deg, ${glassBg} 0%, transparent 55%)`,
        inset: 0,
        opacity: 0.55,
        position: "absolute",
        [theme.breakpoints.down("lg")]: {background: `linear-gradient(0deg, ${glassBg} 10%, transparent 70%)`},
    }
})

// #endregion: Styled components

/**
 * Tracks whether an element is worth animating: the tab is visible and the element intersects the viewport.
 */
const useOnScreen = (element: HTMLElement | null): boolean => {
    const [intersecting, setIntersecting] = useState(true)
    const [tabVisible, setTabVisible] = useState(true)

    useEffect(() => {
        const update = () => setTabVisible(document.visibilityState !== "hidden")
        update()
        document.addEventListener("visibilitychange", update)
        return () => document.removeEventListener("visibilitychange", update)
    }, [])

    useEffect(() => {
        if (!element || typeof IntersectionObserver === "undefined") return undefined
        const observer = new IntersectionObserver(([entry]) => setIntersecting(entry.isIntersecting))
        observer.observe(element)
        return () => observer.disconnect()
    }, [element])

    return intersecting && tabVisible
}

export const ConstellationBackdrop: FC = () => {
    const {mode, systemMode} = useColorScheme()
    const isLight = (mode === "system" ? systemMode : mode) === "light"
    const reducedMotion = useReducedMotion() ?? false

    // null until checked on the client, so server and first client render agree
    const [webGL, setWebGL] = useState<boolean | null>(null)
    const [failed, setFailed] = useState(false)
    const [ready, setReady] = useState(false)
    const [layer, setLayer] = useState<HTMLDivElement | null>(null)
    const active = useOnScreen(layer)
    const mounted = useRef(true)

    useEffect(() => {
        mounted.current = true
        setWebGL(isWebGLAvailable())
        return () => {
            mounted.current = false
        }
    }, [])

    const handleReady = useCallback(() => {
        if (mounted.current) setReady(true)
    }, [])
    const handleError = useCallback(() => {
        if (mounted.current) {
            setFailed(true)
            setReady(false)
        }
    }, [])

    // Lite effects (user setting, or auto when the browser renders without a GPU): keep the static CSS fallback only
    const liteEffects = useLiteEffects()

    const showScene = webGL === true && !failed && !liteEffects

    return (
        <Layer
            aria-hidden={true}
            data-testid="constellation-backdrop"
            id="splash-constellation"
            ref={setLayer}
        >
            <FallbackGrid id="splash-hero-grid" />
            <FallbackOrb
                data-scene-ready={ready}
                id="splash-hero-orb"
            />
            {showScene ? (
                <CanvasLayer
                    data-scene-ready={ready}
                    data-testid="constellation-canvas-layer"
                >
                    <SceneErrorBoundary onError={handleError}>
                        <ConstellationScene
                            active={active}
                            isLight={isLight}
                            onError={handleError}
                            onReady={handleReady}
                            reducedMotion={reducedMotion}
                        />
                    </SceneErrorBoundary>
                </CanvasLayer>
            ) : null}
            <Scrim />
        </Layer>
    )
}
