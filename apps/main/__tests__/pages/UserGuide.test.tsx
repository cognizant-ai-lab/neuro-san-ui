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

import {render, screen} from "@testing-library/react"

import {withStrictMocks} from "../../../../__tests__/common/strictMocks"
import UserGuide from "../../pages/userguide"

const originalFetch = window.fetch

describe("User Guide", () => {
    withStrictMocks()

    afterEach(() => {
        window.fetch = originalFetch
    })

    it("Renders the User Guide correctly", async () => {
        const userGuideContent = "Sample User Guide Content"
        window.fetch = jest.fn().mockImplementation(() => {
            return Promise.resolve({
                ok: true,
                text: async () => userGuideContent,
            })
        })
        render(<UserGuide />)

        await screen.findByText(userGuideContent)
    })

    it("Displays an error message when failing to fetch the User Guide", async () => {
        window.fetch = jest.fn().mockImplementation(() => {
            return Promise.resolve({
                ok: false,
            })
        })
        render(<UserGuide />)

        await screen.findByText(/Unable to load user guide/u)
    })
})
