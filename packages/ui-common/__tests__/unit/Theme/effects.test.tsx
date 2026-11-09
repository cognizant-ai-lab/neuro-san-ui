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

import {render} from "@testing-library/react"
import {renderToString} from "react-dom/server"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {useSettingsStore, VisualEffects} from "../../../state/Settings"

// The software-rendering probe result is cached per module instance, so each test loads a fresh copy
const loadEffects = async () => {
    vi.resetModules()
    const settings = await import("../../../state/Settings")
    const effects = await import("../../../Theme/effects")
    return {...effects, useFreshSettingsStore: settings.useSettingsStore}
}

// Fakes the WebGL probe: null means no context (WebGL unavailable or would be software), otherwise a renderer name
const mockWebGL = (renderer: string | null) => {
    const gl = {
        getExtension: (extension: string) =>
            extension === "WEBGL_debug_renderer_info" ? {UNMASKED_RENDERER_WEBGL: 1} : null,
        getParameter: () => renderer,
    }
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() =>
        renderer === null ? null : gl) as unknown as HTMLCanvasElement["getContext"])
}

describe("visual effects", () => {
    withStrictMocks()

    afterEach(() => {
        delete document.documentElement.dataset["effects"]
        useSettingsStore.getState().resetSettings()
    })

    // Renders a component that applies the effects level, and returns the resulting <html> data-effects value
    const applyEffects = async (setting: VisualEffects): Promise<string | undefined> => {
        const {useApplyVisualEffects, useFreshSettingsStore} = await loadEffects()
        useFreshSettingsStore.getState().updateSettings({appearance: {visualEffects: setting}})
        const Probe = (): null => {
            useApplyVisualEffects()
            return null
        }
        render(<Probe />)
        return document.documentElement.dataset["effects"]
    }

    it.each([
        {renderer: null, lite: true, label: "no hardware-accelerated context"},
        {renderer: "llvmpipe (LLVM 17.0.6, 256 bits)", lite: true, label: "llvmpipe"},
        {renderer: "SVGA3D; build: RELEASE; LLVM;", lite: true, label: "VMware SVGA3D"},
        {renderer: "ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)", lite: false, label: "GPU"},
    ])("auto mode detects software rendering: $label", async ({renderer, lite}) => {
        mockWebGL(renderer)
        expect(await applyEffects("auto")).toBe(lite ? "lite" : undefined)
    })

    it.each([
        {setting: "auto", software: true, lite: true},
        {setting: "auto", software: false, lite: false},
        {setting: "full", software: true, lite: false},
        {setting: "lite", software: false, lite: true},
    ] as {setting: VisualEffects; software: boolean; lite: boolean}[])(
        "applies lite mode to <html> for setting=$setting, software=$software",
        async ({setting, software, lite}) => {
            mockWebGL(software ? null : "ANGLE (NVIDIA GeForce RTX 4070)")
            expect(await applyEffects(setting)).toBe(lite ? "lite" : undefined)
        }
    )
    it("treats a throwing WebGL probe as software rendering", async () => {
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
            throw new Error("webgl blew up")
        })
        expect(await applyEffects("auto")).toBe("lite")
    })

    it("treats a context without renderer info as hardware rendering", async () => {
        const gl = {getExtension: (): null => null, getParameter: (): string => ""}
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() =>
            gl) as unknown as HTMLCanvasElement["getContext"])
        expect(await applyEffects("auto")).toBeUndefined()
    })

    it("reports no software rendering on the server snapshot", async () => {
        const {useLiteEffects, useFreshSettingsStore} = await loadEffects()
        useFreshSettingsStore.getState().updateSettings({appearance: {visualEffects: "auto"}})
        const Probe = () => <span>{String(useLiteEffects())}</span>
        expect(renderToString(<Probe />)).toContain("false")
    })
})
