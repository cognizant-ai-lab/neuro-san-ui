import httpStatus from "http-status"

import {
    DeployedModel,
    Deployments,
    DeploymentStatus,
    DeployRequest,
    GetDeploymentsRequest,
    ModelFormat,
    ModelMetaData,
    ModelServingEnvironment,
    TearDownRequest,
} from "./types"
import {MD_BASE_URL} from "../../const"
import {toSafeFilename} from "../../utils/file"
import {StringString} from "../base_types"
import {PredictorParams, PrescriptorParams, RioParams, Run} from "../run/types"

// For deploying models
const DEPLOY_MODELS_ROUTE = `${MD_BASE_URL}/api/v1/serving/deploy`

// For checking if models are deployed
const QUERY_DEPLOYMENTS_ROUTE = `${MD_BASE_URL}/api/v1/serving/deployments`

// For tearing down deployed models
const TEARDOWN_MODELS_ROUTE = `${MD_BASE_URL}/api/v1/serving/teardown`

// For inferencing deployed models
const MODEL_INFERENCE_ROUTE = "v2/models"

function generateDeploymentID(runId: number, experimentId: number, projectId: number, cid?: string): string {
    let deploymentId = `deployment-${projectId}-${experimentId}-${runId}`
    if (cid) {
        deploymentId = `${deploymentId}-${cid}`
    }
    return deploymentId
}

// For returning errors
type ErrorResult = {error: string; description?: string}

/**
 * Given a fetch <code>Response</code>, return a human-readable string describing the error.
 * @param response The fetch response
 * @return A human-readable string describing the error
 */
function interpretFetchResponse(response: Response) {
    return (
        `Error code ${response.status} ("${httpStatus[response.status]}"), ` +
        `status text: "${response.statusText || "<none>"}"`
    )
}

async function deployModel(
    deploymentId: string,
    runId: number,
    experimentId: number,
    projectId: number,
    runName: string,
    cid?: string,
    minReplicas = 0,
    modelServingEnvironment: ModelServingEnvironment = ModelServingEnvironment.KSERVE
): Promise<DeployedModel | ErrorResult> {
    const modelMetaData: ModelMetaData = {
        // In our case our model urls are in the output artifacts
        // and our predictor server takes care of it.
        model_uri: "",
        model_format: ModelFormat.CUSTOM_MODEL_FORMAT,
    }

    const labels: StringString = {
        run_id: runId.toString(),
        experiment_id: experimentId.toString(),
        project_id: projectId.toString(),

        // We have to sanitize the run name as it's used by kserve to generate the model inference URL, which has to be
        // a valid "domain" (no special chars, spaces etc.)
        run_name: toSafeFilename(runName),
    }
    if (cid) {
        labels.cid = cid
    }

    let customPredictorArgs: StringString
    if (modelServingEnvironment === ModelServingEnvironment.KSERVE) {
        customPredictorArgs = {
            gateway_url: MD_BASE_URL,
            run_id: runId.toString(),
        }
        if (cid) {
            customPredictorArgs.prescriptor_cid = cid
        }
    }

    const deployRequest: DeployRequest = {
        model_data: modelMetaData,
        min_replicas: minReplicas,
        deployment_id: deploymentId,
        model_serving_environment: ModelServingEnvironment.KSERVE,
        labels: labels,
        custom_predictor_args: customPredictorArgs,
    }

    console.log(`Deploying model with request: ${JSON.stringify(deployRequest)}`)

    try {
        const response = await fetch(DEPLOY_MODELS_ROUTE, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(deployRequest),
        })

        if (!response.ok) {
            console.debug("Error:", JSON.stringify(response))
            console.error(
                `Error deploying models for run ${runName ?? runId}, deployment request: ` +
                    `${JSON.stringify(deployRequest)}`
            )
            return {
                error: `Failed to deploy models for run ${runName ?? runId}: ${runId}`,
                description: interpretFetchResponse(response),
            }
        }

        return await response.json()
    } catch (e) {
        console.error("Unable to deploy model", e, e.message, `deployment request: ${JSON.stringify(deployRequest)}`)
        return {
            error: `Failed to deploy models for run ${runName ?? runId}`,
            description: e.message,
        }
    }
}

/**
 * Request deployment of all models associated with a particular Run -- predictors, prescriptors, RIO, ...
 * If the models are already deployed, this function simply returns <code>true</code>.
 * @param projectId Project ID for the Run in question
 * @param run The Run for which the models are to be deployed
 * @param minReplicas (not currently used) Minimum number of Kubernetes pods to host the models
 * @param cid Prescriptor (candidate) ID to deploy. If null, all prescriptors are deployed.
 * @param modelServingEnvironment Model serving environment to use. Currently only KSERVE is supported.
 * @return A tuple of a boolean indicating success or failure, and an optional error message.
 */
