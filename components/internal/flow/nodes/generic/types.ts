import {StringBool} from "../../../../../controller/base_types"
/**
 * Common types for flow nodes
 */

/**
 * Type that encapsulates string and numeric enums
 */
type Enum = Record<string, string | number>

/*
A note on the redundancy between `ParameterType` and `BaseParameterType`: these are both used to describe the type of
a parameter. To summarize, `ParameterType` is used for the Typescript compiler, whereas `BaseParameterType` is used for
application code (see descriptions of the type and enum below for more details).

It's possible these two can be combined at some point.

Even better, it's possible we could handle this whole parameter typing via Typescript generics, so we wouldn't need
this internal second-class-citizen type system in the first place. This would be a good thing to do at some point.
The main issue with the Generics approach is type erasure in Typescript: namely, you can't reflect on which particular
instantiation of the Generic class you have at runtime. So you can't say "For this instance of `Foo<T>`, if T is a
`string`, do this, else if T is a `number`, do that". This is a problem for us because we need to be able to reflect
on the type in order to render the node configuration using the correct UI elements.
 */

// Use for strict typing of the value of parameters, so Typescript can catch issues
type ParameterType = boolean | number | string | Enum

// Used for nodes to reflect on the type of each parameter and potentially do different things depending on the type.
// For example, a boolean parameter might be rendered as a checkbox, while a string parameter might be rendered as a
// text field, and an enum parameter might be rendered as a dropdown.
// no-shadow doesn't do well with enums. Search their github issues if you're curious.
// eslint-disable-next-line no-shadow
export enum BaseParameterType {
    BOOLEAN,
    STRING,
    INT,
    FLOAT,
    ENUM,
    ARRAY,
    PASSWORD,
}

export interface CAOChecked {
    context?: StringBool
    action?: StringBool
    outcome?: StringBool
}

export interface ConfigurableNodeParameter {
    description?: string

    // Data type of the parameter
    type?: BaseParameterType

    // Associated enum, if this is an enum type parameter
    enum?: Enum

    // Default value for the field
    default_value?: ParameterType

    // Value is an optional field that can be used within a form
    // etc to denote user input
    value?: ParameterType

    min?: number
    max?: number
    step?: number

    isAdvanced?: boolean

    rows?: number

    typeArray?: string[] | number[]
}

export interface NodeParams {
    [key: string]: ConfigurableNodeParameter
}

export interface ConfigurableNodeState {
    selectedPredictorType?: string
    selectedPredictor?: string
    selectedMetric?: string
    caoState?: CAOChecked
    trainSliderValue?: number
    testSliderValue?: number
    rngSeedValue?: number | null
    params: {
        [key: string]: ConfigurableNodeParameter
    }
}
