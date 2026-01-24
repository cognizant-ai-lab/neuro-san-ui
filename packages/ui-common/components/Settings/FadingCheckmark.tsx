import CheckIcon from "@mui/icons-material/Check"
import Box from "@mui/material/Box"
import {useEffect, useRef, useState} from "react"

// Duration for which the checkmark is shown after changing a setting
const CHECKMARK_FADE_DURATION_MS = 1500

/**
 * Hook to manage the fading checkmark state.
 */
export const useCheckmarkFade = () => {
    const [show, setShow] = useState(false)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const trigger = () => {
        // Clear any existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }

        // Show the checkmark and set a timeout to hide it
        setShow(true)
        timeoutRef.current = setTimeout(() => {
            setShow(false)
            timeoutRef.current = null
        }, CHECKMARK_FADE_DURATION_MS)
    }

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [])

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
