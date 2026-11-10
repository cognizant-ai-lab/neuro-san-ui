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

import {
    getSheen,
    glassSurface,
    gradientText,
    SHEEN_EASE,
    SHEEN_FONT_DISPLAY,
    SHEEN_FONT_MONO,
    SHEEN_RADIUS,
    sheenGradient,
} from "../../../packages/ui-common/Theme/sheen"

// Height of the slim header bar painted across the top of code blocks
const CODE_HEADER_HEIGHT = 26

export const StyledMarkdownContainer = styled(Box)(({theme}) => {
    const palette = (theme.vars ?? theme).palette
    const sheen = getSheen(theme)

    return {
        color: palette.text.primary,
        fontSize: "1rem",
        lineHeight: 1.75,

        "& h1": {
            fontFamily: SHEEN_FONT_DISPLAY,
            fontSize: "2.25rem",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
            marginBottom: "1em",
            // Iridescent, slowly flowing headline
            ...gradientText(theme),
            width: "fit-content",
        },
        "& h2": {
            fontFamily: SHEEN_FONT_DISPLAY,
            fontSize: "1.5rem",
            fontWeight: 600,
            marginTop: "1.5em",
            marginBottom: "1em",
            // Short glowing gradient accent bar under section headings
            "&::after": {
                content: '""',
                display: "block",
                width: 36,
                height: 3,
                marginTop: "0.4em",
                borderRadius: 3,
                backgroundImage: sheenGradient(theme, 90),
                boxShadow: `0 0 12px ${sheen.glow}`,
            },
        },
        "& p": {
            marginTop: "1.25em",
            marginBottom: "1.25em",
        },
        // Links: gradient underline that thickens on hover
        "& a": {
            backgroundImage: sheenGradient(theme, 90),
            backgroundPosition: "0 100%",
            backgroundRepeat: "no-repeat",
            backgroundSize: "100% 1px",
            color: palette.primary.main,
            fontWeight: 500,
            paddingBottom: "0.1em",
            textDecoration: "none",
            transition: `background-size 0.3s ${SHEEN_EASE}`,
            "&:hover": {backgroundSize: "100% 2px"},
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
        // Blockquote: glowing gradient rail on a soft tint
        "& blockquote": {
            backgroundColor: sheen.tint,
            backgroundImage: sheenGradient(theme, 180),
            backgroundPosition: "0 0",
            backgroundRepeat: "no-repeat",
            backgroundSize: "3px 100%",
            borderRadius: `0 ${SHEEN_RADIUS}px ${SHEEN_RADIUS}px 0`,
            color: palette.text.secondary,
            fontStyle: "italic",
            margin: "1.5em 0",
            padding: "0.75em 1rem 0.75em 1.25rem",
        },
        "& hr": {
            border: "none",
            height: 1,
            backgroundImage: [
                "linear-gradient(90deg, transparent",
                sheen.gradientStart,
                sheen.gradientEnd,
                "transparent)",
            ].join(", "),
            opacity: 0.6,
            margin: "2em 0",
        },
        "& table": {
            ...glassSurface(theme, SHEEN_RADIUS),
            borderCollapse: "separate",
            borderSpacing: 0,
            overflow: "hidden",
            width: "100%",
        },
        "& th, & td": {
            borderBottom: `1px solid ${sheen.glassBorder}`,
            padding: "0.5em 0.85em",
            textAlign: "left",
        },
        "& th": {backgroundColor: sheen.tint},
        "& tr:last-child td": {borderBottom: "none"},
        "& code": {
            backgroundColor: sheen.tint,
            borderRadius: SHEEN_RADIUS / 2,
            fontSize: "0.875em",
            fontFamily: SHEEN_FONT_MONO,
            padding: "0.25rem 0.375rem",
        },
        // Code block: specular glass with a slim header bar (tint band + hairline) across the top
        "& pre": {
            ...glassSurface(theme, SHEEN_RADIUS),
            backgroundImage: [
                `linear-gradient(180deg, ${sheen.tint} 0 ${CODE_HEADER_HEIGHT}px, ${sheen.glassBorder} ` +
                    `${CODE_HEADER_HEIGHT}px ${CODE_HEADER_HEIGHT + 1}px, transparent ${CODE_HEADER_HEIGHT + 1}px)`,
                `linear-gradient(180deg, ${sheen.highlight}, transparent 38%)`,
            ].join(", "),
            color: palette.text.primary,
            fontFamily: SHEEN_FONT_MONO,
            fontSize: "0.875em",
            overflowX: "auto",
            padding: `${CODE_HEADER_HEIGHT + 12}px 1em 1em`,
            position: "relative",
        },
        // Code inside a block inherits the block's surface rather than the inline-code tint
        "& pre code": {
            backgroundColor: "transparent",
            padding: 0,
        },
    }
})
