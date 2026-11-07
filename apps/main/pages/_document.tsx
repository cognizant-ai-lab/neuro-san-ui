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

import InitColorSchemeScript from "@mui/material/InitColorSchemeScript"
import {Head, Html, Main, NextScript} from "next/document"
import {JSX as ReactJSX} from "react"

import {COLOR_SCHEME_ATTRIBUTE} from "../theme"

/**
 * Custom document so we can set the color scheme attribute on <html> before React hydrates, avoiding a flash of the
 * wrong (light) scheme on load. Dark is the default for first-time visitors.
 */
const AppDocument = (): ReactJSX.Element => (
    <Html lang="en">
        <Head />
        <body>
            <InitColorSchemeScript
                attribute={COLOR_SCHEME_ATTRIBUTE}
                defaultMode="dark"
            />
            <Main />
            <NextScript />
        </body>
    </Html>
)

export default AppDocument
