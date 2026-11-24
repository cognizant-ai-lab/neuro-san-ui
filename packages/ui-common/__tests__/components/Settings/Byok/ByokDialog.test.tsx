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

import {createTheme, ThemeProvider, useColorScheme} from "@mui/material/styles"
import {act, render, screen, waitFor, within} from "@testing-library/react"
import {userEvent, UserEvent} from "@testing-library/user-event"
import {JSX as ReactJSX, useState} from "react"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {mockFetch} from "../../../../../../__tests__/common/TestUtils"
import {ByokDialog} from "../../../../components/Settings/Byok/ByokDialog"
import {getApiKey, LLMProvider, useSettingsStore} from "../../../../state/Settings"

// Fading checkmark behavior is covered by FadingCheckmark.test.tsx.
vi.mock("../../../../components/Settings/FadingCheckmark", () => ({
    FadingCheckmark: (): null => null,
    useCheckmarkFade: () => ({show: false, trigger: vi.fn()}),
}))

const TEST_API_KEY = "test-api-key-123"
const ROUTER_ENDPOINT = "https://router.example.com/v1"

const ByokThemeControls = (): ReactJSX.Element => {
    const {mode, setMode} = useColorScheme()
    const [isOpen, setIsOpen] = useState<boolean>(false)
    return (
        <>
            <button
                type="button"
                onClick={() => setMode(mode === "dark" ? "light" : "dark")}
            >
                Toggle theme
            </button>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
            >
                Open API keys
            </button>
            <ByokDialog
                id="test-byok-theme-dialog"
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    )
}

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

    describe("LLM Router", () => {
        const ROUTER_KEY = "router-key"
        const getRouterRow = () => screen.getByTestId("test-byok-dialog-llm-router-input")

        const addRouterUrl = async () => {
            const addButton = within(getRouterRow()).getByRole("button", {name: "Add LLM Router base URL"})
            await user.click(addButton)
            return within(getRouterRow()).getByRole("textbox", {name: "LLM Router base URL"})
        }

        const enterRouter = async (key: string, url: string) => {
            const routerRow = getRouterRow()
            const keyInput = within(routerRow).getByPlaceholderText("sk-...")

            await user.click(keyInput)
            await user.paste(key)
            const urlInput = await addRouterUrl()
            await user.click(urlInput)
            await user.paste(url)
        }

        const saveRouter = async (key: string, url: string) => {
            await enterRouter(key, url)
            const saveButton = within(getRouterRow()).getByRole("button", {name: "Save"})
            await user.click(saveButton)
        }

        const editRouterUrl = async () => {
            const editButton = within(getRouterRow()).getByRole("button", {name: "Edit LLM Router base URL"})
            await user.click(editButton)
        }

        const storeKey = (provider: LLMProvider) =>
            useSettingsStore.getState().updateSettings({
                ...(provider === "LLM Router" && {apiEndpoints: {"LLM Router": ROUTER_ENDPOINT}}),
                apiKeys: {[provider]: {value: TEST_API_KEY, expiresAt: Date.now() + 60000}},
            })

        it("tests the router key against its URL and saves both", async () => {
            global.fetch = mockFetch({}, true)
            render(<ByokDialog id="test-byok-dialog" />)

            await saveRouter(ROUTER_KEY, ROUTER_ENDPOINT)

            expect(global.fetch).toHaveBeenCalledWith(`${ROUTER_ENDPOINT}/models`, expect.anything())
            const {settings} = useSettingsStore.getState()
            expect(getApiKey(settings.apiKeys, "LLM Router")).toBe(ROUTER_KEY)
            expect(settings.apiEndpoints["LLM Router"]).toBe(ROUTER_ENDPOINT)
        })

        it("drops trailing slashes from the router URL when leaving the field", async () => {
            global.fetch = mockFetch({}, true)
            render(<ByokDialog id="test-byok-dialog" />)

            await saveRouter(ROUTER_KEY, `  ${ROUTER_ENDPOINT}//`)

            within(getRouterRow()).getByText(ROUTER_ENDPOINT)
            expect(useSettingsStore.getState().settings.apiEndpoints["LLM Router"]).toBe(ROUTER_ENDPOINT)
        })

        it("won't test or save a router key without its URL", async () => {
            render(<ByokDialog id="test-byok-dialog" />)
            const routerRow = getRouterRow()
            const keyInput = within(routerRow).getByPlaceholderText("sk-...")

            await user.click(keyInput)
            await user.paste(ROUTER_KEY)

            expect(within(routerRow).getByRole("button", {name: "Test"})).toBeDisabled()
            expect(within(routerRow).getByRole("button", {name: "Save"})).toBeDisabled()
        })

        it("won't save a saved router key once its URL is cleared", async () => {
            storeKey("LLM Router")
            render(<ByokDialog id="test-byok-dialog" />)
            await editRouterUrl()
            const routerRow = getRouterRow()
            const clearButton = within(routerRow).getByRole("button", {name: "Clear LLM Router base URL"})

            await user.click(clearButton)

            expect(within(routerRow).getByRole("textbox", {name: "LLM Router base URL"})).toHaveValue("")
            expect(within(routerRow).getByRole("button", {name: "Save"})).toBeDisabled()
        })

        it("saves neither the router key nor its URL when the key fails its test", async () => {
            global.fetch = mockFetch({error: {message: "Invalid API key"}}, false, 401)
            render(<ByokDialog id="test-byok-dialog" />)

            await saveRouter(ROUTER_KEY, ROUTER_ENDPOINT)

            const {settings} = useSettingsStore.getState()
            expect(getApiKey(settings.apiKeys, "LLM Router")).toBeFalsy()
            expect(settings.apiEndpoints["LLM Router"]).toBeUndefined()
            expect(screen.getByRole("textbox", {name: "LLM Router base URL"})).toHaveValue(ROUTER_ENDPOINT)
        })

        it("lets the user save a new URL for a saved router key", async () => {
            const NEW_ENDPOINT = "https://other-router.example.com/v1"
            global.fetch = mockFetch({}, true)
            storeKey("LLM Router")
            render(<ByokDialog id="test-byok-dialog" />)
            await editRouterUrl()
            const routerRow = getRouterRow()
            const clearButton = within(routerRow).getByRole("button", {name: "Clear LLM Router base URL"})
            const urlInput = within(routerRow).getByRole("textbox", {name: "LLM Router base URL"})
            const saveButton = within(routerRow).getByRole("button", {name: "Save"})
            expect(saveButton).toBeDisabled()

            await user.click(clearButton)
            await user.click(urlInput)
            await user.paste(NEW_ENDPOINT)
            await user.click(saveButton)

            expect(global.fetch).toHaveBeenCalledWith(`${NEW_ENDPOINT}/models`, expect.anything())
            expect(useSettingsStore.getState().settings.apiEndpoints["LLM Router"]).toBe(NEW_ENDPOINT)
        })

        it("asks about unsaved changes when only the router URL changed", async () => {
            const onCloseMock = vi.fn()
            storeKey("LLM Router")
            render(
                <ByokDialog
                    id="test-byok-dialog"
                    onClose={onCloseMock}
                />
            )
            await editRouterUrl()
            const urlInput = screen.getByRole("textbox", {name: "LLM Router base URL"})
            const closeButton = screen.getByRole("button", {name: "close"})

            await user.click(urlInput)
            await user.paste("/extra")
            await user.click(closeButton)

            expect(onCloseMock).not.toHaveBeenCalled()
            screen.getByText("Unsaved Changes")
        })

        it("saves a changed router URL from the unsaved changes prompt and closes", async () => {
            const NEW_ENDPOINT = "https://other-router.example.com/v1"
            global.fetch = mockFetch({}, true)
            const onCloseMock = vi.fn()
            storeKey("LLM Router")
            render(
                <ByokDialog
                    id="test-byok-dialog"
                    onClose={onCloseMock}
                />
            )
            await editRouterUrl()
            const routerRow = getRouterRow()
            const clearButton = within(routerRow).getByRole("button", {name: "Clear LLM Router base URL"})
            const urlInput = within(routerRow).getByRole("textbox", {name: "LLM Router base URL"})
            const closeButton = screen.getByRole("button", {name: "close"})

            await user.click(clearButton)
            await user.click(urlInput)
            await user.paste(NEW_ENDPOINT)
            await user.click(closeButton)
            const saveChangesButton = screen.getByRole("button", {name: "Save changes"})
            await user.click(saveChangesButton)

            await waitFor(() => expect(onCloseMock).toHaveBeenCalledTimes(1))
            expect(useSettingsStore.getState().settings.apiEndpoints["LLM Router"]).toBe(NEW_ENDPOINT)
        })

        it("shows a saved router URL as a summary line until Edit is clicked", async () => {
            storeKey("LLM Router")
            render(<ByokDialog id="test-byok-dialog" />)
            const routerRow = getRouterRow()
            within(routerRow).getByText(ROUTER_ENDPOINT)
            within(routerRow).getByTitle("Saved")
            expect(within(routerRow).queryByRole("textbox", {name: "LLM Router base URL"})).not.toBeInTheDocument()

            await editRouterUrl()

            expect(within(routerRow).getByRole("textbox", {name: "LLM Router base URL"})).toHaveValue(ROUTER_ENDPOINT)
        })

        it("goes back to the summary line with the edited URL, not yet saved, when Done is clicked", async () => {
            const NEW_ENDPOINT = "https://other-router.example.com/v1"
            storeKey("LLM Router")
            render(<ByokDialog id="test-byok-dialog" />)
            await editRouterUrl()
            const routerRow = getRouterRow()
            const clearButton = within(routerRow).getByRole("button", {name: "Clear LLM Router base URL"})
            const urlInput = within(routerRow).getByRole("textbox", {name: "LLM Router base URL"})
            const doneButton = within(routerRow).getByRole("button", {name: "Done"})

            await user.click(clearButton)
            await user.click(urlInput)
            await user.paste(NEW_ENDPOINT)
            await user.click(doneButton)

            within(routerRow).getByText(NEW_ENDPOINT)
            expect(within(routerRow).queryByTitle("Saved")).not.toBeInTheDocument()
            expect(within(routerRow).getByRole("button", {name: "Save"})).toBeEnabled()
        })

        it("shows Not set with an Add button until a router URL is added", async () => {
            render(<ByokDialog id="test-byok-dialog" />)
            const routerRow = getRouterRow()
            within(routerRow).getByText("Not set")
            expect(within(routerRow).queryByRole("textbox", {name: "LLM Router base URL"})).not.toBeInTheDocument()
            expect(within(routerRow).queryByTitle("Saved")).not.toBeInTheDocument()

            await addRouterUrl()
            const doneButton = within(routerRow).getByRole("button", {name: "Done"})
            await user.click(doneButton)

            within(routerRow).getByText("Not set")
        })

        it.each([
            {
                case: "a new router key has no URL",
                setup: async () => {
                    const keyInput = within(getRouterRow()).getByPlaceholderText("sk-...")
                    await user.click(keyInput)
                    await user.paste(ROUTER_KEY)
                },
                savedKey: undefined,
                savedEndpoint: undefined,
            },
            {
                case: "a saved router's URL is cleared",
                setup: async () => {
                    await editRouterUrl()
                    const clearButton = within(getRouterRow()).getByRole("button", {name: "Clear LLM Router base URL"})
                    await user.click(clearButton)
                },
                savedKey: TEST_API_KEY,
                savedEndpoint: ROUTER_ENDPOINT,
            },
        ])(
            "won't test or save from the unsaved changes prompt when $case",
            async ({setup, savedKey, savedEndpoint}) => {
                global.fetch = mockFetch({}, true)
                const onCloseMock = vi.fn()
                if (savedKey) {
                    storeKey("LLM Router")
                }
                render(
                    <ByokDialog
                        id="test-byok-dialog"
                        onClose={onCloseMock}
                    />
                )
                const closeButton = screen.getByRole("button", {name: "close"})

                await setup()
                await user.click(closeButton)
                const saveChangesButton = screen.getByRole("button", {name: "Save changes"})
                await user.click(saveChangesButton)

                expect(global.fetch).not.toHaveBeenCalled()
                const {settings} = useSettingsStore.getState()
                expect(getApiKey(settings.apiKeys, "LLM Router")).toBe(savedKey)
                expect(settings.apiEndpoints["LLM Router"]).toBe(savedEndpoint)
                expect(onCloseMock).not.toHaveBeenCalled()
            }
        )

        it("closes without asking when a router URL is typed with no key", async () => {
            const onCloseMock = vi.fn()
            render(
                <ByokDialog
                    id="test-byok-dialog"
                    onClose={onCloseMock}
                />
            )
            const closeButton = screen.getByRole("button", {name: "close"})

            const urlInput = await addRouterUrl()
            await user.click(urlInput)
            await user.paste(ROUTER_ENDPOINT)
            await user.click(closeButton)

            expect(onCloseMock).toHaveBeenCalledTimes(1)
        })

        it("closes after saving another key from the prompt when no LLM router is saved", async () => {
            global.fetch = mockFetch({}, true)
            const onCloseMock = vi.fn()
            storeKey("OpenAI")
            render(
                <ByokDialog
                    id="test-byok-dialog"
                    onClose={onCloseMock}
                />
            )
            const anthropicKeyInput = screen.getByPlaceholderText("sk-ant-...")
            const closeButton = screen.getByRole("button", {name: "close"})

            await user.click(anthropicKeyInput)
            await user.paste("anthropic-key")
            await user.click(closeButton)
            const saveChangesButton = screen.getByRole("button", {name: "Save changes"})
            await user.click(saveChangesButton)

            await waitFor(() => expect(onCloseMock).toHaveBeenCalledTimes(1))
            expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "Anthropic")).toBe("anthropic-key")
        })

        it("explains that the router uses the OpenAI API format and can't be used with an OpenAI key", async () => {
            render(<ByokDialog id="test-byok-dialog" />)
            await addRouterUrl()

            expect(
                within(getRouterRow()).getByText(/uses the OpenAI API format.*can't be used with an OpenAI key/u)
            ).toBeVisible()
        })

        it.each([
            {saved: "OpenAI", entered: "LLM Router", rowTestId: "test-byok-dialog-llm-router-input"},
            {saved: "LLM Router", entered: "OpenAI", rowTestId: "test-byok-dialog-openai-input"},
        ] as const)("won't save an $entered key while an $saved key is saved", async ({saved, entered, rowTestId}) => {
            storeKey(saved)
            render(<ByokDialog id="test-byok-dialog" />)
            const row = screen.getByTestId(rowTestId)
            const keyInput = within(row).getByPlaceholderText("sk-...")
            expect(within(row).queryByRole("alert")).not.toBeInTheDocument()

            await user.click(keyInput)
            await user.paste(ROUTER_KEY)
            if (entered === "LLM Router") {
                const urlInput = await addRouterUrl()
                await user.click(urlInput)
                await user.paste(ROUTER_ENDPOINT)
            }

            expect(within(row).getByRole("alert")).toHaveTextContent(
                `You can't save both ${entered} and ${saved} keys. Forget the ${saved} key first.`
            )
            expect(within(row).getByRole("button", {name: "Save"})).toBeDisabled()
        })

        it("saves only one of an OpenAI key and an LLM router entered together", async () => {
            global.fetch = mockFetch({}, true)
            const onCloseMock = vi.fn()
            render(
                <ByokDialog
                    id="test-byok-dialog"
                    onClose={onCloseMock}
                />
            )
            const openAIKeyInput = within(screen.getByTestId("test-byok-dialog-openai-input")).getByPlaceholderText(
                "sk-..."
            )
            const closeButton = screen.getByRole("button", {name: "close"})

            await user.click(openAIKeyInput)
            await user.paste(TEST_API_KEY)
            await enterRouter(ROUTER_KEY, ROUTER_ENDPOINT)
            await user.click(closeButton)
            const saveChangesButton = screen.getByRole("button", {name: "Save changes"})
            await user.click(saveChangesButton)

            await waitFor(() => {
                const {apiKeys} = useSettingsStore.getState().settings
                expect([getApiKey(apiKeys, "OpenAI"), getApiKey(apiKeys, "LLM Router")].filter(Boolean)).toHaveLength(1)
            })
            expect(onCloseMock).not.toHaveBeenCalled()
        })
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
        await user.click(screen.getByRole("button", {name: "Keep editing"}))
        expect(screen.queryByRole("button", {name: "Save anyway"})).not.toBeInTheDocument()
        expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBe("old-key")
        expect(input).toHaveValue("sk-proj-invalid")
        expect(onClose).not.toHaveBeenCalled()
    })

    it("does not save a key when validation finishes after the dialog unmounts", async () => {
        let resolveRequest: (response: Response) => void
        global.fetch = vi.fn(
            () =>
                new Promise<Response>((resolve) => {
                    resolveRequest = resolve
                })
        )
        const {unmount} = render(<ByokDialog id="unmounted-key" />)
        const row = screen.getByTestId("unmounted-key-openai-input")
        await user.click(within(row).getByPlaceholderText("sk-..."))
        await user.paste("sk-proj-example")
        await user.click(within(row).getByRole("button", {name: "Save"}))
        unmount()
        await act(async () => {
            resolveRequest(Response.json({}))
        })

        expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBeFalsy()
    })

    it("does not save a draft changed while validation is pending", async () => {
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
                id="pending-key"
                onClose={onClose}
            />
        )
        const row = screen.getByTestId("pending-key-openai-input")
        const input = within(row).getByPlaceholderText("sk-...")
        await user.click(input)
        await user.paste("sk-proj-first")
        await user.click(within(row).getByRole("button", {name: "Save"}))
        await user.clear(input)
        await user.click(input)
        await user.paste("sk-proj-second")
        await user.click(screen.getByRole("button", {name: "close"}))
        await user.click(screen.getByRole("button", {name: "Save changes"}))
        await act(async () => {
            resolveRequest(new Response("{}", {status: 200}))
        })
        await waitFor(() => expect(within(row).getByRole("button", {name: "Save"})).toBeEnabled())
        expect(onClose).not.toHaveBeenCalled()
        expect(global.fetch).toHaveBeenCalledTimes(1)
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
        await waitFor(() => expect(within(row).getByRole("button", {name: "Forget"})).toBeEnabled())
        expect(global.fetch).toHaveBeenCalledTimes(1)
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

    it("closes after reusing a pending save without another request", async () => {
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
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
        expect(global.fetch).toHaveBeenCalledTimes(1)
        expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBe("sk-proj-example")
    })

    it("forgets the saved key while a replacement is being validated", async () => {
        useSettingsStore.getState().updateSettings({
            apiKeys: {OpenAI: {value: "old-key", expiresAt: Date.now() + 60000}},
        })
        let resolveRequest: (response: Response) => void
        global.fetch = vi.fn(
            () =>
                new Promise<Response>((resolve) => {
                    resolveRequest = resolve
                })
        )
        render(<ByokDialog id="forget-pending" />)
        const row = screen.getByTestId("forget-pending-openai-input")
        const input = within(row).getByPlaceholderText("sk-...")
        await user.clear(input)
        await user.click(input)
        await user.paste("sk-proj-replacement")
        await user.click(screen.getByRole("button", {name: "close"}))
        await user.click(screen.getByRole("button", {name: "Save changes"}))
        await user.click(await within(row).findByRole("button", {name: "Forget"}))
        await user.click(screen.getByRole("button", {name: "Yes, forget key"}))
        expect(within(row).getByRole("button", {name: "Forget"})).toBeDisabled()
        await act(async () => {
            resolveRequest(Response.json({}))
        })
        expect(input).toHaveValue("")
        expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBeFalsy()
    })

    it.each(["Save", "Save changes"])(
        "offers Save anyway after provider validation fails through %s",
        async (action) => {
            global.fetch = mockFetch({error: {message: "Key rejected"}}, false, 401)
            render(<ByokDialog id="restricted-key" />)
            const row = screen.getByTestId("restricted-key-openai-input")
            const key = "sk-proj-example-sk-payload"
            await user.click(within(row).getByPlaceholderText("sk-..."))
            await user.paste(key)
            if (action === "Save changes") {
                await user.click(screen.getByRole("button", {name: "close"}))
                await user.click(screen.getByRole("button", {name: action}))
            } else {
                await user.click(within(row).getByRole("button", {name: action}))
            }

            const saveUnverified = await screen.findByRole("button", {name: "Save anyway"})
            expect(screen.getByText(/The key could not be verified/u)).toBeVisible()
            expect(within(row).getByRole("button", {name: "Forget"})).toBeDisabled()
            await user.click(saveUnverified)
            expect(within(row).getByRole("button", {name: "Forget"})).toBeEnabled()
            expect(getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")).toBe(key)
            expect(global.fetch).toHaveBeenCalledTimes(1)
        }
    )

    it.each(["light", "dark"] as const)("shows the OpenAI logo for a %s single-theme provider", (mode) => {
        const theme = createTheme({palette: {mode}})
        render(
            <ThemeProvider theme={theme}>
                <ByokDialog id="test-byok-dark-dialog" />
            </ThemeProvider>
        )

        expect(screen.getByRole("img", {name: "OpenAI logo"})).toHaveAttribute(
            "src",
            mode === "dark" ? "/OpenAI-white.png" : "/OpenAI-black.png"
        )
    })

    it.each(["light", "dark"] as const)("keeps the OpenAI logo in sync with a saved %s appearance", async (mode) => {
        localStorage.setItem("mui-mode", mode)
        const theme = createTheme({
            cssVariables: {colorSchemeSelector: "data-mui-color-scheme"},
            defaultColorScheme: "dark",
            colorSchemes: {light: true, dark: true},
        })
        render(
            <ThemeProvider
                theme={theme}
                defaultMode="dark"
                noSsr={true}
            >
                <ByokThemeControls />
            </ThemeProvider>
        )

        await user.click(screen.getByRole("button", {name: "Open API keys"}))
        const initialLogo = mode === "dark" ? "/OpenAI-white.png" : "/OpenAI-black.png"
        const toggledLogo = mode === "dark" ? "/OpenAI-black.png" : "/OpenAI-white.png"
        await waitFor(() => expect(screen.getByRole("img", {name: "OpenAI logo"})).toHaveAttribute("src", initialLogo))

        await user.click(screen.getByRole("button", {name: "close"}))
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
        await user.click(screen.getByRole("button", {name: "Toggle theme"}))
        await user.click(screen.getByRole("button", {name: "Open API keys"}))
        expect(screen.getByRole("img", {name: "OpenAI logo"})).toHaveAttribute("src", toggledLogo)

        await user.click(screen.getByRole("button", {name: "close"}))
        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
        await user.click(screen.getByRole("button", {name: "Toggle theme"}))
        await user.click(screen.getByRole("button", {name: "Open API keys"}))
        expect(screen.getByRole("img", {name: "OpenAI logo"})).toHaveAttribute("src", initialLogo)
    })
})
