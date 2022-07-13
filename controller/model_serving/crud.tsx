import {
    DeployedModel,
    Deployments, DeploymentStatus,
    DeployRequest,
    GetDeploymentsRequest,
    ModelFormat,
    ModelMetaData,
    ModelServingEnvironment
} from "./types";
import {StringString} from "../base_types";
import {NotificationType, sendNotification} from "../notification";
import {Run} from "../run/types";
import {MD_BASE_URL} from "../../const";

const DEPLOY_ROUTE = MD_BASE_URL + "/api/v1/serving/deploy"
const QUERY_DEPLOYMENTS_URL = MD_BASE_URL + "/api/v1/serving/deployments"
const V2_MODELS_ENDPOINT = "v2/models"

export function generateDeploymentID(run_id: number,
                                     experiment_id: number,
                                     project_id: number,
                                     cid?: string): string {

    let deployment_id = `deployment-${project_id}-${experiment_id}-${run_id}`
    if (cid) {
        deployment_id = `${deployment_id}-${cid}`
    }
    return deployment_id

}

export async function deployModel(
    deployment_id: string,
    run_id: number,
    experiment_id: number,
    project_id: number,
    run_name: string,
    min_replicas = 0,
    model_serving_environment: ModelServingEnvironment = ModelServingEnvironment.KSERVE,
    cid?: string): Promise<DeployedModel> {

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
        run_name: run_name
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
        const response = await fetch(DEPLOY_ROUTE, {
            method: 'POST',
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(deployRequest)
        })

        if (response.status != 200) {
            sendNotification(NotificationType.error, `Failed to deploy models for run ${run_name}: ${run_id}`,
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
    cid: string,
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
    const result = await isRunDeployed(model_serving_env, run.id, deployment_id)
    if (result) {
        // short-circuit -- already deployed
        return deployment_id
    }

    try {
        return await deployModel(
            deployment_id, run.id, run.experiment_id, project_id, run.name, min_replicas, model_serving_env, cid
        )
    } catch (e) {
        sendNotification(NotificationType.error, "Internal error",
            `Unable to deploy model for run id ${run.id}. See console for more details.`)
        console.error(e, e.stack)
        return null
    }
}

export async function isRunDeployed(model_serving_environment: ModelServingEnvironment = ModelServingEnvironment.KSERVE,
                                    run_id: number,
                                    deployment_id: string,
): Promise<boolean> {

    // Fetch the already deployed models
    const deployments: Deployments = await getDeployments(run_id, model_serving_environment)
    if (!deployments || Object.keys(deployments).length === 0) {
        // none found so in particular the requested one is not deployed
        return false
    }

    return deployments.deployed_models.map(model => model.model_status.deployment_id).includes(deployment_id)
}

export async function getDeployments(
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
        const response = await fetch(QUERY_DEPLOYMENTS_URL, {
            method: 'POST',
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request)
        })

        if (response.status != 200) {
            sendNotification(NotificationType.error, `Failed to fetch models for run id ${run_id} `, response.statusText)
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
 * @param name Kserve model name for this particular model
 * @return A ready-to-use inference URL for the model requested
 */
function getModelInferenceUrl(baseUrl: string, name: string) {
    return `http://${baseUrl}/${V2_MODELS_ENDPOINT}/${name}/infer`;
}

/**
 * Retrieve model names (predictor, prescriptor) for a particular run.
 * Only supports kserve-hosted models!
 *
 * @param baseUrl The kserve base URL
 * @param runId Run ID for the run whose models are requested
 * @param cid Prescriptor (candidate) ID to look for among the models
 * @return An object with an array of predictors and prescriptors. Each item in the arrays is a ready-to-use kserve
 * endpoint that can be accessed for inferencing that model.
 */
export async function getModels(
    baseUrl: string,
    runId: number,
    cid: string) {

    const url = `http://${baseUrl}/${V2_MODELS_ENDPOINT}`
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
        const modelsArray = modelsObject.models;

        // Pull out predictor and prescriptor models
        const predictors = modelsArray
            .filter(model => model.startsWith("predictor"))
            .map(pred => getModelInferenceUrl(baseUrl, pred))
        const prescriptors = modelsArray
            .filter(model => model.startsWith("prescriptor") && model.endsWith(`-${cid}`))
            .map(pres => getModelInferenceUrl(baseUrl, pres))

        return {
            predictors: predictors,
            prescriptors: prescriptors
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
    if (deploymentStatus && deploymentStatus.deployed_models) {
        const models = deploymentStatus.deployed_models
        if (models.length == 1) {
            const model = deploymentStatus.deployed_models[0]
            // Check if model is ready for use
            if (model.model_status.status === DeploymentStatus[DeploymentStatus.DEPLOYMENT_READY]) {
                const baseUrl = model.model_reference.base_url
                return await getModels(baseUrl, runID, prescriptorIDToDeploy)
            }
        }
    }
}

