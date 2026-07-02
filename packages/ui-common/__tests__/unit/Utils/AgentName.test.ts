/*
Unit tests for the "agent name" manipulation module
 */

// eslint-disable-next-line no-shadow
import {describe, expect, it} from "vitest"

import {withStrictMocks} from "../../../../../__tests__/common/vitest/strictMocks"
import {
    cleanUpAgentName,
    filenameToNetworkName,
    networkNamesConflict,
    networkNameToApiName,
    nextAvailableNetworkName,
    normalizeNetworkNameForComparison,
    removeTrailingUuid,
    toDisplayName,
} from "../../../utils/AgentName"

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

describe("filenameToNetworkName", () => {
    withStrictMocks()

    it.each([
        {
            name: "converts an underscore filename to a spaced, capitalized name",
            filename: "ecommerce_support.json",
            expected: "Ecommerce Support",
        },
        {name: "converts a hyphenated filename", filename: "my-network.json", expected: "My Network"},
        {name: "handles a filename with no extension", filename: "mynetwork", expected: "Mynetwork"},
        {
            name: "strips a trailing UUID from the filename",
            filename: "autonomous_venture_studio_ops_683b0dfb_4816_464d_9c83_7e59ce6497d3.json",
            expected: "Autonomous Venture Studio Ops",
        },
        {
            name: "keeps a normal filename unchanged aside from formatting",
            filename: "my_network.json",
            expected: "My Network",
        },
    ])("$name", ({filename, expected}) => {
        expect(filenameToNetworkName(filename)).toBe(expected)
    })

    it.each([
        {
            name: "returns the raw stem verbatim, without beautifying",
            filename: "ecommerce_support.json",
            expected: "ecommerce_support",
        },
        {
            name: "keeps a trailing UUID on the stem",
            filename: "autonomous_venture_studio_ops_683b0dfb_4816_464d_9c83_7e59ce6497d3.json",
            expected: "autonomous_venture_studio_ops_683b0dfb_4816_464d_9c83_7e59ce6497d3",
        },
    ])("with useNativeNames on: $name", ({filename, expected}) => {
        expect(filenameToNetworkName(filename, true)).toBe(expected)
    })
})

describe("networkNameToApiName", () => {
    withStrictMocks()

    it.each([
        {name: "replaces spaces with underscores", input: "My Network", expected: "My_Network"},
        {name: "drops the parentheses around an appended index", input: "My Network (2)", expected: "My_Network_2"},
        {name: "trims surrounding whitespace", input: "  My Network  ", expected: "My_Network"},
    ])("$name", ({input, expected}) => {
        expect(networkNameToApiName(input)).toBe(expected)
    })
})

describe("normalizeNetworkNameForComparison", () => {
    withStrictMocks()

    it("collapses separators, parentheses and case so display and API forms match", () => {
        expect(normalizeNetworkNameForComparison("My Network (2)")).toBe("my network 2")
        expect(normalizeNetworkNameForComparison("My_Network_2")).toBe("my network 2")
        expect(normalizeNetworkNameForComparison("MY-NETWORK-(2)")).toBe("my network 2")
    })
})

describe("networkNamesConflict", () => {
    withStrictMocks()

    it("treats display and API forms of the same name as conflicting", () => {
        expect(networkNamesConflict("My Network (2)", "My_Network_2")).toBe(true)
    })

    it("returns false for distinct names", () => {
        expect(networkNamesConflict("My Network", "Other Network")).toBe(false)
    })
})

describe("nextAvailableNetworkName", () => {
    withStrictMocks()

    it.each([
        {
            name: "appends ' (2)' when only the base name is taken",
            existing: ["My Network"],
            expected: "My Network (2)",
        },
        {
            name: "skips to the next free index when ' (2)' is also taken",
            existing: ["My Network", "My Network (2)"],
            expected: "My Network (3)",
        },
        {
            name: "starts at ' (2)' even when the base name itself is free",
            existing: ["Something Else"],
            expected: "My Network (2)",
        },
        {
            name: "compares names ignoring separators and case",
            existing: ["my_network", "MY-NETWORK-(2)"],
            expected: "My Network (3)",
        },
    ])("$name", ({existing, expected}) => {
        expect(nextAvailableNetworkName("My Network", existing)).toBe(expected)
    })
})
