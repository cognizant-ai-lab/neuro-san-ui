/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import {act, render, screen, within} from "@testing-library/react"
import {userEvent, UserEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {getSectionAnchorId, SettingsNavLayout} from "../../../components/Settings/SettingsNav"

const ID = "test-settings"

const SECTIONS = [
    {key: "one", label: "Section One", content: <p>First content</p>},
    {key: "two", label: "Section Two", content: <p>Second content</p>},
    {key: "three", label: "Section Three", content: <p>Third content</p>},
]

// Minimal controllable IntersectionObserver stand-in (jsdom doesn't provide one)
class MockIntersectionObserver {
    static instances: MockIntersectionObserver[] = []

    readonly observed: Element[] = []

    readonly disconnect = vi.fn()

    readonly unobserve = vi.fn()

    readonly takeRecords = vi.fn(() => [])

    readonly callback: IntersectionObserverCallback

    readonly options?: IntersectionObserverInit

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        this.callback = callback
        this.options = options
        MockIntersectionObserver.instances.push(this)
    }

    observe(element: Element) {
        this.observed.push(element)
    }

    // Report the given anchor ids as intersecting (and every other observed element as not)
    fire(intersectingIds: string[]) {
        const entries = this.observed.map(
            (target) => ({target, isIntersecting: intersectingIds.includes(target.id)}) as IntersectionObserverEntry
        )
        this.callback(entries, this as unknown as IntersectionObserver)
    }
}

// motion's whileInView also creates observers; the scrollspy one is identified by its root and margin
const isScrollSpy = (instance: MockIntersectionObserver, scrollColumn: HTMLElement) =>
    instance.options?.root === scrollColumn && instance.options?.rootMargin === "0px 0px -60% 0px"

const renderNav = () =>
    render(
        <SettingsNavLayout
            id={ID}
            sections={SECTIONS}
            after={<button type="button">After button</button>}
        />
    )

describe("SettingsNavLayout", () => {
    withStrictMocks()

    let user: UserEvent
    const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView

    beforeEach(() => {
        user = userEvent.setup({delay: null})
        window.HTMLElement.prototype.scrollIntoView = vi.fn()
    })

    afterEach(() => {
        window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView
        vi.unstubAllGlobals()
        MockIntersectionObserver.instances = []
    })

    it("renders one nav button per section, with the first one current", () => {
        renderNav()

        const nav = screen.getByRole("navigation", {name: "Settings sections"})
        const buttons = within(nav).getAllByRole("button")
        expect(buttons.map((button) => button.textContent)).toEqual(SECTIONS.map((section) => section.label))

        expect(buttons[0]).toHaveAttribute("aria-current", "location")
        expect(buttons[1]).not.toHaveAttribute("aria-current")
        expect(buttons[0]).toHaveAttribute("aria-controls", getSectionAnchorId(ID, "one"))

        // Section content and trailing content are rendered in the scroll column
        SECTIONS.forEach((section) => {
            expect(screen.getByRole("region", {name: section.label})).toHaveAttribute(
                "id",
                getSectionAnchorId(ID, section.key)
            )
        })
        expect(screen.getByRole("button", {name: "After button"})).toBeInTheDocument()
    })

    it("scrolls to the section and marks it current when a nav item is clicked", async () => {
        renderNav()

        const navButton = screen.getByRole("button", {name: "Section Three"})
        await user.click(navButton)

        const target = document.getElementById(getSectionAnchorId(ID, "three"))
        expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1)
        expect(vi.mocked(window.HTMLElement.prototype.scrollIntoView).mock.contexts[0]).toBe(target)
        expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith(
            expect.objectContaining({block: "start"})
        )
        expect(navButton).toHaveAttribute("aria-current", "location")
        expect(screen.getByRole("button", {name: "Section One"})).not.toHaveAttribute("aria-current")
        expect(target).toHaveFocus()
    })

    it("is keyboard accessible", async () => {
        renderNav()

        await user.tab()
        expect(screen.getByRole("button", {name: "Section One"})).toHaveFocus()
        await user.tab()
        const secondButton = screen.getByRole("button", {name: "Section Two"})
        expect(secondButton).toHaveFocus()

        await user.keyboard("{Enter}")
        expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1)
        expect(secondButton).toHaveAttribute("aria-current", "location")
    })

    it("does not crash without IntersectionObserver (jsdom)", () => {
        expect(typeof globalThis.IntersectionObserver).toBe("undefined")
        renderNav()
        expect(screen.getByRole("button", {name: "Section One"})).toHaveAttribute("aria-current", "location")
    })

    it("highlights the section currently in view (scrollspy)", () => {
        vi.stubGlobal("IntersectionObserver", MockIntersectionObserver)
        renderNav()

        // The scrollspy observer is rooted at the scroll column and watches every section anchor
        const scrollColumn = document.getElementById(`${ID}-sections`)
        const spy = MockIntersectionObserver.instances.find((instance) => isScrollSpy(instance, scrollColumn))
        expect(spy).toBeDefined()
        expect(spy.observed.map((element) => element.id)).toEqual(
            SECTIONS.map((section) => getSectionAnchorId(ID, section.key))
        )

        act(() => spy.fire([getSectionAnchorId(ID, "two"), getSectionAnchorId(ID, "three")]))
        expect(screen.getByRole("button", {name: "Section Two"})).toHaveAttribute("aria-current", "location")
        expect(screen.getByRole("button", {name: "Section One"})).not.toHaveAttribute("aria-current")

        act(() => spy.fire([getSectionAnchorId(ID, "three")]))
        expect(screen.getByRole("button", {name: "Section Three"})).toHaveAttribute("aria-current", "location")

        // Nothing in view: keep the last active section
        act(() => spy.fire([]))
        expect(screen.getByRole("button", {name: "Section Three"})).toHaveAttribute("aria-current", "location")
    })

    it("selects the last section when scrolled to the bottom", () => {
        vi.stubGlobal("IntersectionObserver", MockIntersectionObserver)
        renderNav()

        const scrollColumn = document.getElementById(`${ID}-sections`)
        Object.defineProperty(scrollColumn, "scrollHeight", {configurable: true, value: 1000})
        Object.defineProperty(scrollColumn, "clientHeight", {configurable: true, value: 400})
        scrollColumn.scrollTop = 600

        act(() => {
            scrollColumn.dispatchEvent(new Event("scroll"))
        })
        expect(screen.getByRole("button", {name: "Section Three"})).toHaveAttribute("aria-current", "location")
    })

    it("ignores scrollspy updates while a nav click is scrolling", async () => {
        vi.stubGlobal("IntersectionObserver", MockIntersectionObserver)
        renderNav()

        const scrollColumn = document.getElementById(`${ID}-sections`)
        const spy = MockIntersectionObserver.instances.find((instance) => isScrollSpy(instance, scrollColumn))

        await user.click(screen.getByRole("button", {name: "Section Three"}))
        act(() => spy.fire([getSectionAnchorId(ID, "two")]))
        expect(screen.getByRole("button", {name: "Section Three"})).toHaveAttribute("aria-current", "location")
    })

    it("disconnects the observer on unmount", () => {
        vi.stubGlobal("IntersectionObserver", MockIntersectionObserver)
        const {unmount} = renderNav()
        const scrollColumn = document.getElementById(`${ID}-sections`)
        const spy = MockIntersectionObserver.instances.find((instance) => isScrollSpy(instance, scrollColumn))

        unmount()
        expect(spy.disconnect).toHaveBeenCalled()
    })
})
