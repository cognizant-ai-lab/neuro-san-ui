/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

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

import {act, render, screen} from "@testing-library/react"
import {userEvent, UserEvent} from "@testing-library/user-event"

import {withStrictMocks} from "../../../../../../__tests__/common/strictMocks"
import {SlyDataDialog} from "../../../../components/AgentChat/ChatCommon/SlyDataDialog"
import {useAgentChatHistoryStore} from "../../../../state/ChatHistory"
import {downloadFile} from "../../../../utils/File"

vi.mock("../../../../utils/File", async () => {
    const actual = vi.importActual("../../../../utils/File")
    return {
        ...(await actual),
        downloadFile: vi.fn(),
    }
})

const NETWORK_ID = "music_nerd_pro"
const DIALOG_ID = "test-sly-data-dialog"

// A one-pixel transparent GIF, as a data URI
const IMAGE_DATA_URI = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

describe("SlyDataDialog", () => {
    withStrictMocks()

    let user: UserEvent
    const onCloseMock = vi.fn()

    beforeEach(() => {
        user = userEvent.setup({delay: null})

        // Start each test from a clean store
        const agentHistory = useAgentChatHistoryStore.getState().history
        Object.keys(agentHistory).forEach((agentId) => {
            useAgentChatHistoryStore.getState().resetHistory(agentId)
        })
    })

    const renderDialog = (extraSlyDataKeys?: readonly string[]) =>
        render(
            <SlyDataDialog
                extraSlyDataKeys={extraSlyDataKeys}
                id={DIALOG_ID}
                isOpen={true}
                networkDisplayName="Music Nerd Pro"
                networkId={NETWORK_ID}
                onClose={onCloseMock}
            />
        )

    const getEditor = () => screen.getByLabelText<HTMLTextAreaElement>("Sly data")

    const getSlyData = () => useAgentChatHistoryStore.getState().history[NETWORK_ID]?.slyData

    /**
     * Replaces the whole contents of the editor. Uses paste rather than type because sly_data is JSON and
     * userEvent's type() treats braces as syntax.
     */
    const replaceEditorContents = async (contents: string) => {
        const editor = getEditor()
        await user.clear(editor)
        await user.click(editor)
        await user.paste(contents)
    }

    it("shows the current sly data for the network, pretty-printed", () => {
        act(() => useAgentChatHistoryStore.getState().setSlyData(NETWORK_ID, {charges: 2, user: "bob"}))

        renderDialog()

        expect(getEditor()).toHaveValue('{\n  "charges": 2,\n  "user": "bob"\n}')
    })

    it("shows an empty object when the network has no sly data yet", () => {
        renderDialog()

        expect(getEditor()).toHaveValue("{}")
    })

    it("saves edits to the store and closes", async () => {
        act(() => useAgentChatHistoryStore.getState().setSlyData(NETWORK_ID, {charges: 2}))

        renderDialog()
        await replaceEditorContents('{"charges": 5}')
        await user.click(screen.getByRole("button", {name: "Save"}))

        expect(getSlyData()).toEqual({charges: 5})
        expect(onCloseMock).toHaveBeenCalled()
    })

    it("removes keys the user deleted, rather than merging them back in", async () => {
        act(() => useAgentChatHistoryStore.getState().setSlyData(NETWORK_ID, {charges: 2, user: "bob"}))

        renderDialog()
        await replaceEditorContents('{"charges": 2}')
        await user.click(screen.getByRole("button", {name: "Save"}))

        expect(getSlyData()).toEqual({charges: 2})
    })

    it("refuses to save malformed JSON and says why", async () => {
        renderDialog()
        await replaceEditorContents('{"charges": }')

        expect(screen.getByRole("button", {name: "Save"})).toBeDisabled()
        expect(screen.getByRole("button", {name: "Export sly data"})).toBeDisabled()
    })

    it("refuses to save a JSON array, since sly data has to be an object", async () => {
        renderDialog()
        await replaceEditorContents("[1, 2]")

        expect(screen.getByText("Sly data must be a JSON object, not an array.")).toBeInTheDocument()
        expect(screen.getByRole("button", {name: "Save"})).toBeDisabled()
    })

    it("recovers once the JSON is valid again", async () => {
        renderDialog()
        await replaceEditorContents("{oops")
        expect(screen.getByRole("button", {name: "Save"})).toBeDisabled()

        await replaceEditorContents('{"ok": true}')
        expect(screen.getByRole("button", {name: "Save"})).toBeEnabled()
    })

    it("clears the editor without touching the store until the user saves", async () => {
        act(() => useAgentChatHistoryStore.getState().setSlyData(NETWORK_ID, {charges: 2}))

        renderDialog()
        await user.click(screen.getByRole("button", {name: "Clear sly data"}))

        expect(getEditor()).toHaveValue("{}")
        expect(getSlyData()).toEqual({charges: 2})

        await user.click(screen.getByRole("button", {name: "Save"}))
        expect(getSlyData()).toEqual({})
    })

    it("discards edits when cancelled", async () => {
        act(() => useAgentChatHistoryStore.getState().setSlyData(NETWORK_ID, {charges: 2}))

        renderDialog()
        await replaceEditorContents('{"charges": 99}')
        await user.click(screen.getByRole("button", {name: "Cancel"}))

        expect(getSlyData()).toEqual({charges: 2})
        expect(onCloseMock).toHaveBeenCalled()
    })

    it("exports the sly data as a JSON file", async () => {
        act(() => useAgentChatHistoryStore.getState().setSlyData(NETWORK_ID, {charges: 2}))

        renderDialog()
        await user.click(screen.getByRole("button", {name: "Export sly data"}))

        expect(downloadFile).toHaveBeenCalledWith(
            '{\n  "charges": 2\n}',
            "music_nerd_pro_sly_data.json",
            "application/json"
        )
    })

    it("loads sly data from an imported file", async () => {
        renderDialog()

        const file = new File(['{"imported": true}'], "sly.json", {type: "application/json"})
        await user.upload(screen.getByTestId(`${DIALOG_ID}-file-input`), file)

        expect(getEditor()).toHaveValue('{"imported": true}')
        expect(screen.getByRole("button", {name: "Save"})).toBeEnabled()
    })

    it("explains why an imported file is unusable instead of silently dropping it", async () => {
        renderDialog()

        const file = new File(["not json at all"], "sly.json", {type: "application/json"})
        await user.upload(screen.getByTestId(`${DIALOG_ID}-file-input`), file)

        expect(getEditor()).toHaveValue("not json at all")
        expect(screen.getByRole("button", {name: "Save"})).toBeDisabled()
    })

    it("previews values that look like images", () => {
        act(() => useAgentChatHistoryStore.getState().setSlyData(NETWORK_ID, {avatar: IMAGE_DATA_URI}))

        renderDialog()

        expect(screen.getByRole("img", {name: "avatar"})).toHaveAttribute("src", IMAGE_DATA_URI)
    })

    it("shows no image preview when there is nothing to preview", () => {
        act(() => useAgentChatHistoryStore.getState().setSlyData(NETWORK_ID, {charges: 2}))

        renderDialog()

        expect(screen.queryByRole("img")).not.toBeInTheDocument()
    })

    it("follows the store while the user has not made any edits", () => {
        renderDialog()

        act(() => useAgentChatHistoryStore.getState().updateSlyData(NETWORK_ID, {charges: 3}))

        expect(getEditor()).toHaveValue('{\n  "charges": 3\n}')
    })

    it("keeps the user's edits when the agents update sly data, and offers a reload", async () => {
        act(() => useAgentChatHistoryStore.getState().setSlyData(NETWORK_ID, {charges: 2}))

        renderDialog()
        await replaceEditorContents('{"charges": 99}')

        // The agents echo new sly data while the user is still editing
        act(() => useAgentChatHistoryStore.getState().updateSlyData(NETWORK_ID, {charges: 3}))

        expect(getEditor()).toHaveValue('{"charges": 99}')

        await user.click(screen.getByRole("button", {name: "Reload"}))
        expect(getEditor()).toHaveValue('{\n  "charges": 3\n}')
    })

    it("names the keys that get merged in on send, without showing their values", () => {
        renderDialog(["llm_config", "login"])

        expect(screen.getByText(/llm_config, login/u)).toBeInTheDocument()
    })

    it("says nothing about merged keys when there are none", () => {
        renderDialog()

        expect(screen.queryByText(/Added automatically when you send/u)).not.toBeInTheDocument()
    })
})
