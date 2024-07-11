// Too many "unused" enum values to disable individually. The values are used, just not explicitly so the IDE
// scanner (IntelliJ) gets confused.
// noinspection JSUnusedGlobalSymbols

/*
Configuration settings and constants for LLM model node configuration popup
 */

import {BaseParameterType, NodeParams} from "./nodes/generic/types"

// no-shadow doesn't do well with enums. Search their github issues if you're curious.
// eslint-disable-next-line no-shadow
enum LlmModel {
    "OpenAI : gpt-4-turbo" = "gpt-4-turbo",
    "OpenAI : gpt-4" = "gpt-4",
    "OpenAI : gpt-3.5-turbo" = "gpt-3.5-turbo",
    "OpenAI: gpt-4o" = "gpt-4o",
    "Anthropic : claude-3-opus-20240229" = "claude-3-opus-20240229",
    "Anthropic : claude-3-sonnet-20240229" = "claude-3-sonnet-20240229",
    "Anthropic : claude-3-haiku-20240307" = "claude-3-haiku-20240307",
    "Ollama : llama2" = "llama2",
    "Ollama : llama3" = "llama3",
    "Ollama : mistral" = "mistral",
    "Ollama : mixtral" = "mixtral",
}

// no-shadow doesn't do well with enums. Search their github issues if you're curious.
// eslint-disable-next-line no-shadow
enum TokenEncoding {
    /* eslint-disable @typescript-eslint/no-duplicate-enum-values */

    // Sourced from this Python package: <venv>/site-packages/tiktoken/model.py

    // There are dupe values in here since it's a many-to-one mapping. We may do something with the various keys
    // (model names) later.

    "ada" = "r50k_base",
    "babbage" = "r50k_base",
    "code-cushman-001" = "p50k_base",
    "code-cushman-002" = "p50k_base",
    "code-davinci-001" = "p50k_base",
    "code-davinci-002" = "p50k_base",
    "code-davinci-edit-001" = "p50k_edit",
    "code-search-ada-code-001" = "r50k_base",
    "code-search-babbage-code-001" = "r50k_base",
    "curie" = "r50k_base",
    "cushman-codex" = "p50k_base",
    "davinci" = "r50k_base",
    "davinci-codex" = "p50k_base",
    "gpt-3.5-turbo" = "cl100k_base",
    "gpt-4" = "cl100k_base",
    "gpt2" = "gpt2",
    "text-ada-001" = "r50k_base",
    "text-babbage-001" = "r50k_base",
    "text-curie-001" = "r50k_base",
    "text-davinci-001" = "r50k_base",
    "text-davinci-002" = "p50k_base",
    "text-davinci-003" = "p50k_base",
    "text-davinci-edit-001" = "p50k_edit",
    "text-embedding-ada-002" = "cl100k_base",
    "text-search-ada-doc-001" = "r50k_base",
    "text-search-babbage-doc-001" = "r50k_base",
    "text-search-curie-doc-001" = "r50k_base",
    "text-search-davinci-doc-001" = "r50k_base",
    "text-similarity-ada-001" = "r50k_base",
    "text-similarity-babbage-001" = "r50k_base",
    "text-similarity-curie-001" = "r50k_base",
    "text-similarity-davinci-001" = "r50k_base",

    /* eslint-enable @typescript-eslint/no-duplicate-enum-values */
}

/**
 * Configuration params for data confabulator LLM
 */
