import {Button} from "@mui/material"
import Box from "@mui/material/Box"
import Popover from "@mui/material/Popover"
import Typography from "@mui/material/Typography"
import {ColorPicker, IColor} from "react-color-palette"

interface ColorPickerDialogProps {
    readonly open: boolean
    readonly anchorEl: HTMLElement
    readonly onClose: () => void
    readonly color: IColor
    readonly onChange: (value: ((prevState: IColor) => IColor) | IColor) => void
    readonly onClick: () => void
}

export function ColorPickerDialog(props: ColorPickerDialogProps) {
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
                sx={{marginBottom: 2, color: "text.primary"}}
            >
                Choose Color
            </Typography>
            <ColorPicker
                height={100}
                color={props.color}
                onChange={props.onChange}
                hideInput={["rgb", "hsv"]}
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
                sx={{marginTop: 2, width: "100%"}}
            >
                OK
            </Button>
        </Popover>
    )
}
