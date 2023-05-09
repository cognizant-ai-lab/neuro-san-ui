import NewBar from "./newbar";
import {Table} from "evergreen-ui";
import {ResponsiveLine} from "@nivo/line";
import {FiAlertCircle} from "react-icons/fi";

interface EspRunPlotProps {
    id: string
    readonly PrescriptorRunData
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


ESPRunPlot.authRequired = true
