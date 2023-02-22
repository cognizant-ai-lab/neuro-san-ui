/**
 * This interface is used to define the props that the numeric input expects
 */
interface ConfigNumericProps {

    // Testing id for the component
    id: string,

    // Component style
    style?

    // Name of the parameter represented by the component
    paramName: string,

    // Initial value of the component
    value: string,

    // Default config for param represented by input
    defaultParam: object,

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
    function getStep(defaultParam): string {

        // Default step if one is not defined in defaults for param
        let step = "1"  // For integers
        if (defaultParam.type === "float") {
            step = "0.01"
        }

        if (defaultParam.hasOwnProperty('step')) {
            step = defaultParam.step
        }

        return step
    }

    /**
     *  Get the minimum from the default parameter description
     *  @param defaultParam the default parameter
     *  @return the minimum in the structure, if that exists,
     *          undefined if none exists in the defaultParam.
     */
    function getMin(defaultParam): string {

        // Default min if one is not defined in defaults for param
        const min = defaultParam.min != null && defaultParam.min.toString()
        return min
    }

    /**
     *  Get the maximum from the default parameter description
     *  @param defaultParam the default parameter
     *  @return the maximum in the structure, if that exists,
     *          undefined if none exists in the defaultParam.
     */
    function getMax(defaultParam): string {

        // Default max if one is not defined in defaults for param
        const max = defaultParam.max != null && defaultParam.max.toString()
        return max
    }

    /**
     *  Get the default value from the default parameter description
     *  @param defaultParam the default parameter description
     *  @return the default_value in the structure, if that exists,
     *          undefined if none exists in the defaultParam.
     */
    function getDefaultValue(defaultParam): string {

        const default_value = defaultParam.default_value != null && defaultParam.default_value.toString()
        return default_value
    }


    const id = props.id
    const param = props.paramName
    const useStep = getStep(props.defaultParam)
    const useMin = getMin(props.defaultParam)
    const useMax = getMax(props.defaultParam)
    const useDefaultValue = getDefaultValue(props.defaultParam)
    const value = props.Value.toString()

    return  <input id={id}
                type="number"
                step={useStep}
                min={useMin}
                max={useMax}
                defaultValue={useDefaultValue}
                value={value}
                onChange={event => props.onParamChange(event, param)}
                style={props.style}
            />
}
