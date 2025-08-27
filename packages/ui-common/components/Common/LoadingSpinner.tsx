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
