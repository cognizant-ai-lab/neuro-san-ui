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

import {DeployLogEntry} from "../../../controller/deploy/Deploy"
import {AccordionLite} from "../../Common/AccordionLite"

interface DeployLogProps {
    readonly id: string
    readonly log: readonly DeployLogEntry[]
}

const formatTime = (timestamp: number): string => new Date(timestamp).toLocaleTimeString([], {hour12: false})

/**
 * Collapsible "Technical details" section listing each step of a deploy.
 */
export const DeployLog: FC<DeployLogProps> = ({id, log}) => (
    <AccordionLite
        id={id}
        title="Technical details"
        contentSx={{
            backgroundColor: "action.hover",
            borderRadius: 1,
            display: "flex",
            flexDirection: "column",
            fontSize: "0.75rem",
            gap: 0.75,
            mt: 1,
            p: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
        }}
        items={log.map((entry) => (
            <Box
                key={`${entry.timestamp}-${entry.message}`}
                sx={{fontFamily: "monospace"}}
            >
                {`${formatTime(entry.timestamp)} ${entry.message}`}
                {entry.detail && (
                    <>
                        <br />
                        {entry.detail}
                    </>
                )}
            </Box>
        ))}
    />
)
