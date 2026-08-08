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

/*
Unit tests for the sly_data view/edit helpers
 */

// eslint-disable-next-line no-shadow
import {describe, expect, it} from "vitest"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {findImageValues, formatSlyData, parseSlyData} from "../../../utils/SlyData"

// A one-pixel transparent GIF, as a data URI
const IMAGE_DATA_URI = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

describe("formatSlyData", () => {
    withStrictMocks()

    it("pretty-prints sly data as indented JSON", () => {
        expect(formatSlyData({charges: 2, user: "bob"})).toBe('{\n  "charges": 2,\n  "user": "bob"\n}')
    })

    it("renders an empty object when there is no sly data", () => {
        expect(formatSlyData(undefined)).toBe("{}")
        expect(formatSlyData({})).toBe("{}")
    })

    it("round-trips through the parser", () => {
        const original = {list: [1, 2, 3], nested: {a: true}}
        expect(parseSlyData(formatSlyData(original)).value).toStrictEqual(original)
    })
})

describe("parseSlyData", () => {
    withStrictMocks()

    it("parses a JSON object", () => {
        const result = parseSlyData('{"charges": 2}')
        expect(result.error).toBeUndefined()
        expect(result.value).toStrictEqual({charges: 2})
    })

    it.each(["", " ".repeat(3), "\n"])("treats blank text (%j) as empty sly data", (text: string) => {
        const result = parseSlyData(text)
        expect(result.error).toBeUndefined()
        expect(result.value).toStrictEqual({})
    })

    it("reports malformed JSON, quoting the parser's own message", () => {
        const result = parseSlyData('{"charges": }')
        expect(result.error).toBeTruthy()
        expect(result.value).toStrictEqual({})
    })

    it("rejects an array at the root", () => {
        expect(parseSlyData("[1, 2]").error).toBe("Sly data must be a JSON object, not an array.")
    })

    it.each(["42", '"hello"', "true", "null"])("rejects the primitive %s at the root", (text: string) => {
        expect(parseSlyData(text).error).toBe("Sly data must be a JSON object, not a primitive value.")
    })

    it("survives being handed nothing at all", () => {
        expect(parseSlyData(undefined).value).toStrictEqual({})
    })
})

describe("findImageValues", () => {
    withStrictMocks()

    it("finds an image supplied as a data URI", () => {
        expect(findImageValues({avatar: IMAGE_DATA_URI})).toStrictEqual([{path: "avatar", src: IMAGE_DATA_URI}])
    })

    it.each([
        "https://example.com/chart.png",
        "http://example.com/chart.JPEG",
        "https://example.com/chart.svg?width=200",
        "https://example.com/chart.webp#top",
    ])("finds an image supplied as the URL %s", (url: string) => {
        expect(findImageValues({chart: url})).toStrictEqual([{path: "chart", src: url}])
    })

    it.each([
        "just some text",
        "https://example.com/report.pdf",
        "data:text/plain;base64,aGVsbG8=",
        "example.com/chart.png",
    ])("ignores the non-image value %j", (value: string) => {
        expect(findImageValues({field: value})).toStrictEqual([])
    })

    it("reports a readable key path for nested images", () => {
        const slyData = {report: {charts: [{thumbnail: IMAGE_DATA_URI}]}}
        expect(findImageValues(slyData)).toStrictEqual([{path: "report.charts[0].thumbnail", src: IMAGE_DATA_URI}])
    })

    it("finds every image, in document order", () => {
        const slyData = {first: IMAGE_DATA_URI, notes: "no image here", second: "https://example.com/b.png"}
        expect(findImageValues(slyData).map((image) => image.path)).toStrictEqual(["first", "second"])
    })

    it("stops descending past the maximum depth", () => {
        // 7 levels of nesting: one deeper than the walker will follow
        const tooDeep = {a: {b: {c: {d: {e: {f: {g: IMAGE_DATA_URI}}}}}}}
        expect(findImageValues(tooDeep)).toStrictEqual([])

        const justShallowEnough = {a: {b: {c: {d: {e: {f: IMAGE_DATA_URI}}}}}}
        expect(findImageValues(justShallowEnough)).toHaveLength(1)
    })

    it("caps the number of images it returns", () => {
        const many = Object.fromEntries(
            Array.from({length: 50}, (_, index: number) => [`image${index}`, IMAGE_DATA_URI])
        )
        expect(findImageValues(many)).toHaveLength(20)
    })

    it.each([undefined, null, "not an object", 42])("returns nothing for the non-payload %j", (value: unknown) => {
        expect(findImageValues(value)).toStrictEqual([])
    })
})
