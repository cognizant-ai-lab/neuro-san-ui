import Box from "@mui/material/Box"
import {useTheme} from "@mui/material/styles"
import {FC} from "react"
import {Separator} from "react-resizable-panels"

import {getSheen, SHEEN_EASE, sheenGradient} from "../../Theme/sheen"

// Width of the separator's (invisible) hit area, and of the visible grip line inside it (px)
export const SEPARATOR_HIT_WIDTH = 14
const GRIP_WIDTH = 4

/**
 * Slim glowing grab handle between the floating workspace panels. The separator itself is a transparent hit area
 * (so the canvas shows through the gap between panels); the visible part is a short pill that lengthens and lights
 * up with the iridescent gradient on hover, keyboard focus or while dragging.
 *
 * react-resizable-panels sets data-separator to "hover" | "active" | "focus" | "inactive" | "disabled", which we
 * use for the interactive states.
 */
export const PanelSeparator: FC = () => {
    const theme = useTheme()
    const sheen = getSheen(theme)

    const litGrip = {
        background: sheenGradient(theme, 180),
        boxShadow: `0 0 0 1px ${sheen.glow}, 0 0 18px 2px ${sheen.glow}`,
        height: "96px",
        opacity: 1,
    }

    return (
        <Separator
            style={{
                width: `${SEPARATOR_HIT_WIDTH}px`,
                cursor: "col-resize",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                // The workspace overlay is pointer-events: none so the canvas stays interactive; re-enable here
                pointerEvents: "auto",
                outline: "none",
            }}
        >
            <Box
                sx={{
                    alignItems: "center",
                    display: "flex",
                    height: "100%",
                    justifyContent: "center",
                    width: `${SEPARATOR_HIT_WIDTH}px`,
                    "[data-separator='hover'] > & .separator-grip, [data-separator='focus'] > & .separator-grip":
                        litGrip,
                    "[data-separator='active'] > & .separator-grip": {...litGrip, height: "140px"},
                }}
            >
                <Box
                    className="separator-grip"
                    sx={{
                        backgroundColor: sheen.glassBorder,
                        borderRadius: "999px",
                        boxShadow: `0 0 10px -2px ${sheen.glow}`,
                        height: "44px",
                        opacity: 0.8,
                        transition:
                            `height 0.35s ${SHEEN_EASE}, box-shadow 0.25s ${SHEEN_EASE}, ` +
                            `opacity 0.25s ${SHEEN_EASE}, background-color 0.25s ${SHEEN_EASE}`,
                        width: `${GRIP_WIDTH}px`,
                    }}
                />
            </Box>
        </Separator>
    )
}
