import {FC, useEffect} from "react"

// The URL for the Google Analytics script
export const GOOGLE_ANALYTICS_URL = "https://www.googletagmanager.com/gtag/js"

// Extend the global Window interface to add the Google Analytics properties, to keep TypeScript happy
declare global {
    interface Window {
        dataLayer: unknown[]
        gtag: (...args: unknown[]) => void
    }
}

interface GoogleAnalyticsProps {
    readonly gaMeasurementID: string
}

/**
 * This component injects the Google Analytics tracking script
 */
export const GoogleAnalytics: FC<GoogleAnalyticsProps> = ({gaMeasurementID}) => {
    /*
     Effect to inject the Google Analytics script into the document head.
     This has to be an Effect because React intentionally does not run inline <script> elements that it creates
     in the browser. By making this an Effect, we can create a <script> element and append it to the document head,
     which will cause the browser to execute it.
     */
    useEffect(() => {
        const script = document.createElement("script")
        script.async = true
        script.src = `${GOOGLE_ANALYTICS_URL}?id=${gaMeasurementID}`
        document.head.append(script)

        window.dataLayer = window.dataLayer || []
        window.gtag = function () {
            // gtag must push the `arguments` object itself, not an array, for GA to process it
            // eslint-disable-next-line prefer-rest-params
            window.dataLayer.push(arguments)
        }
        window.gtag("js", new Date())
        window.gtag("config", gaMeasurementID)

        return () => {
            script.remove()
        }
    }, [gaMeasurementID])

    return null
}
