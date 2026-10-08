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

import {render, screen, within} from "@testing-library/react"
import {userEvent, UserEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../../__tests__/common/TestUtils"
import {ByokDialog} from "../../../components/Settings/ByokDialog"
import {getApiKey, useSettingsStore} from "../../../state/Settings"

// Fading checkmark behavior is covered by FadingCheckmark.test.tsx.
vi.mock("../../../components/Settings/FadingCheckmark", () => ({
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
        useSettingsStore.persist.clearStorage()

        user = userEvent.setup({delay: null})
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
        expect(saveButton).toBeEnabled()
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

        const closeButton = await screen.findByLabelText("close")
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

        const closeButton = await screen.findByLabelText("close")
        await user.click(closeButton)

        expect(onCloseMock).not.toHaveBeenCalled()
        expect(screen.getByText("Unsaved Changes")).toBeInTheDocument()
        expect(
            screen.getByText(
                "You have unsaved edits. Are you sure you want to discard your changes and close the dialog?"
            )
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

        const closeButton = await screen.findByLabelText("close")
        await user.click(closeButton)

        const discardButton = screen.getByRole("button", {name: "Discard changes"})
        await user.click(discardButton)

        expect(onCloseMock).toHaveBeenCalledTimes(1)
        expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBeFalsy()
    })

    it("saves unsaved API key changes and closes dialog when Save changes is clicked", async () => {
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

        const closeButton = await screen.findByLabelText("close")
        await user.click(closeButton)

        const saveChangesButton = screen.getByRole("button", {name: "Save changes"})
        await user.click(saveChangesButton)

        expect(onCloseMock).toHaveBeenCalledTimes(1)
        expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBe(TEST_API_KEY)
    })

    it("filters providers when supportedProviders prop is passed", () => {
        render(
            <ByokDialog
                id="test-byok-dialog"
                isOpen={true}
                supportedProviders={["Anthropic"]}
            />
        )

        expect(screen.queryByTestId("test-byok-dialog-openai-input")).not.toBeInTheDocument()
        expect(screen.getByTestId("test-byok-dialog-anthropic-input")).toBeInTheDocument()
    })

    it("filters providers when supportedProviders is a Set", () => {
        render(
            <ByokDialog
                id="test-byok-dialog"
                isOpen={true}
                supportedProviders={new Set(["OpenAI"])}
            />
        )

        expect(screen.getByTestId("test-byok-dialog-openai-input")).toBeInTheDocument()
        expect(screen.queryByTestId("test-byok-dialog-anthropic-input")).not.toBeInTheDocument()
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
})
