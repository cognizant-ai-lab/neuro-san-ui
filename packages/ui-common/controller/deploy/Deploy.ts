/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * Client for the network deploy service.
 * @note The deploy service API does not exist yet, so these functions are stubs that simulate its latency and log
 * output.
 */

//#region Types

export interface DeployLogEntry {
    /** Milliseconds since epoch */
    readonly timestamp: number
    readonly message: string
    readonly detail?: string
}

//#endregion Types

//#region Constants

const STUB_BUNDLE_URL = "http://127.0.0.1:8200/bundle"
const STUB_DEPLOY_URL = "http://127.0.0.1:8300/deploy"
const STUB_LIVE_BASE_URL = "http://127.0.0.1:8110"
const STUB_STEP_DELAY_MS = 1000

//#endregion Constants

const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, ms)
    })

/**
 * Publishes a network so it is reachable at a public URL.
 * @param networkName The agent network name to publish
 * @param onLog Called with each step of the deploy as it happens
 * @returns The URL at which the network is live
 */
export const publishNetwork = async (networkName: string, onLog: (entry: DeployLogEntry) => void): Promise<string> => {
    const log = (message: string, detail?: string) => onLog({timestamp: Date.now(), message, detail})
    const bundleId = `bndl_${Math.random().toString(16).slice(2, 10)}`

    log(`POST ${STUB_BUNDLE_URL}`, `${networkName}.hocon`)
    await delay(STUB_STEP_DELAY_MS)
    log(`201 bundle_id=${bundleId}`)

    log(`POST ${STUB_DEPLOY_URL}`, JSON.stringify({bundle_id: bundleId}))
    await delay(STUB_STEP_DELAY_MS * 2)

    const url = `${STUB_LIVE_BASE_URL}/${networkName}`
    log("200", url)

    return url
}

/**
 * Takes a published network offline.
 * @param _networkName The agent network name to unpublish
 */
export const unpublishNetwork = async (_networkName: string): Promise<void> => delay(STUB_STEP_DELAY_MS)
