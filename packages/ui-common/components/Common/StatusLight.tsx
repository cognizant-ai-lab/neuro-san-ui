import Box from "@mui/material/Box"
import Tooltip from "@mui/material/Tooltip"
import {FC, ReactElement} from "react"

type Status = "green" | "red" | "unknown"

interface StatusLightProps {
    readonly id?: string
    readonly statusValue: Status
    readonly tooltip?: ReactElement
}

const statusToColor = (statusValue: Status) => {
    switch (statusValue) {
        case "green":
            return "success.main"
        case "red":
            return "error.main"
        case "unknown":
        default:
            return "action.disabled"
    }
}

export const StatusLight: FC<StatusLightProps> = ({id, statusValue, tooltip}) => (
    <Tooltip
        title={tooltip}
        placement="top"
    >
        <Box
            id={id}
            data-testid={id}
            data-status={statusValue}
            sx={{
                backgroundColor: statusToColor(statusValue),
                borderRadius: "50%",
                display: "inline-block",
                minWidth: "0.75rem",
                minHeight: "0.75rem",
            }}
        />
    </Tooltip>
)
