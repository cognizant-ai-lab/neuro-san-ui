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

/**
 * Returns true if the browser can create a WebGL context. Checked before loading the (heavy) 3D scene bundle, so
 * browsers without WebGL (or with it disabled) only ever see the CSS fallback.
 */
export const isWebGLAvailable = (): boolean => {
    try {
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl")
        if (!context) {
            return false
        }
        // Release the probe context right away; browsers cap the number of live contexts
        context.getExtension("WEBGL_lose_context")?.loseContext()
        return true
    } catch {
        return false
    }
}
