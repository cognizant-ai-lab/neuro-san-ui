import Box from "@mui/material/Box"
// TODO: Switch to MUI button, thing is the react-bootstrap button matches all the other buttons
//import Button from "@mui/material/Button"
import CircularProgress from "@mui/material/CircularProgress"
import NextImage from "next/image"
import {FC, useRef, useState} from "react"
import {Button} from "react-bootstrap"

import {MaximumBlue} from "../../../const"
import {sendDalleQuery} from "../../../controller/dall-e/dall-e"
import {MUIDialog} from "../../dialog"

// #region: Types
interface UIMockupGeneratorProps {
    onClose: () => void
    isOpen: boolean
    userQuery: string
}
// #endregion: Types

export const UIMockupGenerator: FC<UIMockupGeneratorProps> = ({onClose, isOpen, userQuery}) => {
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [mockupURL, setMockupURL] = useState<string>("")

    // Controller for cancelling fetch request
    const controller = useRef<AbortController>(null)

    // Sends query to backend to send to Dall-e via Langchain.
    async function sendUserQueryToDalle() {
        setIsLoading(true)

        try {
            const abortController = new AbortController()
            controller.current = abortController

            const {
                response: {imageURL},
            } = await sendDalleQuery(userQuery)
            setMockupURL(imageURL)
            setIsLoading(false)
        } catch (error) {
            // log error to console
            // TODO: Check that error handling is working and surface error to user
            console.error(error)
            setIsLoading(false)
        }
    }

    return (
        <MUIDialog
            id="ui-mockup-dialog"
            isOpen={isOpen}
            onClose={onClose}
            sx={{display: "flex", flexDirection: "column", minHeight: "400px", minWidth: "500px"}}
            title="User Interface"
        >
            <Box // eslint-disable-line enforce-ids-in-jsx/missing-ids
                sx={{alignItems: "center", display: "flex", flexGrow: "1"}}
            >
                {isLoading ? (
                    <CircularProgress
                        id="ui-mockup-loader"
                        sx={{display: "flex", margin: "0 auto"}}
                    />
                ) : (
                    <NextImage
                        alt="ui-mockup-img"
                        className={!mockupURL ? "hidden" : null}
                        height={500}
                        id="ui-mockup"
                        src={mockupURL}
                        width={1000}
                    />
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
