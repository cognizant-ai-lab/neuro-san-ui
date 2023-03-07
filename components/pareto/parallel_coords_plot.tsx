import React from "react"
import {useMemo} from "react"
import {useState} from "react"

import dynamic from "next/dynamic";
import {ParetoPlotProps} from "./types"
import {GenerationsAnimation} from "./generations_animation"

// Have to import Plotly this weird way
// See: https://github.com/plotly/react-plotly.js/issues/272
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false, })

/**
 * This component generates a parallel coordinates plot. See {@link https://en.wikipedia.org/wiki/Parallel_coordinates}
 * for details.
 * 
 * @param props See {@link ParetoPlotProps} for details.
 */
export function ParallelCoordsPlot(props: ParetoPlotProps): JSX.Element {
    const pareto = props.Pareto
    
    const objectives = pareto[Object.keys(pareto)[0]].objectives
    
    const data = pareto[Object.keys(pareto)[0]].data 

    const numberOfGenerations = useMemo(function () {
        return data.length
    }, [])

    // Generation for which we are displaying data. Default to last generation.
    const [selectedGen, setSelectedGen] = useState(numberOfGenerations)

    const genData = data.find( item => item.id === `Gen ${selectedGen || 1}`)
    
    const dimensions = objectives.map((objective, idx) => {
        const values = genData.data.map(item => item[`objective${idx}`])
        const minObjectiveValue = Math.min(...data.flatMap(gen => gen.data.map(cid => cid[`objective${idx}`])))
        const maxObjectiveValue = Math.max(...data.flatMap(gen => gen.data.map(cid => cid[`objective${idx}`])))
        const range = [minObjectiveValue, maxObjectiveValue]
        return (
            {
                label: objective,
                range: range,
                values: values
            }
        )
    })
    
    const plot = <Plot // eslint-disable-line enforce-ids-in-jsx/missing-ids
                       // "Plot" lacks an "id" attribute
        data={[
            {
                type: 'parcoords',
                // We need to ts-ignore here because the "@types" for Plotly are incomplete, and in particular they
                // don't have the required types for "parcoords" plots so "dimensions" generates a tsc error. 
                // For example, see https://github.com/DefinitelyTyped/DefinitelyTyped/issues/29127
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                dimensions: dimensions,
                line: {color: genData.data.map((o, idx) => idx)}
            },
        ]}
        layout={{autosize: true, showlegend: true}}
        style={{width: "100%"}}
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
