import React from "react";
import {FiAlertCircle} from "react-icons/fi";
import NewBar from "./newbar";
import {Table} from "evergreen-ui"

export interface MetricstableProps {
    readonly PredictorRunData
}

export default function MetricsTable(props: MetricstableProps) {

    const PredictorRunData = props.PredictorRunData
    const predictorRenders = []
    Object.keys(PredictorRunData).forEach(nodeID => {

        const metrics = PredictorRunData[nodeID].metrics
        const rioMetrics = PredictorRunData[nodeID].rioMetrics
        const cells = Object.keys(metrics).map((metricName) => {
                const value = metrics[metricName]
                return <Table.Row key={`${nodeID}-${metricName}`}>
                    <Table.TextCell>{metricName}</Table.TextCell>
                    <Table.TextCell>{value}</Table.TextCell>
                    <Table.TextCell>{rioMetrics && rioMetrics[metricName]}</Table.TextCell>
                </Table.Row>
            }
        )
        predictorRenders.push(
            <div>
                <h4 className="mt-4 mb-4">Predictor with Objectives: {PredictorRunData[nodeID].objectives}</h4>
                <p>Node ID: {nodeID}</p>
                <Table.Body>
                    <Table.Head>
                        <Table.TextCell><b>Metric</b></Table.TextCell>
                        <Table.TextCell><b>Value</b></Table.TextCell>
                        <Table.TextCell><b>RIO</b></Table.TextCell>
                    </Table.Head>
                    <Table.Body>
                        {cells}
                    </Table.Body>
                </Table.Body>
            </div>
        )
    })

    return <>
        <NewBar Title="Predictor Metrics" DisplayNewLink={ false } />
        {predictorRenders && predictorRenders.length > 0
            ?   predictorRenders
            :   <>
                    <span style={{display: "flex"}}>
                        <FiAlertCircle color="red" size={50}/>
                        <span className="ml-4 fs-4 my-auto">No predictors found</span>
                    </span>
                    <br />
                    Navigate to the Runs table and view the error logs for your Run to see what went wrong.
                </>
        }
    </>
}

MetricsTable.authRequired = true
