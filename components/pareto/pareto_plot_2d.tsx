import {EChartsOption} from "echarts-for-react/src/types"

import {ParetoPlotProps} from "./types"
import {EchartParetoPlot} from "./echart_pareto_plot"
import {getDataTable} from "./utils"
import {useMemo} from "react";

/**
 * This function generates a 2-dimensional pareto plot.
 * 
 * It only works for the case of 2outcomes. For experiments with anything other than 3 outcomes, other kinds of plots
 * needs to be used.
 *
 * @param props See {@link ParetoPlotProps} for details.
 */
export function ParetoPlot2D(props: ParetoPlotProps): JSX.Element {
    // How much to extend axes above and below min/max values. For this plot, looks better not to pad so set to 0.
    const scalePadding = 0.0

    const pareto = props.Pareto

    // First (and only, for now) prescriptor node ID
    const firstPrescriptorNodeID = Object.keys(pareto)[0]

    // Associated prescriptor node
    const firstPrescriptorNode = pareto[firstPrescriptorNodeID]

    // Number of generations for this Run
    const numberOfGenerations = useMemo(function () {
        return firstPrescriptorNode.data.length
    }, [])

    const optionsGenerator: EChartsOption = function(genData, objectives, minMaxPerObjective, selectedGen) {
        const allGensSelected = selectedGen === numberOfGenerations + 1

        // If single generation selected, wrap that generation in an object, so we can treat it the same as the
        // "all generations" case.
        const plotData = allGensSelected ? genData : [{id: `Gen ${selectedGen}`, data: genData}]

        // Create 1 "series" per generation, meaning one line on the chart
        const series = plotData.map(generation => ({
            data: generation.data.map(row => ({
                name: row.cid,
                value: Object.values(row),
                itemStyle: {
                    color: "gray",
                    opacity: 0.50
                },
                symbolSize: 12
            })),
            type: "line",
            smooth: true,
            name: generation.id
        }))

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
                        }
                    },
                }
            },
            animation: false,
            xAxis: {
                type: "value",
                name: objectives[0],
                min: (minMaxPerObjective.objective0.min * (1 - scalePadding)).toFixed(2),
                max: (minMaxPerObjective.objective0.max * (1 + scalePadding)).toFixed(2),
            },
            yAxis: {
                type: "value",
                name: objectives[1],
                min: (minMaxPerObjective.objective1.min * (1 - scalePadding)).toFixed(2),
                max: (minMaxPerObjective.objective1.max * (1 + scalePadding)).toFixed(2),
            },
            series: series,
            legend: {
                right: "0%",
                top: '10%',
                selectedMode: false,
                animation: false,
                orient: "vertical",
                type: allGensSelected ? "scroll": "plain"
            },
            tooltip: {
                trigger: "item",
                formatter: (params) => {
                    return params.value
                        .filter(k => k !== "cid")
                        .map((value, idx) => `${objectives[idx] || "prescriptor"}: ${value.toString()}`)
                        .join("<br />")
                },
                axisPointer: {
                    type: "cross",
                    crossStyle: {
                        color: "#999",
                        type: "dashed"
                    }
                }
            },
    }}

    return  <div id="radar-plot-div" style={{height: "100%"}}>
                <EchartParetoPlot   
                    id="radar-plot"
                    style={{height: "100%"}}
                    optionsGenerator={optionsGenerator}
                    paretoProps={props}
                    objectivesCount={props.ObjectivesCount}
                    minObjectives={2}
                    maxObjectives={2}
                    showAllGenerations={true}
                />
            </div>
}
