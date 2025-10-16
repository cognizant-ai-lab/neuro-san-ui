/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import {Typography} from "@mui/material"
import Breadcrumbs from "@mui/material/Breadcrumbs"
import Grid from "@mui/material/Grid"
import startCase from "lodash-es/startCase.js"
import {JSX as ReactJSX} from "react"

interface NeuroAIBreadcrumbsProps {
    readonly pathname?: string
}

export const NeuroAIBreadcrumbs = ({pathname}: NeuroAIBreadcrumbsProps): ReactJSX.Element => {
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
                <a // eslint-disable-line @next/next/no-html-link-for-pages
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
