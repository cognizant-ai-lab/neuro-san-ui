/**
 * NextJS middleware module. Currently used for logging requests.
 *
 * For more info see: https://nextjs.org/docs/pages/building-your-application/routing/middleware
 *
 */

import debugModule from "debug"
import {NextRequest, NextResponse} from "next/server"
const debug = debugModule("middleware")

/**
 * Middleware function for logging requests.
 * @param req The incoming request
 * @returns The response to the request. As the name "middleware" implies, we just pass it along.
 */
// ts-prune-ignore-next  (has to be exported for NextJS to hook into it)
export function middleware(req: NextRequest) {
    const {method, url} = req
    const host = req.headers.get("host") || "unknown host"
    const res = NextResponse.next()

    // Get the real host from the HTTP headers, or else the request will just appear to come from 0.0.0.0
    const realHost = url.replace(/https?:\/\/0.0.0.0/u, host)
    debug(`${method} ${realHost} ${res.status}`)

    return res
}

// ts-prune-ignore-next  (has to be exported for NextJS to hook into it)
export const config = {
    matcher: "/:path*",
}
