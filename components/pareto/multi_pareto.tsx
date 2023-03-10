import NewBar from "../newbar"
import React from "react"
import {useState} from "react"

import {Container} from "react-bootstrap"
import {Row} from "react-bootstrap"
import {Col} from "react-bootstrap"
import Select from 'react-select'
import {Table} from "evergreen-ui"
import {InfoSignIcon} from "evergreen-ui"
import {Tooltip} from "evergreen-ui"
import {ParallelCoordsPlot} from "./parallel_coords_plot";
import {ParetoPlot2D} from "./pareto_plot_2d";
import {ParetoPlotProps} from "./types"
import {SurfacePlot3D} from "./surface_plot_3d"

/**
 * Coordinates the display of various kinds of Pareto charts in 2D, 3D and more.
 * @param props Data for display in in the chart. See {@link ParetoPlotProps}.
 */
export function MultiPareto(props: ParetoPlotProps) {

    const objectivesCount = props.ObjectivesCount
    
    // Options for select dialog
    const options = [
        // Parallel coordinates plot can handle any number of dimensions
        {label: "Parallel Coordinates Plot", value: "parcords", isDisabled: false},

        // 2D pareto plot can only handle 2 dimensions
        {label: "2D Pareto Plot", value: "2d_pareto", isDisabled: objectivesCount > 2},

        // 3D surface plot can handle 2 or 3 dimensions
        {label: "3D Surface Plot", value: "3d_surface", isDisabled: objectivesCount > 3}
    ]
    
    const [selectedChartType, setSelectedChartType] = useState(objectivesCount === 2 ? options[1] : options[0])
    
    if (props.ObjectivesCount < 2) {
        return <>Pareto display is only valid for ≥ 2 objectives</>
    }
        
    // Create selection list for Pareto plot types
    const paretoChartSelect = <Select id="pareto-chart-type-select"
                                      inputId="dms-actions-select-input"
                                      instanceId="dms-actions-select"
                                      options={options}
                                      value={selectedChartType}
                                      isOptionDisabled={(option) => option.isDisabled}
                                      onChange={option => setSelectedChartType(
                                          {label: option.label, value: option.value, isDisabled: option.isDisabled})
                                      }
    />
    
    const nodePlots = []
    
    // For Each node create a table
    Object.keys(props.Pareto).forEach((nodeID, idx) => {
        const cells = []

        cells.push(
            <Table.Row id={`paretor-plot-row=${idx}`} style={{height: "100%"}} key={`${nodeID}-pareto`}>
                <Table.TextCell id={`pareto-plot-text-cell-${idx}`} style={{paddingLeft: 0}}>
                    <div id={`pareto-plot-div-${idx}`} className="pb-28" style={{height: "35rem", width: "100%"}}>
                        
                        {/* Choose type of plot component based on user selection */}
                        
                        {/* Parallel coordinates */}
                        {
                            selectedChartType.value === "parcords" &&
                            <ParallelCoordsPlot
                                id="parallel-coords-table"
                                Pareto={props.Pareto}
                                NodeToCIDMap={props.NodeToCIDMap}
                                PrescriptorNodeToCIDMapUpdater={props.PrescriptorNodeToCIDMapUpdater}
                                ObjectivesCount={props.ObjectivesCount}
                            />
                        }

                        {/* 2D pareto */}
                        {
                            selectedChartType.value === "2d_pareto" &&
                            <ParetoPlot2D
                                id="pareto-plot-table"
                                Pareto={props.Pareto}
                                NodeToCIDMap={props.NodeToCIDMap}
                                PrescriptorNodeToCIDMapUpdater={props.PrescriptorNodeToCIDMapUpdater}
                                ObjectivesCount={props.ObjectivesCount}
                            />
                        }

                        {/* 3D surface */}
                        {
                            selectedChartType.value === "3d_surface" &&
                            <SurfacePlot3D
                                id="surface-plot-3d-table"
                                Pareto={props.Pareto}
                                NodeToCIDMap={props.NodeToCIDMap}
                                PrescriptorNodeToCIDMapUpdater={props.PrescriptorNodeToCIDMapUpdater}
                                ObjectivesCount={props.ObjectivesCount}
                            />
                        }
                    </div>
                </Table.TextCell>
            </Table.Row>
        )

        nodePlots.push(
            <div id="plot-table">
                <Table.Body id="plot-table-body">
                    <Table.Body id="plot-table-cells">
                        {cells}
                    </Table.Body>
                </Table.Body>
            </div>
        )
    })

    const propsId = `${props.id}`

    return <>
        <div id={`${propsId}`}>
            <NewBar id="pareto-prescriptors-bar"
                    InstanceId="pareto-prescriptors"
                    Title="Pareto Prescriptors"
                    DisplayNewLink={false}/>
            <br id="pareto-plot-br" />
            <Container fluid id="pareto-plot-container">
                <Row id="plot-type-row">
                    <Col id="tooltip-column" style={{display: "flex"}}>
                        <h4 id="plot-type-h4">Plot type:</h4>
                        <Tooltip    // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // Tooltip does not have an id property
                            content={"Some plot types may not be available, depending on the number of outcomes " +
                                "in your experiment"}>
                            <div id="plot-info-bubble" className="ps-1">
                                <sup id="plot-info-bubble-sup">
                                    <InfoSignIcon  id="plot-info-bubble-icon" color="blue" size={10}/>
                                </sup>
                            </div>
                        </Tooltip>
                    </Col>
                </Row>
                <Row id="select-chart-row">
                    <Col id="select-chart-col" style={{marginTop: "16px"}}>
                        {paretoChartSelect}
                    </Col>
                </Row>
                <Row id="pareto-plot-row" style={{marginTop: "16px"}}>
                    <Col id="pareto-plots-col">
                        {nodePlots}
                    </Col>
                </Row>
            </Container>
        </div>
    </>
}