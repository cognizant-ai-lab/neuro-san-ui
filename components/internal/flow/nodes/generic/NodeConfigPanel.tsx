import InfoIcon from "@mui/icons-material/Info"
import CardContent from "@mui/material/CardContent"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid2"
import Slider from "@mui/material/Slider"
import Tooltip from "@mui/material/Tooltip"
import {Dispatch, SetStateAction} from "react"

import {BaseParameterType, ConfigurableNodeState, NodeParams} from "./types"
import ConfigNumeric from "../../confignumeric"

type NodeConfigStyles = {
    inputsCardHeight?: string
    inputRowWidth?: string
    inputCompnentStyles?: {
        display?: string
        gap?: string
        alignItems?: string
        width?: string
    }
}

type NodeConfigPanelProps = {
    flowPrefix: string
    idExtension: string
    parentNodeState: ConfigurableNodeState
    setParentNodeState: Dispatch<SetStateAction<ConfigurableNodeState>>
    defaultParams?: NodeParams
    inputTypes: Set<string>
    id: string
    customStyles?: NodeConfigStyles
    readOnlyNode: boolean
}

const NodeConfigPanel = ({
    flowPrefix,
    idExtension,
    parentNodeState,
    setParentNodeState,
    defaultParams,
    inputTypes,
    id,
    customStyles,
    readOnlyNode,
}: NodeConfigPanelProps) => {
    /**
     * This function is used to update the state of any parameter based on a user event (e.g. onChange)
     *
     * @param event UI event that triggered the change
     * @param paramName Name of the parameter that changed
     */
    const onParamChange = (event, paramName: string) => {
        const {value} = event.target
        const paramsCopy = {...parentNodeState.params}
        switch (paramsCopy[paramName].type) {
            case BaseParameterType.INT:
            case BaseParameterType.FLOAT:
                paramsCopy[paramName].value = Number(value)
                break
            case BaseParameterType.BOOLEAN:
                paramsCopy[paramName].value = Boolean(value)
                break
            case BaseParameterType.STRING:
            case BaseParameterType.ENUM:
            default:
                paramsCopy[paramName].value = value
        }

        setParentNodeState({
            ...parentNodeState,
            params: paramsCopy,
        })
    }

    const onCheckboxChange = (event, paramName) => {
        /*
        This function is used to update the state of any checkbox parameters
        */
        const {checked} = event.target
        const paramsCopy = {...parentNodeState.params}
        paramsCopy[paramName].value = checked
        setParentNodeState({...parentNodeState, params: paramsCopy})
    }

    const onTrainSliderChange = (_event: Event, newValue: number | number[]) => {
        const newTestSliderValue = 100 - (newValue as number)
        setParentNodeState({
            ...parentNodeState,
            testSliderValue: newTestSliderValue,
            trainSliderValue: newValue as number,
        })
    }

    const onTestSliderChange = (_event: Event, newValue: number | number[]) => {
        const newTrainSliderValue = 100 - (newValue as number)
        setParentNodeState({
            ...parentNodeState,
            testSliderValue: newValue as number,
            trainSliderValue: newTrainSliderValue,
        })
    }

    const marks = [
        {value: 0, label: "0%"},
        {value: 100, label: "100%"},
    ]

    const sliderComponent = inputTypes.has("sliders") && (
        <CardContent id={`${flowPrefix}-data-split-configuration-panel${idExtension}`}>
            <Container id={`${flowPrefix}-data-split-config${idExtension}`}>
                {parentNodeState.trainSliderValue != null && (
                    <Grid
                        id={`${flowPrefix}-train${idExtension}`}
                        style={{
                            marginLeft: "0.5rem",
                            marginRight: "0.5rem",
                            marginTop: "2rem",
                            marginBottom: "2rem",
                        }}
                    >
                        <Grid id={`${flowPrefix}-train-label${idExtension}`}>Train:</Grid>
                        <Grid id={`${flowPrefix}-train-slider${idExtension}`}>
                            <Slider
                                id={`${flowPrefix}-train-slider-component${idExtension}`}
                                onChange={onTrainSliderChange}
                                min={0}
                                max={100}
                                value={parentNodeState.trainSliderValue}
                                marks={marks}
                                disabled={readOnlyNode}
                                valueLabelDisplay="auto"
                                size="small"
                                sx={{
                                    "& .MuiSlider-rail": {
                                        backgroundColor: "var(--bs-gray-medium)",
                                    },
                                    "& .MuiSlider-track": {
                                        backgroundColor: "#abe2fb",
                                    },
                                }}
                            />
                        </Grid>
                    </Grid>
                )}

                {parentNodeState.testSliderValue != null && (
                    <Grid
                        id={`${flowPrefix}-test${idExtension}`}
                        style={{
                            marginLeft: "0.5rem",
                            marginRight: "0.5rem",
                            marginTop: "2rem",
                            marginBottom: "2rem",
                        }}
                    >
                        <Grid id={`${flowPrefix}-test-label${idExtension}`}>Test:</Grid>
                        <Grid id={`${flowPrefix}-test-slider${idExtension}`}>
                            <Slider
                                id={`${flowPrefix}-test-slider-component${idExtension}`}
                                onChange={onTestSliderChange}
                                min={0}
                                max={100}
                                value={parentNodeState.testSliderValue}
                                marks={marks}
                                disabled={readOnlyNode}
                                valueLabelDisplay="auto"
                                size="small"
                                sx={{
                                    "& .MuiSlider-rail": {
                                        backgroundColor: "var(--bs-gray-medium)",
                                    },
                                    "& .MuiSlider-track": {
                                        backgroundColor: "#abe2fb",
                                    },
                                }}
                            />
                        </Grid>
                    </Grid>
                )}

                {Object.keys(parentNodeState).includes("rngSeedValue") && (
                    <Grid
                        id={`${flowPrefix}-split-rng-seed${idExtension}`}
                        style={{
                            marginLeft: "0.5rem",
                            marginRight: "0.5rem",
                            marginTop: "2rem",
                            marginBottom: "2rem",
                        }}
                    >
                        <Grid id={`${flowPrefix}-split-rng-seed-label${idExtension}`}>RNG seed:</Grid>
                        <Grid id={`${flowPrefix}-split-rng-seed-column${idExtension}`}>
                            <input
                                id={`${flowPrefix}-split-rng-seed-input${idExtension}`}
                                type="number"
                                min={0}
                                value={parentNodeState.rngSeedValue}
                                disabled={readOnlyNode}
                                onChange={(event) => {
                                    setParentNodeState({
                                        ...parentNodeState,
                                        rngSeedValue: parseInt(event.target.value),
                                    })
                                }}
                                style={{width: "50%"}}
                            />
                        </Grid>
                    </Grid>
                )}
            </Container>
        </CardContent>
    )

    const hasParams =
        parentNodeState.params && Object.keys(parentNodeState.params).length && Object.keys(defaultParams).length

    const inputsComponent = inputTypes.has("inputs") && (
        <CardContent
            id={id}
            sx={{
                fontSize: "0.75rem",
                height: customStyles?.inputsCardHeight || "10rem",
                overflowY: "scroll",
                paddingLeft: "1rem",
                paddingRight: "1rem",
            }}
        >
            {hasParams ? (
                Object.keys(defaultParams).map((param) => (
                    <div
                        id={`${flowPrefix}-${param}-input-component${idExtension}`}
                        key={param}
                        style={{
                            ...customStyles?.inputCompnentStyles,
                            display: "grid",
                            gridTemplateColumns: "repeat(8, 1fr)",
                            gap: "0.5rem",
                            marginBottom: "0.75rem",
                        }}
                    >
                        <div
                            id={`${flowPrefix}-${param}-input-component-div${idExtension}`}
                            style={{gridColumn: "span 3 / span 3"}}
                        >
                            <label
                                id={`${flowPrefix}-${param}-label${idExtension}`}
                                style={{textTransform: "capitalize"}}
                            >
                                {param}:
                            </label>
                        </div>
                        <div
                            id={`${flowPrefix}-${param}-data-type-div${idExtension}`}
                            style={{
                                gridColumn: "span 4 / span 4",
                                width: customStyles?.inputRowWidth || undefined,
                            }}
                        >
                            {(defaultParams[param].type === BaseParameterType.INT ||
                                defaultParams[param].type === BaseParameterType.FLOAT) && (
                                <ConfigNumeric
                                    id={`${flowPrefix}-${param}-value${idExtension}`}
                                    paramName={param}
                                    defaultParam={defaultParams[param]}
                                    value={
                                        parentNodeState.params[param]?.value !== null &&
                                        parentNodeState.params[param].value
                                    }
                                    onParamChange={(event) => onParamChange(event, param)}
                                    style={{width: "100%"}}
                                    disabled={readOnlyNode}
                                />
                            )}
                            {defaultParams[param].type === BaseParameterType.BOOLEAN && (
                                <input
                                    id={`${flowPrefix}-${param}-value${idExtension}`}
                                    type="checkbox"
                                    disabled={readOnlyNode}
                                    checked={
                                        parentNodeState.params[param]?.value == null
                                            ? defaultParams[param].default_value == null
                                                ? undefined
                                                : Boolean(defaultParams[param].default_value)
                                            : Boolean(parentNodeState.params[param].value)
                                    }
                                    onChange={(event) => onCheckboxChange(event, param)}
                                />
                            )}
                            {defaultParams[param].type === BaseParameterType.ENUM && (
                                <select
                                    id={`${flowPrefix}-${param}-value${idExtension}`}
                                    value={
                                        parentNodeState.params[param]?.value == null
                                            ? defaultParams[param].default_value == null
                                                ? undefined
                                                : defaultParams[param].default_value?.toString()
                                            : parentNodeState.params[param].value?.toString()
                                    }
                                    onChange={(event) => onParamChange(event, param)}
                                    style={{padding: 0, width: "100%"}}
                                >
                                    {Object.entries(defaultParams[param].enum).map((value) => {
                                        // if enum is numeric, we want the value of the property
                                        const enumIsNumeric = value[0].includes("NUM_")
                                        return (
                                            <option
                                                id={`${flowPrefix}-${param}-${value[0]}${idExtension}`}
                                                key={value[0]}
                                                disabled={readOnlyNode}
                                                value={value[1].toString()}
                                            >
                                                {enumIsNumeric ? value[1].toString() : value[0]}
                                            </option>
                                        )
                                    })}
                                </select>
                            )}
                            {defaultParams[param].type === BaseParameterType.STRING ? (
                                inputTypes.has("showTextArea") ? (
                                    <textarea
                                        style={{width: "100%", fontFamily: "monospace"}}
                                        rows={defaultParams[param].rows || 10}
                                        id={`${flowPrefix}-${param}-value${idExtension}`}
                                        onChange={(event) => onParamChange(event, param)}
                                        disabled={readOnlyNode}
                                    >
                                        {(
                                            parentNodeState.params[param]?.value ??
                                            defaultParams?.[param]?.default_value
                                        )?.toString()}
                                    </textarea>
                                ) : (
                                    <input
                                        id={`${flowPrefix}-${param}-value${idExtension}`}
                                        type="text"
                                        defaultValue={defaultParams[param].default_value?.toString()}
                                        value={parentNodeState.params[param]?.value?.toString()}
                                        onChange={(event) => onParamChange(event, param)}
                                        disabled={readOnlyNode}
                                        style={{width: "100%"}}
                                    />
                                )
                            ) : null}
                            {defaultParams[param].type === BaseParameterType.PASSWORD && (
                                <input
                                    id={`${flowPrefix}-${param}-value${idExtension}`}
                                    type="password"
                                    defaultValue={defaultParams[param].default_value?.toString()}
                                    value={parentNodeState.params[param]?.value?.toString()}
                                    onChange={(event) => onParamChange(event, param)}
                                    disabled={readOnlyNode}
                                    style={{width: "100%"}}
                                />
                            )}
                        </div>
                        <div
                            id={`${flowPrefix}-${param}-tooltip-div${idExtension}`}
                            style={{gridColumn: "span 1 / span 1"}}
                        >
                            <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - Tooltip does not have an id property when compiling
                                title={defaultParams?.[param].description}
                            >
                                <InfoIcon
                                    id={`${flowPrefix}-${param}-tooltip-info-sign-icon${idExtension}`}
                                    sx={{width: "21px", height: "21px"}}
                                />
                            </Tooltip>
                        </div>
                    </div>
                ))
            ) : (
                <p id="no-config-params">No config settings available for this predictor type.</p>
            )}
        </CardContent>
    )

    return (
        <>
            {inputsComponent}
            {sliderComponent}
        </>
    )
}

export default NodeConfigPanel
