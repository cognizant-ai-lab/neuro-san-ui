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
import {styled} from "@mui/material/styles"

export const StyledMarkdownContainer = styled(Box)(() => ({
    fontSize: "1rem",
    lineHeight: 1.75,

    "& h1": {
        fontSize: "2.25rem",
        fontWeight: 800,
        lineHeight: 1.25,
        marginBottom: "1em",
    },
    "& h2": {
        fontSize: "1.5rem",
        fontWeight: 700,
        marginTop: "1.5em",
        marginBottom: "1em",
    },
    "& p": {
        marginTop: "1.25em",
        marginBottom: "1.25em",
    },
    "& a": {
        fontWeight: 500,
        textDecoration: "underline",
    },
    "& ul, & ol": {
        marginTop: "1.25em",
        marginBottom: "1.25em",
        paddingLeft: "1.5rem",
    },
    "& li": {
        marginTop: "0.5em",
        marginBottom: "0.5em",
    },
    "& blockquote": {
        fontStyle: "italic",
        margin: "1.5em 0",
        paddingLeft: "1rem",
    },
    "& code": {
        borderRadius: "0.25rem",
        fontSize: "0.875em",
        fontFamily: "monospace",
        padding: "0.25rem 0.375rem",
    },
    "& pre": {
        backgroundColor: "#1f2937",
        color: "#f9fafb",
        borderRadius: "0.375rem",
        fontSize: "0.875em",
        overflowX: "auto",
        padding: "1em",
    },
}))
