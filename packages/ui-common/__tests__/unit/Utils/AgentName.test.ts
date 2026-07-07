/*
Unit tests for the "agent name" manipulation module
 */

// eslint-disable-next-line no-shadow
import {describe, expect, it} from "vitest"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {cleanUpAgentName, removeTrailingUuid, toDisplayName} from "../../../utils/AgentName"

describe("removeTrailingUuid", () => {
    withStrictMocks()

    it("strips a trailing hyphen-delimited UUID", () => {
        expect(removeTrailingUuid("copy_cat-hello_world-14ecb260-4389-44f3-afad-ea315dfa1966")).toBe(
            "copy_cat-hello_world"
        )
    })

    it("strips a trailing underscore-delimited UUID (sanitized filename form)", () => {
        expect(removeTrailingUuid("my_network_683b0dfb_4816_464d_9c83_7e59ce6497d3")).toBe("my_network")
    })

    it("leaves a name without a trailing UUID unchanged", () => {
        expect(removeTrailingUuid("my_network")).toBe("my_network")
    })

    it("only strips a UUID at the very end", () => {
        expect(removeTrailingUuid("14ecb260-4389-44f3-afad-ea315dfa1966_suffix")).toBe(
            "14ecb260-4389-44f3-afad-ea315dfa1966_suffix"
        )
    })
})

describe("cleanUpAgentName", () => {
    withStrictMocks()

    it.each([
        {input: "foo_bar", expected: "Foo Bar"},
        {input: "my_network", expected: "My Network"},
        {input: "my-network", expected: "My Network"},
    ])("converts $input to $expected", ({input, expected}) => {
        expect(cleanUpAgentName(input)).toBe(expected)
    })
})

describe("toDisplayName", () => {
    withStrictMocks()

    it("strips a trailing UUID and title-cases the rest", () => {
        expect(toDisplayName("my_network_683b0dfb_4816_464d_9c83_7e59ce6497d3")).toBe("My Network")
    })

    it("returns the raw name verbatim when useNativeNames is on", () => {
        expect(toDisplayName("my_network_683b0dfb_4816_464d_9c83_7e59ce6497d3", true)).toBe(
            "my_network_683b0dfb_4816_464d_9c83_7e59ce6497d3"
        )
    })
})
