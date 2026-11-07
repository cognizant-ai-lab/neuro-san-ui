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

import {motion, useMotionValue, useReducedMotion, useSpring} from "motion/react"
import {FC, ReactNode, PointerEvent as ReactPointerEvent} from "react"

const SPRING = {damping: 15, mass: 0.4, stiffness: 180}

interface MagneticProps {
    children: ReactNode
    // Fraction of the pointer's offset from the center that the content follows
    strength?: number
}

/**
 * Wraps content so that it drifts slightly toward the cursor while hovered and springs back on leave.
 * Inert under prefers-reduced-motion.
 */
export const Magnetic: FC<MagneticProps> = ({children, strength = 0.28}) => {
    const reducedMotion = useReducedMotion()
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const springX = useSpring(x, SPRING)
    const springY = useSpring(y, SPRING)

    const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (reducedMotion) return
        const rect = event.currentTarget.getBoundingClientRect()
        x.set((event.clientX - (rect.left + rect.width / 2)) * strength)
        y.set((event.clientY - (rect.top + rect.height / 2)) * strength)
    }

    const reset = () => {
        x.set(0)
        y.set(0)
    }

    return (
        <motion.div
            onPointerLeave={reset}
            onPointerMove={handleMove}
            style={{display: "inline-block", x: springX, y: springY}}
            whileHover={reducedMotion ? undefined : {scale: 1.035}}
            whileTap={{scale: 0.97}}
        >
            {children}
        </motion.div>
    )
}
