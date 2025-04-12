import Box from "@mui/material/Box"
import {styled} from "@mui/material"

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
