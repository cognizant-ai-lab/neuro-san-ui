import NewBar from "./newbar";
import {Table} from "evergreen-ui";
import {ResponsiveLine} from "@nivo/line";
import React, {useEffect, useMemo, useState} from "react";
import {Slider} from 'antd';
import {Button, Card, Container} from "react-bootstrap";
import {FiAlertCircle, FiPlay, FiStopCircle} from "react-icons/fi";
import {MaximumBlue} from "../const";
import {NotificationType, sendNotification} from "../controller/notification";

interface EspRunPlotProps {
    id: string
    readonly PrescriptorRunData
}

interface ParetoPlotProps {

    id: string

    // The pareto front data
    readonly Pareto

    // The Node mapping to the CID Map of selected prescriptor
    NodeToCIDMap

    // A state handler for the parent object whoever needs to use it
    // that maps the node id of the prescriptor(ESP Experiment) to the
    // selected CID within that experiment so it can be used for inference
    readonly PrescriptorNodeToCIDMapUpdater

}

export default function ESPRunPlot(props: EspRunPlotProps) {

    const PrescriptorRunData = props.PrescriptorRunData

    const Nodes: string[] = Object.keys(PrescriptorRunData)

    const nodePlots = []
    Nodes.forEach(nodeID => {

        const Objectives = Object.keys(PrescriptorRunData[nodeID])

        const cells = []
        Objectives.forEach(objective => {
                const bumpData = PrescriptorRunData[nodeID][objective]
                const objectiveMetricGraphLabelId = `${objective}-metric-graph-label`
                cells.push(
                    <Table.Row id={ `objective-row-${objectiveMetricGraphLabelId}` }
                            style={{height: "100%"}} key={`${nodeID}-${objective}`}>
                        <Table.TextCell id={objectiveMetricGraphLabelId}>{objective}</Table.TextCell>
                        <Table.TextCell id={ `graph-${objectiveMetricGraphLabelId}` }>
                            <div id={ `graph-div-${objectiveMetricGraphLabelId}` }
                                    className="pl-4" style={{height: "25rem", width: "100%"}}>
                                { /* 2/6/23 DEF - ResponsiveLine does not have an id tag when compiled */ }
                                <ResponsiveLine     // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                    data={bumpData}
                                    margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
                                    xScale={{ type: 'linear'}}
                                    yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
                                    axisTop={null}
                                    axisRight={null}
                                    axisBottom={{
                                        tickSize: 5,
                                        tickPadding: 5,
                                        tickRotation: 0,
                                        legend: 'Generations',
                                        legendOffset: 36,
                                        legendPosition: 'middle'
                                    }}
                                    pointSize={10}
                                    pointColor={{ theme: 'background' }}
                                    pointBorderWidth={2}
                                    pointBorderColor={{ from: 'serieColor' }}
                                    pointLabelYOffset={-12}
                                    useMesh={true}
                                    legends={[
                                        {
                                            anchor: 'bottom-right',
                                            direction: 'column',
                                            justify: false,
                                            translateX: 100,
                                            translateY: 0,
                                            itemsSpacing: 0,
                                            itemDirection: 'left-to-right',
                                            itemWidth: 80,
                                            itemHeight: 20,
                                            itemOpacity: 0.75,
                                            symbolSize: 12,
                                            symbolShape: 'circle',
                                            symbolBorderColor: 'rgba(0, 0, 0, .5)',
                                            effects: [
                                                    {
                                                        on: 'hover',
                                                        style: {
                                                            itemBackground: 'rgba(0, 0, 0, .03)',
                                                            itemOpacity: 1
                                                        }
                                                    }
                                                ]
                                        }
                                    ]}
                                />
                            </div>
                        </Table.TextCell>
                    </Table.Row>
                )
        })

        nodePlots.push(
            <div id={ `node-id-div-${nodeID}` }>
                <p id={ `node-id-name-${nodeID}` }>Node ID: {nodeID}</p>
                <Table.Body id={ `node-id-body-${nodeID}` }>
                    <Table.Head id={ `node-id-headers-${nodeID}` }>
                        <Table.TextCell id={ `node-id-objective-${nodeID}` }>Objective</Table.TextCell>
                        <Table.TextCell id={ `node-id-plot-${nodeID}` }>Plot</Table.TextCell>
                    </Table.Head>
                    <Table.Body id={ `node-id-${nodeID}-cells`} >
                        {cells}
                    </Table.Body>
                </Table.Body>
            </div>
        )

    })

    const propsId = `${props.id}`

    return <>
        <div id={ `${propsId}` }>
            <NewBar id="prescriptor-metrics-bar"
                InstanceId="prescriptor-metrics"
                Title="Prescriptor Metrics"
                DisplayNewLink={ false } />
            {nodePlots && nodePlots.length > 0
                ? nodePlots
                :   <>
                    <span id="prescriptor-metrics-span" style={{display: "flex"}}>
                        <FiAlertCircle id="prescriptor-metrics-dot" color="red" size={50}/>
                        <span id="prescriptor-metrics-none-found"
                                className="ml-4 fs-4 my-auto">
                            No prescriptors found.
                        </span>
                        <div id="prescriptor-metrics-break" className="break"></div>
                    </span>
                    <br id="prescriptor-metrics-instructions"/>
                    Navigate to the Runs table and view the error logs for your Run to see what went wrong.
                </>
            }
        </div>
    </>

}

