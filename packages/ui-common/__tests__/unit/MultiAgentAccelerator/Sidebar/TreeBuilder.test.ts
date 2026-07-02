import {describe, expect, it} from "vitest"

import {withStrictMocks} from "../../../../../../__tests__/common/vitest/strictMocks"
import {
    AgentNetworkTreeItemModel,
    buildTreeViewItems,
    findTreeItemById,
} from "../../../../components/MultiAgentAccelerator/Sidebar/TreeBuilder"
import {AgentInfo} from "../../../../generated/neuro-san/NeuroSanClient"
import {TemporaryNetwork} from "../../../../state/TemporaryNetworks"

const makeAgent = (agentName: string, tags?: readonly string[]): AgentInfo => ({
    agent_name: agentName,
    tags,
})

const makeTempNetwork = (agentName: string, overrides: Partial<TemporaryNetwork> = {}): TemporaryNetwork => ({
    reservation: {
        reservation_id: agentName,
        lifetime_in_seconds: 300,
        expiration_time_in_seconds: 1_700_000_000,
    },
    agentInfo: {agent_name: agentName},
    agentNetworkName: agentName,
    networkHocon: null,
    ...overrides,
})

describe("TreeBuilder", () => {
    withStrictMocks()

    describe("buildTreeViewItems", () => {
        it("returns an empty tree when there are no networks", () => {
            expect(buildTreeViewItems(true)).toEqual([])
            expect(buildTreeViewItems(true, undefined, undefined)).toEqual([])
        })

        it("nests categorized networks and merges those sharing a category", () => {
            const tree = buildTreeViewItems(true, [makeAgent("retail/grocery/macys"), makeAgent("retail/target")])

            expect(tree).toHaveLength(1)
            const retail = tree[0]
            expect(retail).toMatchObject({id: "retail", isNetwork: false})
            expect(retail.children?.map((child) => child.id)).toEqual(["retail/grocery", "retail/target"])
            expect(findTreeItemById(tree, "retail/grocery/macys")).toMatchObject({isNetwork: true})
        })

        it("groups networks with no '/' under an 'uncategorized' folder, and omits it otherwise", () => {
            const mixed = buildTreeViewItems(true, [makeAgent("retail/macys"), makeAgent("macys")])
            const uncategorized = mixed.find((node) => node.id === "uncategorized")
            expect(uncategorized).toMatchObject({isNetwork: false})
            expect(uncategorized?.children?.[0].id).toBe("macys")

            const categorizedOnly = buildTreeViewItems(true, [makeAgent("retail/macys")])
            expect(categorizedOnly.some((node) => node.id === "uncategorized")).toBe(false)
        })

        it("sorts nodes and their children by display name", () => {
            const tree = buildTreeViewItems(true, [
                makeAgent("zoo/zebra"),
                makeAgent("zoo/antelope"),
                makeAgent("aviary/finch"),
            ])

            expect(tree.map((node) => node.id)).toEqual(["aviary", "zoo"])
            const zoo = tree.find((node) => node.id === "zoo")
            expect(zoo?.children?.map((child) => child.id)).toEqual(["zoo/antelope", "zoo/zebra"])
        })

        it("carries tags and icon suggestions onto the leaf", () => {
            const tree = buildTreeViewItems(true, [makeAgent("macys", ["retail"])], [], {macys: "Storefront"})

            expect(tree[0].children?.[0]).toMatchObject({tags: ["retail"], iconSuggestion: "Storefront"})
        })

        it("uses raw labels natively but cleans and strips trailing UUIDs otherwise", () => {
            const raw = "macys-14ecb260-4389-44f3-afad-ea315dfa1966"
            expect(buildTreeViewItems(true, [makeAgent("travel_agency_ops")])[0].children?.[0].displayName).toBe(
                "travel_agency_ops"
            )
            expect(buildTreeViewItems(false, [makeAgent("travel_agency_ops")])[0].children?.[0].displayName).toBe(
                "Travel Agency Ops"
            )
            expect(buildTreeViewItems(false, [makeAgent(raw)])[0].children?.[0].displayName).toBe("Macys")
        })

        it("does NOT disambiguate duplicate cleaned display names", () => {
            const tree = buildTreeViewItems(false, [makeAgent("retail/macys"), makeAgent("grocery/macys")])

            expect(tree.map((node) => node.children?.[0].displayName)).toEqual(["Macys", "Macys"])
        })

        it("maps temporary-network metadata onto the leaf", () => {
            const definition = [{origin: "front_man", display_as: "llm_agent"}]
            const tree = buildTreeViewItems(
                false,
                [],
                [makeTempNetwork("travel_agency_ops", {agentNetworkDefinition: definition})]
            )

            expect(tree[0].children?.[0]).toMatchObject({
                iconSuggestion: "HourglassTop",
                temporaryNetworkExpirationTime: new Date(1_700_000_000 * 1000),
                temporaryNetworkDefinition: definition,
                displayName: "Travel Agency Ops",
            })
        })
    })

    describe("findTreeItemById", () => {
        const tree: readonly AgentNetworkTreeItemModel[] = buildTreeViewItems(true, [makeAgent("retail/grocery/macys")])

        it("finds a deeply nested node", () => {
            expect(findTreeItemById(tree, "retail/grocery/macys")?.id).toBe("retail/grocery/macys")
        })

        it("returns undefined when no node matches", () => {
            expect(findTreeItemById(tree, "missing")).toBeUndefined()
            expect(findTreeItemById([], "retail")).toBeUndefined()
        })
    })
})
