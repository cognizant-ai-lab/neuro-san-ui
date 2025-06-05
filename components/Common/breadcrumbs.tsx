import {Typography} from "@mui/material"
import Breadcrumbs from "@mui/material/Breadcrumbs"
import Grid from "@mui/material/Grid2"
import {startCase} from "lodash"
import Link from "next/link"
import {usePathname} from "next/navigation"
import {FaChevronRight} from "react-icons/fa6"

const NeuroAIBreadcrumbs = () => {
    const pathname: string = usePathname()
    const urlPaths: string[] = pathname?.split("/").filter((path) => path !== "")

    return (
        <Grid
            id="nav-bar-breadcrumbs-row"
            container={true}
            sx={{
                justifyContent: "flex-start",
                width: "100%",
            }}
        >
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
                        color="white"
                    />
                }
            >
                <Link
                    id="breadcrumb-link-home"
                    href="/"
                    style={{
                        color: "white",
                    }}
                >
                    Home
                </Link>
                {urlPaths?.slice(0, -1).map((urlPath, idx) => {
                    const redirectPath = urlPaths.slice(0, idx + 1).join("/")
                    return (
                        <Link
                            key={urlPath}
                            id={`breadcrumb-link__${urlPath}`}
                            style={{
                                color: "white",
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
                    sx={{color: "white"}}
                >
                    {startCase(urlPaths?.at(-1))}
                </Typography>
            </Breadcrumbs>
        </Grid>
    )
}

export default NeuroAIBreadcrumbs
