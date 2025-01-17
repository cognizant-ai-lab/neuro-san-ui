import {CircularProgress} from "@mui/material"

export const PageLoader = ({id}) => (
    <div
        id={`${id}__loader`}
        className="absolute top-50 start-0 right-0 text-center"
    >
        <h3 id={`${id}-loader__message`}>Loading... Please wait</h3>
        <CircularProgress
            id={`${id}-loader__spinner`}
            sx={{
                color: "var(--bs-primary)",
            }}
            size="100px"
        />
    </div>
)
