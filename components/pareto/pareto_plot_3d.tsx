import {useMemo} from "react"

// ECharts
import {EChartsOption} from "echarts-for-react/src/types"
// This is a load-bearing import. Even though it doesn't appear to be used, it _has_ to be here or else the 3D
// surface plot just plain will not show up.
import 'echarts-gl'

import {ParetoPlotProps} from "./types"
import {EchartParetoPlot} from "./echart_pareto_plot"
import {getDataTable} from "./utils"

/**
 * This component generates a 3D surface plot. 
 * See {@link https://en.wikipedia.org/w/index.php?title=Graph_of_a_function&useskin=vector#Functions_of_two_variables}
 * for details.
 * 
 * It only works for the case of 3 outcomes. For experiments with anything other than 3 outcomes, other kinds of plots
 * needs to be used.
 *
 * @param props See {@link ParetoPlotProps} for details.
 */
export function ParetoPlot3D(props: ParetoPlotProps): JSX.Element {

    // How much to extend axes above and below min/max values
    const scalePadding = 0.01

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
        const plotSubType = props.PlotSubtype ?? "surface"
        
        // Make it translucent for surface plot for easier viewing, but opaque for other plots like scatter & line.
        const opacity = plotSubType === "surface" ? 0.35 : 1.0

        // Desaturated red-pink, 35% opacity for surface plot
        const plotColor = `rgba(244, 118, 97, ${opacity})`
        
        // We want to show darker plot symbols for last gen to hint to the user that they are clickable
        const isLastGeneration = selectedGen === numberOfGenerations
        
        // Extract the "x,y,z" coordinates from this generation's plot data
        const plotData = genData.map(row => ({
                name: row.cid,
                value: Object.values(row),
                itemStyle: {
                    color: plotColor,
                },
            }) 
        )

        // Create the series data for the plot
        const series = [
            {
                name: `Generation ${selectedGen}`,
                type: plotSubType,
                data: plotData,
                itemStyle: {
                    borderWidth: 2,
                    borderColor: "black",
                    opacity: 1,
                },
                lineStyle: {
                    width: 4
                },
            }
        ]
        
        // For surface and line plots, overlay with a scatter plot so the points are obvious
        if (plotSubType === "surface" || plotSubType === "line3D") {
            series.push(
                {
                    name: `Generation ${selectedGen}`,
                    type: "scatter3D",
                    data: plotData,
                    itemStyle: {
                        borderWidth: 0.25,
                        borderColor: isLastGeneration ? "black" : "lightgray",
                        opacity: isLastGeneration ? 1.0 : 0.2,
                    },
                    lineStyle: {
                        width: 1,
                    },
                }    
            )
        }
        
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
            xAxis3D: {
                type: 'value',
                name: objectives[0],
                min: (minMaxPerObjective.objective0.min * (1 - scalePadding)).toFixed(2),
                max: (minMaxPerObjective.objective0.max * (1 + scalePadding)).toFixed(2),
            },
            yAxis3D: {
                type: 'value',
                name: objectives[1],
                min: (minMaxPerObjective.objective1.min * (1 - scalePadding)).toFixed(2),
                max: (minMaxPerObjective.objective1.max * (1 + scalePadding)).toFixed(2),
            },
            zAxis3D: {
                type: 'value',
                name: objectives[2],
                min: (minMaxPerObjective.objective2.min * (1 - scalePadding)).toFixed(2),
                max: (minMaxPerObjective.objective2.max * (1 + scalePadding)).toFixed(2),
            },
            grid3D: {
                viewControl: {
                    projection: 'orthographic',
                    zoomSensitivity: 0  // Disable mousewheel zooming on chart
                },
                axisPointer: {
                    show: false
                }
            },
            series: series,
            legend: {
                right: "25%",
                top: '10%',
                selectedMode: false,
                animation: false,
            },
            tooltip: {
                trigger: "item",
                formatter: (params) => {
                    return params.data.value
                        .filter(k => k !== "cid")
                        .map((value, idx) => `${objectives[idx] || "prescriptor"}: ${value.toString()}`)
                        .join("<br />")
                },
            },
            color: plotColor,
        }
    }

    return <div id="surface-plot-div" style={{height: "100%"}}>
                <EchartParetoPlot
                    id="surface-plot"
                    optionsGenerator={optionsGenerator}
                    paretoProps={props}
                    objectivesCount={props.ObjectivesCount}
                    minObjectives={3}
                    maxObjectives={3}
                />
            </div>
}
