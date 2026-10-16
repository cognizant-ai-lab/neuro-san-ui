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
import {FC} from "react"

import {DeploymentStatus} from "../../../state/Deployments"

const STATUS_COLORS: Record<DeploymentStatus, string> = {
    [DeploymentStatus.Live]: "success.main",
    [DeploymentStatus.Publishing]: "var(--bs-secondary)",
}

interface DeployStatusProps {
    readonly deploymentStatus: DeploymentStatus
}

export const StatusDot: FC<DeployStatusProps> = ({deploymentStatus}) => (
    <Box
        aria-hidden={true}
        component="span"
        sx={{
            backgroundColor: STATUS_COLORS[deploymentStatus],
            borderRadius: "50%",
            display: "inline-block",
            flexShrink: 0,
            height: "0.5rem",
            width: "0.5rem",
        }}
    />
)

/**
 * Compact dot-and-label showing whether a network is publishing or live.
 */
export const DeployStatusBadge: FC<DeployStatusProps> = ({deploymentStatus}) => (
    <Box
        component="span"
        sx={{
            alignItems: "center",
            color: STATUS_COLORS[deploymentStatus],
            display: "inline-flex",
            fontSize: "0.75rem",
            fontWeight: 600,
            gap: 0.5,
        }}
    >
        <StatusDot deploymentStatus={deploymentStatus} />
        {deploymentStatus}
    </Box>
)
