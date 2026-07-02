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
// eslint-disable-next-line no-shadow
import {describe, expect, it} from "vitest"

import {withStrictMocks} from "../../../../../__tests__/common/vitest/strictMocks"
import {PageLoader} from "../../../components/Common/PageLoader"

describe("PageLoader", () => {
    withStrictMocks()

    const pageLoaderComponent = <PageLoader id="mock-page-loader" />

    it("should render a page loader", async () => {
        render(pageLoaderComponent)

        const loadingTitle = screen.getByText("Loading... Please wait")

        expect(loadingTitle).toBeInTheDocument()
    })
})
