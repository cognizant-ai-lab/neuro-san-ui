// Import React
import React, {useState} from "react";

// Import Next Components
import Link, { LinkProps } from "next/link";

// Import Icons
import { BsFillPlusSquareFill } from 'react-icons/bs';
import {AiFillEdit} from "react-icons/ai";

// Define the Props Interface
interface NavbarProps {
    id: string,
    Title: string,
    LinkComponentProps?: LinkProps,
    DisplayNewLink?: boolean,
    LinkCallback?,
    ButtonComponent?,
    EditableCallback?,
    InstanceId?: string,
}

export default function NewBar(props: NavbarProps) {
    /*
    This component builds a Title bar that can have a new 
    button attached or not.
    */

    let idPrefix = "title-bar";
    if (props.InstanceId) {
        idPrefix = props.InstanceId
    }

    // Determine if the new Button needs to be shown or not
    let newButton = null
    if (props.DisplayNewLink) {
        if (props.LinkComponentProps) {
            // If a callback has been provided
            newButton = <Link {...props.LinkComponentProps} >
                            <a><h3 className="h3"><BsFillPlusSquareFill /></h3></a>
                        </Link>
        } else if (props.LinkCallback) {
            // If a link has been provided
            newButton = <h3 id={ `${idPrefix}-link` } className="h3" onClick={props.LinkCallback}>
                            <BsFillPlusSquareFill />
                        </h3>
        } else if (props.ButtonComponent) {
            newButton = props.ButtonComponent
        }
    }

    const [editing, setEditing] = useState(false)
    let title
    if (props.EditableCallback && !editing) {
        title = <h3 className="h3">
            {props.Title}
            <button onClick={() => {
                        setEditing(true)
                    }}
                    id={ `${idPrefix}-button` }
            >
                <AiFillEdit size='14'/>
            </button>
        </h3>
    } else if (props.EditableCallback && editing) {
        title = <h3 className="h3">
            <input type="text"
                   id={ `${idPrefix}-input` }
                   autoFocus={true}
                   disabled={false}
                   defaultValue={props.Title}
                   onBlur={
                       event => {
                            props.EditableCallback(event.target.value)
                            setEditing(false)
                       }
                   }
                   onKeyUp={
                       event => {
                           if (event.key === "Enter") {
                               const target = event.target as HTMLInputElement
                               props.EditableCallback(target.value)
                               setEditing(false)
                           }
                       }
                   }
                   />
        </h3>
    } else {
        title = <h3 className="h3" id={ `${idPrefix}-title` }>{ props.Title }</h3>
    }

    return <div id={props.id} className="flex justify-between py-6 items-center border-b-2 border-black">
                {title}
                { newButton }
            </div>

}
