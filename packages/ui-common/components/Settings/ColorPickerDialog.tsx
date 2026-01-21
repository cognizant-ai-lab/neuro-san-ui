import {Button} from "@mui/material"
import Box from "@mui/material/Box"
import Popover from "@mui/material/Popover"
import Typography from "@mui/material/Typography"
import {FC} from "react"
import {ColorPicker, IColor} from "react-color-palette"

interface ColorPickerDialogProps {
    readonly isOpen: boolean
    readonly anchorEl: HTMLElement | null
    readonly onClose: () => void
    readonly color: IColor
    readonly onChange: (value: ((prevState: IColor) => IColor) | IColor) => void
    readonly onClick: () => void
}

/**
 * Popup dialog for picking colors. Uses react-color-palette under the hood. Basically just wraps the
 * react-color-palette ColorPicker component in a MUI Popover with some extra UI elements.
 */
export const ColorPickerDialog: FC<ColorPickerDialogProps> = ({
    isOpen,
    anchorEl,
    onClose,
    color,
    onChange,
    onClick,
}) => (
    <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={onClose}
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
            sx={{marginBottom: 2}}
        >
            Choose Color
        </Typography>
        <ColorPicker
            height={100}
            color={color}
            onChange={onChange}
            // Limit options to avoid confusing users
            hideInput={["rgb", "hsv"]}
            hideAlpha={true}
        />
        <Box
            style={{
                backgroundColor: color.hex,
                width: "100%",
                height: "1.5rem",
                border: "1px solid #000",
                marginTop: "1rem",
            }}
        />
        <Button
            variant="contained"
            onClick={onClick}
            sx={{marginTop: 2, width: "100%"}}
        >
            OK
        </Button>
    </Popover>
)
