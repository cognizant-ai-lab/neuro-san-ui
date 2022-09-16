import {notification} from 'antd';
import {ReactNode} from "react";
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
 */
export function sendNotification(nt: NotificationType, message: string, description: string | ReactNode = ""): void {
    // Log a copy to the console for troubleshooting
    console.debug(`Notification: Message: "${message}" Description: "${renderToString(description)}"`)

    // Show error and warnings for longer
    let duration: number
    switch (nt) {
        case NotificationType.info:
        case NotificationType.success:
            duration = SUCCESS_NOTIFICATION_DURATION_SECS
            break
        case NotificationType.warning:
        case NotificationType.error:
        default:
            duration = ERROR_WARNING_NOTIFICATION_DURATION_SECS
            break
    }

    // Send the notification with antd
    notification[NotificationType[nt]]({
        message: message,
        description: description,
        duration: duration
    })
}
