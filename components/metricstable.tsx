import React from "react";
import {FiAlertCircle} from "react-icons/fi";
import NewBar from "./newbar";
import {InfoSignIcon, Position, Table, Tooltip} from "evergreen-ui"

interface MetricstableProps {
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
                    <Table.TextCell id={metricName}>{metricName}</Table.TextCell>
                    <Table.TextCell>{value}</Table.TextCell>
                    {rioMetrics && <Table.TextCell>{rioMetrics[metricName]}</Table.TextCell>}
                    {rioMetrics && <Table.TextCell>
                        {((value - rioMetrics[metricName])/value * 100).toFixed(2)}%
                    </Table.TextCell>}
                </Table.Row>
            }
        )

        const predictorMetricsId = `predictor-with-objectives-${PredictorRunData[nodeID].objectives}`
        predictorRenders.push(
            <div>
                <h4 className="mt-4 mb-4" id={predictorMetricsId}>
                    Predictor with Objectives: {PredictorRunData[nodeID].objectives}
                </h4>
                <p>Node ID: {nodeID}</p>
                <Table.Body>
                    <Table.Head>
                        <Table.TextCell><b>Metric</b></Table.TextCell>
                        <Table.TextCell><b>Value</b></Table.TextCell>
                        {rioMetrics && <Table.TextCell><b>RIO</b></Table.TextCell>}
                        {rioMetrics &&
                            <Table.TextCell>
                                <div style={{display: "flex"}}>
                                    <b>RIO diff</b>
                                    <Tooltip
                                        content="Difference between original predictor metric and RIO-enhanced predictor metric, as a percentage"
                                        statelessProps={{className: "opacity-75"}}
                                        position={Position.TOP_RIGHT}
                                    >
                                        <div className="ps-1"><InfoSignIcon color="blue" size={10}/></div>
                                    </Tooltip>
                                </div>
                            </Table.TextCell>
                        }
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
