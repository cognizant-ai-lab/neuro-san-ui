import ReactEcharts from "echarts-for-react"
import {Table} from "evergreen-ui"
import {FiAlertCircle} from "react-icons/fi"

import NewBar from "./newbar"
import {calculateMinMax} from "./pareto/utils"

interface EspRunPlotProps {
    id: string
    readonly PrescriptorRunData
}

export default function ESPRunPlot(props: EspRunPlotProps) {
    const prescriptorRunData = props.PrescriptorRunData
    const nodes: string[] = Object.keys(prescriptorRunData)
    const shouldRender = Object.keys(prescriptorRunData).length

    const nodePlots = []
    nodes.forEach((nodeID) => {
        const objectives: string[] = Object.keys(prescriptorRunData[nodeID])

        const cells = []
        objectives.forEach((objective) => {
            // Create a plot for each objective. Each objective will have min, max, mean across generations.
            const objectiveData = prescriptorRunData[nodeID][objective]

            const minAllGenerations = Math.min.apply(
                null,
                objectiveData.flatMap((row: {data: {y: number}[]}) => row.data.map((datum: {y: number}) => datum.y))
            )
            const maxAllGenerations = Math.max.apply(
                null,
                objectiveData.flatMap((row: {data: {y: number}[]}) => row.data.map((datum: {y: number}) => datum.y))
            )

            const objectiveMinMax = calculateMinMax(minAllGenerations, maxAllGenerations)
            const objectiveMetricGraphLabelId = `${objective}-metric-graph-label`
            const options = {
                xAxis: {
                    type: "value",
                    name: "Generation",
                    nameLocation: "middle",
                },
                yAxis: {
                    type: "value",
                    min: objectiveMinMax.niceMin.toPrecision(5),
                    max: objectiveMinMax.niceMax.toPrecision(5),
                    interval: objectiveMinMax.tickSpacing,
                },
                series: objectiveData.map((anObjective) => ({
                    data: anObjective.data.map((row) => ({
                        name: row.id,
                        value: [row.x, row.y],
                        symbolSize: 8,
                    })),
                    name: anObjective.id,
                    type: "line",
                    smooth: true,
                })),
                legend: {
                    right: "0%",
                    top: "0%",
                    selectedMode: false,
                    animation: false,
                    orient: "vertical",
                    type: "plain",
                },
                tooltip: {
                    trigger: "item",
                    formatter: (params) => {
                        return [
                            params.seriesName,
                            `Generation: ${params.data.value[0]}`,
                            `Value: ${params.data.value[1]}`,
                        ].join("<br />")
                    },
                    axisPointer: {
                        type: "cross",
                        crossStyle: {
                            color: "#97999B",
                            type: "dashed",
                        },
                    },
                },
            }

            cells.push(
                <Table.Row
                    id={`objective-row-${objectiveMetricGraphLabelId}`}
                    style={{height: "100%"}}
                    key={`${nodeID}-${objective}`}
                >
                    <Table.TextCell id={objectiveMetricGraphLabelId}>{objective}</Table.TextCell>
                    <Table.TextCell id={`graph-${objectiveMetricGraphLabelId}`}>
                        <div
                            id={`graph-div-${objectiveMetricGraphLabelId}`}
                            style={{height: "35rem", width: "100%"}}
                        >
                            <ReactEcharts // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // ReactEcharts lacks an id attribute
                                style={{height: "100%"}}
                                option={options}
                            />
                        </div>
                    </Table.TextCell>
                </Table.Row>
            )
        })

        nodePlots.push(
            <div id={`node-id-div-${nodeID}`}>
                <p id={`node-id-name-${nodeID}`}>Node ID: {nodeID}</p>
                <Table.Body id={`node-id-body-${nodeID}`}>
                    <Table.Head id={`node-id-headers-${nodeID}`}>
                        <Table.TextCell id={`node-id-objective-${nodeID}`}>Objective</Table.TextCell>
                        <Table.TextCell id={`node-id-plot-${nodeID}`}>Plot</Table.TextCell>
                    </Table.Head>
                    <Table.Body id={`node-id-${nodeID}-cells`}>{cells}</Table.Body>
                </Table.Body>
            </div>
        )
    })

    const propsId = props.id

    return (
        <>
            {shouldRender ? (
                <div id={propsId}>
                    <NewBar
                        id="prescriptor-metrics-bar"
                        InstanceId="prescriptor-metrics"
                        Title="Prescriptor Metrics"
                        DisplayNewLink={false}
                    />
                    <br id="prescriptor-plot-br" />
                    {nodePlots && nodePlots.length > 0 ? (
                        nodePlots
                    ) : (
                        <>
                            <span
                                id="prescriptor-metrics-span"
                                style={{display: "flex"}}
                            >
                                <FiAlertCircle
                                    id="prescriptor-metrics-dot"
                                    color="var(--bs-red)"
                                    size={50}
                                />
                                <span
                                    id="prescriptor-metrics-none-found"
                                    className="ml-4 fs-4 my-auto"
                                >
                                    No prescriptors found.
                                </span>
                                <div
                                    id="prescriptor-metrics-break"
                                    className="break"
                                />
                            </span>
                            <br id="prescriptor-metrics-instructions" />
                            Navigate to the Runs table and view the error logs for your Run to see what went wrong.
                        </>
                    )}
                </div>
            ) : null}
        </>
    )
}

ESPRunPlot.authRequired = true
