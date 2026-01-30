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
import Alert, {AlertColor} from "@mui/material/Alert"
import Collapse from "@mui/material/Collapse"
import IconButton from "@mui/material/IconButton"
import {styled, SxProps} from "@mui/material/styles"
import {FC, ReactNode, useState} from "react"

// #region: Styled Components
const StyledAlert = styled(Alert)({
    fontSize: "large",
    marginBottom: "1rem",

    "& .MuiAlert-message": {
        paddingTop: "0.25rem",
        paddingBottom: "0.25rem",
    },
})
// #endregion: Styled Components

// #region: Types
interface MUIAlertProps {
    children: ReactNode
    closeable?: boolean
    id: string
    severity: AlertColor
    sx?: SxProps
}
// #endregion: Types

export const MUIAlert: FC<MUIAlertProps> = ({children, closeable = false, id, severity, sx}) => {
    const [alertOpen, setAlertOpen] = useState<boolean>(true)

    const handleClose = () => {
        setAlertOpen(false)
    }

    return (
        <Collapse
            id={`${id}-collapse`}
            in={alertOpen}
        >
            <StyledAlert
                action={
                    closeable && (
                        <IconButton
                            aria-label="close"
                            color="inherit"
                            id={`${id}-icon-button`}
                            onClick={() => {
                                setAlertOpen(false)
                            }}
                            size="small"
                            sx={{
                                bottom: "2px",
                                position: "relative",
                            }}
                        >
                            <CloseIcon
                                fontSize="inherit"
                                id={`${id}-close-icon`}
                            />
                        </IconButton>
                    )
                }
                id={id}
                onClose={closeable ? handleClose : undefined}
                severity={severity}
                sx={sx}
            >
                {children}
            </StyledAlert>
        </Collapse>
    )
}
