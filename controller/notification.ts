import {notification} from 'antd';

export enum NotificationType {
    "success",
    "info",
    "warning",
    "error"
}

export interface NotificationProps {
    readonly Type: string,
    readonly Message: string,
    readonly Description: string
}

/**
 * Convenience method to allow sending notifications to user with a one-liner.
 * Simply wraps @Notification function
 * @param nt Indicates whether it's error, warning, info etc.
 * @param message Brief summary of the notification
 * @param description More complete description of the notification
 */
export function sendNotification(nt: NotificationType, message: string, description: string = ""): void {
    Notification({
        Type: NotificationType[nt],
        Message: message,
        Description: description
    })
}

export default function Notification(props: NotificationProps) {

    /* 
    This function extends the AndD notification to be a repeatable,
    easy to use component
    */
    notification[props.Type]({
      message: props.Message,
      description:
        props.Description
    });
  };