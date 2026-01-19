import {Button} from "@mui/material"
import Box from "@mui/material/Box"
import Popover from "@mui/material/Popover"
import Typography from "@mui/material/Typography"
import {ColorPicker, IColor} from "react-color-palette"

export function ColorPickerDialog(props: {
    open: boolean
    anchorEl: HTMLElement
    onClose: () => void
    color: IColor
    onChange: (value: ((prevState: IColor) => IColor) | IColor) => void
    onClick: () => void
}) {
    return (
        <Popover
            open={props.open}
            anchorEl={props.anchorEl}
            onClose={props.onClose}
            slotProps={{
                paper: {
                    sx: {
                        minWidth: "300px",
                        padding: "1rem",
                        paddingTop: 5,
                    },
                },
            }}
        >
            <Typography
                variant="h6"
                sx={{mb: 2, color: "white"}}
            >
                Choose Color
            </Typography>
            <ColorPicker
                height={100}
                color={props.color}
                onChange={props.onChange}
                hideInput={true}
                hideAlpha={true}
            />
            <Box
                style={{
                    backgroundColor: props.color.hex,
                    width: "100%",
                    height: "1.5rem",
                    border: "1px solid #000",
                    marginTop: "1rem",
                }}
            />
            <Button
                variant="contained"
                onClick={props.onClick}
                sx={{mt: 2, width: "100%"}}
            >
                OK
            </Button>
        </Popover>
    )
}
