import {
    DeployedModel, Deployments,
    DeployRequest,
    GetDeploymentsRequest,
    ModelFormat,
    ModelMetaData,
    ModelServingEnvironment
} from "./types";
import {StringString} from "../base_types";
// import {MD_BASE_URL} from "../../const";
import {NotificationType, sendNotification} from "../notification";
import {Run} from "../run/types";

const MD_BASE_URL = "http://localhost:30003"
const DEPLOY_ROUTE = "/api/v1/serving/deploy"
const GET_DEPLOYMENT_URL = "/api/v1/serving/deployment"
const GET_DEPLOYMENTS_URL = "/api/v1/serving/deployments"

export function determineModelFormat(model_uri: string): ModelFormat {
    // Determine the model format
    const extension: string = model_uri.split('.').pop();
    let model_format: ModelFormat
    if (extension === "h5") {
        model_format = ModelFormat.H5
    } else if (extension === "joblib") {
        model_format = ModelFormat.SKLEARN_JOBLIB
    } else {
        // Raise error
    }

    return model_format
}

export function GenerateDeploymentID(run_id: number,
                                     experiment_id: number,
                                     project_id: number,
                                     node_id: string, cid?: string): string {

    let deployment_id: string = `${project_id}-${experiment_id}-${run_id}-${node_id.substr(0, 5)}`
    if (cid) {
        deployment_id = `${deployment_id}-${cid}`
    }
    return deployment_id

}

export async function DeployModel(
    deployment_id: string,
    model_uri: string,
    run_id: number,
    experiment_id: number,
    project_id: number,
    node_id: string,
    run_name: string,
    min_replicas: number,
    model_serving_environment: ModelServingEnvironment,
    cid?: string): Promise<DeployedModel> {

    const model_format: ModelFormat = determineModelFormat(model_uri)
    const model_meta_data: ModelMetaData = {
        model_uri: model_uri,
        model_format: model_format
    }

    const labels: StringString = {
        run_id: run_id.toString(),
        experiment_id: experiment_id.toString(),
        project_id: project_id.toString(),
        node_id: node_id,
        run_name: run_name
    }
    if (cid) {
        labels.cid = cid
    }

    let custom_predictor_args: StringString
    if (model_serving_environment === ModelServingEnvironment.KSERVE) {
        custom_predictor_args = {
            model_name: deployment_id,
            model_uri: model_uri,
            gateway_url: MD_BASE_URL,
            run_id: run_id.toString(),
            node_id: node_id.toString()
        }

    } else {

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
        const response = await fetch(MD_BASE_URL + DEPLOY_ROUTE, {
            method: 'POST',
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(deployRequest)
        })

        if (response.status != 200) {
            sendNotification(NotificationType.error, `Failed to deploy model for node id ${node_id}`, response.statusText)
            return null
        }

        return await response.json()
    } catch (e) {
        sendNotification(NotificationType.error, "Model deployment error",
            "Unable to deploy model. See console for more details.")
        console.error(e, e.stack)
    }

    return

}

export async function DeployRun(
    project_id: number,
    run: Run,
    min_replicas: number,
    cid: string,
    model_serving_env: ModelServingEnvironment
    ) {

    // Fetch the already deployed models
    const deployed_models: Deployments = await GetDeployedModelsForRun(run.id, model_serving_env)
    const deployed_ids: string[] = deployed_models.deployed_models.map(model => model.model_status.deployment_id)

    const flow = JSON.parse(run.flow)
    const output_artifacts: StringString = flow.output_artifacts
    Object.keys(output_artifacts).forEach((node, _) => {
        let prescriptor_cid = null
        let node_id: string
        if (node.startsWith("predictor")) {
            node_id = node.substr("predictor".length + 1)
        } else {
            node_id = node.substr("prescriptor".length + 1).replace(`-${cid}`, "")
            cid = prescriptor_cid
        }
        const deployment_id: string = GenerateDeploymentID(
            run.id,
            run.experiment_id,
            project_id,
            node_id, cid
        )

        // Only deploy the model if it is not deployed
        if (!deployed_ids.includes(deployment_id)) {
            DeployModel(deployment_id, output_artifacts[node],
                run.id, run.experiment_id, project_id, node_id,
                run.name, min_replicas, model_serving_env, cid
            )
        }
    })

}

export async function GetDeployment(deployment_id: string, model_serving_environment: ModelServingEnvironment): Promise<DeployedModel> {

    try {
        const response = await fetch(
            MD_BASE_URL + GET_DEPLOYMENT_URL + `?deployment_id=${deployment_id}&model_serving_environment=${model_serving_environment}`,
            {
            method: 'GET',
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            }
        })

        if (response.status != 200) {
            sendNotification(NotificationType.error, `Failed to fetch model for deployment id ${deployment_id}`, response.statusText)
            return null
        }

        return await response.json()
    } catch (e) {
        sendNotification(NotificationType.error, "Model Fetch error",
            " See console for more details.")
        console.error(e, e.stack)
    }

    return

}

export async function GetDeployedModelsForRun(
    run_id: number,
    model_serving_environment: ModelServingEnvironment
): Promise<Deployments> {

    const labels: StringString = {
        run_id: run_id.toString()
    }
    const request: GetDeploymentsRequest = {
        labels: labels,
        model_serving_environment: model_serving_environment
    }

    try {
        const response = await fetch(MD_BASE_URL + GET_DEPLOYMENTS_URL, {
            method: 'POST',
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request)
        })

        if (response.status != 200) {
            sendNotification(NotificationType.error, `Failed to fetch model for run id ${run_id}`, response.statusText)
            return null
        }

        return await response.json()
    } catch (e) {
        sendNotification(NotificationType.error, "Model fetch error",
            "Unable to fetch deployed model. See console for more details.")
        console.error(e, e.stack)
    }


    return

}