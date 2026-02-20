/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

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

import dynamic from "next/dynamic"

import {useAuthentication} from "../../../../packages/ui-common"
import {useEnvironmentStore} from "../../../../packages/ui-common/state/Environment"

// @xyflow/react (v12) is imported normally — SSR is skipped via next/dynamic because
// ReactFlow accesses browser-only APIs during render and must be client-only.
const MultiAgentAccelerator = dynamic(
    () => import("../../../../packages/ui-common").then((m) => m.MultiAgentAccelerator),
    {ssr: false}
)

// Main function.
export default function MultiAgentAcceleratorPage() {
    // For access to logged-in session and current username
    const {
        user: {image: userImage, name: userName},
    } = useAuthentication().data

    const {backendNeuroSanApiUrl} = useEnvironmentStore()

    return (
        <MultiAgentAccelerator
            userInfo={{userName, userImage}}
            backendNeuroSanApiUrl={backendNeuroSanApiUrl}
        />
    )
}

MultiAgentAcceleratorPage.authRequired = true
MultiAgentAcceleratorPage.isContainedInViewport = true
MultiAgentAcceleratorPage.pageContext = `The Multi-Agent Accelerator (Neuro-San) UI presents an interactive view of an
    Agent Network. Users can browse different networks from the left menu, while the central graph visualizes how agents
    connect and collaborate to complete tasks. A chat panel on the right allows users to ask questions and receive
    answers.`
