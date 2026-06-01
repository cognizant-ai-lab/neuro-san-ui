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
 * Component to display agent intro, including agent name, image, and greeting.
 */
export const AgentIntro: FC<AgentIntroProps> = ({agentDisplayName, customAgentGreetings, targetAgent}) => {
    // eslint-disable-next-line react/hook-use-state -- we want to set this an "on mount" value only and never update
    const [greeting] = useState<string>(() => {
        if (customAgentGreetings?.[targetAgent]) {
            return customAgentGreetings[targetAgent]
        }
        const randomIndex = Math.floor(Math.random() * GENERIC_AGENT_GREETINGS.length)
        return GENERIC_AGENT_GREETINGS[randomIndex]
    })

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
