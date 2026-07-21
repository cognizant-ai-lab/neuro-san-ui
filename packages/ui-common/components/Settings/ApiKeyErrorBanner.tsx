import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import Box from "@mui/material/Box"
import ButtonBase from "@mui/material/ButtonBase"
import Collapse from "@mui/material/Collapse"
import {alpha} from "@mui/material/styles"
import Typography from "@mui/material/Typography"
import {FC, useState} from "react"

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
    const [expanded, setExpanded] = useState<boolean>(false)
    const {vendor, result} = failure
    const {status: statusCode, message, errorType, raw} = result

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
            {raw ? (
                <Box sx={{mt: 0.75}}>
                    <ButtonBase
                        aria-expanded={expanded}
                        disableRipple
                        onClick={() => setExpanded((prev) => !prev)}
                        sx={{
                            "&:hover": {color: "text.primary"},
                            alignItems: "center",
                            color: "text.secondary",
                            display: "flex",
                            flexWrap: "wrap",
                            fontSize: "0.75rem",
                            fontWeight: 400,
                            gap: 1,
                            justifyContent: "flex-start",
                            width: "100%",
                        }}
                    >
                        <Box sx={{alignItems: "center", display: "flex", gap: 0.25}}>
                            <ExpandMoreIcon
                                sx={{
                                    fontSize: "1rem",
                                    transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
                                    transition: "transform 0.15s ease",
                                }}
                            />
                            View raw response
                        </Box>
                        {errorType ? (
                            <Typography
                                component="span"
                                sx={{color: "inherit", fontFamily: "monospace", fontSize: "0.75rem"}}
                                variant="caption"
                            >
                                {errorType}
                            </Typography>
                        ) : null}
                    </ButtonBase>
                    <Collapse
                        in={expanded}
                        unmountOnExit
                    >
                        <Box
                            component="pre"
                            sx={{
                                backgroundColor: (theme) => alpha(theme.palette.common.black, 0.25),
                                borderRadius: 1,
                                fontSize: "0.75rem",
                                m: 0,
                                mt: 0.75,
                                maxHeight: 200,
                                overflow: "auto",
                                p: 1,
                            }}
                        >
                            {raw}
                        </Box>
                    </Collapse>
                </Box>
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
