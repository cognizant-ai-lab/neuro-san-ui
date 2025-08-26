/* eslint-disable @next/next/no-html-link-for-pages */
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import {Breadcrumbs, Grid, Typography} from "@mui/material"
import startCase from "lodash-es/startCase.js"

interface NeuroAIBreadcrumbsProps {
    readonly pathname?: string
}

export const NeuroAIBreadcrumbs = ({pathname}: NeuroAIBreadcrumbsProps): JSX.Element => {
    const urlPaths: string[] = pathname?.split("/").filter((path) => path !== "")
    const pageName = startCase(urlPaths?.at(-1))

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
                    <ChevronRightIcon
                        id="breadcrumb-separator"
                        fontSize="small"
                    />
                }
            >
                <a
                    id="breadcrumb-link-home"
                    href="/"
                >
                    Home
                </a>
                {urlPaths?.slice(0, -1).map((urlPath, idx) => {
                    const redirectPath = urlPaths.slice(0, idx + 1).join("/")
                    return (
                        <a
                            key={urlPath}
                            id={`breadcrumb-link__${urlPath}`}
                            style={{
                                textDecoration: "underlined",
                            }}
                            href={`/${redirectPath}`}
                        >
                            {startCase(urlPath)}
                        </a>
                    )
                })}
                <Typography id="breadcrumb-link__current">{pageName}</Typography>
            </Breadcrumbs>
        </Grid>
    )
}
