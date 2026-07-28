import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import httpStatus from "http-status"
import {FC} from "react"

import {KeyValidationFailure} from "../../controller/llm/Providers"
import {LLMProvider} from "../../state/Settings"
import {MUIAlert} from "../Common/MUIAlert"

interface ApiKeyErrorBannerProps {
    readonly id: string
    readonly failures: readonly ApiKeyFailure[]
}

export interface ApiKeyFailure {
    readonly vendor: LLMProvider
    readonly result: KeyValidationFailure
}

const FailureRow: FC<{id: string; failure: ApiKeyFailure}> = ({id, failure}) => {
    const {vendor, result} = failure
    const {status: statusCode, message} = result

    const title =
        statusCode !== undefined
            ? `${vendor} — ${httpStatus[statusCode] ?? "Unknown status"} (${statusCode})`
            : `${vendor} — Request failed`

    return (
        <Box data-testid={`${id}-failure`}>
            <Typography
                sx={{fontWeight: 700}}
                variant="body2"
            >
                {title}
            </Typography>
            {/* The error messages from the provider, if present in the response body. */}
            {message ? (
                <Typography
                    sx={{mt: 0.25, overflowWrap: "anywhere"}}
                    variant="body2"
                >
                    {message}
                </Typography>
            ) : null}
        </Box>
    )
}

/**
 * A banner shown at the top of the API Keys section that aggregates all failing key-test results.
 */
export const ApiKeyErrorBanner: FC<ApiKeyErrorBannerProps> = ({id, failures}) => {
    if (failures.length === 0) {
        return null
    }

    return (
        <MUIAlert
            id={id}
            severity="error"
            sx={{width: "100%"}}
        >
            <Box sx={{display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0}}>
                {failures.map((failure) => (
                    <FailureRow
                        failure={failure}
                        id={`${id}-${failure.vendor.toLowerCase()}`}
                        key={failure.vendor}
                    />
                ))}
            </Box>
        </MUIAlert>
    )
}
