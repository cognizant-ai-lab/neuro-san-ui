import DragIndicator from "@mui/icons-material/DragIndicator"
import Box from "@mui/material/Box"
import {FC} from "react"
import {Separator} from "react-resizable-panels"

/**
 * Styled Separator that wraps the default react-resizable-panels Separator component. It adds some visual flair.
 */
export const PanelSeparator: FC = () => (
    <Separator
        style={{
            width: "14px",
            cursor: "col-resize",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
        }}
    >
        <Box
            sx={{
                width: "14px",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background-color 120ms ease",

                "&:hover": {
                    backgroundColor: "action.hover",
                },

                "&:hover .separator-grip": {
                    borderColor: "primary.main",
                    backgroundColor: "background.paper",
                    color: "primary.main",
                    boxShadow: 2,
                    opacity: 1,
                },
            }}
        >
            <Box
                className="separator-grip"
                sx={{
                    width: "18px",
                    height: "44px",
                    borderRadius: "999px",
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "background.default",
                    color: "text.secondary",
                    opacity: 0.75,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition:
                        "background-color 120ms ease, border-color 120ms ease, color 120ms ease, " +
                        "box-shadow 120ms ease, opacity 120ms ease",
                }}
            >
                <DragIndicator
                    fontSize="small"
                    sx={{fontSize: "1rem"}}
                />
            </Box>
        </Box>
    </Separator>
)
