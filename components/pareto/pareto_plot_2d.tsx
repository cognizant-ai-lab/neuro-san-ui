import {EChartsOption} from "echarts-for-react/src/types"
import {useMemo} from "react"

import {EchartParetoPlot} from "./echart_pareto_plot"
import {ParetoPlotProps} from "./types"
import {calculateMinMax, getDataTable} from "./utils"

/**
 * This function generates a 2-dimensional pareto plot.
 *
 * It only works for the case of 2 outcomes. For experiments with anything other than 2 outcomes, other kinds of plots
 * needs to be used.
 *
 * @param props See {@link ParetoPlotProps} for details.
 */
export function ParetoPlot2D(props: ParetoPlotProps): JSX.Element {
    const pareto = props.Pareto

    // First (and only, for now) prescriptor node ID
    const firstPrescriptorNodeID = Object.keys(pareto)[0]

    // Associated prescriptor node
    const firstPrescriptorNode = pareto[firstPrescriptorNodeID]

    // Number of generations for this Run
    const numberOfGenerations = useMemo(() => {
        return firstPrescriptorNode.data.length
    }, [])

    const optionsGenerator: EChartsOption = function (genData, objectives, minMaxPerObjective, selectedGen) {
        const allGensSelected = selectedGen === numberOfGenerations + 1

        // If single generation selected, wrap that generation in an object, so we can treat it the same as the
        // "all generations" case.
        const plotData = allGensSelected ? genData : [{id: `Gen ${selectedGen}`, data: genData}]

        // Create 1 "series" per generation, meaning one line on the chart
        const series = plotData.map((generation) => ({
            data: generation.data.map((row) => ({
                name: row.cid,
                value: Object.values(row),
                itemStyle: {
                    color: "gray",
                    opacity: 0.5,
                },
                symbolSize: 12,
            })),
            type: "line",
            smooth: true,
            name: generation.id,
        }))

        const objective0MinMax = calculateMinMax(minMaxPerObjective.objective0.min, minMaxPerObjective.objective0.max)
        const objective1MinMax = calculateMinMax(minMaxPerObjective.objective1.min, minMaxPerObjective.objective1.max)

        return {
            toolbox: {
                // Add desired toolbox features
                feature: {
                    saveAsImage: {},
                    dataView: {
                        readOnly: true,
                        // optionToContent allows us to create a nicely formatted data table when the user clicks
                        // that tool.
                        optionToContent: function (opt) {
                            return getDataTable(opt.series[0].data, objectives)
                        },
                    },
                },
            },
            animation: false,
            xAxis: {
                type: "value",
                name: objectives[0],
                min: objective0MinMax.niceMin.toPrecision(5),
                max: objective0MinMax.niceMax.toPrecision(5),
                interval: objective0MinMax.tickSpacing,
            },
            yAxis: {
                type: "value",
                name: objectives[1],
                min: objective1MinMax.niceMin.toPrecision(5),
                max: objective1MinMax.niceMax.toPrecision(5),
                interval: objective1MinMax.tickSpacing,
            },
            series: series,
            legend: {
                right: "0%",
                top: "10%",
                selectedMode: false,
                animation: false,
                orient: "vertical",
                type: allGensSelected ? "scroll" : "plain",
            },
            tooltip: {
                trigger: "item",
                formatter: (params) => {
                    return params.value
                        .filter((k) => k !== "cid")
                        .map((value, idx) => `${objectives[idx] || "prescriptor"}: ${value.toString()}`)
                        .join("<br />")
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
    }

    return (
        <div
            id="radar-plot-div"
            style={{height: "100%"}}
        >
            <EchartParetoPlot
                id="radar-plot"
                optionsGenerator={optionsGenerator}
                paretoProps={props}
                objectivesCount={props.ObjectivesCount}
                minObjectives={2}
                maxObjectives={2}
                showAllGenerations={true}
            />
        </div>
    )
}
