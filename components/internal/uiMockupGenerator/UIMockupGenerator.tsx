import Box from "@mui/material/Box"
// TODO: Switch to MUI button, thing is the react-bootstrap button matches all the other buttons
//import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import {FC, useRef, useState} from "react"
import {Button} from "react-bootstrap"

import {MaximumBlue} from "../../../const"
import {sendDalleQuery} from "../../../controller/dall-e/dall-e"
import {CodeUiResponse} from "../../../pages/api/gpt/code-ui/types"
import {MUIDialog} from "../../dialog"

// #region: Types
interface UIMockupGeneratorProps {
    actionFields: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
    contextFields: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
    isOpen: boolean
    onClose: () => void
    outcomeFields: any[] // eslint-disable-line @typescript-eslint/no-explicit-any
    projectDescription: string
    projectName: string
}
// #endregion: Types

export const UIMockupGenerator: FC<UIMockupGeneratorProps> = ({
    actionFields,
    contextFields,
    isOpen,
    onClose,
    outcomeFields,
    projectDescription,
    projectName,
}) => {
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [generatedCode, setGeneratedCode] = useState<string>("")

    // Controller for cancelling fetch request
    const controller = useRef<AbortController>(null)

    const userQuery = `
        Project name: ${projectName}.
        Project description: ${projectDescription}.
        Action fields: ${actionFields.join(", ")}.
        Context fields: ${contextFields.join(", ")}.
        Outcome fields: ${outcomeFields.join(", ")}.
    `

    // Sends query to backend to send to Dall-e via Langchain.
    async function sendUserQueryToDalle() {
        setIsLoading(true)

        try {
            controller.current = new AbortController()

            const response: CodeUiResponse = await sendDalleQuery(userQuery)
            setGeneratedCode(response.response.generatedCode)
        } catch (error) {
            // log error to console
            // TODO: Check that error handling is working and surface error to user
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <MUIDialog
            id="ui-mockup-dialog"
            isOpen={isOpen}
            onClose={onClose}
            sx={{display: "flex", flexDirection: "column", minWidth: "2000px", minHeight: "800px"}}
            title="User Interface"
        >
            <Box // eslint-disable-line enforce-ids-in-jsx/missing-ids
                sx={{alignItems: "center", display: "flex", flexGrow: "1"}}
            >
                {isLoading ? (
                    <CircularProgress
                        id="ui-mockup-loader"
                        sx={{display: "flex", margin: "0 auto 60px auto"}}
                        size={200}
                    />
                ) : (
                    generatedCode && (
                        // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                width: "100%",
                                height: "100%",
                                overflow: "auto",
                            }}
                        >
                            <div
                                id="generated-code"
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    width: "100%",
                                }}
                                // The warning is valid -- the LLM could in theory generate dangerous code. Need to
                                // think through how to mitigate this.
                                // eslint-disable-next-line react/no-danger
                                dangerouslySetInnerHTML={{__html: generatedCode}}
                            />
                        </Box>
                    )
                )}
            </Box>
            <Box // eslint-disable-line enforce-ids-in-jsx/missing-ids
                sx={{alignSelf: "flex-end", width: "100%"}}
            >
                <Button
                    id="ui-mockup-btn"
                    onClick={sendUserQueryToDalle}
                    style={{
                        background: MaximumBlue,
                        borderColor: MaximumBlue,
                        marginBottom: "1rem",
                        marginTop: "1rem",
                        width: "100%",
                    }}
                >
                    Generate
                </Button>
            </Box>
        </MUIDialog>
    )
}
