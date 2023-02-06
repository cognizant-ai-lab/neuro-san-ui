import React from "react";
import {FiAlertCircle} from "react-icons/fi";
import NewBar from "./newbar";
import {InfoSignIcon, Position, Table, Tooltip} from "evergreen-ui"
import {FlowQueries} from "./internal/flow/flowqueries";
import {FetchMetrics} from "../controller/predictor";
import {FaArrowDown, FaArrowUp} from "react-icons/fa";

interface MetricstableProps {
    readonly PredictorRunData,
    readonly Predictors
}


export default function MetricsTable(props: MetricstableProps) {
    const PredictorRunData = props.PredictorRunData
    const Predictors = props.Predictors
    const predictorRenders = []


    function getRioImprovement(unCorrectedValue: number, rioMetrics, metrics, metricName: string, nodeID: string) {
        const predictor = FlowQueries.getNodeByID(Predictors, nodeID)
        if (!predictor) {
            return null
        }

        // Get the predictor type (regressor/classifier) so we can get the appropriate list of metrics info
        const predictorType = predictor.data.ParentPredictorState.selectedPredictorType
        const metricsInfo = FetchMetrics(predictorType)

        // After training, metrics IDs are returned to us in the format [test|train]_[metric name]_[outcome name]
        // We want just the middle part to look up the metric in the Map.
        // This is a bit of a hack, but there seems to be no other way to get the raw metric name after training.
        const baseMetricName = metricName.split("_")[1]

        // Figure out which way the metric goes
        const higherIsBetter: boolean = metricsInfo.get(baseMetricName)

        // Original prediction
        const nonAdjustedValue = metrics[metricName]

        // RIO-adjusted prediction
        const rioValue = rioMetrics[metricName]

        // Improvement (or worsening) due to RIO
        const rioDiff = nonAdjustedValue - rioValue

        // Generate appropriate display element depending on improvement or worsening, and include percentage.
        // If before & after are exactly equal, no arrow is shown.
        const isImproved = higherIsBetter ? (rioValue > nonAdjustedValue) : (rioValue < nonAdjustedValue)
        return <span style={{display: "inline-flex"}} id={`rio-diff-${metricName}`}>
            {((rioDiff) / nonAdjustedValue * 100).toFixed(2)}%
            {rioDiff != 0 &&
                (isImproved
                    ? <FaArrowUp style={{color: "#4EAD60FF"}} />
                    : <FaArrowDown style={{color: "#ff5740"}} />
                )
            }
        </span>
    }

    Object.keys(PredictorRunData).forEach(nodeID => {
        const metrics = PredictorRunData[nodeID].metrics
        const rioMetrics = PredictorRunData[nodeID].rioMetrics
        const cells = Object.keys(metrics).map((metricName) => {
                const unCorrectedValue = metrics[metricName]
                return <Table.Row key={`${nodeID}-${metricName}`}>
                    <Table.TextCell id={metricName}>{metricName}</Table.TextCell>
                    <Table.TextCell>{unCorrectedValue}</Table.TextCell>
                    {rioMetrics && <Table.TextCell>{rioMetrics[metricName]}</Table.TextCell>}
                    {rioMetrics && <Table.TextCell>
                        {getRioImprovement(unCorrectedValue, rioMetrics, metrics, metricName, nodeID)}
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
                                    <b>RIO improvement</b>
                                    <Tooltip
                                        content="Improvement of uncertainty model enhanced predictor metric over original predictor metric, as a percentage"
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
        <NewBar id="predictor-metrics-bar" Title="Predictor Metrics" DisplayNewLink={ false } />
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
