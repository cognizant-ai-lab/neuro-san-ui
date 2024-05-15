import {EChartsOption} from "echarts-for-react/src/types"

import {EchartParetoPlot} from "./echart_pareto_plot"
import {ParetoPlotProps} from "./types"
import {calculateMinMax, getDataTable} from "./utils"

/**
 * This component generates a radar plot. See {@link https://en.wikipedia.org/wiki/Radar_chart}
 * for details.
 *
 * It only works for the case of 3 outcomes. For experiments with anything other than 3 outcomes, other kinds of plots
 * needs to be used.
 *
 * @param props See {@link ParetoPlotProps} for details.
 */
export function RadarPlot(props: ParetoPlotProps): JSX.Element {
    const optionsGenerator: EChartsOption = function (genData, objectives, minMaxPerObjective, selectedGen) {
        const plotData = genData.map((row) => ({
            name: row.cid,
            value: Object.values(row),
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
                        },
                    },
                },
            },
            animation: false,
            radar: {
                shape: "circle",
                indicator: Object.keys(genData[0])
                    .filter((k) => k !== "cid")
                    .map((key, idx) => {
                        const paddedMinMax = calculateMinMax(
                            minMaxPerObjective[key].min,
                            minMaxPerObjective[key].max,
                            10
                        )
                        return {
                            name: objectives[idx],
                            min: paddedMinMax.niceMin.toPrecision(5),
                            max: paddedMinMax.niceMax.toPrecision(5),
                            interval: paddedMinMax.tickSpacing,
                        }
                    }),
                radius: "80%",
            },
            series: [
                {
                    name: `Generation ${selectedGen}`,
                    type: "radar",
                    data: plotData,
                },
            ],
            tooltip: {
                trigger: "item",
                formatter: (params) => {
                    return params.value
                        .filter((k) => k !== "cid")
                        .map((value, idx) => `${objectives[idx] || "prescriptor"}: ${value.toString()}`)
                        .join("<br />")
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
            />
        </div>
    )
}
