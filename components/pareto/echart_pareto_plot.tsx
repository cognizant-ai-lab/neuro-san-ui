import React from "react"
import {useMemo} from "react"
import {useState} from "react"
import {CSSProperties} from "react"

import {ParetoPlotProps} from "./types"
import {GenerationsAnimation} from "./generations_animation"
import ReactEcharts from "echarts-for-react";
import {EChartsOption} from "echarts-for-react/src/types"
import {sendNotification} from "../../controller/notification"
import {NotificationType} from "../../controller/notification"

interface EchartPlotProps {
    // Component ID
    id: string
    
    /**
     Pareto front data. See {@link ParetoPlotProps} for more details.
     */
    paretoProps: ParetoPlotProps,
    
    // Number of objectives across all prescriptors (currently only one prescriptor supported)
    objectivesCount: number,
    
    // Min number of objectives for this plot type
    minObjectives?: number,

    // Max number of objectives for this plot type (or null if no limit)
    maxObjectives?: number,

    // Delay in milliseconds between animation frames when animating generations
    frameDelayMs?: number,
    
    // CSS style
    style: CSSProperties,
    
    // Options to pass to ECharts
    optionsGenerator: (genData, objectives, minMaxPerObjective, selectedGen) => EChartsOption
}

/**
 * This component wraps a generic EChart plot.
 *
 * @param props See {@link EchartPlotProps} for details.
 */
export function EchartParetoPlot(props: EchartPlotProps): JSX.Element {
    const pareto = props.paretoProps.Pareto

    // First (and only, for now) prescriptor node ID
    const firstPrescriptorNodeID = Object.keys(pareto)[0]

    // Associated presctriptor node
    const firstPrescriptorNode = pareto[firstPrescriptorNodeID]
    
    // Retrieve objectives
    const objectives = firstPrescriptorNode.objectives

    // Unpack params
    const minObjectives = props.minObjectives ?? 2
    const frameDelayMs = props.frameDelayMs ?? 50

    // For now, only one prescriptor per experiment supported, so grab [0]
    const data = firstPrescriptorNode.data

    // Number of generations for this Run
    const numberOfGenerations = useMemo(function () {
        return data.length
    }, [])

    // Build a cache of the results for each generation
    const cachedDataByGen = useMemo(function () {
        const gendata = {}
        for (const row of data) {
            gendata[row.id] = row.data
        }

        return gendata

    }, [data])

    // Maintain the state of the animation if its playing or not
    const [playing, setPlaying] = useState(false)

    // Generation for which we are displaying data. Default to last generation.
    const [selectedGen, setSelectedGen] = useState(numberOfGenerations)
    
    // Calculate min and max values for each objective across all generations (if playing animation) or for current
    // generation (if user is viewing a single generation). 
    // This allows us to scale the chart appropriately for the animation or for viewing a single generation
    const minMaxPerObjective = useMemo(function () {
        const genData = cachedDataByGen[`Gen ${selectedGen}`]
        return Object.fromEntries(objectives.map((objective, idx) => {
            const minObjectiveValue = playing 
                ? Math.min(...data.flatMap(gen => gen.data.map(cid => cid[`objective${idx}`]))) 
                : Math.min(...genData.map(row => row[`objective${idx}`]))
            const maxObjectiveValue = playing 
                ? Math.max(...data.flatMap(gen => gen.data.map(cid => cid[`objective${idx}`])))
                : Math.max(...genData.map(row => row[`objective${idx}`]))
            
            return [
                `objective${idx}`,
                {
                    min: minObjectiveValue,
                    max: maxObjectiveValue
                }
            ]
        }))
    }, [data, objectives, playing, selectedGen])

    // Make sure parent didn't use wrong kind of plot for number of objectives
    if (props.objectivesCount < minObjectives) {
        return <>{`This type of plot is only valid for ≥ ${minObjectives} objectives`}</>
    }

    if (props.maxObjectives && props.objectivesCount > props.maxObjectives) {
        return <>{`This type of plot is only valid for ≤ ${props.maxObjectives} objectives`}</>
    }

    // Get data for selected gen from cache
    const genData = cachedDataByGen[`Gen ${selectedGen}`]
    
    // Handle when user clicks on a prescriptor candidate
    function selectedCIDStateUpdator(cid: string) {
        return props.paretoProps.PrescriptorNodeToCIDMapUpdater(value => {
            return {
                ...value,
                [firstPrescriptorNodeID]: cid
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
            const selectedCID = params.value[params.value.length - 1]
            selectedCIDStateUpdator(selectedCID)
        }
        : () => {
            sendNotification(NotificationType.error, "Model Selection Error",
                "Only models from the last generation can be used with the decision interface")
        }

    // Retrieve "options" (all data for EChart and associated options) for selectede generation
    const options = props.optionsGenerator(genData, objectives, minMaxPerObjective, selectedGen)
    
    // Build EChart plot
    const plot =
        <div id="echart-pareto-plot-div" style={{height: "100%"}}>
            <ReactEcharts   // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // ReactEcharts lacks an id attribute
                style={{height: "100%"}}
                option={options}
                onEvents={{click: onChartClick}}
            />
        </div>

    // Wrap plot in animation component and return it
    const id = props.id
    return <>
        <GenerationsAnimation
            id={id}
            NumberOfGenerations={numberOfGenerations}
            Plot={plot}
            SetSelectedGen={(gen: number) => setSelectedGen(gen)}
            SelectedGen={selectedGen}
            ShowAllGenerations={false}
            FrameDelayMs={frameDelayMs}
            SetPlaying={setPlaying}
            Playing={playing}
        />
    </>
}
