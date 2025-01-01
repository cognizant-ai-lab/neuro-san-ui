import InfoIcon from "@mui/icons-material/Info"
import Tooltip from "@mui/material/Tooltip"
import {ReactElement} from "react"

interface InfoTipParams {
    // Prefix to be used for nested component IDs
    id: string

    // The actual content of the popup tooltip
    info: string

    // Size of the info icon
    size?: number

    // Fill color of the icon (so that it can be seen against various backgrounds)
    color?: string
}

/**
 * Encapsulates a tooltip with an "info" icon. This is a common pattern so it's worth having a reusable component
 * to achieve this.
 *
 * @param props {@see InfoTipParams}
 * @return A Tooltip with the requested text that wraps an InfoIcon
 */
export function InfoTip(props: InfoTipParams): ReactElement {
    const divId = `${props.id}-info-bubble`
    const supId = `${props.id}-info-bubble-sup`
    const iconId = `${props.id}-info-bubble-icon`
    const size = props.size || 15
    const color = props.color || "var(--bs-primary)"

    return (
        <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
            // Tooltip has no id property
            title={props.info}
        >
            <div
                id={divId}
                className="ps-1"
            >
                <sup id={supId}>
                    <InfoIcon
                        sx={{color, fontSize: size}}
                        id={iconId}
                        style={{marginTop: "6px"}}
                    />
                </sup>
            </div>
        </Tooltip>
    )
}
