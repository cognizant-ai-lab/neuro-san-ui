// Types for model serving controller

// Model ID, Model URL, Node ID
import {StringToArrayOfStringOrNumber, StringToStringToArrayOfStringOrNumber} from "../base_types"

type RunModel = [string, string, string]

export type RunModels = {
    readonly runId: number
    readonly predictors: RunModel[]
    readonly prescriptors: RunModel[]
    readonly rio: RunModel[]
}

/**
 * Response from running inference on a model. This is not part of the protobuf contract, which just returns "string"
 * since there are potentially many different models, each returning their own thing. This type lists the
 * currently known and used responses from the models types we handle.
 *
 * Unfortunately the RIO response is just an unnamed object, so we have to use the intersection type below.
 */
export type ModelResponse =
    | {
          readonly prescribedActions?: StringToArrayOfStringOrNumber
          readonly predictedOutcomes?: StringToArrayOfStringOrNumber
          readonly rulesInference?: string
      }
    | StringToStringToArrayOfStringOrNumber
