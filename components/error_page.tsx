import React from "react";
import {LOGO} from "../const";
import Navbar from "./navbar";

/**
 * This is the page that will be shown to users when the outer error boundary is triggered
 * @param id HTML id for the <code>div</code> for this page
 * @param errorText Error text to be displayed
 */
export default function ErrorPage({id, errorText}): React.ReactElement {
    return <div id={id} className="container">
    <Navbar id="navbar-id" Logo={LOGO} WithBreadcrumbs={true}/>
        <div id="error-div" style={{fontSize: "xx-large", color: "red", marginBottom: 16}}>
            An internal error occurred. Please report the following error to the LEAF team:
        </div>
        <div id="error-text-div" style={{fontFamily: "monospace", marginBottom: 16}}>{errorText}</div>
        More information may be available in the browser console.
    </div>
}

