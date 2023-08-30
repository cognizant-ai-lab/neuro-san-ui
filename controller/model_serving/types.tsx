// Format the model is based in.
// For custom model formats the request must specify
// UNKNOWN_MODEL_FORMAT and a custom predictor image
// with args when the adapter server is spun up.
import {StringString} from "../base_types";

// no-shadow doesn't do well with enums. Search their github issues if you're curious.
// eslint-disable-next-line no-shadow
export enum ModelFormat {
    // Ignored
    DEFAULT_MODEL_FORMAT_ENUM = 0,
    UNKNOWN_MODEL_FORMAT = 1,
    H5 = 2,
    SKLEARN_JOBLIB = 3,
    CUSTOM_MODEL_FORMAT = 4,
}


export interface ModelMetaData {
    // The location of the model on the S3 bucket.
    // This could be any blob store/http uri but for now I have only tested S3.
    model_uri: string

    // The format the model is based on
    model_format: ModelFormat
}

// no-shadow doesn't do well with enums. Search their github issues if you're curious.
// eslint-disable-next-line no-shadow
export enum ModelServingEnvironment {
    // Ignored
    DEFAULT_MODEL_SERVING_ENV_ENUM = 0,
    UNKNOWN_MODEL_SERVING_ENV = 1,
    KSERVE = 2
}

// no-shadow doesn't do well with enums. Search their github issues if you're curious.
// eslint-disable-next-line no-shadow
export enum DeploymentStatus {

    // Ignored
    DEFAULT_DEPLOYMENT_STATUS_ENUM = 0,

    // UNKNOWN means wait until one of the
    // other status is reflected - the request is premature
    // and will take a bit to determine the actual status.
    DEPLOYMENT_STATUS_UNKNOWN = 1,

    // DEPLOYMENT_READY does not indicate that the pods are actually up
    // and rather means that no error occoured while spinning up the resources
    // to spin up the pod.
    // The case where this might not mean you can curl the URL even if Deployment
    // is ready is when the cluster does not have enough nodes to spin up the pods.
    // In this case one of the following will happen:
    // 1. The pods will be in pending state and the request will timeout.
    // 2. If min_replicas for other deployments was 0, when the others spin to zero
    // this pod will spin up
    // 3. If the cluster has a node autoscaler, that will be kicked off to spin nodes
    // to allocate these pods
    // TODO: Provide more granular status by looking at the pods directly
    DEPLOYMENT_READY = 2,

    DEPLOYMENT_NOT_READY = 3,

    // This error occurs mostly when deployments with not a unique
    // id are requested to be spun
    DEPLOYMENT_ALREADY_EXISTS = 4,

    // This error occurs while trying to delete a deployment
    // that does not exist
    DEPLOYMENT_DOES_NOT_EXIST = 5,

    // This happens when a not supported model uri format is provided.
    INCOMPATIBLE_STORAGE_ADAPTER = 6,

    // This happens when the environment is not supported
    INCOMPATIBLE_ENVIRONMENT = 7
}

export interface DeployRequest {

    // The metadata regarding the model. Part of this metadata is also used
    // to spin up the pre/post processing transformer required.
    model_data: ModelMetaData

    // This determines the number of replicas that are required to be up at all time.
    // KServe scales to zero when there are no requests which allows us to bill to AWS less
    // and also allocate resources for models that might be needed at the moment without triggering
    // the cluster autoscaler.
    // This is optional and the Serving adapter determines the default value.
    min_replicas?: number

    // The deployment id that needs to be used to uniquely identify.
    // The client generates this and has to conform to k8s deployment
    // name rules: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
    deployment_id?: string

    // The environment where the model must be served.
    model_serving_environment: ModelServingEnvironment

    // A map containing the labels to tag this deployment with.
    // This map is optional, however also after the model is deployed this
    // gives the ability to search for a specific deployment or a group of deployments
    // to search the deployment with.
    // For eg: All models that have tag project_id = 4 or a specific model that
    // has project_id = 4, run_id = 1
    labels?: StringString

    // Map defining the transformer args that need to provided
    // at runtime.
    // NOTE: While the adapter is spinning up it must have a custom processor
    // image specified for these to be true. The processor here
    // refers to the kserve transformer that does the pre and post processing
    // of data
    // This field will be depreciated
    custom_processor_args?: StringString

    // Map defining the custom predictor args that need to provided
    // at runtime.
    // NOTE: While the adapter is spinning up it must have a custom transformer
    // image specified for these to be true.
    // This field will be depreciated
    custom_predictor_args?: StringString

    // Config map that will be mounted on to the preprocessor image and the predictor
    // container at run time if required. This field is optional at the moment
    // and the above two fields must be used. This config is assumed to be in accord
    // with the container images that are being used.
    config?: string
}

export interface GetDeploymentsRequest {
    // If the deployment id is not available filters can
    // be supplied to filter based on labels on the deployment
    // These are the same labels that are specified while deploying the model
    // in the DeployRequest.
    // For eg: All models that have tag project_id = 4 or a specific model that
    // has project_id = 4, run_id = 1
    labels: StringString

    // The environment where the model must be queried
    model_serving_environment: ModelServingEnvironment
}


// This message is most likely going to evolve
// as we add more environments.
interface DeployedModelReference {
    // The host required to query the model
    model_host?: string

    // The endpoint config required to query the model
    base_url?: string
}

interface ModelStatus {
    // The status of the deployment
    status: string

    // A unique id generated by the server.
    deployment_id: string

    // Labels associated with this model
    // These are the same labels that are specified while deploying the model
    // in the DeployRequest.
    labels: StringString
}

export interface TearDownRequest {
    deployment_id: string

    // The environment where the model is deployed
    model_serving_environment: ModelServingEnvironment
}

export interface DeployedModel {
    // Status of the Model
    model_status: ModelStatus

    // Endpoint info that can be used to infer the model
    model_reference: DeployedModelReference
}

export interface Deployments {
    deployed_models: DeployedModel[]
}
