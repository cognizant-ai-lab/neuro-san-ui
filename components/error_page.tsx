import Box from "@mui/material/Box"
import {ReactElement} from "react"

import BlankLines from "./blanklines"
import NeuroAIBreadcrumbs from "./breadcrumbs"
import Navbar from "./navbar"
import {GENERIC_LOGO, LOGO} from "../const"
import useFeaturesStore from "../state/features"

/**
 * This is the page that will be shown to users when the outer error boundary is triggered
 * @param id HTML id for the <code>div</code> for this page
 * @param errorText Error text to be displayed
 */
export default function ErrorPage({id, errorText}): ReactElement {
    // Get "generic branding" flag
    const {isGeneric} = useFeaturesStore()

    return (
        <>
            <Navbar
                id="navbar-id"
                Logo={isGeneric ? GENERIC_LOGO : LOGO}
            />
            <Box
                id={id}
                sx={{marginLeft: "1rem"}}
            >
                {/* eslint-disable-next-line enforce-ids-in-jsx/missing-ids */}
                <NeuroAIBreadcrumbs />
                <h4
                    id="error-header"
                    style={{color: "var(--bs-red)", marginTop: "1rem"}}
                >
                    Oops, an internal error occurred on our end.
                </h4>
                <div id="error-div-1">
                    <b id="bold-1">There&apos;s no need to worry – you didn&apos;t do anything wrong.</b> This is a bug
                    in our server and we&apos;ll fix it as soon as possible.
                    <BlankLines
                        id="bl1"
                        numLines={2}
                    />
                    To attempt to recover from the error, try these steps:
                    <BlankLines
                        id="bl2"
                        numLines={2}
                    />
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
                    <BlankLines
                        id="bl3"
                        numLines={1}
                    />
                    If none of that helps, please report the following error to the LEAF team:
                </div>
                <BlankLines
                    id="bl4"
                    numLines={1}
                />
                <div
                    id="error-text-div"
                    style={{fontFamily: "monospace"}}
                >
                    {errorText}
                </div>
                <BlankLines
                    id="bl5"
                    numLines={1}
                />
                More information may be available in the browser console. Please include such information in your report
                if possible.
            </Box>
        </>
    )
}
