/**
 * Plasma Edge Visibility – E2E Test
 *
 * This test validates that ReactFlow handle elements maintain their layout
 * position during "zen mode" (isAwaitingLlm).  The bug fixed by PR #228
 * caused plasma edges to disappear because AgentNode handles used
 * `display: none` instead of `visibility: hidden`, which removed them from
 * layout and broke ReactFlow's edge routing (edges collapsed to the origin).
 *
 * JSDOM-based unit tests can't catch this because they lack a real layout
 * engine — getBoundingClientRect() always returns zeros.  A browser-level
 * test is required to verify that handles retain their dimensions.
 *
 * Prerequisites:
 *   1. The app is running (default http://localhost:3000, override with BASE_URL env).
 *   2. A neuro-san backend is available with at least one agent network.
 */

import {expect, test, type Page} from "@playwright/test"

const MULTI_AGENT_PATH = "/multiAgentAccelerator"

// Fake NextAuth session to bypass Auth0 redirect.
const FAKE_SESSION = {
    user: {
        name: "E2E Test User",
        email: "e2e@test.local",
        image: "",
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockAuthentication = async (page: Page) => {
    await page.route("**/api/auth/session", (route) =>
        route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(FAKE_SESSION),
        })
    )
    await page.route("**/api/auth/csrf", (route) =>
        route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({csrfToken: "e2e-fake-csrf-token"}),
        })
    )
    await page.route("**/api/auth/providers", (route) =>
        route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                auth0: {
                    id: "auth0",
                    name: "Auth0",
                    type: "oauth",
                    signinUrl: "/api/auth/signin/auth0",
                    callbackUrl: "/api/auth/callback/auth0",
                },
            }),
        })
    )
}

/**
 * Select the first available agent network from the sidebar tree view.
 */
const selectFirstNetwork = async (page: Page) => {
    await expect(page.getByText("Agent Networks")).toBeVisible({timeout: 15_000})

    const tree = page.getByRole("tree")
    const firstCategory = tree.getByRole("treeitem").first()
    await firstCategory.click()

    const nestedGroup = firstCategory.locator('[role="group"]')
    await expect(nestedGroup).toBeVisible({timeout: 5_000})

    const firstLeaf = nestedGroup.getByRole("treeitem").first()
    await firstLeaf.click()

    await expect(page.locator(".react-flow__node").first()).toBeVisible({timeout: 15_000})
}

/**
 * Send a chat message and wait for zen mode to activate.
 * Zen mode hides the legend and disables layout controls.
 */
const sendMessageAndEnterZenMode = async (page: Page) => {
    const chatInput = page.locator("#user-input")
    await chatInput.fill("Hello")

    const sendButton = page.locator("#submit-query-button")
    await sendButton.click()

    // Zen mode hides the legend — wait for it to disappear
    await expect(page.locator('[id$="-legend"]')).toBeHidden({timeout: 30_000})
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe("PR #228 regression: handle visibility in zen mode", () => {
    test.beforeEach(async ({page}) => {
        await mockAuthentication(page)
        await page.goto(MULTI_AGENT_PATH)
        await page.waitForSelector("#multi-agent-accelerator-agent-flow-outer-box", {
            state: "visible",
            timeout: 30_000,
        })
    })

    test("handles use visibility:hidden, not display:none, in zen mode", async ({page}) => {
        // This is the surgical regression test for the exact root cause of PR #228.
        // `display: none` removes elements from layout, which breaks ReactFlow's
        // edge routing because handle positions become (0,0).
        // `visibility: hidden` preserves layout while hiding the handle visually.
        await selectFirstNetwork(page)
        await sendMessageAndEnterZenMode(page)

        const handles = page.locator(".react-flow__handle")
        const handleCount = await handles.count()
        expect(handleCount).toBeGreaterThan(0)

        for (let i = 0; i < handleCount; i++) {
            const handle = handles.nth(i)

            const display = await handle.evaluate((el) => window.getComputedStyle(el).display)
            expect(display, `Handle ${i} uses display:none – breaks ReactFlow edge routing`).not.toBe("none")

            const visibility = await handle.evaluate((el) => window.getComputedStyle(el).visibility)
            expect(["visible", "hidden"]).toContain(visibility)
        }
    })

    test("handles maintain non-zero layout dimensions in zen mode", async ({page}) => {
        // This test validates the MECHANISM by which display:none breaks edge routing.
        // With display:none, getBoundingClientRect() returns 0×0 because the element is
        // removed from layout entirely.  With visibility:hidden, getBoundingClientRect()
        // returns actual dimensions because the element still occupies space.
        //
        // ReactFlow uses handle positions from getBoundingClientRect to compute edge
        // paths.  When handles have zero dimensions, edges collapse to (0,0) and
        // plasma edges disappear or render as invisible degenerate shapes.
        //
        // This test CANNOT be replicated in JSDOM because getBoundingClientRect()
        // always returns zeros there regardless of CSS — a real browser is required.
        await selectFirstNetwork(page)
        await sendMessageAndEnterZenMode(page)

        const handles = page.locator(".react-flow__handle")
        const handleCount = await handles.count()
        expect(handleCount).toBeGreaterThan(0)

        for (let i = 0; i < handleCount; i++) {
            const handle = handles.nth(i)

            const rect = await handle.evaluate((el) => {
                const r = el.getBoundingClientRect()
                return {width: r.width, height: r.height}
            })

            expect(
                rect.width,
                `Handle ${i} has zero width – removed from layout (display:none bug)`
            ).toBeGreaterThan(0)
            expect(
                rect.height,
                `Handle ${i} has zero height – removed from layout (display:none bug)`
            ).toBeGreaterThan(0)
        }
    })
})
