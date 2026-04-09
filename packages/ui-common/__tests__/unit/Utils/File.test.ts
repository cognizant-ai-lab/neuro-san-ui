/*
Unit tests for the "file" utility module
 */

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {downloadFile, getFileName, splitFilename, toSafeFilename} from "../../../utils/File"

describe("toSafeFilename", () => {
    withStrictMocks()

    it("should replace non-alphanumeric characters with underscores", () => {
        expect(toSafeFilename("my cool file!")).toBe("my_cool_file")
        expect(toSafeFilename("Hello, world!")).toBe("Hello__world")
        expect(toSafeFilename("The quick brown fox jumps over the lazy dog")).toBe(
            "The_quick_brown_fox_jumps_over_the_lazy_dog"
        )
    })

    it("should trim leading and trailing underscores", () => {
        expect(toSafeFilename("_my cool file_")).toBe("my_cool_file")
        expect(toSafeFilename("__Hello, world!__")).toBe("Hello__world")
        expect(toSafeFilename("__The quick brown fox jumps over the lazy dog__")).toBe(
            "The_quick_brown_fox_jumps_over_the_lazy_dog"
        )
    })

    it("should handle empty or null strings", () => {
        expect(toSafeFilename("")).toBe("")
        expect(toSafeFilename(null)).toBe("")
    })
})

describe("getFileName", () => {
    it("should return an empty string when the input is empty", () => {
        expect(getFileName("")).toBe("")
    })

    it("should return the file name when the path includes a file extension", () => {
        expect(getFileName("C:/Users/JaneDoe/Documents/myfile.txt")).toBe("myfile.txt")
    })

    it("should return the file name when the file has no extension", () => {
        expect(getFileName("C:/Users/JaneDoe/Documents/myfile")).toBe("myfile")
    })

    it("should return the file name when the path includes backslashes", () => {
        expect(getFileName("C:\\Users\\JaneDoe\\Documents\\myfile.txt")).toBe("myfile.txt")
    })

    it("should return the file name when the path includes both forward and back slashes", () => {
        expect(getFileName("C:/Users/JaneDoe\\Documents/myfile.txt")).toBe("myfile.txt")
    })

    it("should return nothing when the path ends with a forward slash", () => {
        expect(getFileName("C:/Users/JaneDoe/Documents/")).toBe("")
    })

    it("should return nothing when the path ends with a backslash", () => {
        expect(getFileName("C:\\Users\\JaneDoe\\Documents\\")).toBe("")
    })

    it("should return the file name when the path ends with a period", () => {
        expect(getFileName("C:/Users/JaneDoe/Documents/myfile.txt.")).toBe("myfile.txt.")
    })

    it("should return the file name when the path contains only one backslash", () => {
        expect(getFileName("C:\\myfile.txt")).toBe("myfile.txt")
    })

    it("should return the file name when the path contains only one forward slash", () => {
        expect(getFileName("C:/myfile.txt")).toBe("myfile.txt")
    })
})

describe("splitFileName", () => {
    it("Should split a filename correctly", () => {
        expect(splitFilename("foo.csv")).toEqual({name: "foo", ext: "csv"})
        expect(splitFilename("foo")).toEqual({name: "foo", ext: ""})
        expect(splitFilename("foo.bar.baz")).toEqual({name: "foo.bar", ext: "baz"})
    })
})

describe("downloadFile", () => {
    it("should create a download link with the correct filename and content", () => {
        // Mock URL methods directly (they don't exist in JSDOM by default)
        const objectUrl = "blob:http://localhost/fake-blob-url"
        const createObjectUrlMock = jest.fn().mockReturnValue(objectUrl)
        const revokeObjectURLMock = jest.fn()
        const originalCreateObjectURL = global.URL.createObjectURL
        const originalRevokeObjectURL = global.URL.revokeObjectURL

        global.URL.createObjectURL = createObjectUrlMock
        global.URL.revokeObjectURL = revokeObjectURLMock

        // Mock HTMLAnchorElement.prototype.click
        const originalAnchorClick = HTMLAnchorElement.prototype.click

        const clickMock = jest.fn()
        HTMLAnchorElement.prototype.click = clickMock

        // Mock Blob constructor
        const blobMock = jest.fn()
        const originalBlob = global.Blob
        global.Blob = blobMock

        const fileName = "hello.txt"
        const textToWrite = "Hello, world!"
        try {
            downloadFile(textToWrite, fileName)

            // Make sure correct Blob was created
            expect(blobMock).toHaveBeenCalledWith([textToWrite])

            expect(revokeObjectURLMock).toHaveBeenCalledWith(objectUrl)

            expect(clickMock).toHaveBeenCalled()
        } finally {
            global.URL.createObjectURL = originalCreateObjectURL
            global.URL.revokeObjectURL = originalRevokeObjectURL
            HTMLAnchorElement.prototype.click = originalAnchorClick
            global.Blob = originalBlob
        }

        // Make sure correct Blob was created
        expect(blobMock).toHaveBeenCalledWith([textToWrite])

        expect(revokeObjectURLMock).toHaveBeenCalledWith(objectUrl)

        expect(clickMock).toHaveBeenCalled()
    })
})
