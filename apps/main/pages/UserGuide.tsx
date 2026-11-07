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

import {Theme} from "@mui/material/styles"
import {FC, JSX as ReactJSX, useEffect, useState} from "react"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import rehypeSlug from "rehype-slug"
import remarkToc from "remark-toc"

import {Spotlight} from "../../../packages/ui-common/components/Common/Spotlight"
import {glassSurface} from "../../../packages/ui-common/Theme/sheen"
import {StyledMarkdownContainer} from "../styles/StyledMarkdownContainer"
import {CustomPageProps} from "../Types/Types"

// Path to user guide Markdown doc on the server
const USER_GUIDE_PATH = "user_guide.md"

// Main function.
export const UserGuide: FC & CustomPageProps = Object.assign(
    (): ReactJSX.Element => {
        const [userGuide, setUserGuide] = useState(null)

        const getData = async () => {
            try {
                // fetch guide from server
                const result = await fetch(USER_GUIDE_PATH, {
                    headers: {
                        "Content-Type": "text/markdown",
                        Accept: "text/markdown",
                    },
                })

                // Check if the request was successful
                if (!result.ok) {
                    setUserGuide(
                        `## Unable to load user guide. Internal error: http ${result.status} ${result.statusText}`
                    )
                    return
                }

                // Set user guide content
                setUserGuide(await result.text())
            } catch (e) {
                setUserGuide(`## Unable to load user guide. Internal error: ${e}`)
            }
        }

        useEffect(() => {
            void getData()
        }, [])

        return (
            // Frosted-glass reading card lit by a soft glow that follows the pointer
            <Spotlight
                id="user-guide-card"
                size={560}
                sx={(theme: Theme) => ({
                    ...glassSurface(theme),
                    display: "flex",
                    flex: 1,
                    marginBottom: "1.5rem",
                    marginTop: "0.5rem",
                    marginX: "auto",
                    maxWidth: 1080,
                    minHeight: 0,
                    overflow: "hidden",
                    width: "100%",
                })}
            >
                <StyledMarkdownContainer
                    id="user-guide-container"
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: "auto",
                        padding: {xs: "1.25rem 1.25rem", md: "2.25rem 3rem"},
                        scrollbarGutter: "stable",
                    }}
                >
                    <ReactMarkdown
                        rehypePlugins={[rehypeRaw, rehypeSlug]}
                        remarkPlugins={[[remarkToc, {heading: "Table of Contents", tight: true}]]}
                    >
                        {userGuide}
                    </ReactMarkdown>
                </StyledMarkdownContainer>
            </Spotlight>
        )
    },
    {authRequired: true}
)

export default UserGuide
