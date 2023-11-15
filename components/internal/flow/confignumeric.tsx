import {CSSProperties} from "react"

import {ConfigurableNodeParameter} from "./nodes/generic/types"
import {PredictorParamFields} from "./predictorinfo"

/**
 * This interface is used to define the props that the numeric input expects
 */
interface ConfigNumericProps {
    // Testing id for the component
    id: string

    // Component style
    style?: CSSProperties

    // Name of the parameter represented by the component
    paramName: string

    // Initial value of the component
    value: string | number | boolean

    // Default config for param represented by input
    defaultParam: PredictorParamFields | ConfigurableNodeParameter

    // Function to be called when input changes
    onParamChange: (event, paramName: string) => void
}

/**
 * Interface for numeric input of configured parameters whose
 * min/max/step are data-driven.
 */
export default function ConfigNumeric(props: ConfigNumericProps) {
    /**
     *  Get the step from the default parameter description
     *  @param defaultParam the default parameter
     *  @return the step in the structure, if that exists, or a default
     *      given the parameter's type.
     */
    function getStep(defaultParam: PredictorParamFields | ConfigurableNodeParameter): string {
        // Default step if one is not defined in defaults for param
        let step = "1" // For integers
        if (defaultParam.type === "float") {
            step = "0.01"
        } else if (Object.hasOwn(defaultParam, "step")) {
            step = defaultParam.step.toString()
        }

        return step
    }

    /**
     *  Get the minimum from the default parameter description
     *  @param defaultParam the default parameter
     *  @return the minimum in the structure, if that exists,
     *          undefined if none exists in the defaultParam.
     */
    function getMin(defaultParam: PredictorParamFields | ConfigurableNodeParameter): string {
        // Default min if one is not defined in defaults for param
        return defaultParam.min != null ? defaultParam.min.toString() : null
    }

    /**
     *  Get the maximum from the default parameter description
     *  @param defaultParam the default parameter
     *  @return the maximum in the structure, if that exists,
     *          undefined if none exists in the defaultParam.
     */
    function getMax(defaultParam: PredictorParamFields | ConfigurableNodeParameter): string {
        // Default max if one is not defined in defaults for param
        return defaultParam.max != null ? defaultParam.max.toString() : null
    }

    /**
     *  Get the default value from the default parameter description
     *  @param defaultParam the default parameter description
     *  @return the default_value in the structure, if that exists,
     *          undefined if none exists in the defaultParam.
     */
    function getDefaultValue(defaultParam: PredictorParamFields | ConfigurableNodeParameter): string {
        return defaultParam.default_value != null ? defaultParam.default_value.toString() : null
    }

    const id = props.id
    const param = props.paramName
    const useStep = getStep(props.defaultParam)
    const useMin = getMin(props.defaultParam)
    const useMax = getMax(props.defaultParam)
    const useDefaultValue = getDefaultValue(props.defaultParam)
    const value = props.value != null ? props.value.toString() : useDefaultValue

    return (
        <input
            id={id}
            type="number"
            step={useStep}
            min={useMin}
            max={useMax}
            value={value}
            onChange={(event) => props.onParamChange(event, param)}
            style={props.style}
        />
    )
}
