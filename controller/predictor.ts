// Import the library for making requests
import axios from 'axios'

// Import constants
import { TRAIN_SERVER } from "../const"

export async function FetchPredictors(predictorType: string) {
    /*
    This function is the controller used to contact the backend to
    fetch the type of predictors availaible
    */
    
    // Create the Predictor URL
    const PredictorURL = TRAIN_SERVER + `/predictors/${predictorType}`

    // Fetch the Predictors and return the promise that returns the 
    // JSON
   let response = await fetch(PredictorURL) 
   let predictorResp = await response.json()
    
    return predictorResp

}

export async function FetchMetrics(predictorType: string) {
    /*
    This function is the controller used to contact the backend to
    fetch the type of predictors availaible
    */
    
    // Create the Predictor URL
    const URL = TRAIN_SERVER + `/metrics/${predictorType}`

    // Fetch the metrics
   let response = await fetch(URL) 
   let metrics = await response.json()
    
    return metrics
}

export async function FetchParams(predictorType: string, predictorName: string) {
    /*
    This function is the controller used to contact the backend to
    fetch the configuration parameters for the predictor
    */
    
    // Create the Predictor URL
    const URL = TRAIN_SERVER + `/default_params/${predictorType}/${predictorName}`

    // Fetch the Predictors and return the promise that returns the 
    // JSON
    let response = await fetch(URL) 
    let params = await response.json()
        
    return params
}