import InfoIcon from "@mui/icons-material/Info"
import {TableBody, TableCell, TableHead, TableRow} from "@mui/material"
import Tooltip from "@mui/material/Tooltip"
import {FaArrowDown, FaArrowUp} from "react-icons/fa"
import {FiAlertCircle} from "react-icons/fi"

import {FlowQueries} from "./internal/flow/flowqueries"
import {ConfigurableNode} from "./internal/flow/nodes/generic/configurableNode"
import {fetchMetrics} from "./internal/flow/predictorinfo"
import NewBar from "./newbar"

interface MetricstableProps {
    readonly PredictorRunData
    readonly Predictors
}

export default function MetricsTable(props: MetricstableProps) {
    const predictorRunData = props.PredictorRunData
    const predictors = props.Predictors
    const predictorRenders = []

    function getRioImprovement(rioMetrics, metrics, metricName: string, nodeID: string) {
        const predictor = FlowQueries.getNodeByID(predictors, nodeID) as ConfigurableNode
        if (!predictor) {
            return null
        }

        // Get the predictor type (regressor/classifier) so we can get the appropriate list of metrics info
        const predictorType = predictor.data.ParentNodeState.selectedPredictorType
        const metricsInfo = fetchMetrics(predictorType)

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
        const isImproved = higherIsBetter ? rioValue > nonAdjustedValue : rioValue < nonAdjustedValue
        return (
            <span
                style={{display: "inline-flex"}}
                id={`rio-diff-${metricName}`}
            >
                {((rioDiff / nonAdjustedValue) * 100).toFixed(2)}%
                {rioDiff !== 0 &&
                    (isImproved ? (
                        <FaArrowUp
                            id="arrow-up"
                            style={{color: "#2DB81F"}}
                        />
                    ) : (
                        <FaArrowDown
                            id="arrow-down"
                            style={{color: "#B81F2D"}}
                        />
                    ))}
            </span>
        )
    }

    Object.keys(predictorRunData).forEach((nodeID) => {
        const metrics = predictorRunData[nodeID].metrics
        const rioMetrics = predictorRunData[nodeID].rioMetrics
        const predictorMetricsId = `predictor-with-objectives-${predictorRunData[nodeID].objectives}`

        const cells = Object.keys(metrics).map((metricName) => {
            const unCorrectedValue = metrics[metricName]
            const metricPrefix = `${predictorMetricsId}-${metricName}`

            return (
                <TableRow
                    id={`${metricPrefix}-row`}
                    key={`${nodeID}-${metricName}`}
                >
                    <TableCell id={`${metricPrefix}-name`}>{metricName}</TableCell>
                    <TableCell id={`${metricPrefix}-uncorrected-value`}>{unCorrectedValue}</TableCell>
                    {rioMetrics && <TableCell id={`${metricPrefix}-rio-metric`}>{rioMetrics[metricName]}</TableCell>}
                    {rioMetrics && (
                        <TableCell id={`${metricPrefix}-rio-improvement`}>
                            {getRioImprovement(rioMetrics, metrics, metricName, nodeID)}
                        </TableCell>
                    )}
                </TableRow>
            )
        })

        predictorRenders.push(
            <div id={`${predictorMetricsId}-table`}>
                <h4
                    id={predictorMetricsId}
                    style={{marginTop: "1rem", marginBottom: "1rem"}}
                >
                    Predictor with Objectives: {predictorRunData[nodeID].objectives}
                </h4>
                <p id={`${predictorMetricsId}-node-id`}>Node ID: {nodeID}</p>
                <TableBody
                    style={{display: "table", width: "100%"}}
                    id={`${predictorMetricsId}-table-body`}
                >
                    <TableHead id={`${predictorMetricsId}-table-headers`}>
                        <TableCell id={`${predictorMetricsId}-metric`}>
                            <b id={`${predictorMetricsId}-metric-header`}>Metric</b>
                        </TableCell>
                        <TableCell id={`${predictorMetricsId}-value`}>
                            <b id={`${predictorMetricsId}-value-header`}>Value</b>
                        </TableCell>
                        {rioMetrics && (
                            <TableCell id={`${predictorMetricsId}-rio`}>
                                <div
                                    id={`${predictorMetricsId}-rio-improvement-div`}
                                    style={{display: "flex"}}
                                >
                                    <b id={`${predictorMetricsId}-rio-header`}>Uncertainty Model Mean</b>
                                    <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                        title="Mean corrected prediction from the uncertainty model"
                                        placement="top-end"
                                        style={{opacity: 0.75}}
                                    >
                                        <div
                                            id={`${predictorMetricsId}-rio-tooltip-info-sign-div`}
                                            style={{paddingInlineStart: "0.25rem"}}
                                        >
                                            <InfoIcon
                                                id={`${predictorMetricsId}-tooltip-info-sign-icon`}
                                                sx={{color: "var(--bs-primary)", width: "15px", height: "15px"}}
                                            />
                                        </div>
                                    </Tooltip>
                                </div>
                            </TableCell>
                        )}
                        {rioMetrics && (
                            <TableCell id={`${predictorMetricsId}-rio-improvement`}>
                                <div
                                    id={`${predictorMetricsId}-rio-improvement-div`}
                                    style={{display: "flex"}}
                                >
                                    <b id={`${predictorMetricsId}-rio-pct-improvement-header`}>
                                        Uncertainty model difference %
                                    </b>
                                    {/* 2/6/23 DEF - Tooltip does not have an id property when compiling */}
                                    <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                        /* eslint-disable-next-line max-len */
                                        title="Improvement of uncertainty model enhanced predictor metric over original predictor metric, as a percentage"
                                        placement="top-end"
                                        style={{opacity: 0.75}}
                                    >
                                        <div
                                            id={`${predictorMetricsId}-rio-percent-tooltip-info-sign-div`}
                                            style={{paddingInlineStart: "0.25rem"}}
                                        >
                                            <InfoIcon
                                                id={`${predictorMetricsId}-tooltip-info-sign-icon`}
                                                sx={{color: "var(--bs-primary)", width: "15px", height: "15px"}}
                                            />
                                        </div>
                                    </Tooltip>
                                </div>
                            </TableCell>
                        )}
                    </TableHead>
                    <TableBody id={`${predictorMetricsId}-metrics-table-cells`}>{cells}</TableBody>
                </TableBody>
            </div>
        )
    })

    return (
        <>
            <NewBar
                id="predictor-metrics-bar"
                InstanceId="predictor-metrics"
                Title="Predictor Metrics"
                DisplayNewLink={false}
            />
            <br id="predictor-plot-br" />
            {predictorRenders && predictorRenders.length > 0 ? (
                predictorRenders
            ) : (
                <>
                    <span
                        id="no-predictors"
                        style={{display: "flex"}}
                    >
                        <FiAlertCircle
                            id="no-predictors-alert-circle"
                            color="var(--bs-red)"
                            size={50}
                        />
                        <span
                            id="no-predictors-message"
                            className="ml-4 fs-4 my-auto"
                        >
                            No predictors found
                        </span>
                    </span>
                    <br id="no-predictor-advice" />
                    Navigate to the Runs table and view the error logs for your Run to see what went wrong.
                </>
            )}
        </>
    )
}

MetricsTable.authRequired = true
