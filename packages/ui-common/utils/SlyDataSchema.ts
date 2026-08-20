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

import * as z from "zod"

import {SlyData} from "./SlyData"

/**
 * Helpers for reading an agent network's `sly_data_schema`.
 *
 * A network's front man may advertise the sly_data it expects via `sly_data_schema` (see the neuro-san agent hocon
 * reference). The document is OpenAI-tool-style JSON Schema -- `type`/`properties`/`required`/`description` -- with
 * one quirk: scalar types use neuro-san's names `"int"`, `"float"`, `"string"`, `"bool"` rather than the JSON Schema
 * names. Everything here is defensive: the schema is server-supplied data, and a malformed one must degrade to
 * "no schema" rather than break the sly_data editor.
 */

// How many levels of nested objects a template will materialize. Deep enough for every published schema
// (mcp-style http_headers nest three levels), shallow enough that a pathological schema cannot recurse away.
const MAX_TEMPLATE_DEPTH = 5

// Scalar type names accepted for each kind of template value. Neuro-san's names first, but the JSON Schema
// spellings cost nothing to accept and schema authors do write them.
const INT_TYPES: ReadonlySet<string> = new Set(["int", "integer"])
const FLOAT_TYPES: ReadonlySet<string> = new Set(["double", "float", "number"])
const BOOL_TYPES: ReadonlySet<string> = new Set(["bool", "boolean"])

/**
 * One node of a sly_data_schema document. Loose on purpose: extra keys are the schema author's business.
 * The recursion mirrors JSON Schema's -- an object node describes its keys under `properties`.
 */
const SchemaNode = z.looseObject({
    description: z.string().optional(),
    get properties() {
        return z.record(z.string(), SchemaNode).optional()
    },
    required: z.array(z.string()).optional(),
    type: z.string().optional(),
})

type SchemaNodeType = z.infer<typeof SchemaNode>

/**
 * A top-level sly_data key advertised by the network, in a shape ready for display.
 */
export interface SlyDataSchemaEntry {
    /** What the key is for, verbatim from the schema */
    readonly description?: string

    /** True if the key appears in the schema's root `required` list */
    readonly isRequired: boolean

    /** The property name, verbatim. Any string is legal here -- some networks use URLs as keys. */
    readonly key: string

    /** The declared type name (neuro-san writes "int"/"float"/"string"/"bool"), or "object" when only inferable */
    readonly type?: string
}

/**
 * Whether a schema node describes an object. An explicit `type: "object"` counts, and so does an untyped node
 * that declares `properties` -- schema authors routinely omit the redundant `type`.
 * @param node The schema node to examine.
 * @returns True if the node describes an object value.
 */
const isObjectNode = (node: SchemaNodeType): boolean =>
    node.type === "object" || (node.type === undefined && node.properties !== undefined)

/**
 * Validates a server-supplied sly_data_schema and returns its root node, or null if there is nothing usable.
 * A root is usable when it is object-shaped and declares at least one property.
 * @param schema The sly_data_schema as received from the server. May be anything.
 * @returns The validated root node, or null when the schema is absent or unusable.
 */
const parseSchemaRoot = (schema: unknown): SchemaNodeType | null => {
    if (schema === undefined || schema === null) {
        return null
    }

    const parsed = SchemaNode.safeParse(schema)
    if (!parsed.success || !isObjectNode(parsed.data) || Object.keys(parsed.data.properties ?? {}).length === 0) {
        // A bad schema is the network author's bug, not the user's: degrade to the schema-less experience.
        console.warn("Ignoring unusable sly_data_schema:", schema)
        return null
    }

    return parsed.data
}

/**
 * Lists the top-level sly_data keys a network advertises, for display to the user.
 * @param schema The network's sly_data_schema, as returned by the function endpoint. May be anything.
 * @param excludeKeys Keys to leave out: the ones the UI itself supplies at send time (API keys, login...), which
 * the user should not be prompted for.
 * @returns One entry per declared key in declaration order, or an empty array when the schema is unusable.
 */
export const describeSlyDataSchema = (
    schema: unknown,
    excludeKeys: readonly string[] = []
): readonly SlyDataSchemaEntry[] => {
    const root = parseSchemaRoot(schema)
    if (root === null) {
        return []
    }

    const required = new Set(root.required)

    return Object.entries(root.properties)
        .filter(([key]: [string, SchemaNodeType]) => !excludeKeys.includes(key))
        .map(([key, node]: [string, SchemaNodeType]) => ({
            description: node.description,
            isRequired: required.has(key),
            key,
            type: node.type ?? (isObjectNode(node) ? "object" : undefined),
        }))
}

/**
 * Produces the template value for one schema node, folding in whatever the user already has.
 * An existing value always wins -- even one that contradicts the schema -- because a template must never
 * destroy user input. Objects are merged recursively so a partially-filled nested value gains its missing keys.
 * @param node The schema node describing this value.
 * @param existing The value currently at this position, or undefined if there is none.
 * @param depth How many object levels deep this node is, for the recursion cap.
 * @returns The existing value, or a default appropriate for the declared type when there is none.
 */
const templateValue = (node: SchemaNodeType, existing: unknown, depth: number): unknown => {
    if (isObjectNode(node)) {
        if (existing !== undefined && (existing === null || typeof existing !== "object" || Array.isArray(existing))) {
            return existing
        }

        if (depth >= MAX_TEMPLATE_DEPTH) {
            return existing ?? {}
        }

        const merged: SlyData = {...(existing as SlyData)}
        Object.entries(node.properties ?? {}).forEach(([key, child]: [string, SchemaNodeType]) => {
            merged[key] = templateValue(child, merged[key], depth + 1)
        })
        return merged
    }

    if (existing !== undefined) {
        return existing
    }

    if (node.type === "string") {
        return ""
    }
    if (INT_TYPES.has(node.type) || FLOAT_TYPES.has(node.type)) {
        return 0
    }
    if (BOOL_TYPES.has(node.type)) {
        return false
    }

    // A type we do not understand: null marks "fill me in" without guessing a shape
    return null
}

/**
 * Builds a sly_data skeleton from the network's schema, layered under the user's existing values.
 * @param schema The network's sly_data_schema. May be anything; an unusable schema returns `existing` untouched.
 * @param existing The current sly_data. Every existing key survives verbatim; the template only adds what is missing.
 * @param excludeKeys Top-level keys never to seed: the ones the UI supplies at send time. Keeping these out matters
 * for more than tidiness -- `llm_config` holds API keys, which must never be led into the persistent store.
 * @returns A new object; the input is not mutated.
 */
export const buildSlyDataTemplate = (
    schema: unknown,
    existing: SlyData,
    excludeKeys: readonly string[] = []
): SlyData => {
    const root = parseSchemaRoot(schema)
    if (root === null) {
        return existing
    }

    const merged: SlyData = {...existing}
    Object.entries(root.properties)
        .filter(([key]: [string, SchemaNodeType]) => !excludeKeys.includes(key))
        .forEach(([key, node]: [string, SchemaNodeType]) => {
            merged[key] = templateValue(node, merged[key], 1)
        })

    return merged
}
