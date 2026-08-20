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
Unit tests for the sly_data_schema helpers
 */

// eslint-disable-next-line no-shadow
import {describe, expect, it, vi} from "vitest"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {buildSlyDataTemplate, describeSlyDataSchema} from "../../../utils/SlyDataSchema"

// The schema of neuro-san's math_guy example network: two required scalars
const MATH_GUY_SCHEMA = {
    properties: {
        x: {description: "The first operand for the arithmetic operation", type: "float"},
        y: {description: "The second operand for the arithmetic operation", type: "float"},
    },
    required: ["x", "y"],
    type: "object",
}

// The schema of neuro-san's music_nerd_pro_sly_api_key example network: a scalar plus the BYOK llm_config block
const BYOK_SCHEMA = {
    properties: {
        llm_config: {
            properties: {
                openai_api_key: {description: "The User's OpenAI API key", type: "string"},
            },
            required: ["openai_api_key"],
            type: "object",
        },
        running_cost: {description: "The running cost of the operation", type: "float"},
    },
    required: ["llm_config"],
    type: "object",
}

// The schema of neuro-san's mcp_github example network: objects nested three deep, with a URL as a property key
const MCP_URL = "https://api.githubcopilot.com/mcp"
const MCP_SCHEMA = {
    properties: {
        http_headers: {
            description: "HTTP headers to be sent with MCP tool requests.",
            properties: {
                [MCP_URL]: {
                    properties: {
                        Authorization: {description: "Authorization header for GitHub API access", type: "string"},
                    },
                    required: ["Authorization"],
                    type: "object",
                },
            },
            required: [MCP_URL],
            type: "object",
        },
    },
    required: ["http_headers"],
    type: "object",
}

describe("describeSlyDataSchema", () => {
    withStrictMocks()

    it("lists scalar keys with type, required flag and description", () => {
        expect(describeSlyDataSchema(MATH_GUY_SCHEMA)).toStrictEqual([
            {description: "The first operand for the arithmetic operation", isRequired: true, key: "x", type: "float"},
            {description: "The second operand for the arithmetic operation", isRequired: true, key: "y", type: "float"},
        ])
    })

    it("marks keys absent from the required list as optional", () => {
        const entries = describeSlyDataSchema(BYOK_SCHEMA)
        expect(entries.find((entry) => entry.key === "running_cost")?.isRequired).toBe(false)
        expect(entries.find((entry) => entry.key === "llm_config")?.isRequired).toBe(true)
    })

    it("skips excluded keys", () => {
        expect(describeSlyDataSchema(BYOK_SCHEMA, ["llm_config"])).toStrictEqual([
            {description: "The running cost of the operation", isRequired: false, key: "running_cost", type: "float"},
        ])
    })

    it("keeps unusual property keys such as URLs verbatim", () => {
        expect(describeSlyDataSchema(MCP_SCHEMA)).toStrictEqual([
            {
                description: "HTTP headers to be sent with MCP tool requests.",
                isRequired: true,
                key: "http_headers",
                type: "object",
            },
        ])
    })

    it("infers object for an untyped node that declares properties", () => {
        const schema = {
            properties: {settings: {properties: {volume: {type: "int"}}}},
            type: "object",
        }
        expect(describeSlyDataSchema(schema)[0].type).toBe("object")
    })

    it("leaves the type undefined when the schema does not say", () => {
        const schema = {properties: {mystery: {description: "who knows"}}, type: "object"}
        expect(describeSlyDataSchema(schema)[0].type).toBeUndefined()
    })

    it("returns nothing when there is no schema", () => {
        expect(describeSlyDataSchema(undefined)).toStrictEqual([])
        expect(describeSlyDataSchema(null)).toStrictEqual([])
    })

    it.each([
        ["a primitive", 42],
        ["a non-object root", {properties: {x: {type: "float"}}, type: "array"}],
        ["a root without properties", {type: "object"}],
        ["a root with empty properties", {properties: {}, type: "object"}],
    ])("warns and returns nothing for %s", (_label: string, schema: unknown) => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
        expect(describeSlyDataSchema(schema)).toStrictEqual([])
        expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("sly_data_schema"), expect.anything())
    })
})

describe("buildSlyDataTemplate", () => {
    withStrictMocks()

    it("seeds a default value per declared type", () => {
        const schema = {
            properties: {
                count: {type: "int"},
                enabled: {type: "bool"},
                name: {type: "string"},
                rate: {type: "float"},
                stuff: {type: "list"},
            },
            type: "object",
        }
        expect(buildSlyDataTemplate(schema, {})).toStrictEqual({
            count: 0,
            enabled: false,
            name: "",
            rate: 0,
            stuff: null,
        })
    })

    it("accepts the JSON Schema spellings of the scalar types", () => {
        const schema = {
            properties: {a: {type: "integer"}, b: {type: "number"}, c: {type: "boolean"}, d: {type: "double"}},
            type: "object",
        }
        expect(buildSlyDataTemplate(schema, {})).toStrictEqual({a: 0, b: 0, c: false, d: 0})
    })

    it("keeps every existing value, even one that contradicts the schema", () => {
        const existing = {x: "not a number", y: 4.5}
        expect(buildSlyDataTemplate(MATH_GUY_SCHEMA, existing)).toStrictEqual({x: "not a number", y: 4.5})
    })

    it("adds only the missing keys", () => {
        expect(buildSlyDataTemplate(MATH_GUY_SCHEMA, {x: 3})).toStrictEqual({x: 3, y: 0})
    })

    it("builds nested objects and fills gaps inside a partial one", () => {
        const existing = {http_headers: {[MCP_URL]: {}}}
        expect(buildSlyDataTemplate(MCP_SCHEMA, existing)).toStrictEqual({
            http_headers: {[MCP_URL]: {Authorization: ""}},
        })
    })

    it("seeds an empty object for an object node that declares no properties", () => {
        const schema = {properties: {config: {type: "object"}}, type: "object"}
        expect(buildSlyDataTemplate(schema, {})).toStrictEqual({config: {}})
    })

    it("never seeds excluded keys", () => {
        expect(buildSlyDataTemplate(BYOK_SCHEMA, {}, ["llm_config"])).toStrictEqual({running_cost: 0})
    })

    it("leaves an existing non-object value alone where the schema declares an object", () => {
        expect(buildSlyDataTemplate(MCP_SCHEMA, {http_headers: "oops"})).toStrictEqual({http_headers: "oops"})
    })

    it("does not mutate the existing sly data", () => {
        const existing = {x: 3}
        buildSlyDataTemplate(MATH_GUY_SCHEMA, existing)
        expect(existing).toStrictEqual({x: 3})
    })

    it("returns the existing sly data untouched when the schema is unusable", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
        const existing = {kept: true}
        expect(buildSlyDataTemplate({type: "object"}, existing)).toBe(existing)
        expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("sly_data_schema"), expect.anything())
    })

    it("stops materializing objects beyond the depth cap", () => {
        // Each level nests one object deeper than the last; the cap must cut this off, not recurse forever
        let node: Record<string, unknown> = {type: "string"}
        for (let index = 0; index < 10; index += 1) {
            node = {properties: {deeper: node}, type: "object"}
        }
        const result = buildSlyDataTemplate(node, {})

        let depth = 0
        let cursor: unknown = result
        while (cursor !== null && typeof cursor === "object" && "deeper" in cursor) {
            cursor = (cursor as Record<string, unknown>)["deeper"]
            depth += 1
        }
        expect(depth).toBeLessThan(10)
        expect(depth).toBeGreaterThan(0)
    })
})
