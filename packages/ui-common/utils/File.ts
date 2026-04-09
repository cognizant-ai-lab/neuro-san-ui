// Miscellaneous local file related utilities

// Sanitize filename before saving
export const toSafeFilename = (input: string): string => {
    // handle null-ish cases
    if (!input) {
        return ""
    }

    // Replace any non-alphanumeric characters with underscores
    let safeFilename = input.replace(/[^a-zA-Z0-9]/gu, "_")

    // Trim any leading or trailing underscores
    safeFilename = safeFilename.replace(/^_+|_+$/gu, "")

    return safeFilename
}

/**
 * Splits a given filename into its name and extension components.
 * @param filename Filename as string like foo.csv or just "foo" with no extension
 * @return An object with properties <code>name</code> containing the filename part and <code>ext</code> containing
 * the extension, or <code>""</code> if none.
 */
export const splitFilename = (filename: string): {ext: string; name: string} => {
    const indexOfDot = filename.lastIndexOf(".")
    if (indexOfDot === -1) {
        return {name: filename, ext: ""}
    }
    return {name: filename.slice(0, indexOfDot), ext: filename.slice(indexOfDot + 1)}
}

/**
 * Obtains the filename from a full path, returning only the last component of the path -- the file name
 * with extensions.
 * <br>
 * Handles forward-slash and backslash-delimited paths.
 * @example
 * // returns baz.csv
 * getFileName("/tmp/foo/bar/qux/baz.csv")
 * @param path The path to be parsed
 * @return The filename part of the path only
 */
export const getFileName = (path: string): string =>
    // conflicts with ESLint newline-per-chained-call rule
    // prettier-ignore
    path.split("\\")
        .pop()
        .split("/")
        .pop()

/**
 * Downloads a file containing the supplied content with the specified filename
 * @param messageContents The contents of the file to be downloaded
 * @param fileName Local filename for the file to be downloaded
 */
export const downloadFile = (messageContents: string | Uint8Array, fileName: string) => {
    const downloadLink = document.createElement("a")

    const blob = new Blob([messageContents] as BlobPart[])

    // Apply the url and filename to the anchor tag
    downloadLink.href = URL.createObjectURL(blob)
    downloadLink.download = fileName

    // Add the anchor to the page, click it, then remove it
    document.body.append(downloadLink)
    downloadLink.click()
    downloadLink.remove()

    URL.revokeObjectURL(downloadLink.href)
}
