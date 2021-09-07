import uuid from 'react-uuid'
import { ResponsiveBump } from '@nivo/bump'

export function BumpESPPlot({ RunsResultData, Verb }) {

    // const numObjectives = Object.keys(RunsResultData).length
    // const sampleObj = Object.keys(RunsResultData)[0]
    // const columnVerbNames = Object.keys(RunsResultData[sampleObj])
    // const numColumns = columnVerbNames.length
    const TableHeaderNames = ['Objectives', Verb]

    let tableHeaderElements = []
    TableHeaderNames.forEach(header => {
        tableHeaderElements.push(
            <th key={uuid()} 
            scope="col" 
            className="px-10 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
            { header }
            </th>
        )
    })

    let graphRows = []

    for (const objective of Object.keys(RunsResultData)) {

        
        const metricCol = <td key={`${objective}-${Verb}`} className="px-10 py-3 text-center text-xs font-medium text-gray-900 tracking-wider">
                { 
                    <div className="pl-4" style={{height: "50rem", width: "100%"}}>
                        <ResponsiveBump
                            data={RunsResultData[objective][Verb]}
                            margin={{ top: 40, right: 100, bottom: 40, left: 60 }}
                            colors={{ scheme: 'spectral' }}
                            lineWidth={3}
                            activeLineWidth={6}
                            inactiveLineWidth={3}
                            inactiveOpacity={0.15}
                            pointSize={10}
                            activePointSize={16}
                            inactivePointSize={0}
                            pointColor={{ theme: 'background' }}
                            pointBorderWidth={3}
                            activePointBorderWidth={3}
                            pointBorderColor={{ from: 'serie.color' }}
                            axisTop={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: "",
                                legendPosition: 'middle',
                                legendOffset: -36
                            }}
                            axisRight={null}
                            axisBottom={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: 'Generations',
                                legendPosition: 'middle',
                                legendOffset: 32
                            }}
                            axisLeft={{
                                tickSize: 5,
                                tickPadding: 5,
                                tickRotation: 0,
                                legend: "",
                                legendPosition: 'middle',
                                legendOffset: -36
                            }}
                        />
                    </div>
                }
            </td>

        let row = [
            <td className="px-10 py-3 text-center text-xs font-medium tracking-wider">
                {objective}
            </td>,
            metricCol
        ]

        graphRows.push(
            <tr key={objective}>
                {row}
            </tr>
        )


    }

    return <div className="flex flex-col mt-4">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>{tableHeaderElements}</tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {graphRows}
                </tbody>
            </table>
            </div>
        </div>
        </div>
    </div>
}