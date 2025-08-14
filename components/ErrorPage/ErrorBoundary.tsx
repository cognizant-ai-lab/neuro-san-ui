import {Component, ErrorInfo, ReactNode} from "react"

import ErrorPage from "./ErrorPage"

/**
 * Optional properties that should be present on the Error object if it's a real Javascript error.
 * It's possible to throw any random thing in Javascript/Typescript so we cannot assume these are present as some
 * misbehaved piece of code may have thrown a <code>string</code> or an <code>int</code> instead of an error
 * object.
 */
interface CustomError extends Error {
    fileName?: string
    lineNumber?: number
    columnNumber?: number
    message: string
}

/**
 * Interface to define the state for this component
 */
interface ErrorBoundaryState {
    readonly hasError: boolean
    readonly error: unknown
}

/**
 * Interface to define the incoming props for this component
 */
interface ErrorBoundaryProps {
    readonly id: string
    readonly children: ReactNode
}

/**
 * Implements a system-wide error handler for NextJS pages in our app.
 * Taken from here: https://nextjs.org/docs/advanced-features/error-handling
 *
 * Note: as of writing (April 2023) ReactJS does not support error boundaries for functional components (like all of
 * those in UniLEAF are) so we take the approach of wrapping all components in our app with this class component that
 * handles the error boundary.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    // This is the key override called by ReactJS when an unhandled error is thrown. And this is why you cannot
    // create error boundaries in functional components -- no way to override this method.
    static getDerivedStateFromError(error: unknown) {
        // Update state so the next render will show the fallback UI
        return {hasError: true, error}
    }

    constructor(props: ErrorBoundaryProps) {
        super(props)

        // Define a state variable to track whether is an error or not
        this.state = {hasError: false, error: null}
    }

    // No need for "this" here
    // eslint-disable-next-line @typescript-eslint/class-methods-use-this
    override componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
        // TODO: Send this to central logging service once it's available
        console.error({error, errorInfo})
    }

    override render() {
        // Check if the error is thrown
        if (this.state.hasError) {
            // Render fallback UI
            const id = this.props.id
            const error = this.state.error
            let fileName = "Unknown"
            let lineNumber = null
            let columnNumber = null
            let message = ""
            if (error instanceof Error) {
                // the error object is an instance of the built-in Error type in JavaScript
                const customError = error as CustomError
                if (customError.fileName) {
                    fileName = customError.fileName
                }
                if (customError.lineNumber != null) {
                    lineNumber = customError.lineNumber
                }
                if (customError.columnNumber != null) {
                    columnNumber = customError.columnNumber
                }

                message = customError.message
            }
            return (
                <ErrorPage
                    id={id}
                    errorText={`${message} in ${fileName} line ${lineNumber} column ${columnNumber}`}
                />
            )
        }

        // Return children components in case of no error
        return this.props.children
    }
}
