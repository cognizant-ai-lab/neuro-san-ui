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
import {normalizeUrlInput, stripProtocol} from "../../../utils/Url"

describe("stripProtocol", () => {
    withStrictMocks()

    it("removes http and https protocols", () => {
        expect(stripProtocol("http://example.com")).toBe("example.com")
        expect(stripProtocol("HTTPS://example.com")).toBe("example.com")
    })

    it("tolerates missing values", () => {
        expect(stripProtocol(undefined as unknown as string)).toBe("")
    })
})

describe("normalizeUrlInput", () => {
    withStrictMocks()

    it("uses the protocol given in the input", () => {
        expect(normalizeUrlInput(" http://host:80 ", "https")).toEqual({host: "host:80", protocol: "http"})
        expect(normalizeUrlInput("https://host", "http")).toEqual({host: "host", protocol: "https"})
    })

    it("falls back when there is no protocol", () => {
        expect(normalizeUrlInput("host", "http")).toEqual({host: "host", protocol: "http"})
    })
})
