/*
Unit tests for the "file" utility module
 */

import {getFileName, toSafeFilename } from "../../utils/file"

describe("toSafeFilename", () => {
    it("should replace non-alphanumeric characters with underscores", () => {
        expect(toSafeFilename("my cool file!")).toBe("my_cool_file")
        expect(toSafeFilename("Hello, world!")).toBe("Hello__world")
        expect(toSafeFilename("The quick brown fox jumps over the lazy dog")).toBe("The_quick_brown_fox_jumps_over_the_lazy_dog")
    })

    it("should trim leading and trailing underscores", () => {
        expect(toSafeFilename("_my cool file_")).toBe("my_cool_file")
        expect(toSafeFilename("__Hello, world!__")).toBe("Hello__world")
        expect(toSafeFilename("__The quick brown fox jumps over the lazy dog__")).toBe("The_quick_brown_fox_jumps_over_the_lazy_dog")
    })

    it("should handle empty or null strings", () => {
        expect(toSafeFilename("")).toBe("")
        expect(toSafeFilename(null)).toBe("")
    })
})

describe('getFileName', () => {
    it('should return an empty string when the input is empty', () => {
        expect(getFileName('')).toBe('');
    });

    it('should return the file name when the path includes a file extension', () => {
        expect(getFileName('C:/Users/JaneDoe/Documents/myfile.txt')).toBe('myfile.txt');
    });

    it('should return the file name when the file has no extension', () => {
        expect(getFileName('C:/Users/JaneDoe/Documents/myfile')).toBe('myfile');
    });

    it('should return the file name when the path includes backslashes', () => {
        expect(getFileName('C:\\Users\\JaneDoe\\Documents\\myfile.txt')).toBe('myfile.txt');
    });

    it('should return the file name when the path includes both forward and back slashes', () => {
        expect(getFileName('C:/Users/JaneDoe\\Documents/myfile.txt')).toBe('myfile.txt');
    });

    it('should return nothing when the path ends with a forward slash', () => {
        expect(getFileName('C:/Users/JaneDoe/Documents/')).toBe('');
    });

    it('should return nothing when the path ends with a backslash', () => {
        expect(getFileName('C:\\Users\\JaneDoe\\Documents\\')).toBe('');
    });

    it('should return the file name when the path ends with a period', () => {
        expect(getFileName('C:/Users/JaneDoe/Documents/myfile.txt.')).toBe('myfile.txt.');
    });

    it('should return the file name when the path contains only one backslash', () => {
        expect(getFileName('C:\\myfile.txt')).toBe('myfile.txt');
    });

    it('should return the file name when the path contains only one forward slash', () => {
        expect(getFileName('C:/myfile.txt')).toBe('myfile.txt');
    });
});
