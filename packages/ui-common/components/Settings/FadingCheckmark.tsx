import CheckIcon from "@mui/icons-material/Check"
import Box from "@mui/material/Box"
import {useState} from "react"

// Duration for which the checkmark is shown after changing a setting
const CHECKMARK_FADE_DURATION_MS = 1500

/**
 * Hook to manage the fading checkmark state.
 */
export const useCheckmarkFade = () => {
    const [show, setShow] = useState(false)

    const trigger = () => {
        setShow(true)
        setTimeout(() => setShow(false), CHECKMARK_FADE_DURATION_MS)
    }

    return {show, trigger}
}

/**
 * A checkmark that fades in and out based on the `show` prop.
 * @param show Whether to show the checkmark.
 */
export const FadingCheckmark = ({show}: {show: boolean}) => (
    <Box
        sx={{
            opacity: show ? 1 : 0,
            transition: "opacity 0.5s ease-out",
            color: "var(--bs-success)",
        }}
    >
        <CheckIcon />
    </Box>
)
