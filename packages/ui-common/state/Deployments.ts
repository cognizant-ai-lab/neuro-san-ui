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

import {create} from "zustand"

import {DeployLogEntry} from "../controller/deploy/Deploy"

export enum DeploymentStatus {
    Publishing = "Publishing",
    Live = "Live",
}

export type Deployment =
    | {
          readonly status: DeploymentStatus.Publishing
          readonly log: readonly DeployLogEntry[]
      }
    | {
          readonly status: DeploymentStatus.Live
          readonly log: readonly DeployLogEntry[]
          readonly url: string
          /** Milliseconds since epoch */
          readonly publishedAt: number
      }

/**
 * Zustand state store for published networks, keyed by agent network name.
 */
interface DeploymentsStore {
    readonly deployments: Readonly<Record<string, Deployment>>
    readonly setDeployment: (networkName: string, deployment: Deployment) => void
    readonly removeDeployment: (networkName: string) => void
}

export const useDeploymentsStore = create<DeploymentsStore>()((set) => ({
    deployments: {},
    setDeployment: (networkName, deployment) =>
        set(({deployments}) => ({deployments: {...deployments, [networkName]: deployment}})),
    removeDeployment: (networkName) =>
        set(({deployments}) => {
            const {[networkName]: _removed, ...rest} = deployments
            return {deployments: rest}
        }),
}))
