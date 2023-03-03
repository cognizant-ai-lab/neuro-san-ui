import NewBar from "./newbar"
import React from "react"
import Plot from 'react-plotly.js';

export function ParallelCoordsPlot(props) {
    const plot = <Plot id="plotly-plot"
        data={[
            {
                x: [1, 2, 3],
                y: [2, 6, 3],
                type: 'scatter',
                mode: 'lines+markers',
                marker: {color: 'red'},
            },
            {type: 'bar', x: [1, 2, 3], y: [2, 5, 3]},
        ]}
        layout={{width: 320, height: 240, title: 'A Fancy Plot'}}
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