// ParetoPlot renders a react component that is capable of
// animating over several generations of an ESP Run.
function ParetoPlot(props) {

    // Unpack props
    const { xLabel, yLabel } = props;
    const data = props.data
    const selectedCIDStateUpdator = props.SelectedCIDStateUpdator
    const selectedCID = props.SelectedCID

    // Compute the min and the max of all the values for the plot below
    // We do this rather than letting the plot decide because while animating
    // we want to keep our axes static
    // We also use useMemo to tell react not to re-compute these values again - the data
    // is large for instance 100 generations - and re-computation makes the UI really laggy
    const flatData = useMemo(function() {
        return data
            .map(genData => genData.data)
            .flat()
    }, [])

    const x = useMemo(function() {
        return flatData.map(row => row.x)
    }, [])

    const y = useMemo(function() {
        return flatData.map(row => row.y)
    }, [])

    const minX = useMemo(function() {
        return Math.min(...x)
    }, [])

    const minY = useMemo(function() {
        return Math.min(...y)
    }, [])

    const maxX = useMemo(function() {
        return Math.max(...x)
    }, [])

    const maxY = useMemo(function() {
        return Math.max(...y)
    }, [])

    const numGen = useMemo(function() {
        return data.length
    }, [])

    // Create a cache of all the generations by the generation
    // name in a hash table for fast lookup.
    // This useMemo has a dependency selectedCID that denotes
    // that his object only be recreated when it changes, i.e
    // the user selects a different prescriptor for inference
    const cachedDataByGen = useMemo(function() {
        const gendata = {}
        let row
        for (row of data) {
            gendata[row.id] = [row]
        }

        // Overlay the selected prescriptor for inference on the last generation
        const selectedDataPt = gendata[row.id][0].data.filter(
            point => point.cid === selectedCID
        )
        // TODO: This color does not appear yet. The underlying library
        // is pretty low level and does not provide an easy interface for merging.
        gendata[row.id].unshift({
            id: "Selected for Inference",
            data: selectedDataPt,
            color: "red"
        })
        return gendata

    }, [selectedCID])



    // We manage the selected state to display only data of selected generation.
    const [selectedGen, setSelectedGen] = useState(numGen)

    // Maintain the state of the animation if its playing or not
    const [playing, setPlaying] = useState(false)

    // Maintain the state of the setInterval Object that is used to play
    // We keep this so we can clear it when component is unmounted
    const [playingInterval, setPlayingInterval] = useState(null)

    // No setup but returning a teardown function that clears the timer if it hadn't
    // been cleaned up.
    // The timer gets cleaned up when either the stop animation button is pressed or
    // the animation ends. But if the Run drawer is closed before that happens - the timer
    // does not get cleaned up. This ensures that it gets cleaned up on unmount
    useEffect(function() {
        if (playingInterval) {
            return function cleanup() {
                clearInterval(playingInterval)
            }
        }
    }, [])

    // Generate mars for the slider
    const marks = {}
    marks[numGen + 1] = `All Gen`

    // On Click handler - only rendered at the last generation as those are the
    // candidates we persist
    // The default click handler shows the Notification if the
    // selected Candidate is not of the last generation - we cannot yet perform inference
    // on those as those don't exist

    let onClickHandler: (point, event) => void

    onClickHandler = () => {
        sendNotification(NotificationType.error, "Model Selection Error",
            "Only models from the last generation can be used with the decision interface" )
    }
    // Override the default onclick handler to actually update the selected model
    // if it is selected from the last generation
    if (selectedGen === numGen) {
        onClickHandler = node => {
            selectedCIDStateUpdator(node.data.cid)
        }
    }

    // A custom Point symbol for the scatter plot
    const CustomSymbol = ({ size, color, borderWidth, borderColor }) => (
        <g id="scatter-plot-custom-symbols">
            <circle id="scatter-plot-circle-1"
                fill="#fff"
                r={size / 2}
                strokeWidth={borderWidth}
                stroke={borderColor}
            />
            <circle id="scatter-plot-circle-2"
                r={size / 5}
                strokeWidth={borderWidth}
                stroke={borderColor}
                fill={color}
                fillOpacity={0.35}
            />
        </g>
    )

    return <>
        <div id="pareto-plot-div" className="flex mt-4 ">

            {/* This button enables the animation */}
            <Button id="generation-play-button"
                style={{background: MaximumBlue, borderColor: MaximumBlue}}
                type="button"
                className="mr-4"
                onClick={() => {
                    // If the animation is not playing start the animation by using
                    // a setInterval that updates the states ever half second
                    if (!playing) {
                        if (selectedGen >= numGen) { setSelectedGen(1) }
                        setPlaying(true)
                        const interval = setInterval(function() {
                            setSelectedGen(selectedGen => {
                                if(selectedGen === numGen) {
                                    clearInterval(interval)
                                    setPlaying(false)
                                    return selectedGen
                                }
                                return selectedGen + 1
                            })
                        }, 100)
                        setPlayingInterval(interval)
                    } else {
                        // If the timer was already started - meaning the stop button is
                        // pressed - clear the timer
                        clearInterval(playingInterval)
                        setPlayingInterval(null)
                        setPlaying(false)
                    }

                }}
            >{playing ? <FiStopCircle id="generation-play-stop"/> : <FiPlay id="generation-play-play"/>}</Button>

            <Slider id="selected-generation-slider"
                    defaultValue={numGen}
                    marks={marks}
                    min={1}
                    max={numGen + 1}
                    value={selectedGen}
                    dots={true}
                    disabled={playing}
                    onChange={value => {
                        setSelectedGen(value)
                    }}
                    handleStyle={{
                        borderColor: MaximumBlue,
                        color: MaximumBlue
                    }}
                    trackStyle={{
                        backgroundColor: MaximumBlue
                    }}
                    className="w-full mr-6"
            />
        </div>

        { /* 2/6/23 DEF - ResponsiveLine does not have an id tag when compiled */ }
        <ResponsiveLine // eslint-disable-line enforce-ids-in-jsx/missing-ids
            pointSymbol={CustomSymbol}
            pointSize={12}
            pointBorderWidth={1}
            pointBorderColor={{
                from: 'color',
                modifiers: [['darker', 0.3]]
            }}
            curve="monotoneX"
            tooltip={({point}) => {
                return <Card id="responsive-line-tooltip">
                    <Container id="responsive-line-tooltip-container" className="flex flex-col justify-space-between">
                        <p id="responsive-line-tooltip-x-label">{xLabel}: {point.data.x}</p>
                        <p id="responsive-line-tooltip-y-label">{yLabel}: {point.data.y}</p>
                    </Container>
                </Card>
            }}
            data={cachedDataByGen[`Gen ${selectedGen}`] ?? data}
            margin={{top: 60, right: 140, bottom: 70, left: 90}}
            xScale={{type: 'linear', min: minX, max: maxX}}
            xFormat=">-.2f"
            yScale={{type: 'linear', min: minY, max: maxY}}
            yFormat=">-.2f"
            axisTop={null}
            axisRight={null}
            axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: xLabel,
                legendPosition: 'middle',
                legendOffset: 46
            }}
            axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: yLabel,
                legendPosition: 'middle',
                legendOffset: -60
            }}
            enableGridX={true}
            enableGridY={true}
            isInteractive={true}
            useMesh={true}
            legends={[
                {
                    anchor: 'bottom-right',
                    direction: 'column',
                    justify: false,
                    translateX: 122,
                    translateY: 0,
                    itemWidth: 103,
                    itemHeight: 12,
                    itemsSpacing: 5,
                    itemDirection: 'left-to-right',
                    symbolSize: 12,
                    symbolShape: 'circle',
                    effects: [
                        {
                            on: 'hover',
                            style: {
                                itemOpacity: 1
                            }
                        }
                    ]
                }
            ]}
            onClick={onClickHandler}
        />
    </>
}


