import { notification } from 'antd';

export interface NotificationProps {
    readonly Type: string,
    readonly Message: string,
    readonly Description: string
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