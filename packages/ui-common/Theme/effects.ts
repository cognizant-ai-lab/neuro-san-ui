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

// Visual effects level. Frosted-glass blur (backdrop-filter) and the WebGL splash scene are cheap on a GPU but very
// expensive when the browser renders in software (VMs, remote desktops, GPU blocklisted), where they can pin several
// CPU cores. "Lite" mode drops them; "auto" picks lite only when software rendering is detected.

import {useEffect, useSyncExternalStore} from "react"

import {useSettingsStore} from "../state/Settings"

// Attribute set on <html> while lite effects are active; globals.css keys its lite overrides on it
const EFFECTS_ATTRIBUTE = "data-effects"

// Renderer names reported by software rasterizers and VM virtual GPUs (which are typically backed by one)
const SOFTWARE_RENDERER_PATTERN =
    /llvmpipe|softpipe|lavapipe|swiftshader|software|svga3d|basic render|virgl|offscreen/iu

let cachedSoftwareRendering: boolean | undefined

/**
 * Best-effort detection of software (CPU) rendering. Checks whether WebGL refuses a context when told to fail on a
 * "major performance caveat" (browsers do that when they'd fall back to software), and the unmasked renderer name.
 * Returns true when WebGL is unavailable altogether, since the browser is then unlikely to be GPU-accelerated.
 */
const isSoftwareRendering = (): boolean => {
    if (cachedSoftwareRendering !== undefined) {
        return cachedSoftwareRendering
    }
    if (typeof document === "undefined") {
        return false
    }

    let result = true
    try {
        const canvas = document.createElement("canvas")
        const gl = canvas.getContext("webgl", {failIfMajorPerformanceCaveat: true})
        if (gl) {
            const info = gl.getExtension("WEBGL_debug_renderer_info")
            const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ""
            result = SOFTWARE_RENDERER_PATTERN.test(renderer)
            gl.getExtension("WEBGL_lose_context")?.loseContext()
        }
    } catch {
        result = true
    }

    cachedSoftwareRendering = result
    return result
}

// Detection touches the DOM, so it must only run on the client: report "not detected" during SSR / hydration
const subscribeNoop = (): (() => void) => () => undefined
const useSoftwareRendering = () =>
    useSyncExternalStore(
        subscribeNoop,
        () => isSoftwareRendering(),
        () => false
    )

/**
 * Whether lite (low-cost) visual effects should be used, based on the user's setting and the detected renderer.
 */
export const useLiteEffects = (): boolean => {
    const setting = useSettingsStore((state) => state.settings.appearance.visualEffects)
    const softwareRendering = useSoftwareRendering()
    return setting === "lite" || (setting === "auto" && softwareRendering)
}

/**
 * Mirrors the effective effects level onto <html> so global CSS can switch off expensive effects app-wide.
 * Mount once, near the root of the app.
 */
export const useApplyVisualEffects = (): void => {
    const lite = useLiteEffects()
    useEffect(() => {
        const root = document.documentElement
        if (lite) {
            root.setAttribute(EFFECTS_ATTRIBUTE, "lite")
        } else {
            root.removeAttribute(EFFECTS_ATTRIBUTE)
        }
    }, [lite])
}
