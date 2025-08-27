import {useAuthentication} from "../../../../packages/ui-common"
import useEnvironmentStore from "../../../../packages/ui-common/state/environment"
import {usePreferences} from "../../../../packages/ui-common/state/Preferences"
import {MultiAgentAccelerator} from "../../../../packages/ui-common"

// Main function.
// Has to be export default for Next.js so tell ts-prune to ignore
// ts-prune-ignore-next
export default function MultiAgentAcceleratorPage() {
    // Animation time for the left and right panels to slide in or out when launching the animation
    // For access to logged-in session and current username
    const {
        user: {image: userImage, name: userName},
    } = useAuthentication().data

    const {backendNeuroSanApiUrl} = useEnvironmentStore()

    // Dark mode
    const {darkMode} = usePreferences()

    return (
        <MultiAgentAccelerator
            userInfo={{userName, userImage}}
            backendNeuroSanApiUrl={backendNeuroSanApiUrl}
            darkMode={darkMode}
        />
    )
}

MultiAgentAcceleratorPage.authRequired = true
MultiAgentAcceleratorPage.isContainedInViewport = true
MultiAgentAcceleratorPage.pageContext = `The Multi-Agent Accelerator (Neuro-San) UI presents an interactive view of an
    Agent Network. Users can browse different networks from the left menu, while the central graph visualizes how agents
    connect and collaborate to complete tasks. A chat panel on the right allows users to ask questions and receive
    answers.`
