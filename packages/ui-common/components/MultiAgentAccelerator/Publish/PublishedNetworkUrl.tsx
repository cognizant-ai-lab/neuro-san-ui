/*
Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

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

import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import OpenInNewIcon from "@mui/icons-material/OpenInNew"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {FC, useState} from "react"

export const COPY_URL_LABEL = "Copy live URL"
export const OPEN_URL_LABEL = "Open live URL"

const COPY_TOOLTIPS = {
    idle: COPY_URL_LABEL,
    copied: "Copied",
    failed: "Couldn't copy",
} as const

type CopyStatus = keyof typeof COPY_TOOLTIPS

interface PublishedNetworkUrlProps {
    readonly url: string
}

/**
 * Read-only display of a published network's URL, with icons to copy it or open it in a new tab.
 */
export const PublishedNetworkUrl: FC<PublishedNetworkUrlProps> = ({url}) => {
    const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle")

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url)
            setCopyStatus("copied")
        } catch {
            setCopyStatus("failed")
        }
    }

    return (
        <Box
            sx={{
                alignItems: "center",
                backgroundColor: "action.hover",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                display: "flex",
                gap: 0.5,
                pl: 1.5,
                pr: 0.5,
                py: 0.5,
            }}
        >
            <Typography
                sx={{
                    flex: 1,
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
                title={url}
            >
                {url}
            </Typography>
            <Tooltip
                onClose={() => setCopyStatus("idle")}
                title={COPY_TOOLTIPS[copyStatus]}
            >
                <IconButton
                    aria-label={COPY_URL_LABEL}
                    onClick={handleCopy}
                    size="small"
                >
                    <ContentCopyIcon fontSize="inherit" />
                </IconButton>
            </Tooltip>
            <Tooltip title={OPEN_URL_LABEL}>
                <IconButton
                    aria-label={OPEN_URL_LABEL}
                    href={url}
                    rel="noopener noreferrer"
                    size="small"
                    target="_blank"
                >
                    <OpenInNewIcon fontSize="inherit" />
                </IconButton>
            </Tooltip>
        </Box>
    )
}
