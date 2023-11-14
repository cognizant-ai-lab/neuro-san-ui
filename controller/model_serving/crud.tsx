import {
    DeployedModel,
    Deployments,
    DeploymentStatus,
    DeployRequest,
    GetDeploymentsRequest,
    ModelFormat,
    ModelMetaData,
    ModelServingEnvironment,
    TearDownRequest
} from "./types"
import {MD_BASE_URL} from "../../const"
import {toSafeFilename} from "../../utils/file"
import {StringString} from "../base_types"
import {NotificationType, sendNotification} from "../notification"
import {Run} from "../run/types"

// For deploying models
const DEPLOY_MODELS_ROUTE = `${MD_BASE_URL}/api/v1/serving/deploy`

// For checking if models are deployed
const QUERY_DEPLOYMENTS_ROUTE = `${MD_BASE_URL}/api/v1/serving/deployments`

// For tearing down deployed models
const TEARDOWN_MODELS_ROUTE = `${MD_BASE_URL}/api/v1/serving/teardown`

// For inferencing deployed models
const MODEL_INFERENCE_ROUTE = "v2/models"

function generateDeploymentID(run_id: number,
                                     experiment_id: number,
                                     project_id: number,
                                     cid?: string): string {

    let deployment_id = `deployment-${project_id}-${experiment_id}-${run_id}`
    if (cid) {
        deployment_id = `${deployment_id}-${cid}`
    }
    return deployment_id

}

async function deployModel(
    deployment_id: string,
    run_id: number,
    experiment_id: number,
    project_id: number,
    run_name: string,
    cid?: string,
    min_replicas = 0,
    model_serving_environment: ModelServingEnvironment = ModelServingEnvironment.KSERVE): Promise<DeployedModel> {

    const model_meta_data: ModelMetaData = {
        // In our case our model urls are in the output artifacts
        // and our predictor server takes care of it.
        model_uri: "",
        model_format: ModelFormat.CUSTOM_MODEL_FORMAT
    }

    const labels: StringString = {
        run_id: run_id.toString(),
        experiment_id: experiment_id.toString(),
        project_id: project_id.toString(),
        
        // We have to sanitize the run name as it's used by kserve to generate the model inference URL, which has to be 
        // a valid "domain" (no special chars, spaces etc.)
        run_name: toSafeFilename(run_name)
    }
    if (cid) {
        labels.cid = cid
    }

    let custom_predictor_args: StringString
    if (model_serving_environment === ModelServingEnvironment.KSERVE) {
        custom_predictor_args = {
            gateway_url: MD_BASE_URL,
            run_id: run_id.toString()
        }
        if (cid) {
            custom_predictor_args.prescriptor_cid = cid
        }
    }

    const deployRequest: DeployRequest = {
        model_data: model_meta_data,
        min_replicas: min_replicas,
        deployment_id: deployment_id,
        model_serving_environment: model_serving_environment,
        labels: labels,
        custom_predictor_args: custom_predictor_args
    }

    try {
        const response = await fetch(DEPLOY_MODELS_ROUTE, {
            method: 'POST',
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(deployRequest)
        })

        if (response.status != 200) {
            sendNotification(NotificationType.error,
                `Failed to deploy models for run ${run_name ?? "no name"}: ${run_id}`,
                response.statusText)
            return null
        }

        return await response.json()
    } catch (e) {
        sendNotification(NotificationType.error, "Model deployment error",
            "Unable to deploy model. See console for more details.")
        console.error(e, e.stack)
        return null
    }
}

export async function deployRun(
    project_id: number,
    run: Run,
    min_replicas = 0,
    cid: string = null,
    model_serving_env: ModelServingEnvironment = ModelServingEnvironment.KSERVE
    ) {

    // Fetch the already deployed models
    const deployment_id: string = generateDeploymentID(
        run.id,
        run.experiment_id,
        project_id,
        cid
    )

    // Only deploy the model if it is not deployed
    const result = await isRunDeployed(run.id, deployment_id, model_serving_env)
    if (result) {
        // short-circuit -- already deployed
        return deployment_id
    }

    try {
        return await deployModel(deployment_id, run.id, run.experiment_id, project_id, run.name, cid, min_replicas,
            model_serving_env)
    } catch (e) {
        sendNotification(NotificationType.error, "Internal error",
            `Unable to deploy model for run id ${run.id}. See console for more details.`)
        console.error(e, e.stack)
        return null
    }
}

/**
 * This function cleans up the model deployments using the <code>navigator.sendBeacon</code> browser feature. It is 
 * intended to be set up as an event handler for when the user closes the tab or navigates away from the app.
 * 
 * For documentation on this API see {@link https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon}
 * 
 * @param project_id Numeric current Project ID
 * @param run The Run that we wish to undeploy
 * @return <code>void<code> -- works by "side effects".
 */
export function undeployRunUsingBeacon(project_id: number,
                                       run: Run) {
    // Get deployment ID that we want to undeploy
    const deployment_id: string = generateDeploymentID(
        run.id,
        run.experiment_id,
        project_id,
        null
    )

    // Generate the request
    const tearDownRequest: TearDownRequest = {
        deployment_id: deployment_id,
        model_serving_environment: ModelServingEnvironment.KSERVE
    }
    navigator.sendBeacon(TEARDOWN_MODELS_ROUTE, JSON.stringify(tearDownRequest))
}

