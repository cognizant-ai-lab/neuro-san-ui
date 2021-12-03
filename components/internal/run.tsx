import React, {useEffect, useState} from "react";
import {Run, Runs} from "../../controller/run/types";
import {BrowserFetchRuns} from "../../controller/run/fetch";
import {
    constructRunMetricsForRunPlot
} from "../../controller/run/results";
import MetricsTable from "../metricstable";
import ESPRunPlot, {ParetoPlotTable} from "../esprunplot";
import {Button} from "react-bootstrap";
import {MaximumBlue} from "../../const";
import ClipLoader from "react-spinners/ClipLoader";
import Link from "next/link";
import Flow from "./flow/flow";
import {ReactFlowProvider} from "react-flow-renderer";
import {node} from "prop-types";

export interface RunProps {
    ProjectId: number,
    Run: Run
}

var debug = require('debug')('run')

export default function RunPage(props: RunProps): React.ReactElement {

    const [predictorPlotData, setPredictorPlotData] = useState(null)
    const [prescriptorPlotData, setPrescriptorPlotData] = useState(null)
    const [paretoPlotData, setParetoPlotData] = useState({})
    const [flowInstance, setFlowInstance] = useState(null)
    const [nodeToCIDMap, updateNodeToCIDMap] = useState({})

    const flow = JSON.parse(props.Run.flow)

    const constructMetrics = metrics => {
        let [constructedPredictorResults, constructedPrescriptorResults, pareto] = constructRunMetricsForRunPlot(flow, JSON.parse(metrics))
        setPredictorPlotData(constructedPredictorResults)
        setPrescriptorPlotData(constructedPrescriptorResults)
        setParetoPlotData(pareto)
    }

    // Kick off a timer that updates the plot data and the artifacts at frequent intervals
    useEffect(() => {
            // Build plot data if metrics exist
            if (props.Run.metrics) {
                constructMetrics(props.Run.metrics)
            }
        },[])

    useEffect(() => {
        if (paretoPlotData) {

            const nodeToCIDMap = {}

            // This is the 1D case - if the Pareto does not exist
            if(Object.keys(paretoPlotData).length === 0) {
                // Get all the artifacts that start with the keyword prescriptor
                const prescriptorArtifactNames = Object.keys(JSON.parse(props.Run.output_artifacts)).filter(
                    name => name.startsWith("prescriptor")
                )

                prescriptorArtifactNames.forEach(artifact => {
                    // Split the name of the prescriptor to extract the node id and the cid
                    const splitName = artifact.split("-")
                    const nodeId = splitName.slice(1, splitName.length - 1).join("-")
                    const cid = splitName[splitName.length - 1]
                    nodeToCIDMap[nodeId] = cid
                })

            } else {

                // Loop over the nodes
                Object.keys(paretoPlotData).forEach(nodeId => {
                    const nodeInfo = paretoPlotData[nodeId].data
                    const numGen = nodeInfo.length
                    nodeToCIDMap[nodeId] = nodeInfo[numGen - 1].data[0].cid
                })

            }
            updateNodeToCIDMap(nodeToCIDMap)
        }
    }, [paretoPlotData])

    // Fit flow when displaying Run
    useEffect(() => {
        if (flowInstance) {
            flowInstance.fitView()
        }
    }, [flow])

    let PlotDiv = []
    if (predictorPlotData) {
        PlotDiv.push(<MetricsTable PredictorRunData={predictorPlotData} />)
    }

    if (prescriptorPlotData) {
        PlotDiv.push(<ESPRunPlot PrescriptorRunData={prescriptorPlotData} />)
    }

    if (Object.keys(paretoPlotData).length > 0) {
        PlotDiv.push(<ParetoPlotTable
            Pareto={paretoPlotData}
            NodeToCIDMap={nodeToCIDMap}
            PrescriptorNodeToCIDMapUpdater={updateNodeToCIDMap} />)
    }

    if (!predictorPlotData && !prescriptorPlotData) {
        PlotDiv.push(
            <div className="container">
                <ClipLoader color={MaximumBlue} loading={true} size={50} />
            </div>
        )
    } else {
        PlotDiv.push(
            <Button size="lg" className="mt-4 mb-4"
                    type="button"
                    style={{background: MaximumBlue, borderColor: MaximumBlue, width: "100%"}}
            >
                <Link
                    href={`/projects/${props.ProjectId}/experiments/${props.Run.experiment_id}/run/${props.Run.id}/ui/${Object.values(nodeToCIDMap)[0]}`}
                >
                    <a style={{
                        color: "white"
                    }}>Go to Decision Making System with Prescriptor: {Object.values(nodeToCIDMap)[0]}</a>
                </Link>

            </Button>
        )
    }
    
    return <div className="mr-8 ml-8">
        {/* Create the title bar */}
        <h1 className="mt-4 mb-4">{props.Run.name}</h1>

        <div>
            <ReactFlowProvider>
                <Flow
                    ProjectID={props.ProjectId}
                    Flow={flow}
                    ElementsSelectable={false}
                    onLoad={reactFlowInstance => {setFlowInstance(reactFlowInstance)}}
                />
            </ReactFlowProvider>
        </div>

        {PlotDiv}
    </div>


}