export async function deployRun(
    projectId: number,
    run: Run,
    minReplicas = 0,
    cid: string = null,
    modelServingEnvironment: ModelServingEnvironment = ModelServingEnvironment.KSERVE
): Promise<[boolean, ErrorResult?]> {
    // Fetch the already deployed models
    const deploymentID: string = generateDeploymentID(run.id, run.experiment_id, projectId, cid)

    // Only deploy the model if it is not already deployed
    const isDeployed = await isRunDeployed(run.id, deploymentID, modelServingEnvironment)
    if (isDeployed) {
        // short-circuit -- already deployed
        return [true, null]
    }

    try {
        const result = await deployModel(
            deploymentID,
            run.id,
            run.experiment_id,
            projectId,
            run.name,
            cid,
            minReplicas,
            modelServingEnvironment
        )
        if (result && "error" in result) {
            return [false, result]
        } else {
            return [true, null]
        }
    } catch (e) {
        console.error(`Unable to deploy model for run ${JSON.stringify(run)}`, e, e.message)
        return [
            false,
            {
                error: "Internal error",
                description: `Unable to deploy model for run id ${run.id}. See console for more details.`,
            },
        ]
    }
}

/**
 * This function cleans up the model deployments using the <code>navigator.sendBeacon</code> browser feature. It is
 * intended to be set up as an event handler for when the user closes the tab or navigates away from the app.
 *
 * For documentation on this API see {@link https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon}
 *
 * @param projectId Numeric current Project ID
 * @param run The Run that we wish to undeploy
 * @return <code>void<code> -- works by "side effects".
 */
export function undeployRunUsingBeacon(projectId: number, run: Run) {
    // Get deployment ID that we want to undeploy
    const deploymentID: string = generateDeploymentID(run.id, run.experiment_id, projectId, null)

    // Generate the request
    const tearDownRequest: TearDownRequest = {
        deployment_id: deploymentID,
        model_serving_environment: ModelServingEnvironment.KSERVE,
    }
    navigator.sendBeacon(TEARDOWN_MODELS_ROUTE, JSON.stringify(tearDownRequest))
}

/**
 * Undeploy (tear down) all the models associated with a run -- predictors, prescriptor(s), uncertainty models
 * @param projectId Project ID for these models
 * @param run Run object for these models
 */
export async function undeployRun(
    projectId: number,
    run: Run
    // Typescript lib uses "any" so we have to as well
) {
    // Get deployment ID that we want to undeploy
    const deploymentID: string = generateDeploymentID(run.id, run.experiment_id, projectId, null)

    // Generate the request
    const tearDownRequest: TearDownRequest = {
        deployment_id: deploymentID,
        model_serving_environment: ModelServingEnvironment.KSERVE,
    }

    try {
        const response = await fetch(TEARDOWN_MODELS_ROUTE, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(tearDownRequest),
        })

        if (!response.ok) {
            console.error(interpretFetchResponse(response))
        }
    } catch (e) {
        console.error(e, e.stack)
    }
}

async function isRunDeployed(
    runId: number,
    deploymentId: string,
    modelServingEnvironment: ModelServingEnvironment = ModelServingEnvironment.KSERVE
): Promise<boolean> {
    // Fetch the already deployed models
    const deployments: Deployments | ErrorResult = await getDeployments(runId, modelServingEnvironment)
    if (!deployments || Object.keys(deployments).length === 0 || "error" in deployments) {
        // Either not found or error, so indicate run is not deployed
        return false
    }

    return deployments.deployed_models.map((model) => model.model_status.deployment_id).includes(deploymentId)
}

async function getDeployments(
    runId: number,
    modelServingEnvironment: ModelServingEnvironment = ModelServingEnvironment.KSERVE
): Promise<Deployments | ErrorResult> {
    const labels: StringString = {
        run_id: runId.toString(),
    }
    const request: GetDeploymentsRequest = {
        labels: labels,
        model_serving_environment: modelServingEnvironment,
    }

    try {
        const response: Response = await fetch(QUERY_DEPLOYMENTS_ROUTE, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        })

        if (!response.ok) {
            return {
                error: `Failed to to retrieve deployed models for ${runId}`,
                description: interpretFetchResponse(response),
            }
        }

        return await response.json()
    } catch (e) {
        console.error(`Unable to get deployments for run ${JSON.stringify(runId)}`, e, e.message)
        return {
            error: `Failed to to retrieve deployed models for ${runId}`,
            description: `Internal error occured: ${e.message}`,
        }
    }
}

/**
 * Generates an inference URL for kserve for a particular model
 * @param baseUrl Base URL for kserve model (same for all models across a deployment)
 * @param modelName Kserve model name for this particular model
 * @return A ready-to-use inference URL for the model requested
 */
