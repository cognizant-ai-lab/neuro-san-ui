import {useRef, useState} from "react"
import {sendDalleQuery} from "../../../controller/dall-e/dall-e"
import NewBar from "../../newbar"
import {Button, Container} from "react-bootstrap"
import {MaximumBlue} from "../../../const"
import CircularProgress from '@mui/material/CircularProgress';

// #region: Types
interface UIMockupGeneratorProps {
    userQuery: string
}
// #endregion: Types

export const UIMockupGenerator: React.FC<UIMockupGeneratorProps> = ({userQuery}) => {
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

            const {response: {imageURL}} = await sendDalleQuery(userQuery)
            setIsLoading(false)
            setMockupURL(imageURL)
        } catch (error) {
            // log error to console
            // TODO: Check that error handling is working
            console.error(error)
            setIsLoading(false)
        }
    }

    return (
        <>
            <NewBar
                id="dms-mockup-bar"
                InstanceId="dms-mockup"
                Title="User Interface"
                DisplayNewLink={false}
            />
            <Container
                key="mockup-container"
                id="mockup-container"
                style={{justifyContent: "left"}}
            >
                { isLoading
                    ? <CircularProgress className="mt-4" />
                    : (
                        <img
                            alt="ui-mockup"
                            className={!mockupURL ? "hidden" : null}
                            height={500}
                            id="ui-mockup"
                            src={mockupURL}
                            width={1000}
                        />
                    )
                }
            </Container>
            <Button
                className="mt-4 mb-4"
                id="dms-mockup"
                onClick={sendUserQueryToDalle}
                size="lg"
                style={{background: MaximumBlue, borderColor: MaximumBlue, width: "100%"}}
            >
                Generate User Interface
            </Button>
        </>
    )
}
