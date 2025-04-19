// Main app theme.
import {createTheme} from "@mui/material"

/**
 * This is the main theme for the app. It is used by the MUI ThemeProvider. It exists to override some defaults in MUI
 * to ease our migration to that library, from a plethora of other libraries that we were using previously.
 */
export const APP_THEME = createTheme({
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    "&:hover": {
                        // TODO: May still want this for some buttons like "Cancel" in the modals,
                        // but it was causing issues with icons.
                        backgroundColor: "transparent",
                    },
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: "var(--bs-border-radius)",
                },
            },
        },
    },
    typography: {
        // Initially just force MUI to use our corporate font.
        fontFamily: "var(--bs-body-font-family)",

        // Undo MUI's urge to upper case everything
        button: {
            textTransform: "none",
        },

        h3: {
            fontSize: "2rem",
            fontWeight: 400,
            marginBottom: "0.75rem",
        },
    },
})
