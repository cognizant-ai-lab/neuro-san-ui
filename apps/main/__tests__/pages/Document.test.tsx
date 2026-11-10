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

import {ReactNode} from "react"
import {renderToStaticMarkup} from "react-dom/server"

import AppDocument from "../../pages/_document"

// The next/document components need a Next.js document context, so replace them with simple passthroughs.
vi.mock("next/document", () => ({
    Head: () => <div data-testid="next-head" />,
    Html: ({children, lang}: {children: ReactNode; lang: string}) => <div lang={lang}>{children}</div>,
    Main: () => <main data-testid="next-main" />,
    NextScript: () => <script data-testid="next-script" />,
}))

describe("AppDocument", () => {
    it("Should render the document skeleton with the color scheme init script", () => {
        const view = renderToStaticMarkup(<AppDocument />)

        expect(view).toMatch(/lang="en"[\s\S]*next-head[\s\S]*next-main[\s\S]*next-script/u)
    })
})
