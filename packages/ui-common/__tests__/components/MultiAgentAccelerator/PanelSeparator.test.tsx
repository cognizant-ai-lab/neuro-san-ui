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

import {render, screen} from "@testing-library/react"
import {Group, Panel} from "react-resizable-panels"

import {withStrictMocks} from "../../../../../__tests__/common/strictMocks"
import {PanelSeparator} from "../../../components/MultiAgentAccelerator/PanelSeparator"

describe("PanelSeparator", () => {
    withStrictMocks()

    it("keeps the grip inside the separator track", () => {
        render(
            <Group>
                <Panel>Left</Panel>
                <PanelSeparator />
                <Panel>Right</Panel>
            </Group>
        )

        const separator = screen.getByRole("separator")
        const grip = separator.querySelector<HTMLElement>(".separator-grip")

        expect(separator).toHaveStyle({width: "18px"})
        expect(grip).toHaveStyle({width: "18px"})
    })
})
