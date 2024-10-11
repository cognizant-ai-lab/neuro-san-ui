import {ReactNode} from "react"
import ReactMarkdown from "react-markdown"
import SyntaxHighlighter, {SyntaxHighlighterProps} from "react-syntax-highlighter"
import rehypeRaw from "rehype-raw"
import rehypeSlug from "rehype-slug"

/**
 * Get the formatted output for a given string. The string is assumed to be in markdown format.
 * @param stringToFormat The string to format.
 * @param style The highlighter style to use for code blocks
 * @returns The formatted markdown.
 */
export const getFormattedMarkdown = (stringToFormat: string, style: SyntaxHighlighterProps["style"]): JSX.Element => (
    // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
    <ReactMarkdown
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={{
            code(props) {
                const {children, className, ...rest} = props
                const match = /language-(?<language>\w+)/u.exec(className || "")
                return match ? (
                    // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
                    <SyntaxHighlighter
                        id={`syntax-highlighter-${match.groups.language}`}
                        PreTag="div"
                        language={match.groups.language}
                        style={style}
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
            a({...props}) {
                return (
                    <a
                        {...props}
                        id="reference-link"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {props.children}
                    </a>
                )
            },
        }}
    >
        {stringToFormat}
    </ReactMarkdown>
)

/**
 * Format the output to ensure that text nodes are formatted as markdown but other nodes are passed along as-is.
 *
 * @param nodesList The list of nodes to format
 * @param style The highlighter theme to use for code blocks
 * @returns The formatted output. Consecutive string nodes will be aggregated and wrapped in a markdown component,
 * while other nodes will be passed along as-is.
 */
export const formatOutput = (nodesList: ReactNode[], style: SyntaxHighlighterProps["style"]): ReactNode[] => {
    const formattedOutput: ReactNode[] = []
    let currentTextNodes: string[] = []
    for (const node of nodesList) {
        if (typeof node === "string") {
            currentTextNodes.push(node)
        } else {
            if (currentTextNodes.length > 0) {
                formattedOutput.push(getFormattedMarkdown(currentTextNodes.join(""), style))
                currentTextNodes = []
            }

            // Not a string node. Add the node as-is
            formattedOutput.push(node)
        }
    }

    // Process any remaining text nodes
    if (currentTextNodes.length > 0) {
        formattedOutput.push(getFormattedMarkdown(currentTextNodes.join(""), style))
    }

    return formattedOutput
}
