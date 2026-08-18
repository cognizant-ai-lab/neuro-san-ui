import {styled} from "@mui/material/styles"

//#region: Constants

const BUBBLE_DISTANCE_FROM_RIGHT_EDGE = 20 // Fixed distance from right edge
const BUBBLE_HEIGHT = 78
const BUBBLE_HEIGHT_PLUS_SPACING = BUBBLE_HEIGHT + 10
const BUBBLE_STACK_OFFSET_TOP = 70
const BUBBLE_WIDTH = 260

//#endregion: Constants

//#region: Types

interface ThoughtBubbleProps {
    readonly isHovered: boolean
    readonly isTruncated: boolean
    readonly animationDelay: number
    readonly bubbleIndex: number
    readonly isVisible?: boolean
    readonly isExiting?: boolean
}

//#endregion: Types

export const StyledThoughtBubble = styled("div", {
    shouldForwardProp: (prop) =>
        !["isHovered", "isTruncated", "animationDelay", "bubbleIndex", "isVisible", "isExiting"].includes(
            prop as string
        ),
})<ThoughtBubbleProps>(
    ({theme, isHovered, isTruncated, animationDelay, bubbleIndex, isVisible = true, isExiting = false}) => ({
        // Colors / theme
        // TODO: Add dark mode support? For now both light and dark mode use the same bubble style and look fine.
        background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(250,250,250,0.95) 100%)",
        border: "var(--bs-border-width) var(--bs-border-style) var(--bs-border-color)",
        borderRadius: "var(--bs-border-radius-lg)",
        color: "var(--bs-primary)",
        fontFamily: theme.typography.fontFamily, // TODO: Easy to pull from theme. Rest we need to revisit.
        fontSize: "var(--bs-body-font-size-extra-small)",
        fontWeight: "var(--bs-body-font-weight)",
        padding: "10px 14px",

        // Positioning - restore original right-side layout
        position: "absolute",
        right: BUBBLE_DISTANCE_FROM_RIGHT_EDGE,
        top: BUBBLE_STACK_OFFSET_TOP + bubbleIndex * BUBBLE_HEIGHT_PLUS_SPACING, // Stack vertically with spacing
        transform: "none",

        // Dimensions
        // Only expand height when hovered AND text is truncated
        height: isHovered && isTruncated ? BUBBLE_HEIGHT : "auto",
        maxHeight: BUBBLE_HEIGHT, // Max 3 lines always
        minHeight: "auto", // Let height adjust to content
        minWidth: "100px",
        width: BUBBLE_WIDTH,

        // Other styles
        boxShadow: isHovered
            ? "0 4px 20px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)"
            : "0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)",
        zIndex: isHovered ? 10002 : 10000,
        lineHeight: 1.4,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: `box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
            z-index 0.15s cubic-bezier(0.4, 0, 0.2, 1),
            transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)`,
        cursor: isTruncated ? "pointer" : "default",
        userSelect: isHovered && isTruncated ? "text" : "none",
        animation: isExiting
            ? "fadeOutDown 0.4s cubic-bezier(0.4, 0, 0.1, 1) both"
            : `fadeInUp 0.6s cubic-bezier(0.2, 0, 0.2, 1) ${animationDelay}ms both`,
        opacity: isVisible ? (isExiting ? 0 : 1) : 0,
        pointerEvents: "auto",
        wordBreak: "break-word",
        overflow: "hidden", // Always hide overflow
        // Enable vertical scrolling only when hovered and truncated
        overflowY: isHovered && isTruncated ? "auto" : "hidden",
        whiteSpace: "normal",
    })
)
