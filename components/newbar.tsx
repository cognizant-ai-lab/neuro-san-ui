// Import React
import React from "react";

// Import Next Components
import Link, { LinkProps } from "next/link";

// Import Icons
import { BsFillPlusSquareFill } from 'react-icons/bs';

// Define the Props Interface
export interface NavbarProps {
    Title: string,
    LinkComponentProps?: LinkProps,
    DisplayNewLink?: boolean,
    LinkCallback?: any
}

export default function NewBar(props: NavbarProps) {
    /*
    This component builds a Title bar that can have a new 
    button attached or not.
    */

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
            newButton = <h3 className="h3" onClick={props.LinkCallback}><BsFillPlusSquareFill /></h3>
        }
    } 

    return <div className="flex justify-between py-6 items-center border-b-2 border-black">
                <h3 className="h3">{props.Title}</h3>
                { newButton }
            </div>

}