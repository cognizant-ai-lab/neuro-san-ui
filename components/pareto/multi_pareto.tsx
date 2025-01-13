import FormControl from "@mui/material/FormControl"
import Grid from "@mui/material/Grid2"
import MenuItem from "@mui/material/MenuItem"
import Select from "@mui/material/Select"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableRow from "@mui/material/TableRow"
import {ReactElement, useState} from "react"
import {FiAlertCircle} from "react-icons/fi"

import {ParallelCoordsPlot} from "./parallel_coords_plot"
import {ParetoPlot2D} from "./pareto_plot_2d"
import {ParetoPlot3D} from "./pareto_plot_3d"
import {RadarPlot} from "./radar_plot"
import {ParetoPlotProps} from "./types"
import {InfoTip} from "../infotip"
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
            label: `3D Surface ${objectivesCount === 3 ? "" : " (only available for 3 objectives)"}`,
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

    const [selectedChartType, setSelectedChartType] = useState(options[defaultPlot].value)

    // Create selection list for Pareto plot types
    const paretoChartSelect = (
        <FormControl
            sx={{width: "100%"}}
            id="pareto-chart-type-select-form-control"
        >
            <Select
                id="pareto-chart-type-select"
                value={selectedChartType}
                onChange={(event) => setSelectedChartType(event.target.value)}
            >
                {options.map((item) => (
                    <MenuItem // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        disabled={item.isDisabled}
                        id={`pareto-chart-type-select-${item.value}`}
                        key={item.value}
                        value={item.value}
                    >
                        {item.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )

    const nodePlots = []

    // For Each node create a table
    Object.keys(props.Pareto).forEach((nodeID, idx) => {
        const cells = []

        cells.push(
            <TableRow
                id={`pareto-plot-row=${idx}`}
                style={{height: "100%"}}
                key={`${nodeID}-pareto`}
            >
                <TableCell
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
                        {selectedChartType === "parallel" && (
                            <ParallelCoordsPlot
                                id="parallel-coords-table"
                                Pareto={props.Pareto}
                                NodeToCIDMap={props.NodeToCIDMap}
                                PrescriptorNodeToCIDMapUpdater={props.PrescriptorNodeToCIDMapUpdater}
                                ObjectivesCount={props.ObjectivesCount}
                            />
                        )}

                        {/* 2D pareto */}
                        {selectedChartType === "2d_pareto" && (
                            <ParetoPlot2D
                                id="pareto-plot-table"
                                Pareto={props.Pareto}
                                NodeToCIDMap={props.NodeToCIDMap}
                                PrescriptorNodeToCIDMapUpdater={props.PrescriptorNodeToCIDMapUpdater}
                                ObjectivesCount={props.ObjectivesCount}
                            />
                        )}

                        {/* 3D types */}
                        {(selectedChartType === "surface" ||
                            selectedChartType === "line3D" ||
                            selectedChartType === "scatter3D") && (
                            <ParetoPlot3D
                                id="surface-plot-3d-table"
                                Pareto={props.Pareto}
                                NodeToCIDMap={props.NodeToCIDMap}
                                PrescriptorNodeToCIDMapUpdater={props.PrescriptorNodeToCIDMapUpdater}
                                ObjectivesCount={props.ObjectivesCount}
                                PlotSubtype={selectedChartType}
                            />
                        )}

                        {/* Radar plot */}
                        {selectedChartType === "radar" && (
                            <RadarPlot
                                id="radar-plot-3d-table"
                                Pareto={props.Pareto}
                                NodeToCIDMap={props.NodeToCIDMap}
                                PrescriptorNodeToCIDMapUpdater={props.PrescriptorNodeToCIDMapUpdater}
                                ObjectivesCount={props.ObjectivesCount}
                            />
                        )}
                    </div>
                </TableCell>
            </TableRow>
        )

        nodePlots.push(
            <div
                id="plot-table"
                key="plot-table"
            >
                <TableBody
                    id="plot-table-body"
                    style={{display: "table", width: "100%"}}
                >
                    <TableBody id="plot-table-cells">{cells}</TableBody>
                </TableBody>
            </div>
        )
    })

    const propsId = props.id

    if (props.ObjectivesCount < 2) {
        return null
    }

    return (
        <div
            id={propsId}
            key={propsId}
        >
            <NewBar
                id="pareto-prescriptors-bar"
                InstanceId="pareto-prescriptors"
                Title="Pareto Prescriptors"
                DisplayNewLink={false}
            />
            <br id="pareto-plot-br" />
            {nodePlots.length ? (
                <Grid
                    id="pareto-plot-container"
                    container={true}
                    spacing={2}
                >
                    <Grid
                        id="plot-type-row"
                        size={12}
                        sx={{display: "flex"}}
                    >
                        <h4 id="plot-type-h4">Plot type:</h4>
                        <InfoTip
                            id={`${propsId}-plot-info`}
                            info={
                                "Some plot types may not be available, depending on the number " +
                                "of outcomes in your experiment"
                            }
                        />
                    </Grid>
                    <Grid
                        id="select-chart-row"
                        size={12}
                    >
                        {paretoChartSelect}
                    </Grid>
                    <Grid
                        id="pareto-plot-row"
                        size={12}
                    >
                        <Grid id="pareto-plots-col">{nodePlots}</Grid>
                    </Grid>
                </Grid>
            ) : (
                <>
                    <span
                        id="prescriptor-metrics-span"
                        style={{display: "flex"}}
                    >
                        <FiAlertCircle
                            id="prescriptor-metrics-dot"
                            color="var(--bs-red)"
                            size={50}
                        />
                        <span
                            id="pareto-metrics-none-found"
                            className="ml-4 fs-4 my-auto"
                        >
                            No pareto data found because prescriptor training has failed.
                        </span>
                    </span>
                    <br id="pareto-metrics-instructions" />
                    Navigate to the Runs table and view the error logs for your Run to see what went wrong.
                </>
            )}
        </div>
    )
}
