import {filterExtraFlowProps} from "../../controller/filterFlow"

describe("filterExtraFlowProps", () => {
    const MOCK_FLOW = JSON.stringify([
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
    ])

    it("should remove un-needed flow props", () => {
        const result = filterExtraFlowProps(MOCK_FLOW)

        expect(result).toEqual(
            JSON.stringify([
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
        )
    })
})
