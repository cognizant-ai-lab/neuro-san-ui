import {notification} from 'antd';
import {NotificationPlacement} from "antd/lib/notification";
import {renderToString} from "react-dom/server";

export enum NotificationType {
    "success",
    "info",
    "warning",
    "error"
}

// Display warning and error notification popups for this many seconds
const ERROR_WARNING_NOTIFICATION_DURATION_SECS = 15;

// Display info notification popups for this many seconds
const SUCCESS_NOTIFICATION_DURATION_SECS = 5;

/**
 * Convenience method to allow sending notifications to user with a one-liner.
 * Simply wraps @Notification function
 * @param nt Indicates whether it's error, warning, info etc.
 * @param message Brief summary of the notification
 * @param description More complete description of the notification
 * @param placement Where to show notification. Defaults to top-right.
 */
export function sendNotification(nt: NotificationType, message: string, description: string | JSX.Element = "",
                                 placement: NotificationPlacement = "topRight"): void {

    // Log a copy to the console for troubleshooting
    const descriptionAsString = typeof description === "string" ? description : renderToString(description)
    console.debug(`Notification: Message: "${message}" Description: "${descriptionAsString}"`)

    // Show error and warnings for longer
    let duration: number
    let messageType: string
    switch (nt) {
        case NotificationType.info:
            messageType="info"
            duration = SUCCESS_NOTIFICATION_DURATION_SECS
            break
        case NotificationType.success:
            messageType="success"
            duration = SUCCESS_NOTIFICATION_DURATION_SECS
            break
        case NotificationType.warning:
            messageType="warning"
            duration = ERROR_WARNING_NOTIFICATION_DURATION_SECS
            break
        case NotificationType.error:
        default:
            messageType="error"
            duration = ERROR_WARNING_NOTIFICATION_DURATION_SECS
            break
    }

    // Use some minor customization to be able to inject ids for testing
    const spanId = `notification-message-${messageType}`
    const messageSpan = <span id={spanId}>{message}</span>
    const closeIcon = <span id="notification-close-icon" className="text-monospace fs-5">x</span>

    // Send the notification with antd
    notification[NotificationType[nt]]({
        message: messageSpan,
        description: description,
        duration: duration,
        closeIcon: closeIcon,
        placement: placement
    })
}
