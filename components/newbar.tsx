import BorderColorIcon from "@mui/icons-material/BorderColor"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import Link, {LinkProps} from "next/link"
import {ReactElement, useState} from "react"
import {BsFillPlusSquareFill} from "react-icons/bs"
import {MdOutlineShare} from "react-icons/md"

// Define the Props Interface
interface NavbarProps {
    id: string
    Title: string
    InfoTip?: ReactElement
    LinkComponentProps?: LinkProps
    DisplayNewLink?: boolean
    handleLinkCallback?
    ButtonComponent?
    EditableCallback?
    InstanceId?: string
    handleSharingCallback?
}

export default function NewBar(props: NavbarProps) {
    /*
    This component builds a Title bar that can have a new 
    button attached or not.
    */

    let idPrefix = "title-bar"
    if (props.InstanceId) {
        idPrefix = props.InstanceId
    }

    // Determine if the new Button needs to be shown or not
    let newButton = null
    if (props.DisplayNewLink) {
        if (props.LinkComponentProps) {
            // If a callback has been provided
            newButton = (
                <Link
                    id={`${idPrefix}-link`}
                    {...props.LinkComponentProps}
                >
                    <Typography
                        id={`${idPrefix}-link-heading`}
                        variant="h3"
                    >
                        <BsFillPlusSquareFill id={`${idPrefix}-link-square-fill`} />
                    </Typography>
                </Link>
            )
        } else if (props.handleLinkCallback) {
            // If a link has been provided
            newButton = (
                <Typography
                    id={`${idPrefix}-link`}
                    onClick={props.handleLinkCallback}
                    variant="h3"
                >
                    <BsFillPlusSquareFill id={`${idPrefix}-link-square-fill`} />
                </Typography>
            )
        } else if (props.ButtonComponent) {
            newButton = props.ButtonComponent
        }
    }

    // Determine if the Sharing button needs to be shown or not
    let sharingButton = null
    if (props.handleSharingCallback) {
        sharingButton = (
            <Typography
                id="share-item"
                style={{marginLeft: "auto"}}
                variant="h3"
            >
                <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    enterDelay={1000}
                    title="Share this project"
                >
                    <span
                        id="project-tooltip-share"
                        style={{cursor: "pointer"}}
                    >
                        <MdOutlineShare
                            id="project-share"
                            onClick={props.handleSharingCallback}
                        />
                    </span>
                </Tooltip>
            </Typography>
        )
    }

    const [editing, setEditing] = useState(false)
    let title
    if (props.EditableCallback) {
        if (editing) {
            title = (
                <Typography
                    id={`${idPrefix}-title`}
                    variant="h3"
                >
                    <input
                        type="text"
                        id={`${idPrefix}-input`}
                        autoFocus={true}
                        disabled={false}
                        defaultValue={props.Title}
                        onBlur={(event) => {
                            props.EditableCallback(event.target.value)
                            setEditing(false)
                        }}
                        onKeyUp={(event) => {
                            if (event.key === "Enter") {
                                const target = event.target as HTMLInputElement
                                props.EditableCallback(target.value)
                                setEditing(false)
                            } else if (event.key === "Escape") {
                                setEditing(false)
                            }
                        }}
                    />
                </Typography>
            )
        } else {
            title = (
                <Typography
                    id={`${idPrefix}-title`}
                    style={{display: "flex"}}
                    variant="h3"
                >
                    {props.Title}
                    <Button
                        id={`${idPrefix}-button`}
                        onClick={() => {
                            setEditing(true)
                        }}
                        sx={{minWidth: "auto"}}
                    >
                        <BorderColorIcon // Misleading name - this icon is a pencil with a line below
                            id={`${idPrefix}-button-fill-edit`}
                            sx={{fontSize: "0.9rem"}}
                        />
                    </Button>
                    <div id="info-tip">{props.InfoTip}</div>
                </Typography>
            )
        }
    } else {
        title = (
            <Typography
                id={`${idPrefix}-title`}
                style={{display: "flex"}}
                variant="h3"
            >
                {props.Title}
                <div
                    id="info-tip"
                    style={{marginLeft: "0.25rem"}}
                >
                    {props.InfoTip}
                </div>
            </Typography>
        )
    }

    const propsId = props.id
    return (
        <Box
            id={propsId}
            sx={{
                alignItems: "center",
                borderBottom: "var(--bs-border-width) var(--bs-border-style) var(--bs-gray-light)",
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "0.75rem",
            }}
        >
            {title}
            {newButton}
            {sharingButton}
        </Box>
    )
}
