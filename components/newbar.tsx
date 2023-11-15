import Link, {LinkProps} from "next/link"
import {useState} from "react"
import {AiFillEdit} from "react-icons/ai"
import {BsFillPlusSquareFill} from "react-icons/bs"

// Define the Props Interface
interface NavbarProps {
    id: string
    Title: string
    InfoTip?: React.ReactElement
    LinkComponentProps?: LinkProps
    DisplayNewLink?: boolean
    handleLinkCallback?
    ButtonComponent?
    EditableCallback?
    InstanceId?: string
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
                    <h3
                        id={`${idPrefix}-link-heading`}
                        className="h3"
                    >
                        <BsFillPlusSquareFill id={`${idPrefix}-link-square-fill`} />
                    </h3>
                </Link>
            )
        } else if (props.handleLinkCallback) {
            // If a link has been provided
            newButton = (
                <h3
                    id={`${idPrefix}-link`}
                    className="h3"
                    onClick={props.handleLinkCallback}
                >
                    <BsFillPlusSquareFill id={`${idPrefix}-link-square-fill`} />
                </h3>
            )
        } else if (props.ButtonComponent) {
            newButton = props.ButtonComponent
        }
    }

    const [editing, setEditing] = useState(false)
    let title
    if (props.EditableCallback) {
        if (editing) {
            title = (
                <h3 id={`${idPrefix}-title`}>
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
                </h3>
            )
        } else {
            title = (
                <h3
                    style={{display: "flex"}}
                    id={`${idPrefix}-title`}
                >
                    {props.Title}
                    <button
                        id={`${idPrefix}-button`}
                        onClick={() => {
                            setEditing(true)
                        }}
                    >
                        <AiFillEdit
                            id={`${idPrefix}-button-fill-edit`}
                            size="14"
                        />
                    </button>
                    <div
                        id="info-tip"
                        style={{marginTop: 20}}
                    >
                        {props.InfoTip}
                    </div>
                </h3>
            )
        }
    } else {
        title = (
            <h3
                style={{display: "flex"}}
                id={`${idPrefix}-title`}
            >
                {props.Title}
                <div
                    id="info-tip"
                    style={{marginTop: 20}}
                >
                    {props.InfoTip}
                </div>
            </h3>
        )
    }

    const propsId = `${props.id}`
    return (
        <div
            id={`${propsId}`}
            className="flex justify-between py-6 items-center border-b-2 border-black"
        >
            {title}
            {newButton}
        </div>
    )
}
