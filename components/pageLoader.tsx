import {CircularProgress, Typography} from "@mui/material"

export const PageLoader = ({id}) => (
    <div
        id={`${id}__loader`}
        style={{
            left: "0",
            position: "absolute",
            right: "0",
            textAlign: "center",
            top: "50%",
        }}
    >
        <Typography
            id={`${id}-loader__message`}
            variant="h3"
        >
            Loading... Please wait
        </Typography>
        <CircularProgress
            id={`${id}-loader__spinner`}
            sx={{
                color: "var(--bs-primary)",
            }}
            size="100px"
        />
    </div>
)
