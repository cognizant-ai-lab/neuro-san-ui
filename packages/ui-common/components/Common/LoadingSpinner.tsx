/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import CircularProgress from "@mui/material/CircularProgress"
import {FC} from "react"

interface LoadingSpinnerProps {
    id: string
}

/**
 * A simple loading spinner component that displays a circular progress indicator
 * @param id The id for the spinner and text elements, for testing
 */
export const LoadingSpinner: FC<LoadingSpinnerProps> = ({id}) => {
    return (
        <h3 id={id}>
            <CircularProgress
                id={`${id}-spinner`}
                sx={{color: "var(--bs-primary)"}}
                size={35}
            />
            <span
                id={`${id}-loading-text`}
                style={{marginLeft: "1em"}}
            >
                Loading...
            </span>
        </h3>
    )
}
