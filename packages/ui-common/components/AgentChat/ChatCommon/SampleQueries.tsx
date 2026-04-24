import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import Tooltip from "@mui/material/Tooltip"
import {FC} from "react"

// Maximum number of sample queries to show
const MAX_SAMPLE_QUERIES = 5

// Maximum length of query to show in sample query chips
const QUERY_TRUNCATE_LENGTH = 80

interface SampleQueriesProps {
    readonly handleSend: (query: string) => void
    readonly sampleQueries: string[]
}

/**
 * Render sample querreadonly ies as clickable chips. Agents may or may not have sample queries defined.
 * @param sampleQueries The sample queries to render (from "connectivity" API)
 * @returns A ReactNode representing the sample queries as clickable chips. If a user clicks a chip, it will
 * send the query to the agent.
 */
export const SampleQueries: FC<SampleQueriesProps> = ({handleSend, sampleQueries}) =>
    sampleQueries?.length > 0 ? (
        <Box
            id="sample-queries-box"
            sx={{marginTop: "2rem", marginBottom: "1rem"}}
        >
            {sampleQueries.slice(0, MAX_SAMPLE_QUERIES).map((query) => (
                <Tooltip
                    id={`tooltip-${query}`}
                    title={`Click to send query: "${query}"`}
                    key={`tooltip-${query}`}
                >
                    <Chip
                        id={`sample-query-${query}`}
                        key={query}
                        label={
                            query.length > QUERY_TRUNCATE_LENGTH ? `${query.slice(0, QUERY_TRUNCATE_LENGTH)}...` : query
                        }
                        onClick={async () => {
                            handleSend(query)
                        }}
                        sx={{
                            color: "var(--bs-white)",
                            marginRight: "1rem",
                            marginBottom: "1rem",
                            backgroundColor: "var(--bs-accent1-medium)",
                            "&:hover": {
                                backgroundColor: "var(--bs-accent1-dark)",
                            },
                        }}
                    />
                </Tooltip>
            ))}
        </Box>
    ) : null
