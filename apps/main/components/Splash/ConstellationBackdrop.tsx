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

// Full-bleed, static backdrop for the splash page: a soft iridescent glow and dot grid with an "agent constellation"
// drawn over them in SVG: a glowing core, three tilted orbits and the agents on them, linked to each other. Nothing
// animates or tracks the pointer, so it costs nothing after the first paint.

import {styled} from "@mui/material/styles"
import {FC} from "react"

import {getSheen, SHEEN_DARK, SHEEN_LIGHT} from "../../../../packages/ui-common/Theme/sheen"

// #region: Constellation geometry

interface Point {
    x: number
    y: number
}

interface Orbit {
    // Parametric angles (degrees) of the agents placed on this orbit
    agents: number[]
    rx: number
    ry: number
    // Tilt of the orbit (degrees)
    tilt: number
}

// All coordinates are in a 200 x 200 viewBox centered on the core. Agent angles are chosen so no two agents crowd
// each other or the core.
const ORBITS: Orbit[] = [
    {agents: [65, 220, 350], rx: 44, ry: 20, tilt: -28},
    {agents: [25, 175, 230, 275, 320], rx: 68, ry: 34, tilt: 18},
    {agents: [80, 125, 170, 235, 305, 345], rx: 90, ry: 46, tilt: -10},
]

const CORE_RADIUS = 9

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

// Point at parametric angle t on an ellipse centered on the origin, rotated by tilt
const pointOnOrbit = ({rx, ry, tilt}: Orbit, t: number): Point => {
    const x = rx * Math.cos(toRadians(t))
    const y = ry * Math.sin(toRadians(t))
    const rotation = toRadians(tilt)
    return {
        x: x * Math.cos(rotation) - y * Math.sin(rotation),
        y: x * Math.sin(rotation) + y * Math.cos(rotation),
    }
}

// Agents per orbit, innermost first
const AGENTS: Point[][] = ORBITS.map((orbit) => orbit.agents.map((t) => pointOnOrbit(orbit, t)))

const nearest = (from: Point, candidates: Point[]): Point =>
    candidates.reduce((best, candidate) =>
        Math.hypot(candidate.x - from.x, candidate.y - from.y) < Math.hypot(best.x - from.x, best.y - from.y)
            ? candidate
            : best
    )

// The core talks to every inner agent; every other agent is linked to its nearest agent one orbit in
const LINKS: [Point, Point][] = [
    ...AGENTS[0].map((agent): [Point, Point] => [{x: 0, y: 0}, agent]),
    ...AGENTS.slice(1).flatMap((orbit, index) =>
        orbit.map((agent): [Point, Point] => [nearest(agent, AGENTS[index]), agent])
    ),
]

// #endregion: Constellation geometry

// #region: Styled components

const Layer = styled("div")({
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none",
    position: "absolute",
    zIndex: 0,
})

// Soft iridescent glow behind the constellation. A radial gradient rather than a blur filter: just as soft, and free to
// repaint.
const Orb = styled("div")(({theme}) => {
    const {auroraA, auroraB} = getSheen(theme)
    return {
        aspectRatio: "1",
        backgroundImage: `radial-gradient(circle, ${auroraA}, ${auroraB} 40%, transparent 70%)`,
        borderRadius: "50%",
        left: "72%",
        opacity: 0.8,
        position: "absolute",
        top: "48%",
        transform: "translate(-50%, -50%)",
        width: "min(46vmax, 680px)",
        ...theme.applyStyles("light", {opacity: 0.6}),
        [theme.breakpoints.down("lg")]: {left: "50%", top: "38%", width: "90vmin"},
    }
})

