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

import CloseIcon from "@mui/icons-material/Close"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import {keyframes, styled, useTheme} from "@mui/material/styles"
import {motion, useReducedMotion} from "motion/react"
import {CustomContentProps, SnackbarContent, useSnackbar} from "notistack"
import {JSX as ReactJSX, Ref} from "react"

import {getSheen, glassSurface, gradientBorder, SHEEN_RADIUS, sheenGradient} from "../../Theme/sheen"

// notistack's default auto-hide duration (ms), used when the snackbar doesn't specify one
const DEFAULT_AUTO_HIDE_MS = 5000

// Countdown for the progress line along the bottom of the toast
const DRAIN = keyframes`
    from { transform: scaleX(1); }
    to { transform: scaleX(0); }
`

// Spring for the toast entrance
const TOAST_SPRING = {type: "spring", stiffness: 380, damping: 26, mass: 0.8} as const

// #region: Styled Components
// Status icon sitting in a small glowing disc tinted with the status color
const IconBox = styled(Box)(({theme}) => {
    const palette = (theme.vars ?? theme).palette
    const statusColor = (color: string) => ({
        backgroundColor: theme.alpha(color, 0.16),
        boxShadow: `inset 0 0 0 1px ${theme.alpha(color, 0.35)}, 0 0 16px -2px ${theme.alpha(color, 0.55)}`,
        color,
    })
    return {
        alignItems: "center",
        borderRadius: "50%",
        display: "flex",
        flexShrink: 0,
        height: "1.9rem",
        justifyContent: "center",
        marginRight: "0.7rem",
        width: "1.9rem",
        "& svg": {fontSize: "1.15rem", marginInlineEnd: "0 !important"},

        "&.success": statusColor(palette.success.main),
        "&.error": statusColor(palette.error.main),
        "&.warning": statusColor(palette.warning.main),
        "&.info": statusColor(palette.info.main),
    }
})
// #endregion: Styled Components

// #region: Types
export interface SnackbarProps extends CustomContentProps {
    description: string
}
// #endregion: Types

export const Snackbar = ({
    ref,
    anchorOrigin,
    autoHideDuration,
    description,
    hideIconVariant = false,
    iconVariant,
    id,
    message,
    persist,
    variant,
}: SnackbarProps & {ref?: Ref<HTMLDivElement>}): ReactJSX.Element => {
    const {closeSnackbar} = useSnackbar()
    const handleCloseSnackbar = () => closeSnackbar(id)
    const icon = iconVariant[variant]

    const theme = useTheme()
    const reduceMotion = useReducedMotion()

    // Slide in from the edge the toast is anchored to
    const fromRight = anchorOrigin?.horizontal !== "left"
    const hideAfterMs = autoHideDuration === undefined ? DEFAULT_AUTO_HIDE_MS : autoHideDuration
    const showProgress = !persist && hideAfterMs != null && hideAfterMs > 0

    return (
        <SnackbarContent
            ref={ref}
            role="alert"
        >
            <motion.div
                animate={{opacity: 1, x: 0, scale: 1}}
                initial={reduceMotion ? {opacity: 0} : {opacity: 0, x: fromRight ? 56 : -56, scale: 0.94}}
                style={{transformOrigin: fromRight ? "right center" : "left center"}}
                transition={reduceMotion ? {duration: 0.2} : TOAST_SPRING}
            >
                <Box
                    className={`${variant}-snackbar-notification`}
                    id={`${id}-snackbar-box`}
                    data-testid={`${id}-snackbar-box`}
                    sx={{
                        // A single line of text centers on the icon. With a description, the icon stays at the top.
                        alignItems: description ? "flex-start" : "center",
                        // Frosted-glass toast with an iridescent hairline
                        ...glassSurface(theme, SHEEN_RADIUS),
                        ...gradientBorder(theme, SHEEN_RADIUS, 1, 0.45),
                        color: "text.primary",
                        display: "flex",
                        maxWidth: "450px",
                        minWidth: "250px",
                        overflow: "hidden",
                        padding: "0.9rem",
                        // Room for the close button
                        paddingRight: "2.5rem",
                        // Pause the countdown line while hovered, as notistack pauses the timer
                        "&:hover .snackbar-progress": {animationPlayState: "paused"},
                    }}
                >
                    {!hideIconVariant && (
                        <Box
                            id={`${id}-snackbar-icon-box-container`}
                            // With a description, as tall as the title's first line so the icon centers on it
                            sx={description ? {alignItems: "center", display: "flex", marginTop: "-0.2rem"} : {}}
                        >
                            <IconBox
                                className={variant}
                                data-testid={`${id}-snackbar-icon-box`}
                                id={`${id}-snackbar-icon-box`}
                            >
                                {icon}
                            </IconBox>
                        </Box>
                    )}
                    <Box
                        id={`${id}-snackbar-content-box`}
                        sx={{flex: 1, minWidth: 0, wordWrap: "break-word"}}
                    >
                        <Box
                            id={`${id}-snackbar-message-box`}
                            sx={{
                                // If no description, this is the only message, so reduce font size
                                fontSize: description ? "0.95rem" : "0.85rem",
                            }}
                        >
                            {message}
                        </Box>
                        <IconButton
                            aria-label="close"
                            id={`${id}-close-icon-btn`}
                            onClick={handleCloseSnackbar}
                            sx={{
                                position: "absolute",
                                right: 4,
                                top: 4,
                            }}
                        >
                            <CloseIcon
                                data-testid={`${id}-close-icon`}
                                id={`${id}-close-icon`}
                                sx={{
                                    color: "text.secondary",
                                    fontSize: "0.6em",
                                }}
                            />
                        </IconButton>
                        {description && (
                            <Box
                                id={`${id}-snackbar-description-box`}
                                sx={{fontSize: "0.8rem", paddingTop: "10px"}}
                            >
                                {description}
                            </Box>
                        )}
                    </Box>
                    {showProgress && (
                        <Box
                            aria-hidden={true}
                            className="snackbar-progress"
                            data-testid={`${id}-snackbar-progress`}
                            sx={{
                                animation: `${DRAIN} ${hideAfterMs}ms linear forwards`,
                                backgroundImage: sheenGradient(theme, 90),
                                bottom: 0,
                                boxShadow: `0 0 10px ${getSheen(theme).glow}`,
                                height: "2px",
                                left: 0,
                                opacity: 0.9,
                                position: "absolute",
                                right: 0,
                                transformOrigin: "left center",
                            }}
                        />
                    )}
                </Box>
            </motion.div>
        </SnackbarContent>
    )
}
