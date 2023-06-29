import { Component } from "react"
import { Loading } from "react-simple-chatbot"

// Need to disable some ESlint rules for this module.
// This is a legacy component and hopefully can be converted to Functional once the ticket mentioned in the class
// comment is addressed.
/* eslint-disable react/no-set-state,no-invalid-this */

// Define constructor params for our component (to keep Typescript happy)
type PropTypes = {
    steps?: {search: {value: string}},
    triggerNextStep?: () => object,
}

// Specification for component state (to keep Typescript happy)
type StepState = {
    loading: boolean,
    answer: string,
    nextStepTriggered: boolean
}

/**
 * This is a custom component for use with the <code>react-simple-chatbot</code> component.
 *
 * It is heavily inspired by the
 * {@link https://lucasbassetti.com.br/react-simple-chatbot/#/docs/wikipedia|Wikipedia example} in the doc.
 *
 * For now this has to be an old school class component, since apparently the chatbot library does not support
 * functional components for this property in "steps". See related
 * {@link https://github.com/LucasBassetti/react-simple-chatbot/issues/369|ticket}.
 *
 */
export class CustomStep extends Component<PropTypes, StepState> {

    constructor(props: PropTypes) {
        super(props)

        this.state = {
            loading: true,
            answer: "",
            nextStepTriggered: false,
        }

        this.triggerNext = this.triggerNext.bind(this)
    }

    componentDidMount() {
        // Need to alias "this" (apparently) so we can use it inside the function below. This appears to be some kind
        // of lexical capture, but it's beyond my knowledge, and I'm just copying the example from the doc.
        // eslint-disable-next-line @typescript-eslint/no-this-alias,consistent-this
        const self = this
        const { steps } = this.props
        const search = steps.search.value
        const queryUrl = "/api/gpt/userguide"

        const xhr = new XMLHttpRequest()

        xhr.addEventListener('readystatechange', readyStateChange)

        function readyStateChange() {
            if (this.readyState === 4) {
                const data = JSON.parse(this.responseText)
                const answer = data.answer
                if (answer) {
                    self.setState({ loading: false, answer: answer })
                } else {
                    self.setState({ loading: false, answer: "Sorry, I have no information about that." })
                }
            }
        }

        // Send the request to the server
        xhr.open("POST", queryUrl)
        xhr.setRequestHeader('Accept', 'application/json')
        xhr.setRequestHeader('Content-Type', 'application/json')
        xhr.send(`{"query":"${search}"}`)
    }

    // Trigger next state -- meaning, prompt the user for a new query
    triggerNext() {
        console.log("trigger next")
        this.setState({ nextStepTriggered: true }, () => {
            this.props.triggerNextStep()
        })
    }

    render() {
        const { nextStepTriggered, loading, answer } = this.state
        !nextStepTriggered && this.triggerNext()
        return (
            <>
                {loading ? <Loading id="chatbot-result-id" /> : answer}
            </>
        )
    }
}
