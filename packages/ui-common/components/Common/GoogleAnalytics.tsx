import {FC} from "react"

const GA_MEASUREMENT_ID = "G-KETR7ZF2DG"

const GA_INIT_SCRIPT = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}');
`

/**
 * This component injects the Google Analytics tracking script
 */
export const GoogleAnalytics: FC = () => (
    <>
        <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        {/* eslint-disable-next-line react/no-danger -- not dangerous here as it's our own, static HTML */}
        <script dangerouslySetInnerHTML={{__html: GA_INIT_SCRIPT}} />
    </>
)