// This function encloses the ParetoPlot component to
// render a table of Pareto Plots incase there are multiple Prescriptor nodes/experiments
export function ParetoPlotTable(props: ParetoPlotProps) {

    const nodePlots = []

    // For Each node create a table
    Object.keys(props.Pareto).forEach((nodeID, idx) => {

        const node = props.Pareto[nodeID]
        const objectives = node.objectives

        const cells = []

        cells.push(
            <Table.Row id={ `paretor-plot-row=${idx}` } style={{height: "100%"}} key={`${nodeID}-pareto`} >
                <Table.TextCell id={ `pareto-plot-text-cell-${idx}` }>
                    <div id={ `pareto-plot-div-${idx}` }
                            className="pl-4 pb-28" style={{height: "35rem", width: "100%"}}>
                        <ParetoPlot id={ `pareto-plot-${idx}` }
                            data={node.data}
                            xLabel={objectives[0]}
                            yLabel={objectives[1]}
                            SelectedCID={props.NodeToCIDMap[nodeID]}
                            SelectedCIDStateUpdator={(cid: string) => {
                                props.PrescriptorNodeToCIDMapUpdater(value => {
                                    return {
                                        ...value,
                                        [nodeID]: cid
                                    }
                                })
                            }}
                        />
                    </div>
                </Table.TextCell>
            </Table.Row>
        )

        nodePlots.push(
            <div id="plot-table">
                <Table.Body id="plot-table-body">
                    <Table.Head id="plot-table-header">
                        <Table.TextCell id="plot-table-label">Plot</Table.TextCell>
                    </Table.Head>
                    <Table.Body id="plot-table-cells">
                        {cells}
                    </Table.Body>
                </Table.Body>
            </div>
        )



    })

    const propsId = `${props.id}`

    return <>
        <div id={ `${propsId}` }>
            <NewBar id="pareto-prescriptors-bar"
                InstanceId="pareto-prescriptors"
                Title="Pareto Prescriptors"
                DisplayNewLink={ false } />
            {nodePlots}
        </div>
    </>
}

ESPRunPlot.authRequired = true
