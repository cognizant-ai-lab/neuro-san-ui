import {ClickAwayListener} from "@mui/base/ClickAwayListener"
import {Popper, PopperPlacementType} from "@mui/material"
import {CSSProperties, ReactNode, useState} from "react"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    btnContent: string | ReactNode
    id: string
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
    const {btnContent, onClick: btnClick, id: btnId, ...restBtnProps} = buttonProps
    const {id: popperId, ...restPopperProps} = popperProps

    const handleClick = (event) => {
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
            <button
                type="button"
                id={btnId}
                onClick={handleClick}
                {...restBtnProps}
            >
                {btnContent}
            </button>
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
                >
                    {children}
                </Popper>
            </ClickAwayListener>
        </>
    )
}

export default NodePopper
