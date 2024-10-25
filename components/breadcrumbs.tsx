import {Typography} from "@mui/material"
import Breadcrumbs from "@mui/material/Breadcrumbs"
import {startCase} from "lodash"
import Link from "next/link"
import {usePathname} from "next/navigation"
import {FaChevronRight} from "react-icons/fa6"

const NeuroAIBreadcrumbs = ({rootLabel}: {rootLabel: string}) => {
    const pathname: string = usePathname()
    const urlPaths: string[] = pathname?.split("/").filter((path) => path !== "")

    return (
        <Breadcrumbs
            style={{
                marginTop: "1rem",
            }}
            id="breadcrumb-nav"
            aria-label="breadcrumb"
            separator={
                <FaChevronRight
                    id="breadcrumb-separator"
                    fontSize="small"
                />
            }
        >
            <Link
                id="breadcrumb-link-home"
                href="/"
                style={{
                    color: "#000",
                }}
            >
                {startCase(rootLabel)}
            </Link>
            {urlPaths?.slice(0, -1).map((urlPath, idx) => {
                const redirectPath = urlPaths.slice(0, idx + 1).join("/")
                return (
                    <Link
                        key={urlPath}
                        id={`breadcrumb-link__${urlPath}`}
                        style={{
                            color: "#000",
                            textDecoration: "underlined",
                        }}
                        href={`/${redirectPath}`}
                    >
                        {startCase(urlPath)}
                    </Link>
                )
            })}
            <Typography
                id="breadcrumb-link__current"
                sx={{color: "#AAA"}}
            >
                {startCase(urlPaths?.at(-1))}
            </Typography>
        </Breadcrumbs>
    )
}

export default NeuroAIBreadcrumbs
