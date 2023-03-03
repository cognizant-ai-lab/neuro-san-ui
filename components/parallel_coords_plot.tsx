import NewBar from "./newbar"
import React from "react"

// Have to import Plotly this weird way
// See: https://github.com/plotly/react-plotly.js/issues/272
import dynamic from "next/dynamic";
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false, })

export function ParallelCoordsPlot(props) {
    const plot = <Plot // eslint-disable-line enforce-ids-in-jsx/missing-ids
                       // "Plot" lacks an "id" attribute
        data={[
            {
                type: 'parcoords',
                dimensions: [{
                    range: [1, 5],
                    constraintrange: [1, 2],
                    label: 'A',
                    values: [1,4]
                }, {
                    range: [1,5],
                    label: 'B',
                    values: [3,1.5],
                    tickvals: [1.5,3,4.5]
                }, {
                    range: [1, 5],
                    label: 'C',
                    values: [2,4],
                    tickvals: [1,2,4,5],
                    ticktext: ['text 1','text 2','text 4','text 5']
                }, {
                    range: [1, 5],
                    label: 'D',
                    values: [4,2]
                }]
            },
        ]}
        // layout={{width: 320, height: 240, title: 'A Fancy Plot'}}
    />

    return <>
        <div id={ `${props.id || "parallel-coords-plot"}` }>
            <NewBar id="pareto-prescriptors-bar"
                    InstanceId="prescriptors-objectives"
                    Title="Prescriptors vs objectives"
                    DisplayNewLink={ false } />
            {plot}
        </div>
    </>
}