
/**
 * This interface is used to define the props that the slider expects
 */
interface ConfigNumericProps {

    // Testing id for the component
    id: string,

    // Name of the parameter represented by the component
    ParamName: string,

    // Initial value of the component
    Value: number,

    // Default config for param represented by input
    DefaultParam: object,

    // Function to be called when input changes
    OnParamChange
}


export default function ConfigNumeric(props: ConfigNumericProps) {

    function getStepFromDefaultParam(defaultParam): string {
        /*
        Get the step from the default parameter description
        @param defaultParam the default parameter
        @return the step in the structure, if that exists, or a default
                given the parameter's type.
        */

        // Default step if one is not defined in defaults for param
        step = "1"  // For integers
        if (defaultParam.type === "float") {
            step = "0.01"
        }

        if (defaultParam.hasOwnProperty('step')) {
            step = defaultParam.step
        }

        return step
    }

    function getMinFromDefaultParam(defaultParam): string {
        /*
        Get the minimum from the default parameter description
        @param defaultParam the default parameter
        @return the minimum in the structure, if that exists,
                undefined if none exists in the defaultParam.
        */

        // Default min if one is not defined in defaults for param
        min = undefined
        if (defaultParam.hasOwnProperty('min')) {
            min = defaultParam.min.toString()
        }

        return min
    }

    function getMaxFromDefaultParam(defaultParam): string {
        /*
        Get the maximum from the default parameter description
        @param defaultParam the default parameter
        @return the maximum in the structure, if that exists,
                undefined if none exists in the defaultParam.
        */

        // Default max if one is not defined in defaults for param
        max = undefined
        if (defaultParam.hasOwnProperty('max')) {
            max = defaultParam.max.toString()
        }

        return max
    }

    function getDefaultValueFromDefaultParam(defaultParam): string {
        /*
        Get the default value from the default parameter description
        @param defaultParam the default parameter description
        @return the default_value in the structure, if that exists,
                undefined if none exists in the defaultParam.
        */

        default_value = undefined
        if (defaultParam.hasOwnProperty('default_value')) {
            default_value = defaultParam.default_value.toString()
        }

        return default_value
    }


    const id = props.id
    const param = props.ParamName
    const useStep = getStepFromDefaultParam(props.DefaultParam)
    const useMin = getMinFromDefaultParam(props.DefaultParam)
    const useMax = getMaxFromDefaultParam(props.DefaultParam)
    const useDefaultValue = getDefaultValueFromDefaultParam(props.DefaultParam)
    const value = props.Value.toString()

    return  <input id={ `${id}` }
                type="number"
                step={ `${useStep}` }
                min={ `${useMin}` }
                max={ `${useMax}` }
                defaultValue={ `${useDefaultValue}` }
                value={ `${value}` }
                onChange={event => props.OnParamChange(event, param)}
            />
}
