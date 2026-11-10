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

import {useRouter} from "next/router"
import {FC, JSX as ReactJSX, useEffect} from "react"

import {MultiAgentAccelerator} from "../../../../packages/ui-common/components/MultiAgentAccelerator/MultiAgentAccelerator"
import {useEnvironmentStore} from "../../../../packages/ui-common/state/Environment"
import {useAuthentication} from "../../../../packages/ui-common/utils/Authentication"
import {CustomPageProps} from "../../Types/Types"

// Main function.
export const MultiAgentAcceleratorPage: FC & CustomPageProps = Object.assign(
    (): ReactJSX.Element => {
        // For access to logged-in session and current username
        const username = useAuthentication().data?.user?.name

        const {backendNeuroSanApiUrl} = useEnvironmentStore()

        // "?tour=true": sent here by Help > Take a tour from another page
        const router = useRouter()
        const startTour = router.query["tour"] === "true"

        // The accelerator has picked up the request by now (child effects run first), so take it out of the URL,
        // otherwise every reload would start the tour again
        useEffect(() => {
            if (!startTour) return
            const {tour: _tour, ...query} = router.query
            void router.replace({pathname: router.pathname, query}, undefined, {shallow: true})
        }, [router, startTour])

        return (
            <MultiAgentAccelerator
                username={username}
                defaultNeuroSanUrl={backendNeuroSanApiUrl}
                startTour={startTour}
            />
        )
    },
    {
        authRequired: true,
        // Full-bleed "mission control" workspace: no breadcrumbs above the canvas
        withBreadcrumbs: false,
        pageContext: `The Multi-Agent Accelerator (Neuro-San) UI presents an interactive view of an
    Agent Network. Users can browse different networks from the left menu, while the central graph visualizes how agents
    connect and collaborate to complete tasks. A chat panel on the right allows users to ask questions and receive
    answers.`,
    }
)

export default MultiAgentAcceleratorPage
