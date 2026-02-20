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
import {styled, useTheme} from "@mui/material/styles"
import {CustomContentProps, SnackbarContent, useSnackbar} from "notistack"
import {JSX as ReactJSX, Ref} from "react"

// #region: Styled Components
const IconBox = styled(Box)({
    position: "relative",
    bottom: "2px",

    "&.success": {
        color: "var(--bs-success)",
    },
    "&.error": {
        color: "var(--bs-danger)",
    },
    "&.warning": {
        color: "var(--bs-warning)",
    },
    "&.info": {
        color: "var(--bs-info)",
    },
})
// #endregion: Styled Components

// #region: Types
export interface SnackbarProps extends CustomContentProps {
    description: string
}
// #endregion: Types

export const Snackbar = ({
    ref,
    description,
    hideIconVariant = false,
    iconVariant,
    id,
    message,
    variant,
}: SnackbarProps & {ref?: Ref<HTMLDivElement>}): ReactJSX.Element => {
    const {closeSnackbar} = useSnackbar()
    const handleCloseSnackbar = () => closeSnackbar(id)
    const icon = iconVariant[variant]

    const theme = useTheme()

    return (
        <SnackbarContent
            ref={ref}
            role="alert"
        >
            <Box
                className={`${variant}-snackbar-notification`}
                id={`${id}-snackbar-box`}
                sx={{
                    background: theme.palette.background.paper,
                    borderColor: "transparent",
                    borderRadius: "var(--bs-border-radius)",
                    borderWidth: "1px",
                    boxShadow: `0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12),
                                            0 9px 28px 8px rgba(0, 0, 0, 0.05)`,
                    maxWidth: "450px",
                    minWidth: "250px",
                    padding: "0.9rem",
                    paddingRight: "4rem",
                }}
            >
                {!hideIconVariant && (
                    <Box
                        id={`${id}-snackbar-icon-box-container`}
                        sx={{display: "inline-flex", flexDirection: "column"}}
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
                    sx={{
                        display: "inline-flex",
                        flexDirection: "column",
                        width: "88%",
                        wordWrap: "break-word",
                    }}
                >
                    <Box
                        id={`${id}-snackbar-message-box`}
                        sx={{
                            display: "block",
                            // If no description, this is the only message, so reduce font size
                            fontSize: description ? "0.95rem" : "0.85rem",
                            paddingRight: "25px",
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
                                color: "var(--bs-gray-medium)",
                                fontSize: "0.6em",
                            }}
                        />
                    </IconButton>
                    {description && (
                        <Box
                            id={`${id}-snackbar-description-box`}
                            sx={{fontSize: "0.8rem", paddingTop: "10px", paddingBottom: "10px"}}
                        >
                            {description}
                        </Box>
                    )}
                </Box>
            </Box>
        </SnackbarContent>
    )
}
