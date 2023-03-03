import NewBar from "./newbar"
import React from "react"

// Have to import Plotly this weird way
// See: https://github.com/plotly/react-plotly.js/issues/272
import dynamic from "next/dynamic";
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false, })

export function ParallelCoordsPlot(props) {
    const pareto = props.Pareto
    
    const objectives = pareto[Object.keys(pareto)[0]].objectives
    
    const data = pareto[Object.keys(pareto)[0]].data 
    const genData = data.find( item => item.id === "Gen 10")

    const dimensions = objectives.map((objective, idx) => {
        const values = genData.data.map(item => item[`objective${idx}`])
        console.debug(values)
        return (
            {
                label: objective,
                range: [Math.min(...values) * 0.95, Math.max(...values) * 1.05],
                values: values
            }
        )
    })
    
    const plot = <Plot // eslint-disable-line enforce-ids-in-jsx/missing-ids
                       // "Plot" lacks an "id" attribute
        data={[
            {
                type: 'parcoords',
                dimensions: dimensions,
                line: {color: genData.data.map((o, idx) => idx)}
            },
        ]}
        layout={{autosize: true}}
        style={{width: "100T%"}}
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