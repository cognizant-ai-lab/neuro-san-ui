import {ChatMessage} from "@langchain/core/messages"
import {Collapse} from "antd"
import httpStatus from "http-status"
import {Component} from "react"
import {Loading} from "react-simple-chatbot"

// Need to disable some ESlint rules for this module.
// This is a legacy component and hopefully can be converted to Functional once the ticket mentioned in the class
// comment is addressed.
/* eslint-disable react/no-set-state */

// Define constructor params for our component (to keep Typescript happy)
type PropTypes = {
    steps?: {search: {value: string}}
    triggerNextStep?: () => object
    pageContext?: string
    addChatToHistory: (message: ChatMessage) => void
    chatHistory?: () => ChatMessage[]
}

// Specification for component state (to keep Typescript happy)
type StepState = {
    loading: boolean
    answer: string
    sources: {source: string; page: string; snippet: string}[]
    nextStepTriggered: boolean
}

const ExpandableSources: React.FC<{sourcesAsList: string}> = ({sourcesAsList}) => {
    return (
        <div
            id="show-sources-div"
            style={{fontSize: "smaller", overflowWrap: "anywhere"}}
        >
            <Collapse // eslint-disable-line enforce-ids-in-jsx/missing-ids
            >
                <Collapse.Panel // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    header="Show sources"
                    key={1}
                >
                    {sourcesAsList ?? "No sources found"}
                </Collapse.Panel>
            </Collapse>
        </div>
    )
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
// We want the ExpandableSources component in this same module
// eslint-disable-next-line react/no-multi-comp
export class CustomStep extends Component<PropTypes, StepState> {
    constructor(props: PropTypes) {
        super(props)

        this.state = {
            loading: true,
            answer: "",
            nextStepTriggered: false,
            sources: [],
        }

        this.triggerNext = this.triggerNext.bind(this)
    }

    override componentDidMount() {
        // Need to alias "this" (apparently) so we can use it inside the function below. This appears to be some kind
        // of lexical capture, but it's beyond my knowledge, and I'm just copying the example from the doc.
        // eslint-disable-next-line @typescript-eslint/no-this-alias,consistent-this
        const thisTmp = this
        const {steps} = this.props

        const queryUrl = "/api/gpt/userguide"

        const xhr = new XMLHttpRequest()

        xhr.addEventListener("readystatechange", readyStateChange)

        function readyStateChange(this: XMLHttpRequest) {
            // Hint to non-JS gurus like me: this "this" is not the "this" you think it is. It has nothing to do with
            // the "this" for the current instance of `CustomStep`. Rather, it is the "this" of the event handler
            // for XMLHttpRequest. For more, see https://xhr.spec.whatwg.org/#xmlhttprequest-response
            if (this.readyState === this.DONE) {
                if (this.status === httpStatus.OK) {
                    const data = JSON.parse(this.responseText)
                    const answer = data.answer

                    // Did the server provide a valid "answer"?
                    if (answer) {
                        thisTmp.setState({loading: false, answer: answer, sources: data.sources})

                        // Record bot answer in history
                        thisTmp.props.addChatToHistory(new ChatMessage(answer, "ai"))
                    } else {
                        // Something went wrong -- no "answer" from the server
                        thisTmp.setState({loading: false, answer: "Sorry, I have no information about that."})
                    }
                } else {
                    // HTTP error of some kind
                    thisTmp.setState({
                        loading: false,
                        answer:
                            "Sorry, an internal error has occurred. More detailed " +
                            "information may be available in the browser console.",
                    })
                    console.error(
                        `Error ${this.status} while trying to get answer from ${queryUrl}\n` +
                            `Response: ${this.responseText}`
                    )
                }
            }
        }

        // Prepare the request
        xhr.open("POST", queryUrl)
        xhr.setRequestHeader("Accept", "application/json")
        xhr.setRequestHeader("Content-Type", "application/json")

        const search = steps.search.value
        const safeSearchString = JSON.stringify(search)
        const safePageContext = JSON.stringify(this.props.pageContext)
        const safeChatHistory = JSON.stringify(this.props.chatHistory())

        // Record user query in history
        this.props.addChatToHistory(new ChatMessage(search, "human"))

        // Send the request to the server
        xhr.send(`{"query":${safeSearchString}, "pageContext": ${safePageContext}, "chatHistory": ${safeChatHistory}}`)
    }

    // Trigger next state -- meaning, prompt the user for a new query
    triggerNext() {
        this.setState({nextStepTriggered: true}, () => {
            this.props.triggerNextStep()
        })
    }

    override render() {
        const {nextStepTriggered, loading, answer, sources} = this.state
        if (!nextStepTriggered && !loading) {
            this.triggerNext()
        }

        // Format sources for display
        const sourcesAsList = sources
            ?.map(
                (source) =>
                    `Source: ${source.source.replace(/\n/gu, "")} 
from this snippet: "${source.snippet.replace(/\n/gu, "")}" page: ${source.page ?? "n/a"}`
            )
            .join("\n")

        return (
            <>
                {loading ? (
                    <Loading id="chatbot-result-id" />
                ) : (
                    <>
                        {answer}
                        <ExpandableSources // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            sourcesAsList={sourcesAsList}
                        />
                    </>
                )}
            </>
        )
    }
}
