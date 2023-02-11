/**
 * For utilities relating to date-time processing
 */

/**
 * Takes an ugly date time string in a format like <code>"2023-02-11T21:15:03.362105509Z"</code> and converts it to the
 * slightly friendlier <code>2/11/2023, 9:15:03 PM</code>
 * @param dateTime The input string to convert, in ugly format as shown above
 * @return A string with the human-readable date-time string
 */
export function toFriendlyDateTime(dateTime: string) {
    return new Date(dateTime).toLocaleString()
}
