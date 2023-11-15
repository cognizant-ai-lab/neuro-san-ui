import {ChatMessage} from "langchain/schema"
import {useRouter} from "next/router"
import {memo, useRef} from "react"
import ChatBot from "react-simple-chatbot"
import uuid from "react-uuid"
import {ThemeProvider} from "styled-components"

import {CustomStep} from "./custom_step"
import {chatbotTheme} from "../../../const"

/**
 * "Steps" for controlling the chatbot. This is a JSON description of an FSM (finite state machine).
 * See documentation {@link https://lucasbassetti.com.br/react-simple-chatbot/#/docs/steps|here}.
 *
 * @param pageContext Human-readable description of current page
 * @param addChatToHistory Function to add a chat message to the chat history
 * @param chatHistory Array of chat messages (see {@link ChatMessage}) of both human an AI origin
 * @param welcomeMessage Message to display when the chatbot is first opened
 *
 * @return An array of steps for the chatbot
 */
function getChatbotSteps(
    pageContext: string,
    addChatToHistory: (message: ChatMessage) => void,
    chatHistory: () => ChatMessage[],
    welcomeMessage: string
) {
    return [
        {
            id: "1",
            message: welcomeMessage,
            trigger: "search",
        },
        {
            id: "search",
            user: true,
            trigger: "3",
        },
        {
            id: "3",
            component: (
                <CustomStep // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    // Doesn't need an ID as it doesn't produce anything visible.
                    pageContext={pageContext}
                    chatHistory={chatHistory}
                    addChatToHistory={addChatToHistory}
                />
            ),

            waitAction: true,
            asMessage: true,
            trigger: "4",
        },
        {
            id: "4",
            message: "What else can I help you with?",
            trigger: "search",
        },
    ]
}

/**
 * Encapsulates a Chatbot from the <code>react-simple-chatbot</code> library, with some defaults for our use case.
 * @param props Basic settings for the chatbot. See declaration for details.
 */
const NeuroAIChatbot = (props: {id: string; userAvatar: string; pageContext: string}): React.ReactElement => {
    const router = useRouter()

    // Get "generic branding" flag
    const isGeneric = "generic" in router.query

    const id = props.id
    const pageContext = props.pageContext || "No page context available"

    // Use useRef here since we don't want changes in the chat history to trigger a re-render
    const chatHistory = useRef<ChatMessage[]>([])

    // function to add latest response to state array
    function addChatToHistory(message: ChatMessage) {
        chatHistory.current = [...chatHistory.current, message]
    }

    const welcomeMessage = isGeneric
        ? "Hi, I'm your Autopilot AI assistant. How can I help you?"
        : "Hi! I'm your Cognizant Neuro™ AI assistant. Please type your question below."

    const chatbotSteps = getChatbotSteps(pageContext, addChatToHistory, () => chatHistory.current, welcomeMessage)

    return (
        <>
            <ThemeProvider // eslint-disable-line enforce-ids-in-jsx/missing-ids
                theme={chatbotTheme}
            >
                <ChatBot
                    id={id}
                    cache={false}
                    floating={true}
                    headerTitle={isGeneric ? "Autopilot AI assistant" : "Cognizant Neuro™ AI Assistant"}
                    placeholder="What is a prescriptor?"
                    userAvatar={props.userAvatar}
                    botAvatar={isGeneric ? "/robot.png" : "/cognizantfavicon.ico"}
                    steps={chatbotSteps}
                    width="400px"
                    // Use a random key to force a new instance of the chatbot, so we don't get stale context from
                    // previous page
                    key={uuid()}
                />
            </ThemeProvider>
        </>
    )
}

export default memo(NeuroAIChatbot)
