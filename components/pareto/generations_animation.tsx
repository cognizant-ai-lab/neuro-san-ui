import {Button} from "react-bootstrap"
import {MaximumBlue} from "../../const"
import {FiStopCircle} from "react-icons/fi"
import {FiPlay} from "react-icons/fi"
import {Slider} from "antd"
import React from "react"
import {useEffect} from "react"
import {useState} from "react"

/**
 * Params for the GenerationsAnimation component.
 */
interface GenerationsAnimationParams {
    // id to be used for generated component
    id?: string;
    
    // The inner plot to be animated
    Plot: JSX.Element;
    
    // Total number of generations for this animation
    NumberOfGenerations: number
    
    // Function to updated selected generation in the parent when user clicks
    SetSelectedGen: (number) => void
    
    // Currently selected generation
    SelectedGen: number
}

/**
 * Used for animating a plot over a number of generations. Shows a slider with a "play" button, and allows user to 
 * play and stop the animation, or select a single generation for display.
 * 
 * @param props See {@link GenerationsAnimationParams}.
 */
export function GenerationsAnimation(props: GenerationsAnimationParams) {
    const id = props.id || "generations-animation"

    const plot: JSX.Element = props.Plot
    const numberOfGenerations: number = props.NumberOfGenerations
    const selectedGen: number = props.SelectedGen
    
    const setSelectedGen: (number) => void = props.SetSelectedGen
    
    // Maintain the state of the animation if its playing or not
    const [playing, setPlaying] = useState(false)

    // Maintain the state of the setInterval Object that is used to play
    // We keep this so we can clear it when component is unmounted
    const [playingInterval, setPlayingInterval] = useState(null)
    
    // No setup but returning a teardown function that clears the timer if it hadn't
    // been cleaned up.
    // The timer gets cleaned up when either the stop animation button is pressed or
    // the animation ends. But if the Run drawer is closed before that happens - the timer
    // does not get cleaned up. This ensures that it gets cleaned up on unmount
    useEffect(() => {
        if (playingInterval) {
            return function cleanup() {
                clearInterval(playingInterval)
            }
        } else {
            return null
        }
    }, [])

    // Generate mars for the slider
    const marks = {}
    marks[numberOfGenerations + 1] = `All Gen`
    
    return <div id={id}>
        <div id="generations-animtations-div" className="flex mt-4">
            <Button id="generation-play-button"
                    style={{background: MaximumBlue, borderColor: MaximumBlue}}
                    type="button"
                    className="mr-4"
                    onClick={() => {
                        // If the animation is not playing start the animation by using
                        // a setInterval that updates the states ever half second
                        if (playing) {
                            // If the timer was already started - meaning the stop button is
                            // pressed - clear the timer
                            clearInterval(playingInterval)
                            setPlayingInterval(null)
                            setPlaying(false)
                        } else {
                            if (selectedGen >= numberOfGenerations) {
                                setSelectedGen(1)
                            }
                            setPlaying(true)
                            const interval = setInterval(function () {
                                setSelectedGen(selectedGen => {
                                    if (selectedGen === numberOfGenerations) {
                                        clearInterval(interval)
                                        setPlaying(false)
                                        return selectedGen
                                    }
                                    return selectedGen + 1
                                })
                            }, 100)
                            setPlayingInterval(interval)
                        }

                    }}
            >
                {playing ? <FiStopCircle id="generation-play-stop"/> : <FiPlay id="generation-play-play"/>}
            </Button>

            <Slider id="selected-generation-slider"
                    defaultValue={numberOfGenerations}
                    marks={marks}
                    min={1}
                    max={numberOfGenerations + 1}
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
}
