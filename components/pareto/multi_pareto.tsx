import {InfoSignIcon, Table, Tooltip} from "evergreen-ui"
import {ReactElement, useState} from "react"
import {Col, Container, Row} from "react-bootstrap"
import {FiAlertCircle} from "react-icons/fi"
import Select from "react-select"

import {ParallelCoordsPlot} from "./parallel_coords_plot"
import {ParetoPlot2D} from "./pareto_plot_2d"
import {ParetoPlot3D} from "./pareto_plot_3d"
import {RadarPlot} from "./radar_plot"
import {ParetoPlotProps} from "./types"
import NewBar from "../newbar"

/**
 * Coordinates the display of various kinds of Pareto charts in 2D, 3D and more.
 * @param props Data for display in in the chart. See {@link ParetoPlotProps}.
 */
export function MultiPareto(props: ParetoPlotProps): ReactElement {
    const objectivesCount = props.ObjectivesCount

    // Options for select dialog
    const options = [
        // Parallel coordinates plot can handle any number of dimensions
        {label: "Parallel Coordinates", value: "parallel", isDisabled: false},

        // 2D pareto plot can only handle 2 dimensions
        {
            label: `2D Pareto${objectivesCount > 2 ? " (not available due to > 2 objectives)" : ""}`,
            value: "2d_pareto",
            isDisabled: objectivesCount > 2,
        },

        // 3D plots can handle exactly 3 dimensions
        {
            label: `3D Surface (Beta)${objectivesCount === 3 ? "" : " (only available for 3 objectives)"}`,
            value: "surface",
            isDisabled: objectivesCount !== 3,
        },

        // 3D plots can handle exactly 3 dimensions
        {
            label: `3D Scatter${objectivesCount === 3 ? "" : " (only available for 3 objectives)"}`,
            value: "scatter3D",
            isDisabled: objectivesCount !== 3,
        },

        // 3D plots can handle exactly 3 dimensions
        {
            label: `3D Line${objectivesCount === 3 ? "" : " (only available for 3 objectives)"}`,
            value: "line3D",
            isDisabled: objectivesCount !== 3,
        },

        // Radar plot can handle 3+ dimensions
        {
            label: `Radar${objectivesCount < 3 ? " (only available for 3 or more objectives)" : ""}`,
            value: "radar",
            isDisabled: objectivesCount < 3,
        },
    ]

    // Figure out default plot to use based on number of objectives
    let defaultPlot: number
    if (objectivesCount === 2) {
        defaultPlot = 1
    } else if (objectivesCount === 3) {
        defaultPlot = 2
    } else {
        defaultPlot = 0
    }

    const [selectedChartType, setSelectedChartType] = useState(options[defaultPlot])

    // Create selection list for Pareto plot types
    const paretoChartSelect = (
        <Select
            id="pareto-chart-type-select"
            inputId="pareto-chart-type-select"
            instanceId="pareto-chart-type-select"
            options={options}
            value={selectedChartType}
            isOptionDisabled={(option) => option.isDisabled}
            onChange={(option) =>
                setSelectedChartType({label: option.label, value: option.value, isDisabled: option.isDisabled})
            }
        />
    )

    const nodePlots = []

    // For Each node create a table
    Object.keys(props.Pareto).forEach((nodeID, idx) => {
        const cells = []

        cells.push(
            <Table.Row
                id={`pareto-plot-row=${idx}`}
                style={{height: "100%"}}
                key={`${nodeID}-pareto`}
            >
                <Table.TextCell
                    id={`pareto-plot-text-cell-${idx}`}
                    key={nodeID}
                    style={{paddingLeft: 0}}
                >
                    <div
                        id={`pareto-plot-div-${idx}`}
                        key={`pareto-plot-div-${nodeID}`}
                        className="pb-28"
                        style={{height: "600px", width: "100%"}}
                    >
                        {/* Choose type of plot component based on user selection */}

                        {/* Parallel coordinates */}
                        {selectedChartType.value === "parallel" && (
                            <ParallelCoordsPlot
                                id="parallel-coords-table"
                                Pareto={props.Pareto}
                                NodeToCIDMap={props.NodeToCIDMap}
                                PrescriptorNodeToCIDMapUpdater={props.PrescriptorNodeToCIDMapUpdater}
                                ObjectivesCount={props.ObjectivesCount}
                            />
                        )}

                        {/* 2D pareto */}
                        {selectedChartType.value === "2d_pareto" && (
                            <ParetoPlot2D
                                id="pareto-plot-table"
                                Pareto={props.Pareto}
                                NodeToCIDMap={props.NodeToCIDMap}
                                PrescriptorNodeToCIDMapUpdater={props.PrescriptorNodeToCIDMapUpdater}
                                ObjectivesCount={props.ObjectivesCount}
                            />
                        )}

                        {/* 3D types */}
                        {(selectedChartType.value === "surface" ||
                            selectedChartType.value === "line3D" ||
                            selectedChartType.value === "scatter3D") && (
                            <ParetoPlot3D
                                id="surface-plot-3d-table"
                                Pareto={props.Pareto}
                                NodeToCIDMap={props.NodeToCIDMap}
                                PrescriptorNodeToCIDMapUpdater={props.PrescriptorNodeToCIDMapUpdater}
                                ObjectivesCount={props.ObjectivesCount}
                                PlotSubtype={selectedChartType.value}
                            />
                        )}

                        {/* Radar plot */}
                        {selectedChartType.value === "radar" && (
                            <RadarPlot
                                id="radar-plot-3d-table"
                                Pareto={props.Pareto}
                                NodeToCIDMap={props.NodeToCIDMap}
                                PrescriptorNodeToCIDMapUpdater={props.PrescriptorNodeToCIDMapUpdater}
                                ObjectivesCount={props.ObjectivesCount}
                            />
                        )}
                    </div>
                </Table.TextCell>
            </Table.Row>
        )

        nodePlots.push(
            <div
                id="plot-table"
                key="plot-table"
            >
                <Table.Body id="plot-table-body">
                    <Table.Body id="plot-table-cells">{cells}</Table.Body>
                </Table.Body>
            </div>
        )
    })

    const propsId = `${props.id}`

    return (
        <div
            id={`${propsId}`}
            key={`${propsId}`}
        >
            <NewBar
                id="pareto-prescriptors-bar"
                InstanceId="pareto-prescriptors"
                Title="Pareto Prescriptors"
                DisplayNewLink={false}
            />
            <br id="pareto-plot-br" />
            {props.ObjectivesCount < 2 || nodePlots.length < 1 ? (
                <span
                    id="prescriptor-metrics-span"
                    style={{display: "flex"}}
                >
                    <FiAlertCircle
                        id="prescriptor-metrics-dot"
                        color={props.ObjectivesCount > 2 ? "#eed202" : "red"}
                        size={50}
                    />
                    {props.ObjectivesCount < 2 ? (
                        <span
                            id="pareto-metrics-less-than-2"
                            className="ml-4 fs-4 my-auto"
                        >
                            Pareto display is only valid for ≥ 2 objectives
                        </span>
                    ) : (
                        <span
                            id="pareto-metrics-none-found"
                            className="ml-4 fs-4 my-auto"
                        >
                            No pareto data found.
                        </span>
                    )}
                </span>
            ) : (
                <Container
                    fluid
                    id="pareto-plot-container"
                >
                    <Row id="plot-type-row">
                        <Col
                            id="tooltip-column"
                            style={{display: "flex"}}
                        >
                            <h4 id="plot-type-h4">Plot type:</h4>
                            <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // Tooltip does not have an id property
                                content={
                                    "Some plot types may not be available, depending on the number of outcomes " +
                                    "in your experiment"
                                }
                            >
                                <div
                                    id="plot-info-bubble"
                                    className="ps-1"
                                >
                                    <InfoSignIcon
                                        id="plot-info-bubble-icon"
                                        color="blue"
                                        size={10}
                                    />
                                </div>
                            </Tooltip>
                        </Col>
                    </Row>
                    <Row id="select-chart-row">
                        <Col
                            id="select-chart-col"
                            style={{marginTop: "16px"}}
                        >
                            {paretoChartSelect}
                        </Col>
                    </Row>
                    <Row
                        id="pareto-plot-row"
                        style={{marginTop: "16px"}}
                    >
                        <Col id="pareto-plots-col">{nodePlots}</Col>
                    </Row>
                </Container>
            )}
        </div>
    )
}
