import React, {useEffect, useState} from "react";
import {Run, Runs} from "../../controller/run/types";
import {BrowserFetchRuns} from "../../controller/run/fetch";
import {
    constructRunMetricsForRunPlot
} from "../../controller/run/results";
import MetricsTable from "../metricstable";
import ESPRunPlot from "../esprunplot";
import {Button} from "react-bootstrap";
import {MaximumBlue} from "../../const";
import ClipLoader from "react-spinners/ClipLoader";
import Link from "next/link";
import Flow from "./flow/flow";
import {ReactFlowProvider} from "react-flow-renderer";

export interface RunProps {
    ProjectId: number,
    Run: Run
}

var debug = require('debug')('run')

export default function RunPage(props: RunProps): React.ReactElement {

    const [predictorPlotData, setPredictorPlotData] = useState(null)
    const [prescriptorPlotData, setPrescriptorPlotData] = useState(null)
    const [artifacts, setArtifacts] = useState(null)

    const flow = JSON.parse(props.Run.flow)


    // Kick off a timer that updates the plot data and the artifacts at frequent intervals
    useEffect(() => {

            const RunTimer = setInterval(async () => {
                // Invoke the Run controller to keep triggering the fetch to update the run
                const runs: Runs = await BrowserFetchRuns(null, props.Run.id)

                if (runs.length == 1) {
                    const fetchedRun: Run = runs[0]

                    if (fetchedRun.metrics) {
                        let [constructedPredictorResults, constructedPrescriptorResults] = constructRunMetricsForRunPlot(flow, JSON.parse(fetchedRun.metrics))
                        setPredictorPlotData(constructedPredictorResults)
                        setPrescriptorPlotData(constructedPrescriptorResults)
                    }

                    if (fetchedRun.output_artifacts) {
                        setArtifacts(JSON.parse(fetchedRun.output_artifacts))
                    }


                }

            }, 10000)

            return function cleanup() {
                debug("Cleaning Up");
                clearInterval(RunTimer)
            }

        },[])

    let PlotDiv = []
    if (predictorPlotData) {
        PlotDiv.push(<MetricsTable PredictorRunData={predictorPlotData} />)
        if (prescriptorPlotData) {
            PlotDiv.push(<ESPRunPlot PrescriptorRunData={prescriptorPlotData} />)
            PlotDiv.push(
                <Button size="lg" className="mt-4 mb-4 float-right"
                    // onClick={}
                        type="button"
                        style={{background: MaximumBlue, borderColor: MaximumBlue}}
                >
                    <Link href={`/projects/${props.ProjectId}/experiments/${props.Run.experiment_id}/run/${props.Run.id}/ui`}>
                        <a>Create UI</a>
                    </Link>

                </Button>
            )
        }
    }

    if (!predictorPlotData && !prescriptorPlotData) {
        PlotDiv.push(
            <div className="container">
                <ClipLoader color={MaximumBlue} loading={true} size={50} />
            </div>
        )
    }

    return <>
        {/* Create the title bar */}
        <h1 className="mt-4 mb-4">{props.Run.name}</h1>

        <div>
            <ReactFlowProvider>
                <Flow
                    ProjectID={props.ProjectId}
                    TaggedDataList={[...flow[0].data.TaggedDataList]}
                    Flow={flow}
                    ElementsSelectable={false}
                />
            </ReactFlowProvider>
        </div>

        {PlotDiv}
    </>


}
