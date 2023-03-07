import {Table} from "evergreen-ui"
import NewBar from "../newbar"
import React from "react"
import {useMemo} from "react"
import {useState} from "react"
import {useEffect} from "react"
import {sendNotification} from "../../controller/notification"
import {NotificationType} from "../../controller/notification"
import {Button} from "react-bootstrap"
import {Card} from "react-bootstrap"
import {Container} from "react-bootstrap"
import {MaximumBlue} from "../../const"
import {FiStopCircle} from "react-icons/fi"
import {FiPlay} from "react-icons/fi"
import {Slider} from "antd"
import {ResponsiveLine} from "@nivo/line"
import {ParetoPlotProps} from "./types"

/**
 * This function encloses the ParetoPlot component to
 * render a table of Pareto Plots incase there are multiple Prescriptor nodes/experiments
 * 
 * @param props Data for rendering table. See {@link ParetoPlotProps}.
 */
export function ParetoPlotTable(props: ParetoPlotProps) {

    const nodePlots = []

    // For Each node create a table
    Object.keys(props.Pareto).forEach((nodeID, idx) => {

        const node = props.Pareto[nodeID]
        const objectives = node.objectives

        const plots = []

        plots.push(
            <div id={`two-d-pareto-plot-div-${idx}`}
                 className="pb-28" style={{height: "35rem", width: "100%"}}>
                <ParetoPlot id={`pareto-plot-${idx}`}
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
        )

        nodePlots.push(
            <div id="plot-table">
                <Table.Body id="plot-table-body">
                    <Table.Head id="plot-table-header">
                        <Table.TextCell id="plot-table-label">Plot</Table.TextCell>
                    </Table.Head>
                    <Table.Body id="plot-table-cells">
                        {plots}
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
            {nodePlots}
        </div>
    </>
} 

// ParetoPlot renders a react component that is capable of
// animating over several generations of an ESP Run.
function ParetoPlot(props) {

    // Unpack props
    const {xLabel, yLabel} = props;
    const data = props.data
    const selectedCIDStateUpdator = props.SelectedCIDStateUpdator
    const selectedCID = props.SelectedCID

    // Compute the min and the max of all the values for the plot below
    // We do this rather than letting the plot decide because while animating
    // we want to keep our axes static
    // We also use useMemo to tell react not to re-compute these values again - the data
    // is large for instance 100 generations - and re-computation makes the UI really laggy
    const flatData = useMemo(function () {
        return data
            .map(genData => genData.data)
            .flat()
    }, [])

    const x = useMemo(function () {
        return flatData.map(row => row.objective0)
    }, [])

    const y = useMemo(function () {
        return flatData.map(row => row.objective1)
    }, [])

    const minX = useMemo(function () {
        return Math.min(...x)
    }, [])

    const minY = useMemo(function () {
        return Math.min(...y)
    }, [])

    const maxX = useMemo(function () {
        return Math.max(...x)
    }, [])

    const maxY = useMemo(function () {
        return Math.max(...y)
    }, [])

    const numGen = useMemo(function () {
        return data.length
    }, [])

    // Create a cache of all the generations by the generation
    // name in a hash table for fast lookup.
    // This useMemo has a dependency selectedCID that denotes
    // that his object only be recreated when it changes, i.e
    // the user selects a different prescriptor for inference
    const cachedDataByGen = useMemo(function () {
        const gendata = {}
        let row
        for (row of data) {
            // Line plot requires coordinates to be named (x, y) so add them to the data
            row.data.forEach((val, idx) => {
                row.data[idx].x = row.data[idx].objective0
                row.data[idx].y = row.data[idx].objective1
            })
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
    useEffect(function () {
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
            "Only models from the last generation can be used with the decision interface")
    }
    // Override the default onclick handler to actually update the selected model
    // if it is selected from the last generation
    if (selectedGen === numGen) {
        onClickHandler = node => {
            selectedCIDStateUpdator(node.data.cid)
        }
    }

    // A custom Point symbol for the scatter plot
    const CustomSymbol = ({size, color, borderWidth, borderColor}) => (
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

    const plot = <ResponsiveLine // eslint-disable-line enforce-ids-in-jsx/missing-ids
        pointSymbol={CustomSymbol}
        pointSize={12}
        pointBorderWidth={1}
        pointBorderColor={{
            from: 'color',
            modifiers: [['darker', 0.3]]
        }}
        colors={() => 'rgba(255,0,0,0.51)'}
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
    
    return <>
        <div id="two-d-pareto-plot-div" className="flex mt-4 ">

            {/* This button enables the animation */}
            <Button id="generation-play-button"
                    style={{background: MaximumBlue, borderColor: MaximumBlue}}
                    type="button"
                    className="mr-4"
                    onClick={() => {
                        // If the animation is not playing start the animation by using
                        // a setInterval that updates the states ever half second
                        if (!playing) {
                            if (selectedGen >= numGen) {
                                setSelectedGen(1)
                            }
                            setPlaying(true)
                            const interval = setInterval(function () {
                                setSelectedGen(selectedGen => {
                                    if (selectedGen === numGen) {
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

        { /* 2/6/23 DEF - ResponsiveLine does not have an id tag when compiled */}
        {plot}
    </>
}