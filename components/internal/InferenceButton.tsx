import {styled} from "@mui/material"
import Button from "@mui/material/Button"

export const InferenceButton = styled(Button)(({disabled}) => ({
    background: "var(--bs-primary) !important",
    borderColor: "var(--bs-primary) !important",
    width: "100%",
    color: "var(--bs-white) !important",
    lineHeight: "37.5px",
    paddingTop: "10px",
    paddingBottom: "10px",
    borderRadius: "15px",
    fontSize: "25px",
    fontWeight: 400,
    opacity: disabled ? 0.5 : 1,
    "&.MuiButton-text": {
        color: "white",
    },
}))
