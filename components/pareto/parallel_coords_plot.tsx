import React from "react"
import {useMemo} from "react"
import {useState} from "react"

import {ParetoPlotProps} from "./types"
import {GenerationsAnimation} from "./generations_animation"
import ReactEcharts from "echarts-for-react";
import {EChartsOption} from "echarts-for-react/src/types"
import {sendNotification} from "../../controller/notification"
import {NotificationType} from "../../controller/notification"

/**
 * This component generates a parallel coordinates plot. See {@link https://en.wikipedia.org/wiki/Parallel_coordinates}
 * for details.
 * 
 * @param props See {@link ParetoPlotProps} for details.
 */
export function ParallelCoordsPlot(props: ParetoPlotProps): JSX.Element {
    const pareto = props.Pareto
    
    const objectives = pareto[Object.keys(pareto)[0]].objectives
    
    const prescriptorNodeId = Object.keys(pareto)[0]
    
    // For now, only one prescriptor per experiment supported, so grab [0]
    const data = pareto[Object.keys(pareto)[0]].data

    const numberOfGenerations = useMemo(function () {
        return data.length
    }, [])

    // Generation for which we are displaying data. Default to last generation.
    const [selectedGen, setSelectedGen] = useState(numberOfGenerations)

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

    const selectedCIDStateUpdator = (cid: string) =>
        props.PrescriptorNodeToCIDMapUpdater(value => {
            return {
                ...value,
                [prescriptorNodeId]: cid
            }
        })
    
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
        
    const option: EChartsOption = {
        animation: false,
        parallel: {
            left: "5%",                     // Location of parallel coordinate system.
            right: "5%",
            bottom: "50%",
            top: "15%",
            height: "350px",
            parallelAxisDefault: {          // A pattern for axis definition, which can avoid repeating in `parallelAxis`.
                type: 'value',
                nameLocation: 'end',
                nameGap: 20
            }    
        },
        // Use first data item to get list of objectives. Skip "cid" as it isn't a real data item.
        // Generate a parallel axis for each objective with a suitable range.
        parallelAxis: Object.keys(genData.data[0]).filter(k => k !== "cid").map((key, idx) => {
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
                data: genData.data.map((d) => Object.values(d)),
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
                return params.value.filter(k => k !== "cid").map((value, idx) => `${objectives[idx] || "prescriptor"}: ${value.toString()}`).join("<br />")
            },
        },
    }

    const plot =
        <div style={{height: "100%"}}>
            <ReactEcharts
                style={{height: "100%"}}
                option={option}
                onEvents={{click: onChartClick}}
            />
        </div>

    return <>
        <GenerationsAnimation 
            id="generations-animation" 
            NumberOfGenerations={numberOfGenerations} 
            Plot={plot}  
            SetSelectedGen={(gen: number) => setSelectedGen(gen)} 
            SelectedGen={selectedGen}
            ShowAllGenerations={false}
        />
    </>
}
