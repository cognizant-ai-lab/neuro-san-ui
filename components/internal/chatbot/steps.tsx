import {CustomStep} from "./custom_step"

/**
 * "Steps" for controlling the chatbot. This is really a JSON description of an FSM (finite state machine).
 * See documentation {@link https://lucasbassetti.com.br/react-simple-chatbot/#/docs/steps|here}.
 */
export const chatbotSteps = [
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
        component: <CustomStep />,  // eslint-disable-line enforce-ids-in-jsx/missing-ids
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
]
