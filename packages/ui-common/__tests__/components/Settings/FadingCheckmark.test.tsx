import {act, render, renderHook, screen} from "@testing-library/react"
// eslint-disable-next-line no-shadow
import {describe, expect, it, vi} from "vitest"

import {withStrictMocks} from "../../../../../__tests__/common/vitest/strictMocks"
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
        vi.useFakeTimers()
        const {result} = renderHook(() => useCheckmarkFade())

        act(() => {
            result.current.trigger()
        })

        act(() => {
            vi.advanceTimersByTime(1500)
        })

        expect(result.current.show).toBe(false)
    })

    it("clears timeout on unmount", () => {
        vi.useFakeTimers()
        const {result, unmount} = renderHook(() => useCheckmarkFade())

        act(() => {
            result.current.trigger()
        })

        unmount()

        expect(vi.getTimerCount()).toBe(0)
    })

    it("allows multiple invocations (idempotency)", () => {
        vi.useFakeTimers()
        const {result} = renderHook(() => useCheckmarkFade())

        act(() => {
            result.current.trigger()
            result.current.trigger()
        })

        // Assert show is still true after both triggers
        expect(result.current.show).toBe(true)

        // Assert only one timer exists (first was cleared)
        expect(vi.getTimerCount()).toBe(1)

        // Advance time partway through duration (shouldn't hide yet)
        act(() => {
            vi.advanceTimersByTime(1000)
        })
        expect(result.current.show).toBe(true)

        // Advance time to complete the second trigger's duration
        act(() => {
            vi.advanceTimersByTime(500)
        })
        expect(result.current.show).toBe(false)

        // All timers should be cleared
        expect(vi.getTimerCount()).toBe(0)
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
