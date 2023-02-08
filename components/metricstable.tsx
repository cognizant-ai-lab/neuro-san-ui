import React from "react";
import {FiAlertCircle} from "react-icons/fi";
import NewBar from "./newbar";
import {InfoSignIcon, Position, Table, Tooltip} from "evergreen-ui"
import {FlowQueries} from "./internal/flow/flowqueries";
import {FetchMetrics} from "../controller/predictor";
import {FaArrowDown, FaArrowUp} from "react-icons/fa";

interface MetricstableProps {
    id: string,
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
                    ? <FaArrowUp id="arrow-up" style={{color: "#4EAD60FF"}} />
                    : <FaArrowDown id="arrow-down" style={{color: "#ff5740"}} />
                )
            }
        </span>
    }

    Object.keys(PredictorRunData).forEach(nodeID => {
        const metrics = PredictorRunData[nodeID].metrics
        const rioMetrics = PredictorRunData[nodeID].rioMetrics
        const predictorMetricsId = `predictor-with-objectives-${PredictorRunData[nodeID].objectives}`

        const cells = Object.keys(metrics).map((metricName) => {
            const unCorrectedValue = metrics[metricName]
            const metricPrefix = `${predictorMetricsId}-${metricName}`

            return <Table.Row id={ `${metricPrefix}-row` } key={`${nodeID}-${metricName}`}>
                <Table.TextCell id={ `${metricPrefix}-name` }>
                    {metricName}
                </Table.TextCell>
                <Table.TextCell id={ `${metricPrefix}-uncorrected-value` }>
                    {unCorrectedValue}
                </Table.TextCell>
                {rioMetrics && <Table.TextCell id={ `${metricsPrefix}-rio-metric` }>
                    {rioMetrics[metricName]}
                </Table.TextCell>}
                {rioMetrics && <Table.TextCell id={ `${metricsPrefix}-rio-improvement` }>
                    {getRioImprovement(unCorrectedValue, rioMetrics, metrics, metricName, nodeID)}
                </Table.TextCell>}
            </Table.Row>
        })

        predictorRenders.push(
            <div id={ `${predictorMetricsId}-table` }>
                <h4 className="mt-4 mb-4" id={predictorMetricsId}>
                    Predictor with Objectives: {PredictorRunData[nodeID].objectives}
                </h4>
                <p id={ `${predictorMetricsId}-node-id` }>Node ID: {nodeID}</p>
                <Table.Body id={ `${predictorMetricsId}-table-body` }>
                    <Table.Head id={ `${predictorMetricsId}-table-headers` }>
                        <Table.TextCell id={ `${predictorMetricsId}-metric` }>
                            <b id={ `${predictorMetricsId}-metric-header` }>Metric</b>
                        </Table.TextCell>
                        <Table.TextCell id={ `${predictorMetricsId}-value` }>
                            <b id={ `${predictorMetricsId}-value-header` }>Value</b>
                        </Table.TextCell>
                        {rioMetrics && 
                            <Table.TextCell id={ `${predictorMetricsId}-rio` }>
                                <b id={ `${predictorMetricsId}-rio-header` }>RIO</b>
                            </Table.TextCell>
                        }
                        {rioMetrics &&
                            <Table.TextCell id={ `${predictorMetricsId}-rio-improvement` }>
                                <div id={ `${predictorMetricsId}-rio-improvement-div` } style={{display: "flex"}}>
                                    <b id={ `${predictorMetricsId}-rio-improvement-header` }>RIO improvement</b>
                                    { /* 2/6/23 DEF - Tooltip does not have an id property when compiling */ }
                                    <Tooltip        // eslint_disable-line enforce-ids-in-jsx/missing-ids 
                                        content="Improvement of uncertainty model enhanced predictor metric over original predictor metric, as a percentage"
                                        statelessProps={{className: "opacity-75"}}
                                        position={Position.TOP_RIGHT}
                                    >
                                        <div id={ `${predictorMetricsId}-tooltip-info-sign-div` } className="ps-1">
                                            <InfoSignIcon id={ `${predictorMetricsId}-tooltip-info-sign-icon` }
                                                          color="blue" size={10}/>
                                        </div>
                                    </Tooltip>
                                </div>
                            </Table.TextCell>
                        }
                    </Table.Head>
                    <Table.Body id={ `${predictorMetricsId}-metrics-table-cells` }>
                        {cells}
                    </Table.Body>
                </Table.Body>
            </div>
        )
    })

    return <>
        <NewBar id="predictor-metrics-bar" InstanceId="predictor-metrics"
            Title="Predictor Metrics" DisplayNewLink={ false } />
        {predictorRenders && predictorRenders.length > 0
            ?   predictorRenders
            :   <>
                    <span id="no-predictors" style={{display: "flex"}}>
                        <FiAlertCircle id="no-predictors-alert-circle" color="red" size={50}/>
                        <span id="no-predictors-message" className="ml-4 fs-4 my-auto">
                            No predictors found
                        </span>
                    </span>
                    <br id="no-predictor-advice"/>
                    Navigate to the Runs table and view the error logs for your Run to see what went wrong.
                </>
        }
    </>
}

MetricsTable.authRequired = true
