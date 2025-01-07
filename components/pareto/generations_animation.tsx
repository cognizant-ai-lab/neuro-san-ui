import {Button} from "@mui/material"
import FormControl from "@mui/material/FormControl"
import MenuItem from "@mui/material/MenuItem"
import Select from "@mui/material/Select"
import Slider from "@mui/material/Slider"
import {useEffect, useState} from "react"
import {FiPlay, FiStopCircle} from "react-icons/fi"

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
    SetSelectedGen: (gen: number | ((prevGen: number) => number)) => void

    // Currently selected generation
    SelectedGen: number

    // Whether the type of plot allows user to show all generations simultaneously
    ShowAllGenerations?: boolean

    // Delay between frames in ms
    FrameDelayMs?: number

    // Function to update currently playing state
    SetPlaying: (playing: boolean) => void

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

    const setSelectedGen: (gen: number | ((prevGen: number) => number)) => void = props.SetSelectedGen

    const setPlaying: (playing: boolean) => void = props.SetPlaying
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
    const [playbackSpeed, setPlaybackSpeed] = useState(playbackSpeedOptions[3].value)

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

    const marks = []
    for (let i = 1; i <= numberOfGenerations; i += 1) {
        // Add marks for ends of range of generations
        if (i === 1 || i === numberOfGenerations) {
            marks.push({label: i, value: i})
        }
        // Add marks, without a label, for the rest (which are all the points between the start and the end)
        marks.push({label: "", value: i})
    }

    const maxGenerations = showAllGenerations ? numberOfGenerations + 1 : numberOfGenerations

    // Allow user to show all generations at once, if permitted by plot type
    if (showAllGenerations) {
        marks.push({
            value: maxGenerations,
            label: "All Gen",
        })
    }

    return (
        <>
            <div
                id={id}
                className="flex mt-4"
            >
                <Button
                    id="generation-play-button"
                    sx={{
                        background: "var(--bs-primary) !important",
                        borderColor: "var(--bs-primary) !important",
                        borderRadius: "10px",
                        marginRight: "1rem",
                    }}
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

                            // Give the component some time to render otherwise we don't start back at selectedGen = 1
                            setTimeout(() => {
                                // Just divide by the current scaling value to get how long we should pause between
                                // frames. For example, if we would normally pause 100ms, and playback speed is 2x,
                                // divide: 100ms / 2.0 = 50ms and that's how long we wait, resulting in 2x speed
                                // playback.
                                const adjustedFrameDelay = frameDelayMs / parseFloat(playbackSpeed)
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
                            }, 150)
                        }
                    }}
                >
                    {playing ? (
                        <FiStopCircle
                            id="generation-play-stop"
                            style={{color: "white"}}
                            size={25}
                        />
                    ) : (
                        <FiPlay
                            id="generation-play-play"
                            style={{color: "white"}}
                            size={25}
                        />
                    )}
                </Button>
                <FormControl
                    sx={{alignItems: "self-end"}}
                    id="select-playback-speed-form-control"
                >
                    <Select
                        id="select-playback-speed"
                        disabled={playing}
                        sx={{width: "100px", height: "100%", margin: "0 25px"}}
                        value={playbackSpeed}
                        onChange={(event) => {
                            setPlaybackSpeed(event.target.value)
                        }}
                    >
                        {playbackSpeedOptions.map((item) => (
                            <MenuItem // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                id={`select-playback-speed-${item.value}`}
                                key={item.value}
                                value={item.value}
                            >
                                {item.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Slider
                    id="selected-generation-slider"
                    defaultValue={numberOfGenerations}
                    marks={marks}
                    min={1}
                    max={maxGenerations}
                    value={selectedGen}
                    disabled={playing}
                    onChange={(_event: Event, newValue: number | number[]) => {
                        // We can safely cast to number here because we know it's a single value. Only range sliders
                        // would return an array, which is not what we have here.
                        setSelectedGen(newValue as number)
                    }}
                    sx={{
                        marginRight: "1.5rem",
                        width: "100%",
                        // "All Gen" label styling
                        "& .MuiSlider-markLabel:nth-last-child(2)": {
                            marginTop: "-50px", // To move it above the slider to avoid clashing with generation label
                            textDecoration: "underline",
                        },
                    }}
                />
            </div>
            {plot}
        </>
    )
}