export const CONFABULATOR_NODE_PARAMS: NodeParams = {
    model: {
        default_value: LlmModel["OpenAI : gpt-4-turbo"].valueOf(),
        description: "Large Language Model (LLM) to be used",
        type: BaseParameterType.ENUM,
        enum: LlmModel,
        isAdvanced: false,
    },
    temperature: {
        default_value: 0.7,
        description:
            "The temperature controls how much randomness is in the output. In general, the lower the temperature, " +
            "the more likely the LLM model will choose words with a higher probability of occurrence",
        type: BaseParameterType.FLOAT,
        min: 0.0,
        max: 1.0,
        step: 0.1,
        isAdvanced: false,
    },
    prompt_token_fraction: {
        default_value: 0.5,
        description:
            "The fraction of total tokens (not necessarily words or letters) to use for a prompt. " +
            "Each model_name has a documented number of max_tokens it can handle which is a total count " +
            "of message + response tokens which goes into the calculation",
        type: BaseParameterType.FLOAT,
        min: 0.0,
        max: 1.0,
        step: 0.1,
        isAdvanced: true,
    },
    max_tokens: {
        default_value: 4096,
        description:
            "The maximum number of input tokens accepted by the LLM as input. Note that this varies by LLM " +
            "and by provider, and it is up to you to know the correct value for your model.",
        type: BaseParameterType.INT,
        isAdvanced: true,
    },
    token_encoding: {
        default_value: TokenEncoding["gpt-3.5-turbo"].valueOf(),
        description:
            "tiktoken encoder name. Different for each model and it is up to you to know the correct " +
            "encoding for the model you have chosen.",
        type: BaseParameterType.ENUM,
        enum: TokenEncoding,
        isAdvanced: true,
    },
    table_ratio: {
        default_value: 1.0,
        description:
            "How much of the token space we expect the tables themselves to take up in the prompts " +
            "expressed as a proportion to the existing prompt token counts.  This helps apportion " +
            "rows into windows for large data sets. Default is 1.0, meaning that dataframe tokens should " +
            "take the same amount of space as prompt tokens.",
        type: BaseParameterType.FLOAT,
        min: 0.0,
        max: 1.0,
        step: 0.1,
        isAdvanced: true,
    },
    confabulation_prompt: {
        default_value:
            "Good. Now create a distinct reasonable value for any missing value in the '{column_name}' " +
            "column that is marked as '{na_rep}' where the new value looks like existing data which is not missing. " +
            "Only print the resulting table with the original column names and with the original delimiter I gave you.",
        description: "Prompt sent to the LLM to instruct it to perform data confabulation",
        type: BaseParameterType.STRING,
        rows: 4,
        isAdvanced: true,
    },
    reasoning_prompt: {
        default_value:
            "Based on the existing values in the '{column_name}' column, how would you go about creating " +
            "a distinct reasonable value for any missing value in the '{column_name}' column that is marked as " +
            "'{na_rep}' where the new value looks like existing data which is not missing?",
        description: "An optional string substitution for the default reasoning prompt",
        type: BaseParameterType.STRING,
        rows: 4,
        isAdvanced: true,
    },
}

export const ANALYTICS_NODE_PARAMS: NodeParams = {
    model: {
        default_value: LlmModel["OpenAI : gpt-4-turbo"].valueOf(),
        description: "Large Language Model (LLM) to be used",
        type: BaseParameterType.ENUM,
        enum: LlmModel,
        isAdvanced: false,
    },
    temperature: {
        default_value: 0.2,
        description:
            "The temperature controls how much randomness is in the output. In general, the lower the temperature, " +
            "the more likely GPT-3 will choose words with a higher probability of occurrence",
        type: BaseParameterType.FLOAT,
        isAdvanced: false,
    },
    default_prompt: {
        default_value: "Generate a histogram for one of the variables in the dataset. Include labels and legend.",
        description: "System prompt for the LLM",
        type: BaseParameterType.STRING,
        isAdvanced: true,
    },
}

export const ACTIVATION_NODE_PARAMS: NodeParams = {
    model: {
        default_value: LlmModel["OpenAI : gpt-4-turbo"].valueOf(),
        description: "Large Language Model (LLM) to be used",
        type: BaseParameterType.ENUM,
        enum: LlmModel,
        isAdvanced: false,
    },
    temperature: {
        default_value: 0.2,
        description:
            "The temperature controls how much randomness is in the output. In general, the lower the temperature, " +
            "the more likely the LLM model will choose words with a higher probability of occurrence",
        type: BaseParameterType.FLOAT,
        isAdvanced: false,
    },
    default_prompt: {
        default_value: "What actions do you recommend to optimize the outcomes? What would the outcomes be?",
        description: "Default prompt for the LLM",
        type: BaseParameterType.STRING,
        isAdvanced: true,
    },
}

export const CATEGORY_REDUCER_NODE_PARAMS: NodeParams = {
    model: {
        default_value: LlmModel["OpenAI : gpt-4-turbo"].valueOf(),
        description: "Large Language Model (LLM) to be used",
        type: BaseParameterType.ENUM,
        enum: LlmModel,
        isAdvanced: false,
    },
    temperature: {
        default_value: 0.2,
        description:
            "Controls how much randomness is in the output. In general, the lower the temperature, " +
            "the more likely GPT-3 will choose words with a higher probability of occurrence",
        type: BaseParameterType.FLOAT,
        isAdvanced: false,
    },
    reasoning_prompt: {
        default_value:
            "Each example is its own categorical value. How would you go about reducing the number of categories so " +
            "that there are at most {max_categories} categories?",
        description: "An optional string substitution for the default reasoning prompt",
        isAdvanced: true,
        type: BaseParameterType.STRING,
    },
    reduction_prompt: {
        default_value:
            "Good. Now create a table mapping of each example category I gave you to the new category " +
            `you proposed in the format described below:
            * Put the original example category in a first column
            * Put your new proposed category in a second column
            * Separate the columns by the character '{separator}'.
            * The first column should be labeled '{old_column}'.
            * The last column should be labeled '{new_column}'.`,
        description: "An optional string substitution for the default reduction prompt",
        isAdvanced: true,
        type: BaseParameterType.STRING,
    },
    max_categories: {
        default_value: 20,
        description: "Maximum number of categories allowed.",
        type: BaseParameterType.INT,
        isAdvanced: true,
    },
}
