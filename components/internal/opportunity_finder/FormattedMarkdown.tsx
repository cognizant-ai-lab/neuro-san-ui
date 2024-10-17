import {ReactElement, ReactNode} from "react"
import ReactMarkdown from "react-markdown"
import SyntaxHighlighter, {SyntaxHighlighterProps} from "react-syntax-highlighter"
import rehypeRaw from "rehype-raw"
import rehypeSlug from "rehype-slug"

/**
 * The props for the FormattedMarkdown component.
 */
interface FormattedMarkdownProps {
    /**
     * The id for the div that will contain the formatted markdown.
     */
    id: string

    /**
     * The list of nodes to format. Each node can be a string or a react node.
     */
    nodesList: ReactNode[]

    /**
     * The style to use for the syntax highlighter. @see SyntaxHighlighterThemes
     */
    style: SyntaxHighlighterProps["style"]
}

/**
 * Format the output to ensure that text nodes are formatted as markdown but other nodes are passed along as-is.
 *
 * @param props The props for the component. @see FormattedMarkdownProps
 * @returns The formatted output. Consecutive string nodes will be aggregated and wrapped in a markdown component,
 * while other nodes will be passed along as-is.
 */
export const FormattedMarkdown = (props: FormattedMarkdownProps): ReactElement<FormattedMarkdownProps, "div"> => {
    /**
     * Get the formatted output for a given string. The string is assumed to be in markdown format.
     * @param stringToFormat The string to format.
     * @returns The formatted markdown.
     */
    const getFormattedMarkdown = (stringToFormat: string): JSX.Element => (
        // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
        <ReactMarkdown
            rehypePlugins={[rehypeRaw, rehypeSlug]}
            components={{
                code(codeProps) {
                    const {children, className, ...rest} = codeProps
                    const match = /language-(?<language>\w+)/u.exec(className || "")
                    return match ? (
                        // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                        <SyntaxHighlighter
                            id={`syntax-highlighter-${match.groups.language}`}
                            PreTag="div"
                            language={match.groups.language}
                            style={props.style}
                        >
                            {String(children).replace(/\n$/u, "")}
                        </SyntaxHighlighter>
                    ) : (
                        <code
                            id={`code-${className}`}
                            {...rest}
                            className={className}
                        >
                            {children}
                        </code>
                    )
                },
                // Handle links specially since we want them to open in a new tab
                a({...codeProps}) {
                    return (
                        <a
                            {...props}
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

    // Walk through the nodes list. If we encounter a string node, we'll aggregate it with other string nodes.
    const formattedOutput: ReactNode[] = []
    let currentTextNodes: string[] = []
    for (const node of props.nodesList) {
        // If it's a string node, aggregate it with other string nodes
        if (typeof node === "string") {
            currentTextNodes.push(node)
        } else {
            // Not a string node. Process any aggregated text nodes
            if (currentTextNodes.length > 0) {
                formattedOutput.push(getFormattedMarkdown(currentTextNodes.join("")))
                currentTextNodes = []
            }

            // Not a string node. Add the node as-is
            formattedOutput.push(node)
        }
    }

    // Process any remaining text nodes
    if (currentTextNodes.length > 0) {
        formattedOutput.push(getFormattedMarkdown(currentTextNodes.join("")))
    }

    // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
    return <div id={props.id}>{formattedOutput}</div>
}
