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

import {createTheme, ThemeProvider} from "@mui/material/styles"
import {act, render, screen, waitFor, within} from "@testing-library/react"
import {userEvent, UserEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../../../__tests__/common/TestUtils"
import {ByokDialog} from "../../../../components/Settings/Byok/ByokDialog"
import {getApiKey, useSettingsStore} from "../../../../state/Settings"

// Fading checkmark behavior is covered by FadingCheckmark.test.tsx.
vi.mock("../../../../components/Settings/FadingCheckmark", () => ({
    FadingCheckmark: (): null => null,
    useCheckmarkFade: () => ({show: false, trigger: vi.fn()}),
}))

const TEST_API_KEY = "test-api-key-123"

describe("ByokDialog", () => {
    withStrictMocks()

    let user: UserEvent
    let originalFetch: typeof global.fetch

    beforeEach(() => {
        useSettingsStore.getState().resetSettings()
        user = userEvent.setup()
        originalFetch = global.fetch
    })

    afterEach(() => {
        global.fetch = originalFetch
    })

    it("renders ByokDialog with API key inputs", () => {
        render(<ByokDialog id="test-byok-dialog" />)

        expect(screen.getByText("API Keys")).toBeInTheDocument()
        expect(screen.getByTestId("test-byok-dialog-openai-input")).toBeInTheDocument()
        expect(screen.getByTestId("test-byok-dialog-anthropic-input")).toBeInTheDocument()
    })

    it("allows user to input and save API keys", async () => {
        global.fetch = mockFetch({}, true)

        render(
            <ByokDialog
                id="test-byok-dialog"
                isOpen={true}
            />
        )

        const apiKeyInput = screen.getByTestId("test-byok-dialog-openai-input")
        const inputBox = within(apiKeyInput).getByPlaceholderText("sk-...")

        await user.click(inputBox)
        await user.paste(TEST_API_KEY)

        const saveButton = within(apiKeyInput).getByRole("button", {name: "Save"})
        await user.click(saveButton)

        expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBe(TEST_API_KEY)
    })

    it("triggers onClose directly when closing with no unsaved changes", async () => {
        const onCloseMock = vi.fn()

        render(
            <ByokDialog
                id="test-byok-dialog"
                isOpen={true}
                onClose={onCloseMock}
            />
        )

        const closeButton = screen.getByRole("button", {name: "close"})
        await user.click(closeButton)

        expect(onCloseMock).toHaveBeenCalledTimes(1)
        expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument()
    })

    it("shows unsaved changes modal when closing with unsaved API key changes", async () => {
        const onCloseMock = vi.fn()

        render(
            <ByokDialog
                id="test-byok-dialog"
                isOpen={true}
                onClose={onCloseMock}
            />
        )

        const apiKeyInput = screen.getByTestId("test-byok-dialog-openai-input")
        const inputBox = within(apiKeyInput).getByPlaceholderText("sk-...")

        await user.click(inputBox)
        await user.paste(TEST_API_KEY)

        const closeButton = screen.getByRole("button", {name: "close"})
        await user.click(closeButton)

        expect(onCloseMock).not.toHaveBeenCalled()
        expect(screen.getByText("Unsaved Changes")).toBeInTheDocument()
        expect(
            screen.getByText("You have unsaved edits. Would you like to save your changes, or discard them?")
        ).toBeInTheDocument()
    })

    it("discards unsaved API key changes and closes dialog when Discard changes is clicked", async () => {
        const onCloseMock = vi.fn()

        render(
            <ByokDialog
                id="test-byok-dialog"
                isOpen={true}
                onClose={onCloseMock}
            />
        )

        const apiKeyInput = screen.getByTestId("test-byok-dialog-openai-input")
        const inputBox = within(apiKeyInput).getByPlaceholderText("sk-...")

        await user.click(inputBox)
        await user.paste(TEST_API_KEY)

        const closeButton = screen.getByRole("button", {name: "close"})
        await user.click(closeButton)

        const discardChangesButton = screen.getByRole("button", {name: "Discard changes"})
        await user.click(discardChangesButton)

        expect(onCloseMock).toHaveBeenCalledTimes(1)
        expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBeFalsy()
    })

    it("saves unsaved API key changes and closes dialog when Save changes is clicked", async () => {
        global.fetch = mockFetch({}, true)
        const onCloseMock = vi.fn()

        render(
            <ByokDialog
                id="test-byok-dialog"
                isOpen={true}
                onClose={onCloseMock}
            />
        )

        const apiKeyInput = screen.getByTestId("test-byok-dialog-openai-input")
        const inputBox = within(apiKeyInput).getByPlaceholderText("sk-...")

        await user.click(inputBox)
        await user.paste(TEST_API_KEY)

        const closeButton = screen.getByRole("button", {name: "close"})
        await user.click(closeButton)

        const saveChangesButton = screen.getByRole("button", {name: "Save changes"})
        await user.click(saveChangesButton)

        await waitFor(() => expect(onCloseMock).toHaveBeenCalledTimes(1))
        expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBe(TEST_API_KEY)
    })

    it("filters providers when supportedProviders prop is passed", () => {
        render(
            <ByokDialog
                id="test-byok-dialog"
                isOpen={true}
                supportedProviders={new Set(["Anthropic"])}
            />
        )

        expect(screen.queryByTestId("test-byok-dialog-openai-input")).not.toBeInTheDocument()
        expect(screen.getByTestId("test-byok-dialog-anthropic-input")).toBeInTheDocument()
    })

    it("forgets a saved API key when Forget is clicked and confirmed", async () => {
        global.fetch = mockFetch({}, true)

        render(
            <ByokDialog
                id="test-byok-dialog"
                isOpen={true}
            />
        )

        const apiKeyInput = screen.getByTestId("test-byok-dialog-openai-input")
        const inputBox = within(apiKeyInput).getByPlaceholderText("sk-...")

        await user.click(inputBox)
        await user.paste(TEST_API_KEY)

        const saveButton = within(apiKeyInput).getByRole("button", {name: "Save"})
        await user.click(saveButton)

        expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBe(TEST_API_KEY)

        const forgetButton = within(apiKeyInput).getByRole("button", {name: "Forget"})
        await user.click(forgetButton)

        const confirmButton = screen.getByRole("button", {name: "Yes, forget key"})
        await user.click(confirmButton)

        expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBeFalsy()
    })

    it("displays error banner when key validation fails", async () => {
        global.fetch = mockFetch({error: {message: "Invalid API key"}}, false, 401)

        render(
            <ByokDialog
                id="test-byok-dialog"
                isOpen={true}
            />
        )

        const apiKeyInput = screen.getByTestId("test-byok-dialog-openai-input")
        const inputBox = within(apiKeyInput).getByPlaceholderText("sk-...")

        await user.click(inputBox)
        await user.paste(TEST_API_KEY)

        const testButton = within(apiKeyInput).getByRole("button", {name: "Test"})
        await user.click(testButton)

        expect(screen.getByRole("alert")).toBeInTheDocument()
        expect(screen.getByText("Invalid API key")).toBeInTheDocument()
    })

    it.each(["Save", "Save changes"])("rejects joined keys through %s", async (action) => {
        global.fetch = vi.fn()
        const onClose = vi.fn()
        render(
            <ByokDialog
                id="joined-keys"
                onClose={onClose}
            />
        )
        const row = screen.getByTestId("joined-keys-openai-input")
        await user.click(within(row).getByPlaceholderText("sk-..."))
        await user.paste("sk-proj-firstsk-proj-second")
        if (action === "Save changes") {
            await user.click(screen.getByRole("button", {name: "close"}))
            await user.click(screen.getByRole("button", {name: action}))
        } else {
            await user.click(within(row).getByRole("button", {name: action}))
        }
        expect(await screen.findByText(/multiple API keys pasted together/u)).toBeVisible()
        expect(global.fetch).not.toHaveBeenCalled()
        expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBeFalsy()
        expect(onClose).not.toHaveBeenCalled()
    })

    it.each(["Save", "Save changes"])("retains a saved key when %s validation fails", async (action) => {
        useSettingsStore
            .getState()
            .updateSettings({apiKeys: {OpenAI: {value: "old-key", expiresAt: Date.now() + 60000}}})
        global.fetch = mockFetch({error: {message: "Invalid replacement key"}}, false, 401)
        const onClose = vi.fn()
        render(
            <ByokDialog
                id="invalid-key"
                onClose={onClose}
            />
        )
        const row = screen.getByTestId("invalid-key-openai-input")
        const input = within(row).getByPlaceholderText("sk-...")
        await user.clear(input)
        await user.click(input)
        await user.paste("sk-proj-invalid")
        if (action === "Save changes") {
            await user.click(screen.getByRole("button", {name: "close"}))
            await user.click(screen.getByRole("button", {name: action}))
        } else {
            await user.click(within(row).getByRole("button", {name: action}))
        }
        expect(await screen.findByText("Invalid replacement key")).toBeVisible()
        expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBe("old-key")
        expect(input).toHaveValue("sk-proj-invalid")
        expect(onClose).not.toHaveBeenCalled()
    })

    it("does not save a draft changed while validation is pending", async () => {
        let resolveRequest: (response: Response) => void
        global.fetch = vi.fn(
            () =>
                new Promise<Response>((resolve) => {
                    resolveRequest = resolve
                })
        )
        render(<ByokDialog id="pending-key" />)
        const row = screen.getByTestId("pending-key-openai-input")
        const input = within(row).getByPlaceholderText("sk-...")
        await user.click(input)
        await user.paste("sk-proj-first")
        await user.click(within(row).getByRole("button", {name: "Save"}))
        await user.clear(input)
        await user.click(input)
        await user.paste("sk-proj-second")
        await act(async () => {
            resolveRequest(new Response("{}", {status: 200}))
        })
        await waitFor(() => expect(within(row).getByRole("button", {name: "Save"})).toBeEnabled())
        expect(input).toHaveValue("sk-proj-second")
        expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBeFalsy()
    })

    it.each([
        ["anthropic", "sk-ant-...", "sk-ant-firstsk-ant-second"],
        ["google", "AQ....", "google-example-key"],
    ])("checks %s keys when saving", async (provider, placeholder, key) => {
        global.fetch = mockFetch({}, true)
        render(<ByokDialog id="provider-key" />)
        const row = screen.getByTestId(`provider-key-${provider}-input`)
        await user.click(within(row).getByPlaceholderText(placeholder))
        await user.paste(key)
        await user.click(within(row).getByRole("button", {name: "Save"}))
        if (provider === "anthropic") {
            expect(await screen.findByText(/multiple API keys pasted together/u)).toBeVisible()
            expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "Anthropic")).toBeFalsy()
        } else {
            await waitFor(() => expect(within(row).getByRole("button", {name: "Forget"})).toBeEnabled())
            expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "Google")).toBe(key)
        }
    })

    it("ignores a test result after the user changes the key", async () => {
        let resolveRequest: (response: Response) => void
        global.fetch = vi.fn(
            () =>
                new Promise<Response>((resolve) => {
                    resolveRequest = resolve
                })
        )
        render(<ByokDialog id="stale-test" />)
        const row = screen.getByTestId("stale-test-openai-input")
        const input = within(row).getByPlaceholderText("sk-...")
        await user.click(input)
        await user.paste("sk-proj-first")
        await user.click(within(row).getByRole("button", {name: "Test"}))
        await user.clear(input)
        await user.click(input)
        await user.paste("sk-proj-second")
        await act(async () => {
            resolveRequest(Response.json({error: {message: "Old key rejected"}}, {status: 401}))
        })
        await waitFor(() => expect(within(row).getByRole("button", {name: "Test"})).toBeEnabled())
        expect(screen.queryByText("Old key rejected")).not.toBeInTheDocument()
        expect(input).toHaveValue("sk-proj-second")
    })

    it("does not repeat a pending save when closing and saving changes", async () => {
        let resolveRequest: (response: Response) => void
        global.fetch = vi.fn(
            () =>
                new Promise<Response>((resolve) => {
                    resolveRequest = resolve
                })
        )
        const onClose = vi.fn()
        render(
            <ByokDialog
                id="duplicate-save"
                onClose={onClose}
            />
        )
        const row = screen.getByTestId("duplicate-save-openai-input")
        await user.click(within(row).getByPlaceholderText("sk-..."))
        await user.paste("sk-proj-example")
        await user.click(within(row).getByRole("button", {name: "Save"}))
        await user.click(screen.getByRole("button", {name: "close"}))
        await user.click(screen.getByRole("button", {name: "Save changes"}))
        expect(global.fetch).toHaveBeenCalledTimes(1)
        expect(onClose).not.toHaveBeenCalled()
        await act(async () => {
            resolveRequest(new Response("{}", {status: 200}))
        })
        await waitFor(() => expect(within(row).getByRole("button", {name: "Forget"})).toBeEnabled())
        expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBe("sk-proj-example")
    })

    it("renders dark mode logo when theme mode is dark", () => {
        const darkTheme = createTheme({palette: {mode: "dark"}})
        render(
            <ThemeProvider theme={darkTheme}>
                <ByokDialog id="test-byok-dark-dialog" />
            </ThemeProvider>
        )

        const apiKeyInput = screen.getByTestId("test-byok-dark-dialog-openai-input")
        expect(within(apiKeyInput).getByRole("img")).toHaveAttribute("src", "/OpenAI-white.png")
    })
})
