import Box from "@mui/material/Box"
import Tooltip from "@mui/material/Tooltip"
import {FC, ReactElement} from "react"

export type Status = "green" | "red" | "unknown"

interface StatusLightProps {
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

export const StatusLight: FC<StatusLightProps> = ({statusValue, tooltip}) => (
    <Tooltip
        title={tooltip}
        placement="top"
    >
        <Box
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
