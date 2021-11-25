import NewBar from "./newbar";
import {Table} from "evergreen-ui";
import {ResponsiveLine} from "@nivo/line";
import { ResponsiveScatterPlot } from '@nivo/scatterplot'

export interface EspRunPlotProps {

    readonly PrescriptorRunData: any

}

export interface ParetoPlotProps {

    readonly Pareto: any

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
                                    xScale={{ type: 'point'}}
                                    yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
                                    axisTop={null}
                                    axisRight={null}
                                    axisBottom={{
                                        orient: 'bottom',
                                        tickSize: 5,
                                        tickPadding: 5,
                                        tickRotation: 0,
                                        legend: 'Generations',
                                        legendOffset: 36,
                                        legendPosition: 'middle'
                                    }}
                                    axisLeft={{
                                        orient: 'left',
                                        tickSize: 5,
                                        tickPadding: 5,
                                        tickRotation: 0,
                                        legend: `${objective}`,
                                        legendOffset: -40,
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
                <h4 className="mt-4 mb-4">Prescriptor {nodeID}</h4>
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


export function ParetoPlot(props: ParetoPlotProps) {

    const PrescriptorParetoData = props.Pareto

    const Nodes: string[] = Object.keys(PrescriptorParetoData)

    let nodePlots = []
    Nodes.forEach(nodeID => {

        const node = PrescriptorParetoData[nodeID]
        const objectives = node.objectives

        let cells = []
        const ParetoPlot = <ResponsiveScatterPlot
            data={node.data}
            margin={{ top: 60, right: 140, bottom: 70, left: 90 }}
            xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
            xFormat=">-.2f"
            yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
            yFormat=">-.2f"
            blendMode="multiply"
            axisTop={null}
            axisRight={null}
            axisBottom={{
                orient: 'bottom',
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: objectives[0],
                legendPosition: 'middle',
                legendOffset: 46
            }}
            axisLeft={{
                orient: 'left',
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: objectives[1],
                legendPosition: 'middle',
                legendOffset: -60
            }}
            legends={[
                {
                    anchor: 'bottom-right',
                    direction: 'column',
                    justify: false,
                    translateX: 130,
                    translateY: 0,
                    itemWidth: 100,
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
        />

        cells.push(
            <Table.Row style={{height: "100%"}} key={`${nodeID}-pareto`}>
                <Table.TextCell>Prescriptor {nodeID} Pareto Plot</Table.TextCell>
                <Table.TextCell >
                    <div className="pl-4" style={{height: "25rem", width: "100%"}}>
                        {ParetoPlot}
                    </div>
                </Table.TextCell>
            </Table.Row>
        )

        nodePlots.push(
            <div>
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
        <NewBar Title="Prescriptor Pareto's" DisplayNewLink={ false } />
        {nodePlots}
    </>



}