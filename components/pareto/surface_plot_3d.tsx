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

export function SurfacePlot3D(props: ParetoPlotProps) {
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

    console.debug("selected", selectedGen)
    const genData = data.find( item => item.id === `Gen ${selectedGen || 1}`)
    objectives.map((objective, idx) => {
        const values = genData.data.map(item => item[`objective${idx}`])
        return (
            {
                label: objective,
                // range: [Math.min(...values) * 0.95, Math.max(...values) * 1.05],
                // range: [0, 200],
                values: values
            }
        )
    })
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

    const z = useMemo(function () {
        return flatData.map(row => row.objective2)
    }, [])

    const percentMargin = 5/100.0
    
    const minX = useMemo(function () {
        return Math.min(...x) * (1 - percentMargin)
    }, [])

    const minY = useMemo(function () {
        return Math.min(...y)  * (1 - percentMargin)
    }, [])

    const minZ = useMemo(function () {
        return Math.min(...z)  * (1 - percentMargin)
    }, [])

    const maxX = useMemo(function () {
        return Math.max(...x) * (1 + percentMargin)
    }, [])

    const maxY = useMemo(function () {
        return Math.max(...y) * (1 + percentMargin)
    }, [])

    const maxZ = useMemo(function () {
        return Math.max(...z) * (1 + percentMargin)
    }, [])
    const zData = genData.data.map(item => [item.objective0, item.objective1, item.objective2])
    console.log(zData)
    const plot = <Plot // eslint-disable-line enforce-ids-in-jsx/missing-ids
                       // "Plot" lacks an "id" attribute
        data={[
            {
                type: 'mesh3d',
                x: genData.data.map(item => item.objective0),
                y: genData.data.map(item => item.objective1),
                z: genData.data.map(item => item.objective2)
            },
        ]}
        layout={{
            width: 1200, height: 600,
            scene: {
                xaxis: {
                    range: [minX, maxX],
                    title: {
                        text: objectives[0],
                        font: {
                            family: 'Courier New, monospace',
                            size: 18,
                            color: '#7f7f7f'
                        }
                    },
                },
                yaxis: {
                    range: [minY, maxY],
                    title: {
                        text: objectives[1],
                        font: {
                            family: 'Courier New, monospace',
                            size: 18,
                            color: '#7f7f7f'
                        }
                    },
                },
                zaxis: {
                    range: [minZ, maxZ],
                    title: {
                        text: objectives[2],
                        font: {
                            family: 'Courier New, monospace',
                            size: 18,
                            color: '#7f7f7f'
                        }
                    },
                },
            }}}
        style={{width: "100T%"}}
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

        {plot}
        </div>
    </>
}