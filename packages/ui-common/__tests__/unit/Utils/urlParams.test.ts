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

import {getUrlParameter, setUrlParameter} from "../../../utils/urlParams"

// Mock window object for testing
const mockLocation = {
    href: "http://localhost:3000/multiAgentAccelerator",
    search: "",
}

const mockHistory = {
    replaceState: jest.fn(),
}

Object.defineProperty(window, "location", {
    value: mockLocation,
    writable: true,
})

Object.defineProperty(window, "history", {
    value: mockHistory,
    writable: true,
})

describe("urlParams utilities", () => {
    beforeEach(() => {
        mockLocation.search = ""
        mockLocation.href = "http://localhost:3000/multiAgentAccelerator"
        mockHistory.replaceState.mockClear()
    })

    describe("getUrlParameter", () => {
        it("should return null when parameter is not found", () => {
            expect(getUrlParameter("selectedNetwork")).toBeNull()
        })

        it("should return parameter value when found", () => {
            mockLocation.search = "?selectedNetwork=Airline%20Policy"
            expect(getUrlParameter("selectedNetwork")).toBe("Airline Policy")
        })

        it("should handle multiple parameters", () => {
            mockLocation.search = "?selectedNetwork=Banking%20Ops&other=value"
            expect(getUrlParameter("selectedNetwork")).toBe("Banking Ops")
            expect(getUrlParameter("other")).toBe("value")
            expect(getUrlParameter("notfound")).toBeNull()
        })

        it("should return null when window is undefined (SSR)", () => {
            const originalWindow = global.window
            delete (global as any).window
            
            expect(getUrlParameter("selectedNetwork")).toBeNull()
            
            global.window = originalWindow
        })
    })

    describe("setUrlParameter", () => {
        it("should add parameter to URL", () => {
            setUrlParameter("selectedNetwork", "Airline Policy")
            
            expect(mockHistory.replaceState).toHaveBeenCalledWith(
                {},
                "",
                "http://localhost:3000/multiAgentAccelerator?selectedNetwork=Airline+Policy"
            )
        })

        it("should remove parameter when value is null", () => {
            mockLocation.search = "?selectedNetwork=Banking%20Ops"
            setUrlParameter("selectedNetwork", null)
            
            expect(mockHistory.replaceState).toHaveBeenCalledWith(
                {},
                "",
                "http://localhost:3000/multiAgentAccelerator"
            )
        })

        it("should handle updating existing parameter", () => {
            mockLocation.search = "?selectedNetwork=Banking%20Ops&other=value"
            mockLocation.href = "http://localhost:3000/multiAgentAccelerator?selectedNetwork=Banking%20Ops&other=value"
            
            setUrlParameter("selectedNetwork", "Airline Policy")
            
            expect(mockHistory.replaceState).toHaveBeenCalledWith(
                {},
                "",
                "http://localhost:3000/multiAgentAccelerator?selectedNetwork=Airline+Policy&other=value"
            )
        })

        it("should handle SSR safely", () => {
            const originalWindow = global.window
            delete (global as any).window
            
            // Should not throw
            expect(() => setUrlParameter("selectedNetwork", "test")).not.toThrow()
            
            global.window = originalWindow
        })
    })
})