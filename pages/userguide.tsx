import {useEffect, useState} from "react"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import rehypeSlug from "rehype-slug"
import remarkToc from "remark-toc"

import {StyledMarkdownContainer} from "../styles/StyledMarkdownContainer"

// Path to user guide Markdown doc on the server
const USER_GUIDE_PATH = "user_guide.md"

// Main function.
// Has to be export default for NextJS so tell ts-prune to ignore
// ts-prune-ignore-next
export default function UserGuide() {
    const [userGuide, setUserGuide] = useState(null)

    async function getData() {
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
                setUserGuide(`## Unable to load user guide. Internal error: http ${result.status} ${result.statusText}`)
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
        <StyledMarkdownContainer id="user-guide-container">
            {/* 2/6/23 DEF - ReactMarkdown does not have an id property when compiling */}
            <ReactMarkdown // eslint-disable-line enforce-ids-in-jsx/missing-ids
                rehypePlugins={[rehypeRaw, rehypeSlug]}
                remarkPlugins={[[remarkToc, {heading: "Table of Contents", tight: true}]]}
            >
                {userGuide}
            </ReactMarkdown>
        </StyledMarkdownContainer>
    )
}

UserGuide.authRequired = true
