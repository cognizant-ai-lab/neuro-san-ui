import debugModule from "debug"

import {ModelResponse, RunModels} from "./types"
import {FlowQueries} from "../../components/Flow/flowqueries"
import {NodeType} from "../../components/Flow/nodes/types"
import {DataField} from "../../generated/csv_data_description"
import {
    DeployModelsRequest,
    InferenceRequest,
    InferenceResponse,
    InferenceStatus,
    ModelEncoderData,
    ModelMetaData,
} from "../../generated/inference_service"
import {DataTag, DataTagFieldCAOType} from "../../generated/metadata"
import {DeploymentStatus, ModelFormat} from "../../generated/model_serving_common"
import useEnvironmentStore from "../../state/environment"
import {empty} from "../../utils/objects"
import {extractId} from "../../utils/text"
import {ErrorResult, StringString, StringToArrayOfStringOrNumber} from "../base_types"
import {PredictorParams, RioParams, Run} from "../run/types"

// For inferencing deployed models
const debug = debugModule("crud")

function generateDeploymentID(runId: number): string {
    return `deployment-${runId}`
}

function isPredictor(model: string): boolean {
    return model.startsWith("predictor-")
}

function isRioModel(model: string): boolean {
    return model.startsWith("rio-")
}

function isPrescriptor(model: string): boolean {
    return model.startsWith("prescriptor-") && !model.startsWith("prescriptor-text")
}

/**
 * Get the node ID from a model ID. The node ID is the part of the model ID that is the same as the node ID in the
 * flow.
 * @param modelId
 */
function getNodeId(modelId: string): string {
    if (isPredictor(modelId)) {
        // For example "predictor-849b7281-95ba-83dd-2e8c-f73cd996112a"
        return modelId.substring("predictor-".length)
    }
    if (isPrescriptor(modelId)) {
        // For example "prescriptor-67fb86d3-9047-4ce0-0d42-4e3d3b0f715e-83_28"
        return extractId(modelId, "prescriptor")
    }
    if (isRioModel(modelId)) {
        // For example "rio-4462ba0-e870-736f-5d1-fbe46366f57e-Survived"
        return extractId(modelId, "rio")
    }
    return ""
}

export function getRunModelData(runId: number, outputArtifacts: StringString): RunModels {
    const result: RunModels = {
        runId: runId,
        predictors: [],
        prescriptors: [],
        rio: [],
    }

    for (const key in outputArtifacts) {
        if (Object.hasOwn(outputArtifacts, key)) {
            if (isPredictor(key)) {
                result.predictors.push([key, outputArtifacts[key], getNodeId(key)])
            } else if (isPrescriptor(key)) {
                result.prescriptors.push([key, outputArtifacts[key], getNodeId(key)])
            } else if (isRioModel(key)) {
                result.rio.push([key, outputArtifacts[key], getNodeId(key)])
            }
        }
    }

    return result
}

/**
 * Request deployment of all models associated with a particular Run -- predictors, prescriptors, RIO, ...
 * @param runId Run ID for the Run in question
 * @param outputArtifacts Output artifacts for the Run in question (predictors, prescriptors, RIO models etc.)
 * @return A tuple of a boolean indicating success or failure, deployment id and an optional error message.
 */
export async function deployRun(runId: number, outputArtifacts: StringString): Promise<[boolean, ErrorResult?]> {
    // Determine models associated with this Run
    const runData: RunModels = getRunModelData(runId, outputArtifacts)
    if (runData == null || empty(runData)) {
        console.error(`deployRunNew: Failed to get Run metadata for ${runId}`)
        return [
            false,
            {
                error: "Internal error",
                description: `Failed to get models data for run ID ${runId}. See console for more details.`,
            },
        ]
    }

    // Request deployment for all generated models in our Run
    const deploymentId: string = generateDeploymentID(runId)
    const modelsToDeploy: ModelMetaData[] = [...runData.predictors, ...runData.prescriptors, ...runData.rio].map(
        (model) => ({
            modelId: model[0],
            modelUri: model[1],
            modelFormat: ModelFormat.UNKNOWN_MODEL_FORMAT,
            labels: undefined,
        })
    )

    const request: DeployModelsRequest = {
        deploymentId: deploymentId,
        models: modelsToDeploy,
    }

    const requestAsJson = DeployModelsRequest.toJSON(request)

    const baseUrl = useEnvironmentStore.getState().backendApiUrl
    const inferDeployRoute = `${baseUrl}/api/v1/inference/deploy`

    try {
        debug(`Requesting deployment for run ${runId} with deployment ID ${deploymentId}`)
        const response = await fetch(inferDeployRoute, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestAsJson),
        })
        if (response.ok) {
            return [true, null]
        } else {
            console.error(`FAILED request for deployment ${deploymentId}. Response: ${response.statusText}`)
            return [
                false,
                {
                    error: "Models deployment error",
                    description: `Unable to deploy ${deploymentId} for run id ${runId}. See console for more details.`,
                },
            ]
        }
    } catch (error) {
        console.error(
            `Unable to deploy models for run id ${runId}`,
            error,
            error instanceof Error ? error.message : error
        )
        return [
            false,
            {
                error: "Internal error",
                description: `Unable to deploy model for run id ${runId}. See console for more details.`,
            },
        ]
    }
}

