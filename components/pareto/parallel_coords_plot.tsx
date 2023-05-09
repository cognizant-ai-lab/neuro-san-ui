import {EChartsOption} from "echarts-for-react/src/types"

import {ParetoPlotProps} from "./types"
import {EchartParetoPlot} from "./echart_pareto_plot"
import {getDataTable} from "./utils.js"

/**
 * This component generates a parallel coordinates plot. See {@link https://en.wikipedia.org/wiki/Parallel_coordinates}
 * for details.
 * 
 * @param props See {@link ParetoPlotProps} for details.
 */
export function ParallelCoordsPlot(props: ParetoPlotProps): JSX.Element {
    // How much to extend axes above and below min/max values
    const scalePadding = 0.05

    const optionsGenerator: EChartsOption = function (genData, objectives, minMaxPerObjective) {
        const plotData = genData.map(row => ({
                name: row.cid,
                value: Object.values(row)
            })
        )
        
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
            parallel: {
                left: "5%",                     // Location of parallel coordinate system.
                right: "5%",
                bottom: "50%",
                top: "15%",
                height: "400px",
                parallelAxisDefault: {          // A pattern for axis definition, which can avoid repeating in `parallelAxis`.
                    type: 'value',
                    nameLocation: 'end',
                    nameGap: 20
                }
            },
            // Use first data item to get list of objectives. Skip "cid" as it isn't a real data item.
            // Generate a parallel axis for each objective with a suitable range.
            parallelAxis: Object.keys(genData[0]).filter(k => k !== "cid").map((key, idx) => {
                return {
                    dim: key,
                    name: objectives[idx],
                    type: "value",
                    min: (minMaxPerObjective[key].min * (1 - scalePadding)).toFixed(2),
                    max: (minMaxPerObjective[key].max * (1 + scalePadding)).toFixed(2)
                };
            }),
            series: [
                {
                    type: "parallel",
                    data: plotData,
                    lineStyle: {
                        normal: {
                            type: "gradient",
                            width: 2,
                            opacity: 0.5,
                        },
                    },
                    colorBy: "data",
                    emphasis: {
                        lineStyle: {
                            width: 4,
                        },
                    },
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
    
    return <div id="parcoords-plot-div" style={{height: "100%"}}>
        <EchartParetoPlot
            id="parcoords-plot"
            style={{height: "100%"}}
            optionsGenerator={optionsGenerator}
            paretoProps={props}
            objectivesCount={props.ObjectivesCount}
            minObjectives={2}
        />
    </div>
}
