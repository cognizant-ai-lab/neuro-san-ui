import {toFriendlyDateTime} from "../../utils/date_time"

describe("toFriendlyDateTime", () => {
    it("should convert a valid date-time string to a friendly format", () => {
        const input = "2023-02-11T21:15:03.362105509Z"
        const expectedOutput = new Date(input).toLocaleString()
        expect(toFriendlyDateTime(input)).toBe(expectedOutput)
    })

    it("should handle an empty string input gracefully", () => {
        const input = ""
        expect(toFriendlyDateTime(input)).toBe("Invalid Date")
    })

    it("should handle an invalid date-time string gracefully", () => {
        const input = "invalid-date-time"
        expect(toFriendlyDateTime(input)).toBe("Invalid Date")
    })

    it("should convert a date-time string with a different time zone correctly", () => {
        const input = "2023-02-11T21:15:03.362105509+05:00"
        const expectedOutput = new Date(input).toLocaleString()
        expect(toFriendlyDateTime(input)).toBe(expectedOutput)
    })

    it("should convert a date-time string without milliseconds correctly", () => {
        const input = "2023-02-11T21:15:03Z"
        const expectedOutput = new Date(input).toLocaleString()
        expect(toFriendlyDateTime(input)).toBe(expectedOutput)
    })
})
