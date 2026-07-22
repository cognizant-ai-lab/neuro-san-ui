import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined"
import Box from "@mui/material/Box"
import {alpha} from "@mui/material/styles"
import Typography from "@mui/material/Typography"
import {FC} from "react"

import {KeyValidationResult} from "../../controller/llm/Providers"

export interface ApiKeyFailure {
    readonly vendor: string
    readonly result: KeyValidationResult
}

interface ApiKeyErrorBannerProps {
    readonly id: string
    readonly failures: readonly ApiKeyFailure[]
}

/**
 * Map an HTTP status code to a short, human-readable summary for the banner header.
 * @param status The HTTP status code, if known.
 * @return A short description of the failure.
 */
const describeStatus = (httpStatus?: number): string => {
    switch (httpStatus) {
        case 400:
            return "Bad request"
        case 401:
            return "Authentication failed"
        case 403:
            return "Access forbidden"
        case 404:
            return "Not found"
        case 429:
            return "Rate limited"
        default:
            return httpStatus !== undefined && httpStatus >= 500 ? "Server error" : "Request failed"
    }
}

const FailureRow: FC<{id: string; failure: ApiKeyFailure}> = ({id, failure}) => {
    const {vendor, result} = failure
    const {status: statusCode, message} = result

    const title = `${vendor} — ${describeStatus(statusCode)}${statusCode !== undefined ? ` (${statusCode})` : ""}`

    return (
        <Box data-testid={`${id}-failure`}>
            <Typography
                sx={{color: "error.main", fontWeight: 700}}
                variant="body2"
            >
                {title}
            </Typography>
            {message ? (
                <Typography
                    sx={{color: "error.main", mt: 0.25, overflowWrap: "anywhere"}}
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
// eslint-disable-next-line react/no-multi-comp -- co-located with its single-row helper
export const ApiKeyErrorBanner: FC<ApiKeyErrorBannerProps> = ({id, failures}) => {
    if (failures.length === 0) {
        return null
    }

    return (
        <Box
            data-testid={id}
            role="alert"
            sx={{
                backgroundColor: (theme) => alpha(theme.palette.error.main, 0.12),
                border: (theme) => `1px solid ${alpha(theme.palette.error.main, 0.5)}`,
                borderRadius: 1,
                display: "flex",
                gap: 1.5,
                p: 1.5,
                width: "100%",
            }}
        >
            <ErrorOutlineIcon sx={{color: "error.main", flexShrink: 0}} />
            <Box sx={{display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0, width: "100%"}}>
                {failures.map((failure) => (
                    <FailureRow
                        failure={failure}
                        id={`${id}-${failure.vendor.toLowerCase()}`}
                        key={failure.vendor}
                    />
                ))}
            </Box>
        </Box>
    )
}