export async function checkIfDeploymentReady(runId: number): Promise<boolean> {
    const deploymentId: string = generateDeploymentID(runId)
    const request = {
        deployment_id: deploymentId,
    }

    const baseUrl = useEnvironmentStore.getState().backendApiUrl
    const inferDeployStatusRoute = `${baseUrl}/api/v1/inference/getstatus`

    const response = await fetch(inferDeployStatusRoute, {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
    })

    const jsonResponse = await response.json()
    if (!response.ok) {
        console.error("Error getting deployment status", JSON.stringify(response))
        return false
    }

    return (
        jsonResponse.status === DeploymentStatus[DeploymentStatus.DEPLOYMENT_READY] ||
        jsonResponse.status === DeploymentStatus[DeploymentStatus.DEPLOYMENT_ALREADY_EXISTS]
    )
}

/**
 *  "Vectorize" inputs as required by API. Meaning each input has to be a single-element array.
 * @param inputs An object with keys each mapping to a string or number.
 * @return An object with the same keys and values, where each value is now in a single-element array.
 * See {@link PredictorParams} for specification.
 */
export function vectorize(inputs: {[key: string]: string | number}): PredictorParams {
    return Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, [v]]))
}

/**
 * The thing here is that we only specify model url in our inference request,
 * so we need to get node ID from somewhere. We take it from table which was built from Run's list of generated
 * artifacts. Yes, the whole thing is awkward for sure. Maybe we can extract node id from model url right here.
 * If we lock current assumption that model url does contain node id.
 * Or leave it until we come up with better way of handling Run data in general.
 * @param runData Data returned by a call to {@link getRunModelData}
 * @param modelUrl URL of the model to query
 */
function findModelDataByUrl(runData: RunModels, modelUrl: string): [string, string] {
    for (const model of runData.prescriptors) {
        if (model[1] === modelUrl) {
            return [model[0], model[2]]
        }
    }
    for (const model of runData.predictors) {
        if (model[1] === modelUrl) {
            return [model[0], model[2]]
        }
    }
    for (const model of runData.rio) {
        if (model[1] === modelUrl) {
            return [model[0], model[2]]
        }
    }

    // Not found
    return ["", ""]
}

/**
 * Convert a flow to the format required by the inference API.
 * @param flow Flow object, from the Run we're using for inference
 * @param nodeId Node ID of the model we're interested in, within the flow
 * @param dataTag DataTag object from the Run we're using for inference, potentially modified by LLM nodes
 * (eg. category reducer)
 * @return An object with the fields and CAO mapping required by the inference API
 */
function flowToEncoder(flow: NodeType[], nodeId: string, dataTag: DataTag): ModelEncoderData {
    // Retrieve the model node we're interested in for this inference request (eg. predictor)
    const node = FlowQueries.getNodeByID(flow, nodeId)
    if (!node) {
        throw new Error(`Node ${nodeId} not found in flow`)
    }

    // Extract the CAO mapping from the node
    const context = FlowQueries.extractCheckedFields([node], DataTagFieldCAOType.CONTEXT)
    const actions = FlowQueries.extractCheckedFields([node], DataTagFieldCAOType.ACTION)
    const outcomes = FlowQueries.extractCheckedFields([node], DataTagFieldCAOType.OUTCOME)

    // Names of all fields this model was trained on
    const allFields = context.concat(actions).concat(outcomes)

    // Pull the relevant fields out of the data node and convert them to the format required by the inference API
    const fields = Object.entries(dataTag.fields)
        .filter((field) => allFields.includes(field[0]))
        .reduce((acc, [key, value]) => {
            acc[key] = DataField.fromJSON(value)
            return acc
        }, {})

    return {
        fields: fields,
        cao: {
            context: context,
            actions: actions,
            outcomes: outcomes,
        },
    }
}

