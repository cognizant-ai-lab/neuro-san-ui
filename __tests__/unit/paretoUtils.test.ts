// Jest test for pareto utils

import {calculateMinMax, niceNum} from "../../components/Run/Pareto/utils"

describe("Pareto utils", () => {
    describe("calculateMinMax", () => {
        it("calculates min and max correctly", () => {
            const result = calculateMinMax(1, 10)
            expect(result.niceMin).toEqual(0)
            expect(result.niceMax).toEqual(11)
            expect(result.tickSpacing).toEqual(1)
        })

        it("handles negative numbers", () => {
            const result = calculateMinMax(-10, 10)
            expect(result.niceMin).toEqual(-12)
            expect(result.niceMax).toEqual(12)
            expect(result.tickSpacing).toEqual(2)
        })

        it("handles maxTicks parameter", () => {
            const result = calculateMinMax(1, 10, 5)
            expect(result.niceMin).toEqual(-2)
            expect(result.niceMax).toEqual(12)
            expect(result.tickSpacing).toEqual(2)
        })

        it("handles large numbers", () => {
            const result = calculateMinMax(12_345, 56_768, 100)
            expect(result.niceMin).toEqual(11_500)
            expect(result.niceMax).toEqual(57_500)
            expect(result.tickSpacing).toEqual(500)
        })

        it("handles small numbers", () => {
            const result = calculateMinMax(0.1234, 0.5678, 10)
            expect(result.niceMin).toBeCloseTo(0.05)
            expect(result.niceMax).toBeCloseTo(0.65)
            expect(result.tickSpacing).toBeCloseTo(0.05)
        })
    })

    describe("niceNum", () => {
        it("returns a nice number", () => {
            expect(niceNum(1.234, true)).toEqual(1)
            expect(niceNum(1.234, false)).toEqual(2)
            expect(niceNum(12.34, true)).toEqual(10)
            expect(niceNum(12.34, false)).toEqual(20)
            expect(niceNum(160.25, false)).toEqual(200)
        })

        it("handles negative numbers", () => {
            expect(niceNum(-1.234, true)).toEqual(-1.234)
            expect(niceNum(-1.234, false)).toEqual(-1.234)
        })
    })
})
