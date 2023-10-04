/**
 * This is the module for the "AI decision assistant".
 */
import {Drawer} from "antd"
import {Button, Form, InputGroup} from "react-bootstrap"
import ClipLoader from "react-spinners/ClipLoader"
import {MaximumBlue} from "../../../const"
import {useState} from "react";
import {sendDmsChatQuery} from "../../../controller/dmschat/dmschat";
import {AgentStep} from "langchain/dist/schema";
import {empty} from "../../../utils/objects";
import {StringToStringOrNumber} from "../../../controller/base_types";

/**
 * AI asssistant, intitially for DMS page but in theory could be used elsewhere.
 */
export function AIAssistant(props: {
    predictorUrls: string[]
    prescriptorUrl: string
    contextInputs: StringToStringOrNumber
    onClose: () => void
    open: boolean
    spinnerSize: number
    resetUndeployModelsTimer: () => void,
}) {

    // User LLM chat input
    const [userLlmChatInput, setUserLlmChatInput] = useState<string>("")

    // User LLM chat output
    const [userLlmChatOutput, setUserLlmChatOutput] = useState<string>("")

    // Stores whether are currently awaiting LLM response (for knowing when to show spinners)
    const [isAwaitingLlm, setIsAwaitingLlm] = useState(false)

    // Translates an LLM "step" in JSON format into a more human-readable form
    function decodeStep(step: AgentStep) {
        let output = ""

        if (step.action) {
            output += step.action.log + "\n"
        }

        if (step.observation) {
            output += (empty(step.observation) ? "" : step.observation) + "\n"
        }

        return output
    }

    async function handleUserQuery(event) {
        event.preventDefault()
        const userQuery = event.target[1].value

        try {
            // User interacted so reset timer
            props.resetUndeployModelsTimer()

            setIsAwaitingLlm(true)
            setUserLlmChatOutput("")

            const response = await sendDmsChatQuery(userQuery, props.contextInputs, props.prescriptorUrl,
                props.predictorUrls)

            if (!response.ok) {
                console.debug("response", response)
                setUserLlmChatOutput(`Internal error: \n\n${response.status}: ${response.statusText}\n
More information may be available in the browser console.`)
                return
            }

            const responseJson = await response.json()

            const intermediateSteps = responseJson.response.intermediateSteps.map(
                (step: AgentStep) => decodeStep(step) + "\n"
            )
            const finalOutput = responseJson.response.output
            const fullResponse = (intermediateSteps + finalOutput)

            setUserLlmChatOutput(fullResponse)
        } catch (e) {
            setUserLlmChatOutput(`Internal error: \n\n${e}\n 
More information may be available in the browser console.`)
            console.error(e.stack)
        } finally {
            // Reset state, whatever happened during request
            setIsAwaitingLlm(false)
            setUserLlmChatInput("")
        }

    }

    const handleUserLlmChatInputChange = (event) => {
        const inputText = event.target.value
        setUserLlmChatInput(inputText)
    };

    // Regex to check if user has typed anything besides whitespace
    const userInputEmpty = !(/\S/u).test(userLlmChatInput)

    // Disable Send when request is in progress
    const shouldDisableSendButton = userInputEmpty || isAwaitingLlm

    return <Drawer // eslint-disable-line enforce-ids-in-jsx/missing-ids
        title="AI Decision Assistant"
        placement="right"
        closable={true}
        onClose={props.onClose}
        open={props.open}
        width={"35%"}


        // This flag is required so that the component unmounts on close
        // and the useEffect timer cleanup function is called when the RunPage
        // goes out of scope.
        destroyOnClose={true}
    >
        <Form id="user-query-form" onSubmit={handleUserQuery}>
            <Form.Group id="llm-chat-group">
                <div id="llm-response-div" style={{width: "97%", height: "80vh", margin: "10px"}}>
                    {isAwaitingLlm
                        ? <ClipLoader // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // ClipLoader does not have an id property when compiling
                            color={MaximumBlue} loading={true} size={4 * props.spinnerSize}/>
                        : <Form.Control
                            id="llm-responses"
                            readOnly={true}
                            as="textarea"
                            style={{
                                whiteSpace: "pre-wrap",
                                height: "100%",
                                background: "ghostwhite",
                                borderColor: MaximumBlue,
                                resize: "none",
                                fontFamily: "monospace",
                                fontSize: "smaller"
                            }}
                            value={userLlmChatOutput}
                        />
                    }
                </div>
                <div id="user-input-div" style={{display: "flex"}}>
                    <InputGroup id="user-input-group">
                        <Form.Control id="user-input"
                                      placeholder="What are the current prescribed actions?"
                                      value={userLlmChatInput}
                                      style={{
                                          marginLeft: "5px",
                                          fontSize: "90%"
                                      }}
                                      onChange={handleUserLlmChatInputChange}
                        />
                        <Button id="clear-input-button"
                                onClick={() => setUserLlmChatInput("")}
                                style={{
                                    backgroundColor: "transparent",
                                    border: "none",
                                    fontWeight: 550,
                                    left: "calc(100% - 30px)",
                                    lineHeight: "35px",
                                    position: "absolute",
                                    width: "10px",
                                    zIndex: 99999
                                }}
                        >
                            X
                        </Button>
                    </InputGroup>
                    <Button id="submit-query-button"
                            variant="primary"
                            type="submit"
                            disabled={shouldDisableSendButton}
                            style={{
                                background: MaximumBlue,
                                borderColor: MaximumBlue,
                                color: "white",
                                opacity: shouldDisableSendButton ? "50%" : "100%",
                                marginLeft: "10px",
                                marginRight: "10px"
                            }}
                    >
                        Send
                    </Button>
                </div>
            </Form.Group>
        </Form>
    </Drawer>;
}