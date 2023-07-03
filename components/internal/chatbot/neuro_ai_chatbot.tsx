import ChatBot from "react-simple-chatbot"
import {ThemeProvider} from "styled-components"
import {chatbotTheme} from "../../../const"
import {CustomStep} from "./custom_step";
import uuid from "react-uuid";

/**
 * "Steps" for controlling the chatbot. This is really a JSON description of an FSM (finite state machine).
 * See documentation {@link https://lucasbassetti.com.br/react-simple-chatbot/#/docs/steps|here}.
 */
function getChatbotSteps(pageContext: string) {
    return ([
        {
            id: '1',
            message: "Hi! I'm your Cognizant Neuro™ AI assistant. Please type your question below.",
            trigger: 'search'
        },
        {
            id: 'search',
            user: true,
            trigger: '3'
        },
        {
            id: '3',
            component: <CustomStep pageContext={pageContext} />,    // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                                                    // Doesn't need an ID as it doesn't produce anything visible.
            waitAction: true,
            asMessage: true,
            trigger: '4'
        },
        {
            id: '4',
            message: "What else can I help you with?",
            trigger: 'search'
        }
    ])
}

/**
 * Encapsulates a Chatbot from the <code>react-simple-chatbot</code> library, with some defaults for our use case.
 * @param props Basic settings for the chatbot. See declaration for details.
 */
export function NeuroAIChatbot(props: { id: string, userAvatar: string, pageContext: string }): React.ReactElement {
    const id = props.id
    const pageContext = props.pageContext || "No page context available";
    const chatbotSteps = getChatbotSteps(pageContext);

    return  <>
        <ThemeProvider // eslint-disable-line enforce-ids-in-jsx/missing-ids
            theme={chatbotTheme}
        >
            <ChatBot
                id={id}
                cache={false}
                floating={true}
                headerTitle="Cognizant Neuro™ AI Assistant"
                placeholder="What is a prescriptor?"
                userAvatar={props.userAvatar}
                botAvatar="/cognizantfavicon.ico"
                steps={chatbotSteps}
                width="400px"
                // Use a random key to force a new instance of the chatbot, so we don't get stale context from
                // previous page
                key={uuid()}
            />
        </ThemeProvider>
    </>
}
