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
import 'echarts-gl'

/**
 * This component generates a 3D surface plot.
 * 
 * It only works for the case of 3 outcomes. For experiments with anything other than 3 outcomes, other kinds of plots
 * needs to be used.
 *
 * @param props See {@link ParetoPlotProps} for details.
 */
export function SurfacePlot3D(props: ParetoPlotProps): JSX.Element {
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
            selectedCIDStateUpdator(params.data[params.data.length - 1])
        }
        : () => {
            sendNotification(NotificationType.error, "Model Selection Error",
                "Only models from the last generation can be used with the decision interface")
        }
        
    // Need to have objectives as (x, y, z) coordinates for plotting
    genData.data.forEach(row => {
        row.x = row.objective0
        row.y = row.objective1
        row.z = row.objective2
    })
    
    const plotData = genData.data.map(row => [row.objective0, row.objective1, row.objective2, row.cid])
    
    const options: EChartsOption = {
        xAxis3D: {
            type: 'value',
            name: objectives[0],
            min: (minMaxPerObjective.objective0.min  * (1 - scalePadding)).toFixed(2),
            max: (minMaxPerObjective.objective0.max  * (1 + scalePadding)).toFixed(2),
        },
        yAxis3D: {
            type: 'value',
            name: objectives[1],
            min: (minMaxPerObjective.objective1.min  * (1 - scalePadding)).toFixed(2),
            max: (minMaxPerObjective.objective1.max  * (1 + scalePadding)).toFixed(2),
        },
        zAxis3D: {
            type: 'value',
            name: objectives[2],
            min: (minMaxPerObjective.objective2.min  * (1 - scalePadding)).toFixed(2),
            max: (minMaxPerObjective.objective2.max  * (1 + scalePadding)).toFixed(2),
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
    };

    const plot =
        <div id="surface-plot-div" style={{height: "100%"}}>
            <ReactEcharts   // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // ReactEcharts lacks an id attribute
                style={{height: "100%"}}
                option={options}
                onEvents={{click: onChartClick}}
            />
        </div>

    return <>
        <GenerationsAnimation
            id="generations-animation-3d"
            NumberOfGenerations={numberOfGenerations}
            Plot={plot}
            SetSelectedGen={(gen: number) => setSelectedGen(gen)}
            SelectedGen={selectedGen}
            ShowAllGenerations={false}
            FrameDelayMs={1000}
        />
    </>
}