// Faint dot grid, fading out radially around the constellation
const Grid = styled("div")(({theme}) => {
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

const Constellation = styled("svg")(({theme}) => ({
    aspectRatio: "1",
    left: "72%",
    overflow: "visible",
    position: "absolute",
    top: "48%",
    transform: "translate(-50%, -50%)",
    width: "min(52vmax, 760px)",

    "& .stop-start": {stopColor: SHEEN_DARK.sheen.gradientStart},
    "& .stop-mid": {stopColor: SHEEN_DARK.sheen.gradientMid},
    "& .stop-end": {stopColor: SHEEN_DARK.sheen.gradientEnd},
    "& .orbit": {opacity: 0.22},
    "& .link": {opacity: 0.45},
    "& .agent-halo": {fill: getSheen(theme).tint},
    "& .agent": {fill: SHEEN_DARK.text.primary},

    ...theme.applyStyles("light", {
        "& .stop-start": {stopColor: SHEEN_LIGHT.sheen.gradientStart},
        "& .stop-mid": {stopColor: SHEEN_LIGHT.sheen.gradientMid},
        "& .stop-end": {stopColor: SHEEN_LIGHT.sheen.gradientEnd},
        "& .orbit": {opacity: 0.3},
        "& .link": {opacity: 0.5},
        "& .agent": {fill: SHEEN_LIGHT.background.paper},
    }),

    // In the centered (narrower) layout the constellation sits behind the copy, so recede it
    [theme.breakpoints.down("lg")]: {left: "50%", opacity: 0.4, top: "38%", width: "100vmin"},
}))

// Darkens / lightens the left side so the copy always reads over the backdrop
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

export const ConstellationBackdrop: FC = () => (
    <Layer
        aria-hidden={true}
        data-testid="constellation-backdrop"
        id="splash-constellation"
    >
        <Grid id="splash-hero-grid" />
        <Orb id="splash-hero-orb" />
        <Constellation
            data-testid="constellation-svg"
            id="splash-hero-constellation"
            viewBox="-100 -100 200 200"
        >
            <defs>
                <linearGradient
                    gradientUnits="userSpaceOnUse"
                    id="constellation-stroke"
                    x1="-100"
                    x2="100"
                    y1="-60"
                    y2="60"
                >
                    <stop
                        className="stop-start"
                        offset="0%"
                    />
                    <stop
                        className="stop-mid"
                        offset="55%"
                    />
                    <stop
                        className="stop-end"
                        offset="100%"
                    />
                </linearGradient>
                <radialGradient id="constellation-core">
                    <stop
                        offset="0%"
                        stopColor="#FFFFFF"
                    />
                    <stop
                        className="stop-mid"
                        offset="45%"
                    />
                    <stop
                        className="stop-start"
                        offset="100%"
                    />
                </radialGradient>
                <filter
                    height="300%"
                    id="constellation-glow"
                    width="300%"
                    x="-100%"
                    y="-100%"
                >
                    <feGaussianBlur stdDeviation="4" />
                </filter>
            </defs>

            {ORBITS.map(({rx, ry, tilt}) => (
                <ellipse
                    className="orbit"
                    fill="none"
                    key={`${rx}-${ry}`}
                    rx={rx}
                    ry={ry}
                    stroke="url(#constellation-stroke)"
                    strokeWidth={0.35}
                    transform={`rotate(${tilt})`}
                />
            ))}

            {LINKS.map(([from, to]) => (
                <line
                    className="link"
                    key={`${from.x},${from.y}-${to.x},${to.y}`}
                    stroke="url(#constellation-stroke)"
                    strokeLinecap="round"
                    strokeWidth={0.6}
                    x1={from.x}
                    x2={to.x}
                    y1={from.y}
                    y2={to.y}
                />
            ))}

            {AGENTS.flat().map(({x, y}, index) => {
                // Inner agents are a little larger, as if nearer
                const radius = index < ORBITS[0].agents.length ? 2.6 : 2
                return (
                    <g key={`${x},${y}`}>
                        <circle
                            className="agent-halo"
                            cx={x}
                            cy={y}
                            r={radius * 2.6}
                        />
                        <circle
                            cx={x}
                            cy={y}
                            fill="url(#constellation-stroke)"
                            r={radius}
                        />
                        <circle
                            className="agent"
                            cx={x}
                            cy={y}
                            r={radius * 0.45}
                        />
                    </g>
                )
            })}

            {/* The core: a blurred bloom under a bright gradient sphere */}
            <circle
                fill="url(#constellation-stroke)"
                filter="url(#constellation-glow)"
                opacity={0.8}
                r={CORE_RADIUS * 1.6}
            />
            <circle
                fill="url(#constellation-core)"
                r={CORE_RADIUS}
            />
        </Constellation>
        <Scrim />
    </Layer>
)
