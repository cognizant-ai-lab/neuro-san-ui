import sortByTime from "../utils/sort"
import {MDServerObject, MDServerResponse} from "./base_types"
import {toFriendlyDateTime} from "../utils/date_time"

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
    let response
    try {
        response = await fetch(url, requestParams)
    } catch (e) {
        console.error(`Error fetching url: ${url} for resource: ${resourceName}: `, e)
        return null
    }

    // Check for error
    if (response.status != 200) {
        console.error(`Failed to fetch ${resourceName}`, response.statusText)
        return null
    }

    const reader = response.body.getReader();
    const items: ObjectType[] = []
    const utf8decoder = new TextDecoder('utf8')
    let buffer = ""

    let done = false
    while (!done) {
        const { value, done: isDone } = await reader.read();
        done = isDone
        try {
            if (!done) {
                const chunk = utf8decoder.decode(value)
                buffer += chunk
            }
        } catch (e) {
            // invalid json input, log the error
            console.error(`Error Serializing ${resourceName}: `, e)
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
                itemResult.updated_at = toFriendlyDateTime(itemResult.updated_at)
                itemResult.created_at = toFriendlyDateTime(itemResult.created_at)
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
