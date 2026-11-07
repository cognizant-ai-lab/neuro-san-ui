import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import {Theme} from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import {motion, useReducedMotion, Variants} from "motion/react"
import {FC} from "react"

import {getSheen, glassSurface, glowShadow, gradientBorder, SHEEN_EASE} from "../../../Theme/sheen"
import {hashString} from "../../../utils/text"

// Maximum number of sample queries to show
export const MAX_SAMPLE_QUERIES = 5

// Chip radius: large enough to keep chips fully pill-shaped
const CHIP_RADIUS = 999

// Chips cascade in one after another
const CONTAINER_VARIANTS: Variants = {
    hidden: {},
    shown: {transition: {staggerChildren: 0.07, delayChildren: 0.1}},
}
const CHIP_VARIANTS: Variants = {
    hidden: {opacity: 0, y: 10, scale: 0.92, filter: "blur(4px)"},
    shown: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        transition: {type: "spring", stiffness: 420, damping: 26},
        transitionEnd: {filter: "none"},
    },
}
const CHIP_VARIANTS_REDUCED: Variants = {hidden: {opacity: 0}, shown: {opacity: 1}}

// Maximum length of query to show in sample query chips
export const QUERY_TRUNCATE_LENGTH = 80

interface SampleQueriesProps {
    readonly disabled: boolean
    readonly handleSend: (query: string) => void
    readonly sampleQueries: string[]
}

/**
 * Render sample queries as clickable chips. Agents may or may not have sample queries defined.
 * @param disabled Whether the chips should be disabled or not. Chips should be disabled when the agent is
 * thinking/responding to prevent multiple simultaneous queries being sent to the agent.
 * @param handleSend Function to handle sending a query to the agent when a chip is clicked.
 * @param sampleQueries The sample queries to render (from "connectivity" API)
 * @returns A ReactNode representing the sample queries as clickable chips. If a user clicks a chip, it will
 * send the query to the agent.
 */
export const SampleQueries: FC<SampleQueriesProps> = ({disabled, handleSend, sampleQueries}) => {
    const reduceMotion = useReducedMotion()
    return sampleQueries?.length > 0 ? (
        <Box
            animate="shown"
            component={motion.div}
            id="sample-queries-box"
            initial="hidden"
            sx={{marginTop: "1rem"}}
            variants={CONTAINER_VARIANTS}
        >
            {sampleQueries.slice(0, MAX_SAMPLE_QUERIES).map((query) => {
                const hashedQuery = hashString(query)
                return (
                    <motion.span
                        key={`chip-${hashedQuery}`}
                        style={{display: "inline-block"}}
                        variants={reduceMotion ? CHIP_VARIANTS_REDUCED : CHIP_VARIANTS}
                    >
                        <Tooltip
                            title={`Click to send query: "${query}"`}
                            key={`tooltip-${hashedQuery}`}
                        >
                            <Chip
                                disabled={disabled}
                                label={
                                    query.length > QUERY_TRUNCATE_LENGTH
                                        ? `${query.slice(0, QUERY_TRUNCATE_LENGTH)}...`
                                        : query
                                }
                                onClick={async () => {
                                    handleSend(query)
                                }}
                                variant="outlined"
                                sx={(theme: Theme) => {
                                    // Glass pill whose gradient hairline fades in (and which lifts) on hover
                                    const border = gradientBorder(theme, CHIP_RADIUS, 1, 0)
                                    return {
                                        ...glassSurface(theme, CHIP_RADIUS),
                                        ...border,
                                        backdropFilter: "blur(12px)",
                                        WebkitBackdropFilter: "blur(12px)",
                                        color: "text.primary",
                                        marginRight: "0.75rem",
                                        marginBottom: "0.75rem",
                                        transition: [
                                            `transform 0.3s ${SHEEN_EASE}`,
                                            `box-shadow 0.3s ${SHEEN_EASE}`,
                                            "border-color 0.2s ease",
                                        ].join(", "),
                                        "&::before": {...border["&::before"], transition: "opacity 0.3s ease"},
                                        // Chip's own clickable hover style is more specific than "&:hover", so match it
                                        "&&:hover": {
                                            backgroundColor: getSheen(theme).tint,
                                            borderColor: "transparent",
                                            boxShadow: glowShadow(theme, 20),
                                            transform: "translateY(-2px)",
                                        },
                                        "&:hover::before": {opacity: 0.9},
                                    }
                                }}
                            />
                        </Tooltip>
                    </motion.span>
                )
            })}
        </Box>
    ) : null
}
