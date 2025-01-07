import {enqueueSnackbar, SnackbarOrigin, /*SnackbarOrigin, */ VariantType} from "notistack"
import {renderToString} from "react-dom/server"

// no-shadow doesn't do well with enums. Search their github issues if you're curious.
// eslint-disable-next-line no-shadow
export enum NotificationType {
    "success",
    "info",
    "warning",
    "error",
}

// Display warning and error notification popups for this many seconds
const ERROR_WARNING_NOTIFICATION_DURATION_MS = 15000

// Display info notification popups for this many seconds
const SUCCESS_NOTIFICATION_DURATION_MS = 5000

/**
 * Convenience method to allow sending notifications to user with a one-liner.
 * Simply wraps @Notification function
 * @param variantType Indicates whether it's error, warning, info etc.
 * @param message Brief summary of the notification
 * @param description More complete description of the notification
 * @param placement Where to show notification. Defaults to top-right.
 */
export function sendNotification(
    variantType: NotificationType,
    message: string,
    description: string | JSX.Element = "",
    placement: SnackbarOrigin = {
        vertical: "top",
        horizontal: "right",
    }
): void {
    // Log a copy to the console for troubleshooting
    const descriptionAsString = typeof description === "string" ? description : renderToString(description)
    console.debug(`Notification: Message: "${message}" Description: "${descriptionAsString}"`)

    // Show error and warnings for longer
    let duration: number
    switch (variantType) {
        case NotificationType.info:
        case NotificationType.success:
            duration = SUCCESS_NOTIFICATION_DURATION_MS
            break
        case NotificationType.warning:
        case NotificationType.error:
        default:
            duration = ERROR_WARNING_NOTIFICATION_DURATION_MS
            break
    }

    // Use some minor customization to be able to inject ids for testing
    const spanId = `notification-message-${variantType}`
    const messageSpan = <span id={spanId}>{message}</span>

    enqueueSnackbar(messageSpan, {
        anchorOrigin: placement,
        autoHideDuration: duration,
        // @ts-expect-error - Could "declare module" to fix this
        description,
        variant: NotificationType[variantType] as VariantType,
    })
}
