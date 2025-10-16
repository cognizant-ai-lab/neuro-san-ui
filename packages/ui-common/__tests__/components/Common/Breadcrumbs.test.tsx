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

import {NeuroAIBreadcrumbs} from "../../../components/Common/Breadcrumbs"

const MOCK_PATHNAME = "mockPath1/mockPath2/mockPath3/mockPath4"

describe("NeuroAIBreadcrumbs", () => {
    it("should render breadcrumbs with the correct redirect links", () => {
        render(<NeuroAIBreadcrumbs pathname={MOCK_PATHNAME} />)

        const breadcrumb1 = screen.getByText("Mock Path 1")
        const breadcrumb2 = screen.getByText("Mock Path 2")
        const breadcrumb3 = screen.getByText("Mock Path 3")
        const breadcrumb4 = screen.getByText("Mock Path 4")

        expect(breadcrumb1).toBeInTheDocument()
        expect(breadcrumb2).toBeInTheDocument()
        expect(breadcrumb3).toBeInTheDocument()
        expect(breadcrumb4).toBeInTheDocument()

        expect(breadcrumb1).toHaveAttribute("href", "/mockPath1")
        expect(breadcrumb2).toHaveAttribute("href", "/mockPath1/mockPath2")
        expect(breadcrumb3).toHaveAttribute("href", "/mockPath1/mockPath2/mockPath3")
        // last element in breadcrumb is not a link
        expect(breadcrumb4).not.toHaveAttribute("href")
    })
})
