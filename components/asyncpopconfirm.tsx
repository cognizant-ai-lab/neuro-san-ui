import {Popconfirm, TooltipPlacement} from "antd"
import {ReactNode} from "react"

const NOT_VISIBLE: number = -1
const VISIBLE: number = 1

interface ConfirmProps {
    visible: number,
    confirmData: object
}

export const INITIAL_CONFIRM_PROPS: ConfirmProps = {
    visible: NOT_VISIBLE,
    confirmData: null
}

/**
 * This interface is used to define the props that the AsyncPopconfirm uses
 * XXX Doc params
 */
interface AsyncPopconfirmProps {

    // Testing id for the component
    id: string,

    message: string | ReactNode,

    confirmProps: ConfirmProps,

    setConfirmProps: (confirmProps: ConfirmProps) => void,

    onConfirm: (confirmData: object) => void,

    confirmData?: object,

    index?: number,

    placement?: TooltipPlacement
}

/**
 * Exposed function so onClick functions (for buttons, say) can bring up the AsyncPopconfirm component
 * XXX Doc params
 */
export function showAsyncPopconfirm(confirmProps: ConfirmProps,
                                          setConfirmProps: (confirmProps: ConfirmProps) => void,
                                          confirmData: object = null,
                                          index: number = VISIBLE) {
    setConfirmProps({
        ...confirmProps,
        visible: index,
        confirmData: confirmData
    })
}

/**
 * Convenience method to allow modal confirmation with proper testing ids with a one-liner.
 */
export function AsyncPopconfirm(props: AsyncPopconfirmProps) {

    const id = props.id
    const message = props.message
    const confirmProps = props.confirmProps
    const setConfirmProps = props.setConfirmProps
    const onConfirm = props.onConfirm
    const confirmData = props.confirmData
    const index = (props.index !== undefined) ? props.index : VISIBLE
    const placement = (props.placement !== undefined) ? props.placement : "left"

    const title = (typeof props.message == "string" || props.message instanceof String)
                    ? <span id={ `${id}-message` }>{message}</span>
                    : message

    function isVisible(confirmProps: ConfirmProps, index: number): boolean {
        if (confirmProps === undefined) {
            return false
        }
        return (confirmProps.visible === index)
    }

    return <Popconfirm id={id}
                open={isVisible(confirmProps, index)}
                title={title}
                placement={placement}
                okType="default"
                okButtonProps={{
                    id: `${id}-ok-button`
                }}
                onConfirm={ async() => {
                   setConfirmProps({
                        ...confirmProps,
                        visible: NOT_VISIBLE
                    }) 
                    onConfirm(confirmData)
                }}
                cancelButtonProps={{
                    id: `${id}-cancel-button`
                }}
                onCancel={ () => {
                    setConfirmProps({
                        ...confirmProps,
                        visible: NOT_VISIBLE
                    })
                }} 
            />
}
