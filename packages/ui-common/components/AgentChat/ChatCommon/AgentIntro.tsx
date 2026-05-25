import {FC, useState} from "react"

import {AGENT_IMAGE} from "./Const"
import {GENERIC_AGENT_GREETINGS} from "./Greetings"
import {UserQueryDisplay} from "./UserQueryDisplay"
import {CombinedAgentType} from "../Common/Types"

interface AgentIntroProps {
    readonly agentDisplayName: string
    readonly customAgentGreetings?: Partial<Record<CombinedAgentType, string>>
    readonly targetAgent: string
}

/**
 * Component to display agent metadata, including connectivity info and sample queries.
 */
export const AgentIntro: FC<AgentIntroProps> = ({agentDisplayName, customAgentGreetings, targetAgent}) => {
    const [greeting, setGreeting] = useState<string>("")
    const [currentAgent, setCurrentAgent] = useState<string>("")

    if (currentAgent !== targetAgent) {
        setCurrentAgent(targetAgent)
        setGreeting(
            customAgentGreetings?.[targetAgent] ??
                // eslint-disable-next-line react-hooks/purity -- can't satisfy both purity and other react rules here
                GENERIC_AGENT_GREETINGS[Math.floor(Math.random() * GENERIC_AGENT_GREETINGS.length)]
        )
    }

    return (
        <>
            <UserQueryDisplay
                userQuery={agentDisplayName}
                title={targetAgent}
                userImage={AGENT_IMAGE}
            />
            {greeting}
        </>
    )
}
