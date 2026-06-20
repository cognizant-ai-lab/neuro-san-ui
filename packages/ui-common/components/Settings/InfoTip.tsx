import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import Tooltip from "@mui/material/Tooltip"
import {ReactNode} from "react"

/**
 * Simple wrapper around MUI's Tooltip that displays an info icon which, when hovered, shows the provided title.
 * @param props Object containing the title to be displayed in the tooltip.
 */
export default function InfoTip(props: {title: ReactNode}) {
    return (
        <Tooltip title={props.title}>
            <InfoOutlinedIcon
                aria-label="setting information"
                fontSize="small"
                sx={{
                    color: "primary.main",
                    cursor: "help",
                    fontSize: "0.9rem",
                }}
            />
        </Tooltip>
    )
}
