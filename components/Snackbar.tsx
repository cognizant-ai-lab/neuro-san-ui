import CloseIcon from "@mui/icons-material/Close"
import {styled} from "@mui/material"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import {CustomContentProps, SnackbarContent, useSnackbar} from "notistack"
import {ForwardedRef, forwardRef} from "react"

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
interface SnackbarProps extends CustomContentProps {
    description: string
}
// #endregion: Types

// Pssing Snackbar callback as a function because if we use an arrow function here we'd have to set displayName
export const Snackbar = forwardRef<HTMLDivElement, SnackbarProps>(
    // eslint-disable-next-line prefer-arrow-callback
    function Snackbar(
        {description, hideIconVariant = false, iconVariant, id, message, variant}: SnackbarProps,
        ref: ForwardedRef<HTMLDivElement>
    ): JSX.Element {
        const {closeSnackbar} = useSnackbar()
        const handleCloseSnackbar = () => closeSnackbar(id)
        const icon = iconVariant[variant]

        return (
            // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
            <SnackbarContent
                ref={ref}
                role="alert"
            >
                <Box
                    id={`${id}-snackbar-box`}
                    sx={{
                        background: "var(--bs-white)",
                        borderColor: "transparent",
                        borderRadius: "var(--bs-border-radius)",
                        borderWidth: "1px",
                        boxShadow: `0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 
                                    0 9px 28px 8px rgba(0, 0, 0, 0.05)`,
                        maxWidth: "450px",
                        minWidth: "250px",
                        padding: "0.9rem",
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
)
