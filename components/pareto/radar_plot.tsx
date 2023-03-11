import React from "react"
import {useMemo} from "react"
import {useState} from "react"

import {ParetoPlotProps} from "./types"
import {GenerationsAnimation} from "./generations_animation"
import ReactEcharts from "echarts-for-react";
import {EChartsOption} from "echarts-for-react/src/types"
import {sendNotification} from "../../controller/notification"
import {NotificationType} from "../../controller/notification"
import {cloneDeep} from "lodash"

// This is a load-bearing import. Even though it doesn't appear to be used, it _has_ to be here or else the 3D
// surface plot just plain will not show up.

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
    // Make a deep copy as we will be modifying it (adding x and y values for plot)
    const pareto = cloneDeep(props.Pareto)

    const objectives = pareto[Object.keys(pareto)[0]].objectives

    const prescriptorNodeId = Object.keys(pareto)[0]

    // For now, only one prescriptor per experiment supported, so grab [0]
    const data = pareto[Object.keys(pareto)[0]].data

    const numberOfGenerations = useMemo(function () {
        return data.length
    }, [])

    // Generation for which we are displaying data. Default to last generation.
    const [selectedGen, setSelectedGen] = useState(numberOfGenerations)

    if (props.ObjectivesCount !== 3) {
        return <>SurfacePlot3D display is only valid for 3 objectives</>
    }
    
    const genData = data.find( item => item.id === `Gen ${selectedGen || 1}`)

    // Calculate min and max values for each objective across all generations. This allows us to scale the chart
    // appropriately for the animation.
    const minMaxPerObjective = Object.fromEntries(objectives.map((objective, idx) => {
        const minObjectiveValue = Math.min(...data.flatMap(gen => gen.data.map(cid => cid[`objective${idx}`])))
        const maxObjectiveValue = Math.max(...data.flatMap(gen => gen.data.map(cid => cid[`objective${idx}`])))
        return [
            `objective${idx}`,
            {
                min: minObjectiveValue,
                max: maxObjectiveValue
            }
        ]
    }))

    // How much to extend axes above and below min/max values
    const scalePadding = 0.05

    function selectedCIDStateUpdator(cid: string) {
        return props.PrescriptorNodeToCIDMapUpdater(value => {
            return {
                ...value,
                [prescriptorNodeId]: cid
            }
        })
    }

    // On Click handler - only rendered at the last generation as those are the
    // candidates we persist.
    // The default click handler shows the Notification if the selected Candidate is not of the last generation - we
    // cannot yet perform inference on those as those don't exist.
    const onChartClick: (params) => void = selectedGen === numberOfGenerations ?
        params => {
            // Bit hacky -- assume that CID (prescriptor ID) is the last item in params. Which is should be unless
            // the API changes, but there's no doubt a better way to do this.
            const selectedCID = params.data.value[params.data.value.length - 1]
            selectedCIDStateUpdator(selectedCID)
        }
        : () => {
            sendNotification(NotificationType.error, "Model Selection Error",
                "Only models from the last generation can be used with the decision interface")
        }

    const options: EChartsOption = {
        radar: {
            shape: 'circle',
            indicator: Object.keys(genData.data[0])
                            .filter(k => k !== "cid")
                            .map((key, idx) => ({ 
                                name: objectives[idx],
                                min: minMaxPerObjective[key].min  * (1 - scalePadding),
                                max: minMaxPerObjective[key].max  * (1 + scalePadding)
                            })),
            radius: "80%"
        },
        series: [
            {
                name: `Generation ${selectedGen}`,
                type: 'radar',
                data: genData.data.map(row => ({
                    value: Object.values(row),
                    name: row.cid
                }))
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

    const plot =
        <div id="radar-plot-div" style={{height: "100%"}}>
            <ReactEcharts   // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // ReactEcharts lacks an id attribute
                style={{height: "100%"}}
                option={options}
                onEvents={{click: onChartClick}}
            />
        </div>

    return <>
        <GenerationsAnimation
            id="generations-animation-radar"
            NumberOfGenerations={numberOfGenerations}
            Plot={plot}
            SetSelectedGen={(gen: number) => setSelectedGen(gen)}
            SelectedGen={selectedGen}
            ShowAllGenerations={false}
            FrameDelayMs={500}
        />
    </>
}
