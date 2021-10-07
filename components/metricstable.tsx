import NewBar from "./newbar";
import {Table} from "evergreen-ui"

export interface MetricstableProps {

    readonly PredictorRunData: any

}

export default function MetricsTable(props: MetricstableProps) {

    const PredictorRunData = props.PredictorRunData
    let predictorRenders = []
    Object.keys(PredictorRunData).forEach(nodeID => {

        const metrics = PredictorRunData[nodeID]
        let cells = Object.keys(metrics).map((metricName) => {
                const value = metrics[metricName]
                return <Table.Row key={`${nodeID}-${metricName}`}>
                    <Table.TextCell>{metricName}</Table.TextCell>
                    <Table.TextCell>{value}</Table.TextCell>
                </Table.Row>
            }
        )
        predictorRenders.push(
            <div>
                <h4 className="mt-4 mb-4">Predictor {nodeID}</h4>
                <Table.Body>
                    <Table.Head>
                        <Table.TextCell>Metric</Table.TextCell>
                        <Table.TextCell>Value</Table.TextCell>
                    </Table.Head>
                    <Table.Body>
                        {cells}
                    </Table.Body>
                </Table.Body>
            </div>
        )

    })


    return <>
        <NewBar Title="Predictor Metrics" DisplayNewLink={ false } />
        {predictorRenders}
    </>




}