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

import {Fragment, JSX as ReactJSX, ReactNode} from "react"
import ReactMarkdown from "react-markdown"
import SyntaxHighlighter, {SyntaxHighlighterProps} from "react-syntax-highlighter"
import rehypeRaw from "rehype-raw"
import rehypeSlug from "rehype-slug"

import {hashString} from "../../utils/text"

/**
 * The props for the FormattedMarkdown component.
 */
interface FormattedMarkdownProps {
    /**
     * The id for the div that will contain the formatted Markdown.
     */
    readonly id: string

    /**
     * The list of nodes to format. Each node can be a string or a React node.
     */
    readonly nodesList: ReactNode[]

    /**
     * The style to use for the syntax highlighter. @see SyntaxHighlighterThemes
     */
    readonly style: SyntaxHighlighterProps["style"]

    /**
     * Whether to wrap long lines in the Markdown.
     */
    readonly wrapLongLines: boolean
}

/**
 * Format the output to ensure that text nodes are formatted as Markdown but other nodes are passed along as-is.
 *
 * @param props The props for the component. @see FormattedMarkdownProps
 * @returns The formatted output. Consecutive string nodes will be aggregated and wrapped in a Markdown component,
 * while other nodes will be passed along as-is.
 */
export const FormattedMarkdown = ({
    id,
    nodesList,
    style,
    wrapLongLines = false,
}: FormattedMarkdownProps): ReactJSX.Element => {
    /**
     * Get the formatted output for a given string. The string is assumed to be in Markdown format.
     * @param stringToFormat The string to format.
     * @param index The index of the string in the nodes list. Used as "salt" to generate a unique key.
     * @returns The formatted Markdown.
     */
    const getFormattedMarkdown = (stringToFormat: string, index: number): ReactJSX.Element => (
        <ReactMarkdown
            key={`${hashString(stringToFormat)}-${index}`}
            rehypePlugins={[rehypeRaw, rehypeSlug]}
            components={{
                code(codeProps) {
                    const {children, className, ...rest} = codeProps
                    const match = /language-(?<language>\w+)/u.exec(className || "")
                    return match ? (
                        <SyntaxHighlighter
                            id={`syntax-highlighter-${match.groups["language"]}`}
                            PreTag="div"
                            language={match.groups["language"]}
                            style={style}
                        >
                            {String(children).replace(/\n$/u, "")}
                        </SyntaxHighlighter>
                    ) : (
                        <code
                            id={`code-${className}`}
                            {...rest}
                            className={className}
                            style={wrapLongLines ? {whiteSpace: "pre-wrap", wordBreak: "break-word"} : {}}
                        >
                            {children}
                        </code>
                    )
                },
                // Handle links specially since we want them to open in a new tab
                a({...codeProps}) {
                    return (
                        <a
                            {...codeProps}
                            id="reference-link"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {codeProps.children}
                        </a>
                    )
                },
            }}
        >
            {stringToFormat}
        </ReactMarkdown>
    )

    const getNodeKey = (node: ReactNode, index: number): string => {
        // If it has a key, use that
        if (typeof node === "object" && node !== null && "key" in node && node.key !== null) {
            return `${node.key}-${index}`
        }

        // If not, do our best to synthesize a key
        return `${hashString(node?.toString() || "")}-${index}`
    }

    // Walk through the nodes list. If we encounter a string node, we'll aggregate it with other string nodes.
    const formattedOutput: ReactNode[] = []
    let currentTextNodes: string[] = []
    for (const [i, node] of nodesList.entries()) {
        // If it's a string node, aggregate it with other string nodes
        if (typeof node === "string") {
            currentTextNodes.push(node)
        } else {
            // Not a string node. Process any aggregated text nodes
            if (currentTextNodes.length > 0) {
                const concatenatedText = getFormattedMarkdown(currentTextNodes.join(""), i)
                formattedOutput.push(concatenatedText)
                currentTextNodes = []
            }

            // Not a string node. Add the node as-is
            const key = getNodeKey(node, i)

            formattedOutput.push(<Fragment key={key}>{node}</Fragment>)
        }
    }

    // Process any remaining text nodes
    if (currentTextNodes.length > 0) {
        const concatenatedText = getFormattedMarkdown(currentTextNodes.join(""), nodesList.length)
        formattedOutput.push(concatenatedText)
    }

    return <div id={id}>{formattedOutput}</div>
}
