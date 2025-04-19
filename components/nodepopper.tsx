import {ClickAwayListener} from "@mui/base/ClickAwayListener"
import {Button, Popper, PopperPlacementType, SxProps} from "@mui/material"
// eslint-disable-next-line no-shadow
import {CSSProperties, MouseEvent, ReactNode, useState} from "react"

import {ZIndexLayers} from "../utils/zIndexLayers"

interface ButtonProps {
    btnContent: ReactNode
    btnSxProps?: SxProps
    id: string
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void
}

interface NodePopperProps {
    id: string
    className?: string
    placement?: PopperPlacementType
    style?: CSSProperties
}

const NodePopper = ({
    popperProps,
    buttonProps,
    children,
}: {
    popperProps: NodePopperProps
    buttonProps?: ButtonProps
    children: ReactNode
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const {btnContent, btnSxProps, id: btnId, onClick: btnClick} = buttonProps
    const {id: popperId, ...restPopperProps} = popperProps

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        setIsOpen((prev) => !prev)
        setAnchorEl(anchorEl ? null : event.currentTarget)
        if (btnClick) {
            btnClick(event)
        }
    }

    const handleClickAway = () => {
        setIsOpen(false)
        setAnchorEl(null)
    }

    return (
        <>
            <Button
                id={btnId}
                onClick={handleClick}
                sx={btnSxProps}
            >
                {btnContent}
            </Button>
            <ClickAwayListener // eslint-disable-line enforce-ids-in-jsx/missing-ids
                mouseEvent="onPointerUp"
                touchEvent="onTouchStart"
                onClickAway={handleClickAway}
            >
                <Popper
                    {...restPopperProps}
                    id={popperId}
                    open={isOpen}
                    anchorEl={anchorEl}
                    sx={{zIndex: ZIndexLayers.LAYER_2}}
                >
                    {children}
                </Popper>
            </ClickAwayListener>
        </>
    )
}

export default NodePopper
