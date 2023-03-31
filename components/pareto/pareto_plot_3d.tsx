import React from "react"

// ECharts
import {EChartsOption} from "echarts-for-react/src/types"
// This is a load-bearing import. Even though it doesn't appear to be used, it _has_ to be here or else the 3D
// surface plot just plain will not show up.
import 'echarts-gl'

import {ParetoPlotProps} from "./types"
import {EchartParetoPlot} from "./echart_pareto_plot"

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
    const scalePadding = 0.05

    const optionsGenerator: EChartsOption = function (genData, objectives, minMaxPerObjective, selectedGen) {
        const plotSubType = props.PlotSubtype ?? "surface"
        
        // Make it translucent for surface plot for easier viewing, but opaque for other plots like scatter & line.
        const opacity = plotSubType === "surface" ? 0.35 : 1.0

        // Desaturated red-pink, 35% opacity for surface plot
        const plotColor = `rgba(244, 118, 97, ${opacity})`
        
        // Extract the "x,y,z" coordinates from this generation's plot data
        const plotData = genData.map(row => ({
                name: row[3],
                value: Object.values(row),
                itemStyle: {
                    color: plotColor,
                },
            }) 
        )

        return {
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
                    projection: 'orthographic'
                },
                axisPointer: {
                    show: false
                }
            },
            series: [
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
            ],
            // Would like to have a legend: {} item here, but adding it causes a crash when user clicks on the plot.
            // "this.__layers is null" in the bowels of zrender (a lib used by Echart). Something to do with handling
            // of layers within the chart -- needs investigation (TODO).
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
                    style={{height: "100%"}}
                    optionsGenerator={optionsGenerator}
                    paretoProps={props}
                    objectivesCount={props.ObjectivesCount}
                    minObjectives={3}
                    maxObjectives={3}
                />
            </div>
}
