import NewBar from "./newbar";
import {Table} from "evergreen-ui";
import {ResponsiveLine} from "@nivo/line";
import {useEffect, useMemo, useState} from "react";
import { Slider } from 'antd';
import {Button} from "react-bootstrap";
import {FiPlay, FiStopCircle} from "react-icons/fi";
import {MaximumBlue} from "../const";


export interface EspRunPlotProps {

    readonly PrescriptorRunData: any

}

export interface ParetoPlotProps {

    // The pareto front data
    readonly Pareto: any

    // A state handler for the parent object whoever needs to use it
    // that maps the node id of the prescriptor(ESP Experiment) to the
    // selected CID within that experiment so it can be used for inference
    readonly PrescriptorNodeToCIDMapUpdater: any

}

export default function ESPRunPlot(props: EspRunPlotProps) {

    const PrescriptorRunData = props.PrescriptorRunData

    const Nodes: string[] = Object.keys(PrescriptorRunData)

    let nodePlots = []
    Nodes.forEach(nodeID => {

        const Objectives = Object.keys(PrescriptorRunData[nodeID])

        let cells = []
        Objectives.forEach(objective => {
                const bumpData = PrescriptorRunData[nodeID][objective]
                cells.push(
                    <Table.Row style={{height: "100%"}} key={`${nodeID}-${objective}`}>
                        <Table.TextCell>{objective}</Table.TextCell>
                        <Table.TextCell >
                            <div className="pl-4" style={{height: "25rem", width: "100%"}}>
                                <ResponsiveLine
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
            <div>
                <p>Node ID: {nodeID}</p>
                <Table.Body>
                    <Table.Head>
                        <Table.TextCell>Objective</Table.TextCell>
                        <Table.TextCell>Plot</Table.TextCell>
                    </Table.Head>
                    <Table.Body>
                        {cells}
                    </Table.Body>
                </Table.Body>
            </div>
        )

    })



    return <>
        <NewBar Title="Prescriptor Metrics" DisplayNewLink={ false } />
        {nodePlots}
    </>

}

function ParetoPlot(props) {

    // Unpack props
    const { xLabel, yLabel } = props;
    const data = props.data
    const selectedCIDStateUpdator = props.SelectedCIDStateUpdator

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

    const cachedDataByGen = useMemo(function() {
        const gendata = {}
        for (const row of data) {
            gendata[row.id] = [row]
        }
        return gendata
    }, [])

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
    let onClickHandler = null
    if (selectedGen === numGen) {
        onClickHandler = (node, _) => {
            selectedCIDStateUpdator(node.data.cid)
        }
    }

    return <>
        <div className="flex mt-4 ">
            <Button
                style={{background: MaximumBlue, borderColor: MaximumBlue}}
                type="button"
                className="mr-4"
                onClick={_ => {
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
            >{playing ? <FiStopCircle /> : <FiPlay />}</Button>

            <Slider defaultValue={numGen}
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


        <ResponsiveLine
            data={cachedDataByGen[`Gen ${selectedGen}`] ?? data}
            margin={{top: 60, right: 140, bottom: 70, left: 90}}
            xScale={{type: 'linear', min: minX, max: maxX}}
            xFormat=">-.2f"
            yScale={{type: 'linear', min: minY, max: maxY}}
            yFormat=">-.2f"
            blendMode="multiply"
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


export function ParetoPlotTable(props: ParetoPlotProps) {

    let nodePlots = []

    Object.keys(props.Pareto).forEach(nodeID => {

        const node = props.Pareto[nodeID]
        const objectives = node.objectives

        let cells = []

        cells.push(
            <Table.Row style={{height: "100%"}} key={`${nodeID}-pareto`} >
                <Table.TextCell>
                    <div className="pl-4 pb-28" style={{height: "35rem", width: "100%"}}>
                        <ParetoPlot
                            data={node.data}
                            xLabel={objectives[0]}
                            yLabel={objectives[1]}
                            SelectedCIDStateUpdator={(cid: string) => {
                                props.PrescriptorNodeToCIDMapUpdater(value => {
                                    return {
                                        ...value,
                                        nodeID: cid
                                    }
                                })
                            }}
                        />
                    </div>
                </Table.TextCell>
            </Table.Row>
        )

        nodePlots.push(
            <div>
                <Table.Body>
                    <Table.Head>
                        <Table.TextCell>Plot</Table.TextCell>
                    </Table.Head>
                    <Table.Body>
                        {cells}
                    </Table.Body>
                </Table.Body>
            </div>
        )



    })

    return <>
        <NewBar Title="Prescriptor Pareto's" DisplayNewLink={ false } />
        {nodePlots}
    </>


}