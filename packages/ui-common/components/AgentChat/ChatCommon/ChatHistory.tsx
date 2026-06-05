import {useTheme} from "@mui/material/styles"
import {FC} from "react"

import {Conversation} from "./Conversation"
import {ConversationTurn} from "./ConversationTurn"
import {adjustBrightness} from "../../../Theme/Theme"
import {MUIAccordion} from "../../Common/MUIAccordion"

// #region: Types
interface ChatHistoryProps {
    readonly chatHistoryKey: string
    readonly id: string
    readonly turns: ConversationTurn[]
}
// #endregion: Types

/**
 * Component for displaying chat history from previous interactions with the agent.
 */
export const ChatHistory: FC<ChatHistoryProps> = ({chatHistoryKey, id, turns}) => {
    const theme = useTheme()
    return (
        <MUIAccordion
            id={id}
            key={chatHistoryKey}
            sx={{
                marginBottom: "1rem",
                marginTop: "1rem",
                // Slightly darker background to differentiate from main chat
                backgroundColor: adjustBrightness(theme.palette.background.paper, -5),
                opacity: 0.5,
            }}
            items={[
                {
                    title: "Chat History",
                    content: (
                        <Conversation
                            id={`${id}-conversation`}
                            // Pass "true" here to include final answers, which get persisted as agent
                            // messages in chat history.
                            includeAgentMessages={true}
                            shouldWrapOutput={true}
                            turns={turns}
                        />
                    ),
                },
            ]}
        />
    )
}
