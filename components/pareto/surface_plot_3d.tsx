import React from "react"

// ECharts
import {EChartsOption} from "echarts-for-react/src/types"
// This is a load-bearing import. Even though it doesn't appear to be used, it _has_ to be here or else the 3D
// surface plot just plain will not show up.
import 'echarts-gl'

import {cloneDeep} from "lodash"

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
export function SurfacePlot3D(props: ParetoPlotProps): JSX.Element {
    // Make a deep copy as we will be modifying it (adding x and y values for plot)
    const paretoClone = cloneDeep(props.Pareto)

    const paretoPlotProps: ParetoPlotProps = {
        ...props,
        Pareto: paretoClone
    }

    // How much to extend axes above and below min/max values
    const scalePadding = 0.05

    const optionsGenerator: EChartsOption = function (genData, objectives, minMaxPerObjective, selectedGen) {
        const plotData = genData.map(row => [row.objective0, row.objective1, row.objective2, row.cid])
        
        // Need to have objectives as (x, y, z) coordinates for plotting
        genData.forEach(row => {
            row.x = row.objective0
            row.y = row.objective1
            row.z = row.objective2
        })
        
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
                }
            },
            series: [
                {
                    name: `Generation ${selectedGen}`,
                    type: 'surface',
                    data: plotData,
                    itemStyle: {
                        borderWidth: 2,
                        borderColor: "black",
                        opacity: 1,
                    }
                }
            ],
            tooltip: {
                trigger: "item",
                formatter: (params) => {
                    return params.value
                        .filter(k => k !== "cid")
                        .map((value, idx) => `${objectives[idx] || "prescriptor"}: ${value.toString()}`)
                        .join("<br />")
                },
            },
        }
    }

    return <div id="surface-plot-div" style={{height: "100%"}}>
                <EchartParetoPlot
                    id="surface-plot"
                    style={{height: "100%"}}
                    optionsGenerator={optionsGenerator}
                    paretoProps={paretoPlotProps}
                    objectivesCount={props.ObjectivesCount}
                    minObjectives={3}
                    maxObjectives={3}
                />
            </div>
}
