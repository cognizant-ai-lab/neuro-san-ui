import {NextApiRequest, NextApiResponse} from "next"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Fetch user info from ALB or your backend service
    const userInfo = await fetchUserInfoFromALB(req)

    if (userInfo) {
        res.status(200).json(userInfo)
    } else {
        res.status(401).json({message: "Unauthorized"})
    }
}

async function fetchUserInfoFromALB(req) {
    console.log("Headers:", req.headers) // Log the headers

    const oidcDataHeader = req.headers["x-amzn-oidc-data"] as string
    console.info("OIDC Data Header:", oidcDataHeader)

    const jwtHeaders = oidcDataHeader.split(".")

    // now base64 decode jwtheader
    const buff = Buffer.from(jwtHeaders[1], "base64")
    console.log("Decoded JWT Header:", buff.toString("utf-8"))
    const userInfo = JSON.parse(buff.toString("utf-8"))

    console.log("User Info:", userInfo)

    // Optionally, pass the headers to the page component as props
    return {
        username: userInfo.nickname,
        picture: userInfo.picture,
    }
}
