import Box from "@mui/material/Box"
import {ReactElement} from "react"

import {LOGO} from "../../const"
import {NeuroAIBreadcrumbs} from "../Common/breadcrumbs"
import {Navbar} from "../Common/Navbar"

interface ErrorPageProps {
    id: string
    errorText: string
}

/**
 * This is the page that will be shown to users when the outer error boundary is triggered
 * @param id HTML id for the <code>div</code> for this page
 * @param errorText Error text to be displayed
 */
export default function ErrorPage({id, errorText}: ErrorPageProps): ReactElement {
    return (
        <>
            <Navbar
                id="navbar-id"
                logo={LOGO}
                query={undefined}
                pathname=""
                userInfo={{
                    name: "",
                    image: "",
                }}
                authenticationType=""
                signOut={function (): void {
                    throw new Error("Function not implemented.")
                }}
                supportEmailAddress=""
            />
            <Box
                id={id}
                sx={{marginLeft: "1rem"}}
            >
                <NeuroAIBreadcrumbs />
                <h4
                    id="error-header"
                    style={{color: "var(--bs-red)", marginTop: "1rem"}}
                >
                    Oops, an internal error occurred on our end.
                </h4>
                <div id="error-div-1">
                    <Box
                        id="no-need-to-worry"
                        sx={{marginBottom: "1.5rem"}}
                    >
                        <b id="bold-1">There&apos;s no need to worry – you didn&apos;t do anything wrong.</b> This is a
                        bug in our server and we&apos;ll fix it as soon as possible.
                    </Box>
                    <Box
                        id="try-these-steps"
                        sx={{marginBottom: "1.5rem"}}
                    >
                        To attempt to recover from the error, try these steps:
                    </Box>
                    <Box
                        id="refresh-page"
                        sx={{marginBottom: "1.5rem"}}
                    >
                        <ul
                            id="error-boundary-advice-list"
                            className="list-decimal list-inside"
                        >
                            <li id="error-advice-refresh">Refresh the page to see if the error goes away.</li>
                            <li id="error-advice-reload">
                                Close and re-open your browser, then navigate back to the page where you encountered the
                                error.
                            </li>
                        </ul>
                    </Box>
                    If none of that helps, please report the following error to the LEAF team:
                </div>
                <div
                    id="error-text-div"
                    style={{fontFamily: "monospace", marginTop: "1.5rem", marginBottom: "1.5rem"}}
                >
                    {errorText}
                </div>
                More information may be available in the browser console. Please include such information in your report
                if possible.
            </Box>
        </>
    )
}
