import {cloneDeep} from "lodash"

import {Experiment} from "../../controller/experiments/types"
import {filterExtraFlowProps} from "../../controller/experiments/update"

describe("filterExtraFlowProps", () => {
    const mockFlow = [
        {
            data: {
                taggedDataList: [],
                taggedData: {},
                readOnlyNode: true,
                SelectedDataSourceId: "123",
                ParentNodeState: {
                    params: {
                        mockParam: {
                            mockVal: "1",
                            value: "3",
                            randomVal: "hi",
                        },
                    },
                },
            },
            animated: true,
        },
        {
            data: {
                ParentNodeState: {
                    params: {
                        mockParam: {
                            mockVal: "1",
                            default_value: "3",
                        },
                    },
                },
                SelectedDataSourceId: "123",
            },
            animated: true,
            type: "prescriptornode",
        },
        {
            data: {
                ParameterSet: {
                    mockParam: {
                        mockVal: "1",
                        default_value: "3",
                    },
                },
            },
            animated: true,
        },
    ]
    it("should remove un-needed flow props", () => {
        const experiment = {flow: JSON.stringify(cloneDeep(mockFlow))} as unknown as Experiment
        filterExtraFlowProps(experiment)

        expect(experiment.flow).toEqual([
            {
                data: {
                    SelectedDataSourceId: "123",
                    ParentNodeState: {
                        params: {
                            mockParam: {
                                value: "3",
                            },
                        },
                    },
                },
            },
            {
                data: {
                    ParentNodeState: {
                        params: {
                            mockParam: {
                                default_value: "3",
                            },
                        },
                    },
                },
                type: "prescriptornode",
            },
            {
                data: {
                    ParameterSet: {
                        mockParam: {
                            default_value: "3",
                        },
                    },
                },
            },
        ])
    })
})
