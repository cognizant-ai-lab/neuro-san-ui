import {ConfigurableNodeState} from "../../components/Flow/nodes/generic/types"
import {addDisabledPropertyToOutcomes, getSelectedDataSource} from "../../components/Flow/nodes/utils"
import {DataTagField} from "../../generated/metadata"
import {TaggedDataInfo} from "../../pages/projects/[projectID]/experiments/new"

describe("getSelectedDataSource", () => {
    const MOCK_TAGGED_DATA_LIST = [
        {
            DataSource: {id: "1"},
            LatestDataTag: {},
        },
    ] as unknown as TaggedDataInfo[]
    it("should get the selected dataSource", () => {
        const selectedDataSource = getSelectedDataSource(MOCK_TAGGED_DATA_LIST, 1)
        expect(selectedDataSource).toEqual({
            DataSource: {id: "1"},
            LatestDataTag: {},
        })
    })

    it("should return undefined if the selected dataSource doesnt exist", () => {
        const selectedDataSource = getSelectedDataSource(MOCK_TAGGED_DATA_LIST, 100)
        expect(selectedDataSource).toEqual(undefined)
    })
})

describe("addDisabledPropertyToOutcomes", () => {
    const getParentNodeState = (selectedPredictorType) => ({
        selectedPredictorType,
        caoState: {
            outcome: {
                mockOutcome: true,
            },
        },
    })

    it("should disable if outcome is CONTINOUS and predictorType is classifier", () => {
        const fields = {
            mockOutcome: {
                valued: "CONTINUOUS",
            },
        } as unknown as {[key: string]: DataTagField}

        const parentNodeState = getParentNodeState("classifier")

        const outcomes = addDisabledPropertyToOutcomes(parentNodeState as unknown as ConfigurableNodeState, fields)
        expect(outcomes).toEqual({
            mockOutcome: {
                outcome: false,
                disabled: true,
            },
        })
    })

    it("should disable if outcome is CATEGORICAL and predictorType is regressor", () => {
        const fields = {
            mockOutcome: {
                valued: "CATEGORICAL",
            },
        } as unknown as {[key: string]: DataTagField}

        const parentNodeState = getParentNodeState("regressor")

        const outcomes = addDisabledPropertyToOutcomes(parentNodeState as unknown as ConfigurableNodeState, fields)
        expect(outcomes).toEqual({
            mockOutcome: {
                outcome: false,
                disabled: true,
            },
        })
    })

    it("should not disable if the conditions are not CATEGORICAL<->regressor or CONTINIUOUS<->classifier", () => {
        const fields = {
            mockField: {
                valued: "CATEGORICAL",
            },
        } as unknown as {[key: string]: DataTagField}

        const parentNodeState = getParentNodeState("classifier")

        const outcomes = addDisabledPropertyToOutcomes(parentNodeState as unknown as ConfigurableNodeState, fields)
        expect(outcomes).toEqual({
            mockOutcome: {
                outcome: true,
                disabled: false,
            },
        })
    })
})
