import {Typography} from "@mui/material"
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
    async function sendUserQueryToLlm() {
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
            paperProps={{
                sx: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100%",
                    minWidth: "100%",
                },
            }}
            title={`Sample user interface for "${projectName}"`}
        >
            <Box // eslint-disable-line enforce-ids-in-jsx/missing-ids
                sx={{
                    alignItems: "center",
                    display: "flex",
                    flexGrow: "1",
                    border: "1px solid lightgray",
                    borderRadius: "10px",
                    padding: "1rem",
                }}
            >
                {isLoading ? (
                    <CircularProgress
                        id="ui-mockup-loader"
                        sx={{display: "flex", margin: "0 auto 60px auto"}}
                        size={200}
                    />
                ) : generatedCode ? (
                    <Box
                        id="generated-code"
                        sx={{
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
                ) : (
                    <Box id="ui-mockup-placeholder-container">
                        <Box
                            id="ui-mockup-background-image"
                            sx={{
                                width: "80vw",
                                height: "75vh",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                backgroundImage: "url('/ui_background.png')",
                                backgroundSize: "100% 100%", // Stretch the image to fit the box
                                backgroundPosition: "center",
                                opacity: 0.2,
                            }}
                        />
                        <Typography
                            id="ui-mockup-placeholder"
                            sx={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                color: "var(--bs-primary)",
                                fontFamily: "var(--bs-font-sans-serif)",
                                fontSize: "50px",
                                textAlign: "center",
                                padding: "10px",
                                borderRadius: "10px",
                            }}
                        >
                            Click &quot;Generate&quot; to render a sample user interface.
                        </Typography>
                    </Box>
                )}
            </Box>
            <Box
                id="ui-mockup-btn-container"
                sx={{alignSelf: "flex-end", width: "100%"}}
            >
                <Button
                    id="ui-mockup-btn"
                    onClick={sendUserQueryToLlm}
                    style={{
                        background: MaximumBlue,
                        borderColor: MaximumBlue,
                        marginBottom: "1rem",
                        marginTop: "1rem",
                        width: "100%",
                    }}
                    disabled={isLoading}
                >
                    Generate
                </Button>
            </Box>
        </MUIDialog>
    )
}
