import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import Tooltip from "@mui/material/Tooltip"
import {FC} from "react"

import {hashString} from "../../../utils/text"

// Maximum number of sample queries to show
export const MAX_SAMPLE_QUERIES = 5

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
export const SampleQueries: FC<SampleQueriesProps> = ({disabled, handleSend, sampleQueries}) =>
    sampleQueries?.length > 0 ? (
        <Box
            id="sample-queries-box"
            sx={{marginTop: "1rem"}}
        >
            {sampleQueries.slice(0, MAX_SAMPLE_QUERIES).map((query) => {
                const hashedQuery = hashString(query)
                return (
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
                            sx={{
                                color: "var(--bs-white)",
                                marginRight: "1rem",
                                marginBottom: "1rem",
                                backgroundColor: "var(--bs-accent2-medium)",
                                "&:hover": {backgroundColor: "var(--bs-accent2-dark)"},
                            }}
                        />
                    </Tooltip>
                )
            })}
        </Box>
    ) : null
