import Debug from "debug"
import sortByTime from "../utils/sort"
import {MDServerObject, MDServerResponse} from "./base_types";
import {NotificationType, sendNotification} from "./notification";

// HackyStream implements streaming a specific resource from the MD Server using a regex hack
// By virtue of this hack it currently stores the whole stream in memory.
// Note that this function will return an array of ObjectType items. Even if there is just a single item, you will
// get an array of length 1 containing that item.
export default async function HackyStream<ObjectType extends MDServerObject>(
    url: string,
    resourceName: string,
    method: string = 'GET',
    data: object = null
): Promise<ObjectType[]> {

    // Build request params
    const requestParams = {method: method};
    if (data) {
        requestParams["body"] = JSON.stringify(data)
    }

    // Fetch the URL
    const response = await fetch(url, requestParams)

    // Instantiate logger
    const debug = Debug(`Fetch ${resourceName}`)

    // Check for error
    if (response.status != 200) {
        sendNotification(NotificationType.error, `Failed to fetch ${resourceName}`, response.statusText)
    }

    const reader = response.body.getReader();
    const items: ObjectType[] = []
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
            if (itemResult) {
                itemResult.updated_at = new Date(itemResult.updated_at).toLocaleString()
                itemResult.created_at = new Date(itemResult.created_at).toLocaleString()
                items.push(itemResult)
            }
        } catch (e) {
            console.error(`Error parsing JSON for ${resourceName}: ` + String(e))
            throw e
        }
    }

    sortByTime(items)

    return items
}