/**
 * Convert the response from the inference API to a {@link ModelResponse} object.
 * Mainly used for snake_case to camelCase conversion. ts-proto can't do this for us because the model response is
 * simply defined as "string" in the contract.
 *
 * @param inferenceModelResponse The response from the inference API
 * @returns A {@link ModelResponse} object with the results of the query
 */
function toModelResponse(inferenceModelResponse: {
    prescribed_actions: StringToArrayOfStringOrNumber
    predicted_outcomes: StringToArrayOfStringOrNumber
    rules_inference: string
}): ModelResponse {
    if (
        inferenceModelResponse.prescribed_actions ||
        inferenceModelResponse.predicted_outcomes ||
        inferenceModelResponse.rules_inference
    ) {
        return {
            prescribedActions: inferenceModelResponse?.prescribed_actions,
            predictedOutcomes: inferenceModelResponse?.predicted_outcomes,
            rulesInference: inferenceModelResponse?.rules_inference,
        }
    } else {
        return inferenceModelResponse as ModelResponse
    }
}

/**
 * Query a model for a given set of inputs. The model must have already been deployed by a preceding call to
 * {@link deployRun} and is specified by its URL.
 * The inputs are specified as a set of vectorized name-value inputs. See {@link vectorize} for more details.
 * See {@link PredictorParams} for specification.
 *
 * @param run The Run object for the run whose model we want to query
 * @param modelUrl URL of the model to query
 * @param inputs An object with keys each mapping to a single-element array of strings or numbers.
 * @param dataTag DataTag object from the Run we're using for inference, potentially modified by LLM nodes
 * @param flow Flow object, from the Run we're using for inference, potentially converted to new format (new names
 * for ParentNodeData etc.)
 *
 * @returns A {@link ModelResponse} object with the results of the query, or an {@link ErrorResult} object if an error
 */
export async function queryModel(
    run: Run,
    modelUrl: string,
    inputs: PredictorParams | RioParams,
    dataTag: DataTag,
    flow: NodeType[]
): Promise<ModelResponse | ErrorResult> {
    if (!flow) {
        return {
            error: "Model access error",
            description: `Error querying model ${modelUrl}. Run ${run.id} has no flow`,
        }
    }

    const runData: RunModels = getRunModelData(run.id, JSON.parse(run.output_artifacts))
    if (runData == null) {
        const message = `Error querying model ${modelUrl}. Failed to get Run metadata for ${run.id}`
        return {
            error: "Model access error",
            description: message,
        }
    }
    const [modelId, nodeId] = findModelDataByUrl(runData, modelUrl)
    if (!modelId) {
        return {
            error: "Model access error",
            description: `Error querying model ${modelUrl}. Failed to get Run metadata for ${run.id}`,
        }
    }

    try {
        const modelData: ModelMetaData = {
            modelId: modelId,
            modelUri: modelUrl,
            modelFormat: ModelFormat.UNKNOWN_MODEL_FORMAT,
            labels: undefined,
        }

        // Build the inference request
        const request: InferenceRequest = {
            model: modelData,
            encoder: flowToEncoder(flow, nodeId, dataTag),
            sampleData: JSON.stringify(inputs),
        }

        const requestJson = InferenceRequest.toJSON(request)
        const baseUrl = useEnvironmentStore.getState().backendApiUrl
        const inferRoute = `${baseUrl}/api/v1/inference/infer`

        const response = await fetch(inferRoute, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestJson),
        })
        if (!response.ok) {
            return {
                error: `Received HTTP error response while querying model at ${modelUrl}`,
                description: `Error code ${response.status}, response: ${(await response.json())?.error}`,
            }
        }

        const responseJson: InferenceResponse = await response.json()
        const responseObject = InferenceResponse.fromJSON(responseJson)

        const inferenceStatus: InferenceStatus = responseObject.status
        if (inferenceStatus !== InferenceStatus.SUCCESS) {
            return {
                error: `Received error code while querying model server at ${modelUrl}`,
                description: `Error code ${response.status}, response: ${JSON.stringify(responseObject)}`,
            }
        }

        const modelResponse: string = responseObject.responseData
        if (!modelResponse) {
            return {
                error: "Model access error",
                description: `Error querying model at ${modelUrl}. No response received.`,
            }
        }

        return toModelResponse(JSON.parse(modelResponse))
    } catch (error) {
        console.error("Unable to access model", modelUrl)
        console.error(error, error instanceof Error && error.stack)
        return {
            error: "Model access error",
            description: `Exception encountered while querying model at ${modelUrl}. Error: ${
                error instanceof Error ? error.message : error
            }`,
        }
    }
}
