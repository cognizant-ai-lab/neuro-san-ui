import InfoIcon from "@mui/icons-material/Info"
import CardContent from "@mui/material/CardContent"
import Container from "@mui/material/Container"
import Grid from "@mui/material/Grid2"
import Tooltip from "@mui/material/Tooltip"
import "rc-slider/assets/index.css"
import Slider from "rc-slider"
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

    const onTrainSliderChange = (newValue) => {
        const newTestSliderValue = 100 - newValue
        setParentNodeState({
            ...parentNodeState,
            testSliderValue: newTestSliderValue,
            trainSliderValue: newValue,
        })
    }

    const onTestSliderChange = (newValue) => {
        const newTrainSliderValue = 100 - newValue
        setParentNodeState({
            ...parentNodeState,
            testSliderValue: newValue,
            trainSliderValue: newTrainSliderValue,
        })
    }

    const marks = {
        0: {label: "0%"},
        100: {label: "100%", style: {color: "#53565A"}}, // To prevent end mark from being "grayed out"
    }

    const sliderComponent = inputTypes.has("sliders") && (
        <CardContent id={`${flowPrefix}-data-split-configuration-panel${idExtension}`}>
            <Container id={`${flowPrefix}-data-split-config${idExtension}`}>
                {parentNodeState.trainSliderValue && (
                    <Grid
                        id={`${flowPrefix}-train${idExtension}`}
                        className="mx-2 my-8"
                    >
                        <Grid id={`${flowPrefix}-train-label${idExtension}`}>Train:</Grid>
                        <Grid id={`${flowPrefix}-train-slider${idExtension}`}>
                            <Slider // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - Slider does not have an id property when compiling
                                onChange={(event) => onTrainSliderChange(event)}
                                min={0}
                                max={100}
                                value={parentNodeState.trainSliderValue}
                                marks={marks}
                                disabled={readOnlyNode}
                                handleRender={(node) => {
                                    return (
                                        <Tooltip
                                            id={`${flowPrefix}-train-slider-tooltip${idExtension}`}
                                            title={`${parentNodeState.trainSliderValue}%`}
                                        >
                                            {node}
                                        </Tooltip>
                                    )
                                }}
                            />
                        </Grid>
                    </Grid>
                )}

                {parentNodeState.testSliderValue && (
                    <Grid
                        id={`${flowPrefix}-test${idExtension}`}
                        className="mx-2 my-8"
                    >
                        <Grid id={`${flowPrefix}-test-label${idExtension}`}>Test:</Grid>
                        <Grid id={`${flowPrefix}-test-slider${idExtension}`}>
                            <Slider // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - Slider does not have an id property when compiling
                                onChange={(event) => onTestSliderChange(event)}
                                min={0}
                                max={100}
                                value={parentNodeState.testSliderValue}
                                marks={marks}
                                disabled={readOnlyNode}
                                handleRender={(node) => {
                                    return (
                                        <Tooltip
                                            id={`${flowPrefix}-test-slider-tooltip${idExtension}`}
                                            title={`${parentNodeState.testSliderValue}%`}
                                        >
                                            {node}
                                        </Tooltip>
                                    )
                                }}
                            />
                        </Grid>
                    </Grid>
                )}

                {Object.keys(parentNodeState).includes("rngSeedValue") && (
                    <Grid
                        id={`${flowPrefix}-split-rng-seed${idExtension}`}
                        className="mx-2 my-8"
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
                                className="input-field w-50"
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
            className={`overflow-y-scroll ${customStyles?.inputsCardHeight || "h-40"} text-xs pl-4 pr-4`}
            id={id}
        >
            {hasParams ? (
                Object.keys(defaultParams).map((param) => (
                    <div
                        id={`${flowPrefix}-${param}-input-component${idExtension}`}
                        className="grid grid-cols-8 gap-12 mb-3"
                        style={customStyles?.inputCompnentStyles}
                        key={param}
                    >
                        <div
                            id={`${flowPrefix}-${param}-input-component-div${idExtension}`}
                            className="item1 col-span-3"
                        >
                            <label
                                id={`${flowPrefix}-${param}-label${idExtension}`}
                                className="capitalize"
                            >
                                {param}:
                            </label>
                        </div>
                        <div
                            id={`${flowPrefix}-${param}-data-type-div${idExtension}`}
                            className={`item2 col-span-4 ${customStyles?.inputRowWidth || ""}`}
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
                                    style={{width: "100%"}}
                                    id={`${flowPrefix}-${param}-value${idExtension}`}
                                    value={
                                        parentNodeState.params[param]?.value == null
                                            ? defaultParams[param].default_value == null
                                                ? undefined
                                                : defaultParams[param].default_value?.toString()
                                            : parentNodeState.params[param].value?.toString()
                                    }
                                    onChange={(event) => onParamChange(event, param)}
                                    className="w-32 p-0"
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
                                        className="w-full"
                                        type="text"
                                        defaultValue={defaultParams[param].default_value?.toString()}
                                        value={parentNodeState.params[param]?.value?.toString()}
                                        onChange={(event) => onParamChange(event, param)}
                                        disabled={readOnlyNode}
                                    />
                                )
                            ) : null}
                            {defaultParams[param].type === BaseParameterType.PASSWORD && (
                                <input
                                    id={`${flowPrefix}-${param}-value${idExtension}`}
                                    className="w-full"
                                    type="password"
                                    defaultValue={defaultParams[param].default_value?.toString()}
                                    value={parentNodeState.params[param]?.value?.toString()}
                                    onChange={(event) => onParamChange(event, param)}
                                    disabled={readOnlyNode}
                                />
                            )}
                        </div>
                        <div
                            id={`${flowPrefix}-${param}-tooltip-div${idExtension}`}
                            className="item3 col-span-1"
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
