import ChatBot from "react-simple-chatbot"
import {ThemeProvider} from "styled-components"
import {chatbotTheme} from "../../../const"
import {chatbotSteps} from "./steps"

/**
 * Encapsulates a Chatbot from the <code>react-simple-chatbot</code> library, with some defaults for our use case.
 * @param props Basic settings for the chatbot. See declaration for details.
 */
export function NeuroAIChatbot(props: { id: string, userAvatar: string }): React.ReactElement {
    const id = props.id
    return  <>
        <ThemeProvider // eslint-disable-line enforce-ids-in-jsx/missing-ids
            theme={chatbotTheme}
        >
            <ChatBot id={id}
                     floating={true}
                     placeholder="What is a prescriptor?"
                     userAvatar={props.userAvatar}
                     botAvatar="/cognizantfavicon.ico"
                     steps={chatbotSteps}
                     width="400px"
            />
        </ThemeProvider>
    </>
}
