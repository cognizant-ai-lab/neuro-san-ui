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
    const selectedCID = props.NodeToCIDMap[prescriptorNodeId]
    
    // For now, only one prescriptor per experiment supported, so grab [0]
    const data = pareto[Object.keys(pareto)[0]].data

    const numberOfGenerations = useMemo(function () {
        return data.length
    }, [])

    // Generation for which we are displaying data. Default to last generation.
    const [selectedGen, setSelectedGen] = useState(numberOfGenerations)

    const genData = data.find( item => item.id === `Gen ${selectedGen || 1}`)
    
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
    
    interface Props {
        data: Array<Record<string, number>>
    }

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

    const ParallelCoordinatesChart: React.FC<Props> = ({ data }) => {
        const option: EChartsOption = {
            animation: false,
            // Use first data item to get list of objectives. Skip "cid" as it isn't a real data item.
            parallelAxis: Object.keys(data[0]).filter(k => k !== "cid").map((key, idx) => {
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
                    data: data.map((d) => Object.values(d)),
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
            
        };

        return <ReactEcharts 
            option={option} 
            onEvents={{click: onChartClick}} 
            style={{height: "600px"}}
        />
    };

    const plot = <ParallelCoordinatesChart data={genData.data}/>
    
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
