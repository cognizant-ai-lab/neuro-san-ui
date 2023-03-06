import NewBar from "../newbar"
import React from "react"
import {useState} from "react"


import dynamic from "next/dynamic";
import {Container} from "react-bootstrap"
import {Row} from "react-bootstrap"
import {Col} from "react-bootstrap"
import Select from 'react-select'
import {Table} from "evergreen-ui"
import { ParallelCoordsPlot } from "./parallel_coords_plot";
import { ParetoPlotTable } from "./pareto_plot_2d";
import {ParetoPlotProps} from "./types"
import {SurfacePlot3D} from "./surface_plot_3d"

// Have to import Plotly this weird way to get around NextJS SSR
// See: https://github.com/plotly/react-plotly.js/issues/272
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false, })

export function MultiPareto(props: ParetoPlotProps) {

    const objectivesCount = props.ObjectivesCount
    console.debug(objectivesCount)
    
    // Options for select dialog
    const options = [
        // Parallel coordinates plot can handle any number of dimensions
        {label: "Parallel Coordinates Plot", value: "parcords", isDisabled: false},

        // 2D pareto plot can only handle 2 dimensions
        {label: "2D Pareto Plot", value: "2d_pareto", isDisabled: objectivesCount > 2},

        // 3D surface plot can handle 2 or 3 dimensions
        {label: "3D Surface Plot", value: "3d_surface", isDisabled: objectivesCount > 3}
    ]
    
    const [selectedChartType, setSelectedChartType] = useState(options[0])
    
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
            //
            // onChange={async selectedOption => {
            //     try {
            //         setPrescribing(true)
            //         setPrescriptorID(selectedOption.value)
            //         const models = await checkIfModelsDeployed(runID, selectedOption.value)
            //         if (models) {
            //             // Save predictor(s) for later
            //             setPredictors(models.predictors)
            //
            //             // Only one prescriptor supported for now so grab the first one
            //             setPrescriptorUrl(models.prescriptors[0][1])
            //         }
            //     } finally {
            //         setPrescribing(false)
            //     }
            // }}
    />
    
    const nodePlots = []
    
    // For Each node create a table
    Object.keys(props.Pareto).forEach((nodeID, idx) => {

        const node = props.Pareto[nodeID]

        const cells = []

        cells.push(
            <Table.Row id={`paretor-plot-row=${idx}`} style={{height: "100%"}} key={`${nodeID}-pareto`}>
                <Table.TextCell id={`pareto-plot-text-cell-${idx}`}>
                    <div id={`pareto-plot-div-${idx}`}
                         className="pl-4 pb-28" style={{height: "35rem", width: "100%"}}>
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

                        {
                            selectedChartType.value === "2d_pareto" &&
                            <ParetoPlotTable
                                id="pareto-plot-table"
                                Pareto={props.Pareto}
                                NodeToCIDMap={props.NodeToCIDMap}
                                PrescriptorNodeToCIDMapUpdater={props.PrescriptorNodeToCIDMapUpdater}
                                ObjectivesCount={props.ObjectivesCount}
                            />
                        }

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
            <br />
            <Container fluid>
                <Row className="my-3">
                    <label>Plot type:
                    <Col style={{alignContent: "flex-end", marginTop: "8px"}}>{paretoChartSelect}</Col>
                    </label>
                </Row>
                <Row>
                    <Col>{nodePlots}</Col>
                </Row>
            </Container>
        </div>
    </>
}