/**
 * Undeploy (tear down) all the models associated with a run -- predictors, prescriptor(s), uncertainty models
 * @param project_id Project ID for these models
 * @param run Run object for these models
 * @return A <code>Promise</code> that resolves either to <code>null</code> or the JSON result of the undeploy operation
 */
export async function undeployRun(project_id: number,
                                  run: Run
// Typescript lib uses "any" so we have to as well
) {

    // Get deployment ID that we want to undeploy
    const deployment_id: string = generateDeploymentID(
        run.id,
        run.experiment_id,
        project_id,
        null
    )

    // Generate the request
    const tearDownRequest: TearDownRequest = {
        deployment_id: deployment_id,
        model_serving_environment: ModelServingEnvironment.KSERVE
    }

    try {
        const response = await fetch(TEARDOWN_MODELS_ROUTE, {
            method: 'POST',
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(tearDownRequest)
        })

        if (response.status != 200) {
            console.error("Error:", response.statusText)
        }
    } catch (e) {
        console.error(e, e.stack)
    }
}

async function isRunDeployed(run_id: number,
                             deployment_id: string,
                             model_serving_environment: ModelServingEnvironment = ModelServingEnvironment.KSERVE,
): Promise<boolean> {

    // Fetch the already deployed models
    const deployments: Deployments = await getDeployments(run_id, model_serving_environment)
    if (!deployments || Object.keys(deployments).length === 0) {
        // none found so in particular the requested one is not deployed
        return false
    }

    return deployments.deployed_models.map(model => model.model_status.deployment_id).includes(deployment_id)
}

async function getDeployments(
    run_id: number,
    model_serving_environment: ModelServingEnvironment = ModelServingEnvironment.KSERVE): Promise<Deployments> {

    const labels: StringString = {
        run_id: run_id.toString()
    }
    const request: GetDeploymentsRequest = {
        labels: labels,
        model_serving_environment: model_serving_environment
    }

    try {
        const response: Response = await fetch(QUERY_DEPLOYMENTS_ROUTE, {
            method: 'POST',
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request)
        })

        if (response.status != 200) {
            return null
        }

        return await response.json()
    } catch (e) {
        sendNotification(NotificationType.error, "Model fetch error",
            "Unable to fetch deployed model. See console for more details.")
        console.error(e, e.stack)
        return null
    }
}

/**
 * Generates an inference URL for kserve for a particular model
 * @param baseUrl Base URL for kserve model (same for all models across a deployment)
 * @param modelName Kserve model name for this particular model
 * @return A ready-to-use inference URL for the model requested
 */
function getModelInferenceUrl(baseUrl: string, modelName: string) {
    return `http://${baseUrl}/${MODEL_INFERENCE_ROUTE}/${modelName}/infer`;
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
async function getModels(
    baseUrl: string,
    runId: number,
    cid: string) {

    const url = `http://${baseUrl}/${MODEL_INFERENCE_ROUTE}`
    try {
        const response = await fetch(`${MD_BASE_URL}/api/v1/passthrough`,  {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify({
                url: url,
                method: "GET",
                payload: {}
            })
        })

        if (response.status != 200) {
            sendNotification(NotificationType.error, `Failed to obtain model names for run: ${runId}`,
                response.statusText)
            return null
        }

        const modelsObject = await response.json()
        const modelsArray: string[] = modelsObject.models

        // Pull out predictor, prescriptor and RIO models
        const predictors = modelsArray
            .filter((model: string) => model.startsWith("predictor"))
            .map((model: string) => [model, getModelInferenceUrl(baseUrl, model)])
        const prescriptors = modelsArray
            .filter((model: string) => model.startsWith("prescriptor") && !model.startsWith("prescriptor-text")
                && model.endsWith(`-${cid}`))
            .map((model: string) => [model, getModelInferenceUrl(baseUrl, model)])
        const rioModels = modelsArray
            .filter((model: string) => model.startsWith("rio"))
            .map((model: string) => [model, getModelInferenceUrl(baseUrl, model)])

        return {
            predictors: predictors,
            prescriptors: prescriptors,
            rioModels: rioModels
        }
    } catch (e) {
        sendNotification(NotificationType.error, `Error retrieving model names for run: ${runId}`,
            "See console for more details.")
        console.error(e, e.stack)
        return null
    }
}

/**
 * Polls the model server for a particular model for a given runID. If the models are "warmed up" and ready for use,
 * return the predictor(s) and prescriptor for that runID and prescriptor ID.
 * @param runID ID of the Run object to query
 * @param prescriptorIDToDeploy Specific prescriptor ID to check for
 */
export async function checkIfModelsDeployed(runID: number, prescriptorIDToDeploy: string) {
    const deploymentStatus = await getDeployments(runID)
    let models = null
    if (deploymentStatus && deploymentStatus.deployed_models) {
        const deployedModels = deploymentStatus.deployed_models
        if (deployedModels.length === 1) {
            const model = deploymentStatus.deployed_models[0]
            // Check if model is ready for use
            if (model.model_status.status === DeploymentStatus[DeploymentStatus.DEPLOYMENT_READY]) {
                const baseUrl = model.model_reference.base_url
                models =  await getModels(baseUrl, runID, prescriptorIDToDeploy);
            }
        }
    }
    return models
}

