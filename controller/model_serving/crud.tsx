import {
    DeployedModel,
    Deployments,
    DeploymentStatus,
    DeployRequest,
    GetDeploymentsRequest,
    KServeModelServerStatusSummary,
    ModelFormat,
    ModelMetaData,
    ModelServingEnvironment,
    ModelStatus,
    TearDownRequest
} from "./types";
import {StringBool, StringString} from "../base_types";
// import {MD_BASE_URL} from "../../const";
import {NotificationType, sendNotification} from "../notification";
import {Run} from "../run/types";

const MD_BASE_URL = "http://localhost:30003"
const DEPLOY_ROUTE = "/api/v1/serving/deploy"
const GET_DEPLOYMENT_URL = "/api/v1/serving/deployment"
const GET_DEPLOYMENTS_URL = "/api/v1/serving/deployments"
const TEAR_DOWN_DEPLOYMENT_ROUTE = "/api/v1/serving/teardown"

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
                                     cid?: string): string {

    return cid || `${project_id}-${experiment_id}-${run_id}}`
}

export async function DeployModel(
    deployment_id: string,
    run_id: number,
    experiment_id: number,
    project_id: number,
    run_name: string,
    min_replicas: number,
    model_serving_environment: ModelServingEnvironment,
    cid?: string): Promise<DeployedModel> {

    const model_format: ModelFormat = ModelFormat.CUSTOM_MODEL_FORMAT
    const model_meta_data: ModelMetaData = {
        // In our case our model urls are in the output artifacts
        // and our predictor server takes care of it.
        model_uri: "",
        model_format: model_format
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
            sendNotification(NotificationType.error, `Failed to deploy models for run ${run_name}: ${run_id}`, response.statusText)
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
    const deployment_id: string = GenerateDeploymentID(
        run.id,
        run.experiment_id,
        project_id,
        cid
    )

    // Only deploy the model if it is not deployed
    if (!await IsRunDeployed(model_serving_env, deployment_id)) {
        await DeployModel(deployment_id,
            run.id, run.experiment_id, project_id,
            run.name, min_replicas, model_serving_env, cid
        )
    } else {
        sendNotification(NotificationType.info, `Deployment already exists for run ${run.name}: ${run.id} - ${deployment_id}`)
    }

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

export async function IsRunDeployed(model_serving_environment: ModelServingEnvironment,
                                    deployment_id?: string,
                                    run_id?: number,
                                    experiment_id?: number,
                                    project_id?: number,
                                    cid?: string
): Promise<string | boolean> {

    // Fetch the already deployed models
    const deployed_models: Deployments = await GetDeployedModelsForRun(run_id, model_serving_environment)

    if (Object.keys(deployed_models).length) {
        const deployed_ids: string[] = deployed_models.deployed_models.map(model => model.model_status.deployment_id)
        if (!deployment_id) {
            deployment_id = GenerateDeploymentID(
                run_id,
                experiment_id,
                project_id,
                cid
            )

        }

        if (deployed_ids.includes(deployment_id)) {
            return deployment_id
        }

        return false
    } else {
        return false
    }

}


export async function IsKServeRunModelServerStatusAlive(run_id: number, base_url: string): Promise<boolean> {

    try {
        const response = await fetch(base_url, {
            method: 'GET'
        })

        if (response.status != 200) {
            sendNotification(NotificationType.error, `Failed to check model server status for run: ${run_id}`,
                response.statusText)
            return null
        }

        const responseJson = await response.json()
        return responseJson.status === "alive"
    } catch (e) {
        sendNotification(NotificationType.error, "Model server status check error error",
            "See console for more details.")
        console.error(e, e.stack)
    }

    return false
}

export async function IsKServeModelV2Ready(run_id: number, base_url: string, model_name: string) {

    try {
        const response = await fetch(`${base_url}/v2/models/${model_name}/status`, {
            method: 'GET'
        })

        if (response.status != 200) {
            sendNotification(NotificationType.error, `Failed to check model status for run: ${run_id}`,
                response.statusText)
            return null
        }

        const responseJson = await response.json()
        return "ready" in responseJson && responseJson.ready === true
    } catch (e) {
        sendNotification(NotificationType.error, "Model server status check error error",
            "See console for more details.")
        console.error(e, e.stack)
    }

    return false
}

export async function GenerateKServeModelSummary(run: Run): Promise<KServeModelServerStatusSummary> {

    let model_summary: KServeModelServerStatusSummary = {
        inference_server_status: DeploymentStatus.DEPLOYMENT_STATUS_UNKNOWN,
        model_server_alive: false,
        models_ready: {}
    }

    // Fetch the already deployed models pertaining to this run id
    const deployments: Deployments = await GetDeployedModelsForRun(run.id, ModelServingEnvironment.KSERVE)

    if (Object.keys(deployments).length) {

        if (Object.keys(deployments).length != 1) {
            sendNotification(NotificationType.error, `Could not find unique deployment for run: ${run.id}`)
            return model_summary
        }

        model_summary.inference_server_status = deployments.deployed_models[0].model_status.status
        const base_url: string = deployments.deployed_models[0].model_reference.base_url

        // Check liveliness of model
        const alive: boolean = await IsKServeRunModelServerStatusAlive(run.id, base_url)
        model_summary.model_server_alive = alive

        const model_status: StringBool = {}
        if (alive) {
            const model_names: string[] = Object.keys(run.output_artifacts)
            for (const model_name of model_names) {
                model_status[model_name] = await IsKServeModelV2Ready(run.id, base_url, model_name)
            }
        }
        model_summary.models_ready = model_status

    } else {
        model_summary.inference_server_status = DeploymentStatus.DEPLOYMENT_DOES_NOT_EXIST
    }

    return model_summary
}

export async function TeardownDeployment(model_serving_environment: ModelServingEnvironment,
                                         deployment_id?: string,
                                         run_id?: number,
                                         experiment_id?: number,
                                         project_id?: number,
                                         cid?: string): Promise<ModelStatus> {

    let model_status: ModelStatus = {
        status: DeploymentStatus.DEPLOYMENT_STATUS_UNKNOWN,
        deployment_id: "",
        labels: {}
    }
    const deployed_deployment_id = await IsRunDeployed(model_serving_environment,
        deployment_id,
        run_id,
        experiment_id,
        project_id,
        cid)

    if (deployed_deployment_id && typeof(deployed_deployment_id) == "string") {
        model_status.deployment_id = deployed_deployment_id

        // Generate the request
        const tear_down_request: TearDownRequest = {
            deployment_id: deployed_deployment_id,
            model_serving_environment: model_serving_environment
        }

        try {
            const response = await fetch(MD_BASE_URL + GET_DEPLOYMENTS_URL, {
                method: 'DELETE',
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(tear_down_request)
            })

            if (response.status != 200) {
                sendNotification(NotificationType.error, `Failed to delete model for run id ${run_id}`, response.statusText)
                return null
            }

            model_status = await response.json()
        } catch (e) {
            sendNotification(NotificationType.error, "Model teardown error",
                "Unable to delete deployed model. See console for more details.")
            console.error(e, e.stack)
        }

    }


    return model_status

}