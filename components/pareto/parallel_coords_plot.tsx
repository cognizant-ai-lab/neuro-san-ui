import NewBar from "../newbar"
import React from "react"

import dynamic from "next/dynamic";
import {Slider} from "antd"
import {MaximumBlue} from "../../const"
import {useMemo} from "react"
import {Button} from "react-bootstrap"
import {FiStopCircle} from "react-icons/fi"
import {FiPlay} from "react-icons/fi"
import {useState} from "react"
import {useEffect} from "react"
import {ParetoPlotProps} from "./types"

// Have to import Plotly this weird way
// See: https://github.com/plotly/react-plotly.js/issues/272
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false, })

export function ParallelCoordsPlot(props: ParetoPlotProps) {
    const pareto = props.Pareto
    
    const objectives = pareto[Object.keys(pareto)[0]].objectives
    
    const data = pareto[Object.keys(pareto)[0]].data 

    const numGen = useMemo(function () {
        return data.length
    }, [])

    // We manage the selected state to display only data of selected generation.
    const [selectedGen, setSelectedGen] = useState(numGen)

    // Maintain the state of the animation if its playing or not
    const [playing, setPlaying] = useState(false)

    // Maintain the state of the setInterval Object that is used to play
    // We keep this so we can clear it when component is unmounted
    const [playingInterval, setPlayingInterval] = useState(null)

    const genData = data.find( item => item.id === `Gen ${selectedGen || 1}`)
    console.debug("data", data)
    const dimensions = objectives.map((objective, idx) => {
        const values = genData.data.map(item => item[`objective${idx}`])
        const minObjectiveValue = Math.min(...data.flatMap(gen => gen.data.map(cid => cid[`objective${idx}`])))
        const maxObjectiveValue = Math.max(...data.flatMap(gen => gen.data.map(cid => cid[`objective${idx}`])))
        const range = [minObjectiveValue, maxObjectiveValue]
        console.debug("range", range)
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
                dimensions: dimensions,
                line: {color: genData.data.map((o, idx) => idx)}
            },
        ]}
        layout={{autosize: true, showlegend: true}}
        style={{width: "100%"}}
    />


    // No setup but returning a teardown function that clears the timer if it hadn't
    // been cleaned up.
    // The timer gets cleaned up when either the stop animation button is pressed or
    // the animation ends. But if the Run drawer is closed before that happens - the timer
    // does not get cleaned up. This ensures that it gets cleaned up on unmount
    useEffect(function () {
        if (playingInterval) {
            return function cleanup() {
                clearInterval(playingInterval)
            }
        }
    }, [])
    
    // Generate mars for the slider
    const marks = {}
    marks[numGen + 1] = `All Gen`
    
    return <>
        <div id={ `${props.id || "parallel-coords-plot"}` }>
            <div id="pareto-plot-div" className="flex mt-4 ">
                <Button id="generation-play-button"
                        style={{background: MaximumBlue, borderColor: MaximumBlue}}
                        type="button"
                        className="mr-4"
                        onClick={() => {
                            // If the animation is not playing start the animation by using
                            // a setInterval that updates the states ever half second
                            if (!playing) {
                                if (selectedGen >= numGen) {
                                    setSelectedGen(1)
                                }
                                setPlaying(true)
                                const interval = setInterval(function () {
                                    setSelectedGen(selectedGen => {
                                        if (selectedGen === numGen) {
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
                >
                    {playing ? <FiStopCircle id="generation-play-stop"/> : <FiPlay id="generation-play-play"/>}
                </Button>
    
                <Slider id="selected-generation-slider"
                        defaultValue={numGen}
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
            {plot}
        </div>
    </>
}