function getModelInferenceUrl(baseUrl: string, modelName: string) {
    return `http://${baseUrl}/${MODEL_INFERENCE_ROUTE}/${modelName}/infer`
}

/**
 * Retrieve model names (predictor, prescriptor) for a particular run.
 * Only supports kserve-hosted models!
 *
 * @param baseUrl The kserve base URL
 * @param runId Run ID for the run whose models are requested
 * @param cid Prescriptor (candidate) ID to look for among the models
 * @return An object with an array of predictors, prescriptors and RIO models.
 * Each item in the arrays is a ready-to-use kserve endpoint (URL) that can be accessed for inferencing that model.
 */
async function getModels(baseUrl: string, runId: number, cid: string) {
    const url = `http://${baseUrl}/${MODEL_INFERENCE_ROUTE}`
    try {
        const response = await fetch(`${MD_BASE_URL}/api/v1/passthrough`, {
            method: "POST",
            mode: "cors",
            body: JSON.stringify({
                url: url,
                method: "GET",
                payload: {},
            }),
        })

        if (!response.ok) {
            return {
                error: `Failed to obtain model names for run: ${runId}`,
                description: interpretFetchResponse(response),
            }
        }

        const modelsObject = await response.json()
        const modelsArray: string[] = modelsObject.models

        // Pull out predictor, prescriptor and RIO models
        const predictors = modelsArray
            .filter((model: string) => model.startsWith("predictor"))
            .map((model: string) => [model, getModelInferenceUrl(baseUrl, model)])
        const prescriptors = modelsArray
            .filter(
                (model: string) =>
                    model.startsWith("prescriptor") &&
                    !model.startsWith("prescriptor-text") &&
                    model.endsWith(`-${cid}`)
            )
            .map((model: string) => [model, getModelInferenceUrl(baseUrl, model)])
        const rioModels = modelsArray
            .filter((model: string) => model.startsWith("rio"))
            .map((model: string) => [model, getModelInferenceUrl(baseUrl, model)])

        return {
            predictors: predictors,
            prescriptors: prescriptors,
            rioModels: rioModels,
        }
    } catch (e) {
        console.error(e, e.stack)
        return {
            error: `Failed to obtain model names for run: ${runId}`,
            description: e.message,
        }
    }
}

/**
 * Polls the model server for a particular model for a given runID. If the models are "warmed up" and ready for use,
 * return the predictor(s) and prescriptor for that runID and prescriptor ID. If the models are not ready yet, return
 * <code>null</code>.
 * @param runID ID of the Run object to query
 * @param prescriptorIDToDeploy Specific prescriptor ID to check for
 */
export async function checkIfModelsDeployed(runID: number, prescriptorIDToDeploy: string) {
    const deploymentStatus: Deployments | ErrorResult = await getDeployments(runID)
    if ("error" in deploymentStatus) {
        return deploymentStatus
    }

    let models = null
    if (deploymentStatus && deploymentStatus.deployed_models) {
        const deployedModels = deploymentStatus.deployed_models
        if (deployedModels.length === 1) {
            const model = deploymentStatus.deployed_models[0]
            // Check if model is ready for use
            if (model.model_status.status === DeploymentStatus[DeploymentStatus.DEPLOYMENT_READY]) {
                const baseUrl = model.model_reference.base_url
                models = await getModels(baseUrl, runID, prescriptorIDToDeploy)
            }
        }
    }
    return models
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
 * Query a model for a given set of inputs. The model must have already been deployed by a preceding call to
 * {@link deployRun} and is specified by its URL.
 * The inputs are specified as a set of vectorized name-value inputs. See {@link vectorize} for more details.
 * See {@link PredictorParams} for specification.
 *
 * @param modelUrl URL of the model to query
 * @param inputs An object with keys each mapping to a single-element array of strings or numbers.
 */
export async function queryModel(
    modelUrl: string,
    inputs: PredictorParams | PrescriptorParams | RioParams
    // Typescript lib uses "any" so we have to as well
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
    try {
        const body = JSON.stringify({
            url: modelUrl,
            method: "POST",
            payload: inputs,
        })

        const response = await fetch(`${MD_BASE_URL}/api/v1/passthrough`, {
            method: "POST",
            mode: "cors",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: body,
        })

        if (!response.ok) {
            return {
                error: `Failed to query model at ${modelUrl}`,
                description: `Error code ${response.status}, response: ${(await response.json())?.error}`,
            }
        }

        return await response.json()
    } catch (e) {
        console.error("Unable to access model", modelUrl)
        console.error(e, e.stack)
        return {
            error: "Model access error",
            description: `Failed to query model at ${modelUrl}. Error: ${e.message}`,
        }
    }
}
