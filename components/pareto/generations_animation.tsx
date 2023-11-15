import {Slider} from "antd"
import {useEffect, useState} from "react"
import {Button} from "react-bootstrap"
import {FiPlay, FiStopCircle} from "react-icons/fi"
import Select from "react-select"

import {MaximumBlue} from "../../const"

/**
 * Params for the GenerationsAnimation component.
 */
interface GenerationsAnimationParams {
    // id to be used for generated component
    id?: string

    // The inner plot to be animated
    Plot: JSX.Element

    // Total number of generations for this animation
    NumberOfGenerations: number

    // Function to updated selected generation in the parent when user clicks
    SetSelectedGen: (number) => void

    // Currently selected generation
    SelectedGen: number

    // Whether the type of plot allows user to show all generations simultaneously
    ShowAllGenerations?: boolean

    // Delay between frames in ms
    FrameDelayMs?: number

    // Function to update currently playing state
    SetPlaying: (boolean) => void

    // Current playing state
    Playing: boolean
}

/**
 * Used for animating a plot over a number of generations. Shows a slider with a "play" button, and allows user to
 * play and stop the animation, or select a single generation for display.
 *
 * @param props See {@link GenerationsAnimationParams}.
 */
export function GenerationsAnimation(props: GenerationsAnimationParams) {
    const id = props.id || "generations-animation-main"

    const plot: JSX.Element = props.Plot
    const numberOfGenerations: number = props.NumberOfGenerations
    const selectedGen: number = props.SelectedGen

    const setSelectedGen: (number) => void = props.SetSelectedGen

    const setPlaying: (boolean) => void = props.SetPlaying
    const playing = props.Playing

    const showAllGenerations = props?.ShowAllGenerations ?? true

    const frameDelayMs = props?.FrameDelayMs ?? 100

    // Maintain the state of the setInterval Object (interval timer) that is used to play
    // We keep this so we can clear it when component is unmounted
    const [playingInterval, setPlayingInterval] = useState(null)

    // The various playback speeds. The "value" property is used to scale the interval between frames.
    const playbackSpeedOptions = [
        {value: "0.1", label: "0.10x"},
        {value: "0.25", label: "0.25x"},
        {value: "0.5", label: "0.5x"},
        {value: "1.0", label: "1.0x"},
        {value: "2", label: "2.0x"},
        {value: "4", label: "4.0x"},
        {value: "8", label: "8.0x"},
    ]

    // Current playback speed. Default to 1.0x
    const [playbackSpeed, setPlaybackSpeed] = useState(playbackSpeedOptions[3])

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
        }

        return undefined
    }, [])

    // Allow user to show all generations at once, if permitted by plot type
    const marks = {}
    if (showAllGenerations) {
        marks[numberOfGenerations + 1] = {
            label: "All Gen",
            style: {
                marginTop: "-45px", // To move it above the slider to avoid clashing with generation label
                textDecoration: "underline",
            },
        }
    }

    // Add marks for ends of range of generations
    marks[1] = 1
    marks[numberOfGenerations] = numberOfGenerations

    const maxGenerations = showAllGenerations ? numberOfGenerations + 1 : numberOfGenerations

    return (
        <>
            <div
                id={id}
                className="flex mt-4"
            >
                <Button
                    id="generation-play-button"
                    style={{background: MaximumBlue, borderColor: MaximumBlue}}
                    type="button"
                    className="mr-4"
                    onClick={() => {
                        // If the animation is not playing start the animation by using
                        // a setInterval that updates the states every frameDelayMs milliseconds
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

                            // Just divide by the current scaling value to get how long we should pause between
                            // frames. For example, if we would normally pause 100ms, and playback speed is 2x,
                            // divide: 100ms / 2.0 = 50ms and that's how long we wait, resulting in 2x speed playback.
                            const adjustedFrameDelay = frameDelayMs / parseFloat(playbackSpeed.value)
                            const interval = setInterval(() => {
                                setSelectedGen((generationNumber) => {
                                    if (generationNumber === numberOfGenerations) {
                                        clearInterval(interval)
                                        setPlaying(false)
                                        return generationNumber
                                    }
                                    return generationNumber + 1
                                })
                            }, adjustedFrameDelay)
                            setPlayingInterval(interval)
                        }
                    }}
                >
                    {playing ? <FiStopCircle id="generation-play-stop" /> : <FiPlay id="generation-play-play" />}
                </Button>
                <Select
                    id="select-playback-speed"
                    isDisabled={playing}
                    styles={{control: (styles) => ({...styles, width: "100px", height: "100%", margin: "0 25px"})}}
                    options={playbackSpeedOptions}
                    value={playbackSpeed}
                    onChange={(newOption) => setPlaybackSpeed(newOption)}
                />
                <Slider
                    id="selected-generation-slider"
                    defaultValue={numberOfGenerations}
                    marks={marks}
                    min={1}
                    max={maxGenerations}
                    value={selectedGen}
                    dots={true}
                    disabled={playing}
                    onChange={(value) => {
                        setSelectedGen(value)
                    }}
                    handleStyle={{
                        borderColor: MaximumBlue,
                        color: MaximumBlue,
                    }}
                    trackStyle={{
                        backgroundColor: MaximumBlue,
                    }}
                    className="w-full mr-6"
                />
            </div>
            {plot}
        </>
    )
}
