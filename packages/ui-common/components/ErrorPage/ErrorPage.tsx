/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import Box from "@mui/material/Box"
import {useRouter} from "next/router.js"
import {ReactElement} from "react"

import {LOGO} from "../../const"
import {useEnvironmentStore} from "../../state/Environment"
import {useUserInfoStore} from "../../state/UserInfo"
import {smartSignOut, useAuthentication} from "../../utils/Authentication"
import {NeuroAIBreadcrumbs} from "../Common/Breadcrumbs"
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
    const {auth0ClientId, auth0Domain, supportEmailAddress, logoDevToken} = useEnvironmentStore()

    // Access NextJS router
    const router = useRouter()

    // Access user info store
    const {currentUser, setCurrentUser, setPicture, oidcProvider} = useUserInfoStore()

    // Infer authentication type
    const authenticationType = currentUser ? `ALB using ${oidcProvider}` : "NextAuth"

    const {data: {user: userInfo} = {}} = useAuthentication()

    const handleSignOut = async () => {
        // Clear our state storage variables
        setCurrentUser(undefined)
        setPicture(undefined)

        await smartSignOut(currentUser, auth0Domain, auth0ClientId, oidcProvider)
    }

    return (
        <>
            <Navbar
                authenticationType={authenticationType}
                id="nav-bar"
                logo={LOGO}
                logoDevToken={logoDevToken}
                pathname={router.pathname}
                query={router.query}
                signOut={handleSignOut}
                supportEmailAddress={supportEmailAddress}
                userInfo={userInfo}
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
