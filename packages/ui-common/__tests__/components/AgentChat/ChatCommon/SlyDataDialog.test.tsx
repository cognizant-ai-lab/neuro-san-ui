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

import {act, render, screen, within} from "@testing-library/react"
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

// The shape of neuro-san's math_guy example schema: two required scalars
const MATH_GUY_SCHEMA = {
    properties: {
        x: {description: "The first operand", type: "float"},
        y: {description: "The second operand", type: "float"},
    },
    required: ["x", "y"],
    type: "object",
}

// The shape of a BYOK network's schema: one scalar plus the app-managed llm_config block
const BYOK_SCHEMA = {
    properties: {
        llm_config: {
            properties: {openai_api_key: {type: "string"}},
            type: "object",
        },
        running_cost: {description: "Fake billing so far", type: "float"},
    },
    required: ["llm_config"],
    type: "object",
}

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

    const renderDialog = (extraSlyDataKeys?: readonly string[], slyDataSchema?: Record<string, unknown>) =>
        render(
            <SlyDataDialog
                extraSlyDataKeys={extraSlyDataKeys}
                id={DIALOG_ID}
                isOpen={true}
                networkDisplayName="Music Nerd Pro"
                networkId={NETWORK_ID}
                onClose={onCloseMock}
                slyDataSchema={slyDataSchema}
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
        // The parser's message is shown as the editor's helper text. Its exact wording is engine-dependent,
        // but every variant mentions JSON.
        expect(getEditor()).toHaveAccessibleDescription(/json/iu)
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

        expect(screen.getByText(/Sent automatically with every request/u)).toBeInTheDocument()
        expect(screen.getByText("llm_config")).toBeInTheDocument()
        expect(screen.getByText("login")).toBeInTheDocument()
    })

    it("says nothing about merged keys when there are none", () => {
        renderDialog()

        expect(screen.queryByText(/Sent automatically with every request/u)).not.toBeInTheDocument()
    })

    it("shows no schema hints and no template button when the network declares no schema", () => {
        renderDialog()

        expect(screen.queryByText(/This network expects/u)).not.toBeInTheDocument()
        expect(screen.queryByRole("button", {name: "Fill sly data template"})).not.toBeInTheDocument()
    })

    it("ignores an unusable schema rather than breaking the dialog", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)

        renderDialog(undefined, {type: "object"})

        expect(screen.queryByText(/This network expects/u)).not.toBeInTheDocument()
        expect(getEditor()).toHaveValue("{}")
        expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("sly_data_schema"), expect.anything())
    })

    it("lists the keys the network expects, with type, requiredness and description", () => {
        renderDialog(undefined, MATH_GUY_SCHEMA)

        const hints = within(screen.getByTestId(`${DIALOG_ID}-schema-hints`))
        hints.getByText("x")
        hints.getByText("y")
        hints.getByText(/The first operand/u)
        expect(hints.getAllByText(/\(float, required\)/u)).toHaveLength(2)
    })

    it("leaves the app-supplied keys out of the schema hints", () => {
        renderDialog(["llm_config"], BYOK_SCHEMA)

        const hints = within(screen.getByTestId(`${DIALOG_ID}-schema-hints`))
        hints.getByText("running_cost")
        expect(hints.queryByText("llm_config")).not.toBeInTheDocument()
    })

    it("renders a bare key when the schema gives no type, requiredness or description", () => {
        renderDialog(undefined, {properties: {plain: {}}, type: "object"})

        const hints = within(screen.getByTestId(`${DIALOG_ID}-schema-hints`))
        hints.getByText("plain")
        expect(hints.queryByText(/\(/u)).not.toBeInTheDocument()
    })

    it("seeds the expected keys as a template, keeping existing values", async () => {
        act(() => useAgentChatHistoryStore.getState().setSlyData(NETWORK_ID, {x: 3}))

        renderDialog(undefined, MATH_GUY_SCHEMA)
        await user.click(screen.getByRole("button", {name: "Fill sly data template"}))

        expect(getEditor()).toHaveValue('{\n  "x": 3,\n  "y": 0\n}')

        // The template is only a draft until the user saves it
        expect(getSlyData()).toEqual({x: 3})
        await user.click(screen.getByRole("button", {name: "Save"}))
        expect(getSlyData()).toEqual({x: 3, y: 0})
    })

    it("never seeds the app-supplied keys into the template", async () => {
        renderDialog(["llm_config"], BYOK_SCHEMA)
        await user.click(screen.getByRole("button", {name: "Fill sly data template"}))

        expect(getEditor()).toHaveValue('{\n  "running_cost": 0\n}')
    })

    it("disables the template button while the JSON does not parse", async () => {
        renderDialog(undefined, MATH_GUY_SCHEMA)
        await replaceEditorContents("{oops")

        expect(screen.getByRole("button", {name: "Fill sly data template"})).toBeDisabled()
    })

    it("pre-populates an empty editor with the network's template", () => {
        renderDialog(undefined, MATH_GUY_SCHEMA)

        expect(getEditor()).toHaveValue('{\n  "x": 0,\n  "y": 0\n}')

        // It is an ordinary unsaved draft: no reload alert, and nothing in the store until the user saves
        expect(screen.queryByRole("button", {name: "Reload"})).not.toBeInTheDocument()
        expect(getSlyData()).toBeUndefined()
    })

    it("shows stored values instead of the template when the network already has sly data", () => {
        act(() => useAgentChatHistoryStore.getState().setSlyData(NETWORK_ID, {x: 3}))

        renderDialog(undefined, MATH_GUY_SCHEMA)

        expect(getEditor()).toHaveValue('{\n  "x": 3\n}')
    })

    it("resets to the template, not to nothing, when clearing on a network with a schema", async () => {
        act(() => useAgentChatHistoryStore.getState().setSlyData(NETWORK_ID, {extra: 9, x: 3}))

        renderDialog(undefined, MATH_GUY_SCHEMA)
        await user.click(screen.getByRole("button", {name: "Clear sly data"}))

        expect(getEditor()).toHaveValue('{\n  "x": 0,\n  "y": 0\n}')
    })
})
