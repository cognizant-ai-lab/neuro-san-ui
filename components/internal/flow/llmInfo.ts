/*
Configuration settings and constants for LLM model node configuration popup
 */

type LlmParameterType = boolean|number|string|[]

export enum ParamType {
    BOOLEAN,
    STRING,
    INT,
    FLOAT,
    ENUM
}

enum LlmModel {
    "Google PaLM 2" = "google_palm_2",
    "GPT 3.5 turbo" = "gpt-3.5-turbo",
    "GPT 4" = "gpt-4",
    "Azure GPT 3.5 turbo" = "azure-gpt-3.5-turbo",
    "Azure GPT 4" = "azure-gpt-4",
    "Vicuna" = "Vicuna",
    "Bring your own model" = "byom"
}

enum PromptTemplate {
    "Repair data" = "Repair data",
    "Augment data" = "Augment data",
    "Augment and repair data" = "Augment and repair data"
}

interface LlmParamField {
    description: string,

    // Data type of the parameter
    type: ParamType,

    // List of all available values. Only used for Enum types.
    allValues?: string[]

    // Default value for the field
    default_value: LlmParameterType

    // Value is an optional field that can be used within a form
    // etc to denote user input
    value?: LlmParameterType

    min?: number,
    max?: number,
    step?: number,

    isAdvanced: boolean,

    rows?: number
}

export interface LlmModelParams {
    [key: string]: LlmParamField
}

export const LLM_MODEL_PARAMS: LlmModelParams = {
    "model": {
        default_value: LlmModel["GPT 3.5 turbo"].valueOf(),
        description: "Large Language Model (LLM) to be used",
        type: ParamType.ENUM,
        allValues: Object.values(LlmModel).filter((v) => isNaN(Number(v))).map(v => String(v)),
        isAdvanced: false
    },
    "temperature": {
        default_value: 0.2,
        description:
            `The temperature controls how much randomness is in the output. In general, the lower the temperature, the more ` +
            `likely GPT-3 will choose words with a higher probability of occurrence`,
        type: ParamType.FLOAT,
        isAdvanced: false
    },
    "prompt_template": {
        default_value: PromptTemplate["Repair data"].valueOf(),
        description: "Choose a pre-created template or write your own prompt",
        type: ParamType.ENUM,
        allValues: Object.values(PromptTemplate).filter((v) => isNaN(Number(v))).map(v => String(v)),
        isAdvanced: false
    },

    "system_prompt": {
        default_value:
`The data below is incomplete and includes NA values. Also, the <field2> field is unstructured.

Fill in any NA field with an appropriate value and classify the <field2> field into a new column titled <field3>,
with one of the following values: low, moderate, high: <field1>`,
        description: "System prompt for the LLM",
        type: ParamType.STRING,
        isAdvanced: false
    },
    "<Field1>": {
        default_value: "Data Source",
        description: "",
        type: ParamType.STRING,
        isAdvanced: false,
        rows: 1
    },
    "<Field2>": {
        default_value: "Content",
        description: "",
        type: ParamType.STRING,
        isAdvanced: false,
        rows: 1
    },
    "<Field3>": {
        default_value: "Reputational Risk",
        description: "",
        type: ParamType.STRING,
        isAdvanced: false,
        rows: 1
    }
}

/*

 */
export const LLM_MODEL_PARAMS2: LlmModelParams = {
    "model": {
        default_value: LlmModel["GPT 3.5 turbo"].valueOf(),
        description: "Large Language Model (LLM) to be used",
        type: ParamType.ENUM,
        allValues: Object.values(LlmModel).filter((v) => isNaN(Number(v))).map(v => String(v)),
        isAdvanced: false
    },
    "temperature": {
        default_value: 0.2,
        description:
            `The temperature controls how much randomness is in the output. In general, the lower the temperature, the more ` +
            `likely GPT-3 will choose words with a higher probability of occurrence`,
        type: ParamType.FLOAT,
        allValues: Object.values(LlmModel).filter((v) => isNaN(Number(v))).map(v => String(v)),
        isAdvanced: false
    },
    "prompt_template": {
        default_value: PromptTemplate["Repair data"].valueOf(),
        description: "Choose a pre-created template or write your own prompt",
        type: ParamType.ENUM,
        allValues: Object.values(PromptTemplate).filter((v) => isNaN(Number(v))).map(v => String(v)),
        isAdvanced: false
    },

    "system_prompt": {
        default_value:
`In the table below, change the value of the ESP TYPE field to ‘Outcome’ if the attribute is a decision objective 
that is affected by the choice of actions, and change it to ‘Action’ an action that can be taken 
in order to optimize outcomes.
 
Also, using the DB API, analyze the data and provide a sensitivity analysis.
 
Finally, given the data description is <field1>, devise some analysis on the data and provide any interesting patterns 
or insights you observe, along with charts baking your observations.`,
        description: "System prompt for the LLM",
        type: ParamType.STRING,
        isAdvanced: false
    }
}

export const LLM_MODEL_PARAMS3: LlmModelParams = {
    "model": {
        default_value: LlmModel["GPT 3.5 turbo"].valueOf(),
        description: "Large Language Model (LLM) to be used",
        type: ParamType.ENUM,
        allValues: Object.values(LlmModel).filter((v) => isNaN(Number(v))).map(v => String(v)),
        isAdvanced: false
    },

    "temperature": {
        default_value: 0.2,
        description:
`The temperature controls how much randomness is in the output. In general, the lower the temperature, the more ` +
`likely the LLM model will choose words with a higher probability of occurrence`,
        type: ParamType.FLOAT,
        allValues: Object.values(LlmModel).filter((v) => isNaN(Number(v))).map(v => String(v)),
        isAdvanced: false
    },

    "prompt_template": {
        default_value: PromptTemplate["Repair data"].valueOf(),
        description: "Choose a pre-created template or write your own prompt",
        type: ParamType.ENUM,
        allValues: Object.values(PromptTemplate).filter((v) => isNaN(Number(v))).map(v => String(v)),
        isAdvanced: false
    },

    "system_prompt": {
        default_value:
`For data sample <field1>, given the actions <field2> generated by the Prescriptor, use the API call <field3>, ` +
`with description <field4> to implement the action. Classify the result of the API call above as to adherence to 
Responsible AI policies <field5>.`,
        description: "System prompt for the LLM",
        type: ParamType.STRING,
        isAdvanced: false
    }
}

