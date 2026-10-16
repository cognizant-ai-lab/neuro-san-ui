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

import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Divider from "@mui/material/Divider"
import LinearProgress from "@mui/material/LinearProgress"
import Typography from "@mui/material/Typography"
import {FC} from "react"

import {DeployLog} from "./DeployLog"
import {StatusDot} from "./DeployStatusBadge"
import {LiveUrlField} from "./LiveUrlField"
import {Deployment, DeploymentStatus} from "../../../state/Deployments"

const RELATIVE_TIME_FORMAT = new Intl.RelativeTimeFormat(undefined, {numeric: "auto"})

/**
 * Formats how long ago a network was published, e.g. "just now" or "5 minutes ago".
 * @param publishedAt Milliseconds since epoch
 */
const formatPublishedAgo = (publishedAt: number): string => {
    const minutes = Math.floor((Date.now() - publishedAt) / 60_000)
    if (minutes < 1) return "just now"
    if (minutes < 60) return RELATIVE_TIME_FORMAT.format(-minutes, "minute")

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return RELATIVE_TIME_FORMAT.format(-hours, "hour")

    return RELATIVE_TIME_FORMAT.format(-Math.floor(hours / 24), "day")
}

interface DeployPanelProps {
    readonly deployment: Deployment
    readonly id: string
    readonly onUnpublish: () => void
}

/**
 * Details of a network's deployment: progress while publishing, or the live URL once published.
 */
export const DeployPanel: FC<DeployPanelProps> = ({deployment, id, onUnpublish}) => (
    <Box
        id={id}
        sx={{display: "flex", flexDirection: "column", gap: 1.5, p: 2, width: "22rem"}}
    >
        {deployment.status === DeploymentStatus.Live ? (
            <>
                <Box sx={{alignItems: "center", display: "flex", gap: 1}}>
                    <StatusDot deploymentStatus={deployment.status} />
                    <Typography sx={{fontWeight: 600}}>Live</Typography>
                </Box>
                <LiveUrlField url={deployment.url} />
                <Typography
                    color="text.secondary"
                    variant="body2"
                >
                    Published {formatPublishedAgo(deployment.publishedAt)}
                </Typography>
            </>
        ) : (
            <>
                <Typography sx={{fontWeight: 600}}>Putting it online...</Typography>
                <LinearProgress
                    aria-label="Publishing progress"
                    sx={{"& .MuiLinearProgress-bar": {backgroundColor: "var(--bs-secondary)"}}}
                />
                <Typography
                    color="text.secondary"
                    variant="body2"
                >
                    Usually takes a few seconds.
                </Typography>
            </>
        )}
        <Divider />
        <DeployLog
            id={`${id}-log`}
            log={deployment.log}
        />
        {deployment.status === DeploymentStatus.Live && (
            <Button
                onClick={onUnpublish}
                size="small"
                sx={{alignSelf: "flex-start", color: "error.light", minWidth: 0, p: 0, textTransform: "none"}}
            >
                Unpublish
            </Button>
        )}
    </Box>
)
