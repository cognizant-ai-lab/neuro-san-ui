import {styled, Typography} from "@mui/material"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import {FC, useState} from "react"

import {sendCodeUIQuery} from "../../../controller/code-ui/code-ui"
import {CodeUiResponse} from "../../../pages/api/gpt/code-ui/types"
import {MUIDialog} from "../../dialog"
import {NotificationType, sendNotification} from "../../notification"

// #region: Styles

// This is identical to InferenceButton in DMS but not much point extracting to a common style as we are going to
// revisit the styling of all these buttons. See UN-2742
const StyledButton = styled(Button)(({disabled}) => ({
    background: "var(--bs-primary)",
    borderColor: "var(--bs-primary)",
    width: "100%",
    color: "white !important",
    lineHeight: "37.5px",
    paddingTop: "10px",
    paddingBottom: "10px",
    borderRadius: "15px",
    fontSize: "25px",
    fontWeight: 400,
    opacity: disabled ? 0.5 : 1,
}))
// #endregion: Styles

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

/**
 * Component that generates a mockup of a user interface based on the provided fields. It uses an LLM to generate
 * static HTML which is then rendered in a sandboxed iframe.
 * @param actionFields Action fields from the DMS page
 * @param contextFields Context fields from the DMS page
 * @param isOpen Whether the dialog is open
 * @param onClose Function to close the dialog
 * @param outcomeFields Outcome fields from the DMS page
 * @param projectDescription Description of the project the user is working on
 * @param projectName Name of the project the user is working on
 */
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

    const codeGenerationQuery = `
        Project name: ${projectName}.
        Project description: ${projectDescription}.
        Action fields: ${actionFields.join(", ")}.
        Context fields: ${contextFields.join(", ")}.
        Outcome fields: ${outcomeFields.join(", ")}.
    `

    // Sends query to backend to send to the LLM
    async function sendUserQueryToLlm() {
        setIsLoading(true)

        try {
            const response: CodeUiResponse = await sendCodeUIQuery(codeGenerationQuery)
            setGeneratedCode(response.response.generatedCode)
        } catch (error) {
            if (error instanceof Error) {
                sendNotification(
                    NotificationType.error,
                    "An error occurred while generating the UI",
                    `Description: ${error.message}`
                )
            } else {
                sendNotification(
                    NotificationType.error,
                    "An unknown error occurred while generating the UI",
                    `Description: ${error}`
                )
            }
        } finally {
            setIsLoading(false)
        }
    }

    function getGeneratedCodeIFrame() {
        return (
            <iframe
                id="generated-code"
                srcDoc={generatedCode}
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    width: "100%",
                    height: "80vh",
                    border: "none",
                }}
                sandbox=""
            />
        )
    }

    function getPlaceholder() {
        return (
            <Box id="ui-mockup-placeholder-container">
                <Box
                    id="ui-mockup-background-image"
                    sx={{
                        alignItems: "center",
                        backgroundImage: "url('/ui_background.png')",
                        backgroundPosition: "center",
                        backgroundSize: "100% 100%",
                        display: "flex",
                        height: "75vh",
                        justifyContent: "center",
                        opacity: 0.4,
                        width: "80vw",
                    }}
                />
                <Typography
                    id="ui-mockup-placeholder"
                    sx={{
                        color: "var(--bs-primary)",
                        fontFamily: "var(--bs-font-sans-serif)",
                        fontSize: "50px",
                        padding: "10px",
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        backgroundColor: "rgba(255, 255, 255, 0.75)",
                    }}
                >
                    Click &quot;Generate&quot; to render a sample user interface.
                </Typography>
            </Box>
        )
    }

    function getGenerateButton() {
        return (
            <Box
                id="ui-mockup-btn-container"
                sx={{alignSelf: "flex-end", width: "100%"}}
            >
                <StyledButton
                    id="ui-mockup-btn"
                    onClick={sendUserQueryToLlm}
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        background: "var(--bs-primary)",
                        borderColor: "var(--bs-primary)",
                        margin: "0 auto",
                        marginTop: "2rem",
                        marginBottom: "1rem",
                        width: "90%",
                    }}
                    disabled={isLoading}
                >
                    Generate
                </StyledButton>
            </Box>
        )
    }

    function getDialogContent() {
        return (
            <Box
                id="ui-mockup-container"
                sx={{
                    alignItems: "center",
                    display: "flex",
                    flexGrow: "1",
                    border: "1px solid lightgray",
                    borderRadius: "10px",
                    padding: "1rem",
                    height: "100%",
                }}
            >
                {isLoading ? (
                    <CircularProgress
                        id="ui-mockup-loader"
                        sx={{display: "flex", margin: "0 auto 60px auto"}}
                        size={200}
                    />
                ) : generatedCode ? (
                    getGeneratedCodeIFrame()
                ) : (
                    getPlaceholder()
                )}
            </Box>
        )
    }

    return (
        <MUIDialog
            id="ui-mockup-dialog"
            isOpen={isOpen}
            onClose={onClose}
            contentSx={{display: "flex", flexDirection: "column", minWidth: "2000px", minHeight: "800px"}}
            paperProps={{
                sx: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "90%",
                    minWidth: "90%",
                },
            }}
            title={`Sample user interface for "${projectName}"`}
        >
            {getDialogContent()}
            {getGenerateButton()}
        </MUIDialog>
    )
}
