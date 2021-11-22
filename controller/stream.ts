import sortByTime from "../utils/sort"
import Notification, {NotificationProps} from "./notification";

// HackyStream implements streaming a specific resource from the MD Server using a regex hack
// By virtue of this hack it currently stores the whole stream in memory.
export default async function HackyStream<ObjectType extends MDServerObject>(url: string, resourceName: string): Promise<ObjectType[]> {

    // Fetch the URL
    const response = await fetch(url)

    // Instantiate logger
    const debug = require('debug')(`Fetch ${resourceName}`)

    if (response.status != 200) {
        let notificationProps: NotificationProps = {
            Type: "error",
            Message: `Failed to fetch ${resourceName}`,
            Description: response.statusText
        }
        Notification(notificationProps)
        return null
    }

    const reader = response.body.getReader();
    let items: ObjectType[] = []
    const utf8decoder = new TextDecoder('utf8')
    let buffer = ""

    while (true) {
        const {value, done} = await reader.read()
        if (done) break;
        try {

            const chunk = utf8decoder.decode(value)
            buffer += chunk
        } catch (e) {
            // invalid json input, log the error
            debug(`Error Serializing ${resourceName}: `, e)
        }
    }

    // gRPC streams items to us delimited by newline. But JSON requires commas between items.
    // Therefore, this regex replaces all newlines except the last (which is a legit newline) with comma + newline
    // We also need to sandwich it in square brackets to conform to JSON array syntax
    buffer = '[' + buffer.replace(/\n(?=.*\n)/g, ",\n") + ']'

    let results: MDServerResponse[]
    try {
        results = JSON.parse(buffer);
    } catch (e) {
        console.error(`Error parsing ${resourceName} data from server. First 100 bytes: ` +
            String(results).substring(0, 100))
        throw e
    }

    for (const item of results) {
        try {
            const itemResult: ObjectType = item.result
            itemResult.updated_at = new Date(itemResult.updated_at).toLocaleString()
            items.push(itemResult)
        } catch (error) {
            console.error(`Error parsing JSON for ${resourceName}: ` + String(error))
        }
    }

    sortByTime(items)

    return items
}
