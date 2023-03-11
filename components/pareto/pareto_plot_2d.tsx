import React from "react"
import {useMemo} from "react"
import {useState} from "react"
import {sendNotification} from "../../controller/notification"
import {NotificationType} from "../../controller/notification"
import {Card} from "react-bootstrap"
import {Container} from "react-bootstrap"
import {ResponsiveLine} from "@nivo/line"
import {ParetoPlotProps} from "./types"
import {GenerationsAnimation} from "./generations_animation"
import { cloneDeep } from "lodash"

/**
 * This function generates a 2-dimensional pareto plot.
 * 
 * @param props Data for rendering table. See {@link ParetoPlotProps}.
 */
export function ParetoPlot2D(props: ParetoPlotProps) {
    // Make a deep copy as we will be modifying it (adding x and y values for plot)
    const pareto = cloneDeep(props.Pareto)

    const prescriptorNodeId = Object.keys(pareto)[0]
    const objectives = pareto[prescriptorNodeId].objectives

    const xLabel = objectives[0]
    const yLabel = objectives[1]
    
    // For now, only one prescriptor per experiment supported, so grab [0]
    const data = pareto[prescriptorNodeId].data

    const numberOfGenerations = data.length
    
    const selectedCID = props.NodeToCIDMap[prescriptorNodeId]
    
    const selectedCIDStateUpdator = (cid: string) =>
        props.PrescriptorNodeToCIDMapUpdater(value => {
            return {
                ...value,
                [prescriptorNodeId]: cid
            }
        })

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

    // Create a cache of all the generations by the generation
    // name in a hash table for fast lookup.
    // This useMemo has a dependency selectedCID that denotes
    // that his object only be recreated when it changes, i.e
    // the user selects a different prescriptor for inference
    const cachedDataByGen = useMemo(function () {
        const gendata = {}
        let row
        for (row of data) {
            // Line plot requires coordinates to be named (x, y) rather than (objective0, objective1)
            row.data.forEach((val, idx) => {
                row.data[idx].x = row.data[idx].objective0
                row.data[idx].y = row.data[idx].objective1
                // delete row.data[idx].objective0
                // delete row.data[idx].objective1
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
    const [selectedGen, setSelectedGen] = useState(1)

    if (props.ObjectivesCount !== 2) {
        return <>ParetoPlot2D display is only valid for 2 objectives</>
    }
    
    // Generate mars for the slider
    const marks = {}
    marks[numberOfGenerations + 1] = `All Gen`

    // On Click handler - only rendered at the last generation as those are the
    // candidates we persist.
    // The default click handler shows the Notification if the selected Candidate is not of the last generation - we
    // cannot yet perform inference on those as those don't exist.
    const onClickHandler: (point, _) => void = selectedGen === numberOfGenerations ? 
        node => {
            selectedCIDStateUpdator(node.data.cid)
        }
        : () => {
            sendNotification(NotificationType.error, "Model Selection Error",
                "Only models from the last generation can be used with the decision interface")
        }

    // A custom Point symbol for the scatter plot
    const customSymbol = ({size, color, borderWidth, borderColor}) => (
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

    const plotData = cachedDataByGen[`Gen ${selectedGen}`] ?? data

    // Use constant color for animation or individual generations so it's less jarring, but multicolor when 
    // showing all generations 
    const colors = selectedGen === numberOfGenerations + 1 ? undefined: () => '#ff0000'
    
    const plot = <ResponsiveLine // eslint-disable-line enforce-ids-in-jsx/missing-ids
        pointSymbol={customSymbol}
        pointSize={12}
        pointBorderWidth={1}
        pointBorderColor={{
            from: 'color',
            modifiers: [['darker', 0.3]]
        }}
        colors={colors}
        curve="monotoneX"
        tooltip={({point}) => {
            return <Card id="responsive-line-tooltip">
                <Container id="responsive-line-tooltip-container" className="flex flex-col justify-space-between">
                    <p id="responsive-line-tooltip-x-label">{xLabel}: {point.data.x}</p>
                    <p id="responsive-line-tooltip-y-label">{yLabel}: {point.data.y}</p>
                </Container>
            </Card>
        }}
        data={plotData}
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
        <GenerationsAnimation
            id="generations-animation"
            NumberOfGenerations={numberOfGenerations}
            Plot={plot}
            SetSelectedGen={(gen: number) => setSelectedGen(gen)}
            SelectedGen={selectedGen}
        />
    </>
}