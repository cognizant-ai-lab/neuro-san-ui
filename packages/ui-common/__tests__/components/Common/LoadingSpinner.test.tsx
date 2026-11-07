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

import {LoadingSpinner} from "../../../components/Common/LoadingSpinner"

describe("LoadingSpinner", () => {
    it("renders a gradient progress ring and loading text with ids derived from the given id", () => {
        render(<LoadingSpinner id="test-loader" />)

        const spinner = screen.getByRole("progressbar", {name: "Loading"})
        expect(spinner).toHaveAttribute("id", "test-loader-spinner")
        expect(spinner).toHaveStyle({borderRadius: "50%"})

        expect(screen.getByText("Loading...")).toHaveAttribute("id", "test-loader-loading-text")
        expect(document.getElementById("test-loader")?.tagName).toBe("H3")
    })
})
