import {render, renderHook, screen} from "@testing-library/react"
import {act} from "react"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {FadingCheckmark, useCheckmarkFade} from "../../../components/Settings/FadingCheckmark"

describe("useCheckmarkFade", () => {
    withStrictMocks()
    it("shows the checkmark when trigger is called", () => {
        const {result} = renderHook(() => useCheckmarkFade())

        act(() => {
            result.current.trigger()
        })

        expect(result.current.show).toBe(true)
    })

    it("hides the checkmark after the fade duration", () => {
        jest.useFakeTimers()
        const {result} = renderHook(() => useCheckmarkFade())

        act(() => {
            result.current.trigger()
        })

        act(() => {
            jest.advanceTimersByTime(1500)
        })

        expect(result.current.show).toBe(false)
        jest.useRealTimers()
    })

    it("clears timeout on unmount", () => {
        jest.useFakeTimers()
        const {result, unmount} = renderHook(() => useCheckmarkFade())

        act(() => {
            result.current.trigger()
        })

        unmount()

        expect(jest.getTimerCount()).toBe(0)
        jest.useRealTimers()
    })

    it("allows multiple invocations (idempotency)", () => {
        jest.useFakeTimers()
        const {result} = renderHook(() => useCheckmarkFade())

        act(() => {
            result.current.trigger()
            result.current.trigger()
        })

        // Assert show is still true after both triggers
        expect(result.current.show).toBe(true)

        // Assert only one timer exists (first was cleared)
        expect(jest.getTimerCount()).toBe(1)

        // Advance time partway through duration (shouldn't hide yet)
        act(() => {
            jest.advanceTimersByTime(1000)
        })
        expect(result.current.show).toBe(true)

        // Advance time to complete the second trigger's duration
        act(() => {
            jest.advanceTimersByTime(500)
        })
        expect(result.current.show).toBe(false)

        // All timers should be cleared
        expect(jest.getTimerCount()).toBe(0)
        jest.useRealTimers()
    })
})

describe("FadingCheckmark", () => {
    withStrictMocks()
    it("renders with full opacity when show is true", () => {
        render(<FadingCheckmark show={true} />)
        const checkmark = screen.getByTestId("CheckIcon")
        expect(checkmark.parentElement).toHaveStyle("opacity: 1")
    })

    it("renders with zero opacity when show is false", () => {
        render(<FadingCheckmark show={false} />)
        const checkmark = screen.getByTestId("CheckIcon")
        expect(checkmark.parentElement).toHaveStyle("opacity: 0")
    })
})
