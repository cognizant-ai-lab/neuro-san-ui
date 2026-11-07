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

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {isWebGLAvailable} from "../../../components/Splash/webgl"

describe("isWebGLAvailable", () => {
    withStrictMocks()

    it("is true when a WebGL context can be created, and releases the probe context", () => {
        const loseContext = vi.fn()
        const context = {getExtension: vi.fn().mockReturnValue({loseContext})}
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as RenderingContext)

        expect(isWebGLAvailable()).toBe(true)
        expect(context.getExtension).toHaveBeenCalledWith("WEBGL_lose_context")
        expect(loseContext).toHaveBeenCalled()
    })

    it("falls back to WebGL 1", () => {
        const getContext = vi
            .spyOn(HTMLCanvasElement.prototype, "getContext")
            .mockReturnValueOnce(null)
            .mockReturnValueOnce({getExtension: vi.fn()} as unknown as RenderingContext)

        expect(isWebGLAvailable()).toBe(true)
        expect(getContext).toHaveBeenNthCalledWith(1, "webgl2")
        expect(getContext).toHaveBeenNthCalledWith(2, "webgl")
    })

    it("is false when no context can be created", () => {
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null)
        expect(isWebGLAvailable()).toBe(false)
    })

    it("is false when creating a context throws", () => {
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
            throw new Error("blocked")
        })
        expect(isWebGLAvailable()).toBe(false)
    })
})
