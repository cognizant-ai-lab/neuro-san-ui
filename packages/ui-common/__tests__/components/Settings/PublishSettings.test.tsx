import {render, screen} from "@testing-library/react"
import {userEvent, UserEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {
    DEFAULT_PUBLISH_SERVER_LABEL,
    ORG_NAME_LABEL,
    PUBLISH_SERVER_HOST_LABEL,
    PublishSettings,
    SAVE_PUBLISHING_LABEL,
    TEST_PUBLISH_SERVER_LABEL,
} from "../../../components/Settings/PublishSettings"
import {checkHealth} from "../../../controller/publish/Publish"
import {useEnvironmentStore} from "../../../state/Environment"
import {useSettingsStore} from "../../../state/Settings"

vi.mock("../../../controller/publish/Publish")

const ORG_NAME = "cailville"
const SERVER_HOST = "publish.test"

describe("PublishSettings", () => {
    withStrictMocks()

    let user: UserEvent

    const getPublishSettings = () => useSettingsStore.getState().settings.publish

    const renderSettings = () => render(<PublishSettings id="publishing" />)

    const typeInto = async (label: string, text: string) => {
        const field = screen.getByRole("textbox", {name: label})
        await user.clear(field)
        await user.click(field)
        await user.paste(text)
    }

    const save = async () => {
        const saveButton = screen.getByRole("button", {name: SAVE_PUBLISHING_LABEL})
        await user.click(saveButton)
    }

    beforeEach(() => {
        user = userEvent.setup()
        useSettingsStore.getState().resetSettings()
        useEnvironmentStore.setState({publishServerUrl: null})
    })

    describe("Default server", () => {
        const DEFAULT_SERVER_HOST = "default-publish.test"

        beforeEach(() => {
            useEnvironmentStore.setState({publishServerUrl: `https://${DEFAULT_SERVER_HOST}`})
        })

        it("should fill in the default server when none is saved", () => {
            renderSettings()

            expect(screen.getByRole("textbox", {name: PUBLISH_SERVER_HOST_LABEL})).toHaveValue(DEFAULT_SERVER_HOST)
        })

        it("should test the default server shown in the field", async () => {
            vi.mocked(checkHealth).mockResolvedValue({success: true})
            renderSettings()
            const testButton = screen.getByRole("button", {name: TEST_PUBLISH_SERVER_LABEL})

            await user.click(testButton)

            expect(checkHealth).toHaveBeenCalledWith(`https://${DEFAULT_SERVER_HOST}`)
            screen.getByText("Connected")
        })

        it("should put the default server back when Default is clicked", async () => {
            useSettingsStore.getState().updateSettings({publish: {serverUrl: `https://${SERVER_HOST}`}})
            renderSettings()
            const defaultButton = screen.getByRole("button", {name: DEFAULT_PUBLISH_SERVER_LABEL})

            await user.click(defaultButton)

            expect(screen.getByRole("textbox", {name: PUBLISH_SERVER_HOST_LABEL})).toHaveValue(DEFAULT_SERVER_HOST)
            expect(defaultButton).toBeDisabled()
        })

        it("should follow the default again once the default server is saved", async () => {
            useSettingsStore.getState().updateSettings({publish: {serverUrl: `https://${SERVER_HOST}`}})
            renderSettings()
            const defaultButton = screen.getByRole("button", {name: DEFAULT_PUBLISH_SERVER_LABEL})
            await user.click(defaultButton)

            await save()

            expect(getPublishSettings().serverUrl).toBeNull()
        })
    })

    it("should save the server as an https URL along with the org name", async () => {
        renderSettings()
        await typeInto(PUBLISH_SERVER_HOST_LABEL, SERVER_HOST)
        await typeInto(ORG_NAME_LABEL, `  ${ORG_NAME}  `)

        await save()

        expect(getPublishSettings()).toEqual({serverUrl: `https://${SERVER_HOST}`, orgName: ORG_NAME})
    })

    it("should save an http server when http is chosen", async () => {
        renderSettings()
        const protocolSelect = screen.getByRole("combobox", {name: "Publish server protocol"})
        await user.click(protocolSelect)
        await user.click(screen.getByRole("option", {name: "http://"}))
        await typeInto(PUBLISH_SERVER_HOST_LABEL, SERVER_HOST)

        await save()

        expect(getPublishSettings().serverUrl).toBe(`http://${SERVER_HOST}`)
    })

    it("should show a saved http server with http chosen and the host on its own", async () => {
        useSettingsStore.getState().updateSettings({publish: {serverUrl: `http://${SERVER_HOST}`}})

        renderSettings()

        expect(screen.getByRole("combobox", {name: "Publish server protocol"})).toHaveTextContent("http://")
        expect(screen.getByRole("textbox", {name: PUBLISH_SERVER_HOST_LABEL})).toHaveValue(SERVER_HOST)
    })

    it("should turn publishing off when the server is cleared and saved", async () => {
        useSettingsStore.getState().updateSettings({publish: {serverUrl: `https://${SERVER_HOST}`, orgName: ORG_NAME}})
        renderSettings()
        screen.getByText("On")
        const clearButton = screen.getByRole("button", {name: "Clear publish server"})
        await user.click(clearButton)

        await save()

        expect(getPublishSettings().serverUrl).toBeNull()
        screen.getByText("Off")
    })

    it.each([
        {desc: "Connected when the server is up", success: true, expected: "Connected"},
        {desc: "Couldn't connect when it isn't", success: false, expected: "Couldn't connect"},
    ])("should say $desc", async ({success, expected}) => {
        vi.mocked(checkHealth).mockResolvedValue({success})
        renderSettings()
        await typeInto(PUBLISH_SERVER_HOST_LABEL, SERVER_HOST)
        const testButton = screen.getByRole("button", {name: TEST_PUBLISH_SERVER_LABEL})

        await user.click(testButton)

        expect(checkHealth).toHaveBeenCalledWith(`https://${SERVER_HOST}`)
        screen.getByText(expected)
    })

    it("should not offer to save when nothing has changed", async () => {
        useSettingsStore.getState().updateSettings({publish: {serverUrl: `https://${SERVER_HOST}`, orgName: ORG_NAME}})

        renderSettings()

        expect(screen.getByRole("button", {name: SAVE_PUBLISHING_LABEL})).toBeDisabled()
    })
})
