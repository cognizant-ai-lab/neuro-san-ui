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

import {PublishedNetworkUrl} from "./PublishedNetworkUrl"
import {Published, PublishState, PublishStatus} from "../../../state/Publish"
import {StatusLight} from "../../Common/StatusLight"

interface PublishPanelProps {
    readonly publishState: PublishState
    readonly id: string
    readonly isUnpublishing: boolean
    readonly onUnpublish: (published: Published) => void
}

/**
 * Details of publishing a network: progress while publishing, the live URL once published, or that it's unpublished.
 */
export const PublishPanel: FC<PublishPanelProps> = ({id, isUnpublishing, onUnpublish, publishState}) => (
    <Box
        id={id}
        sx={{display: "flex", flexDirection: "column", gap: 1.5, p: 2, width: "22rem"}}
    >
        {publishState.status === PublishStatus.Unpublished && (
            <>
                <Box sx={{alignItems: "center", display: "flex", gap: 1}}>
                    <StatusLight statusValue="unknown" />
                    <Typography sx={{fontWeight: 600}}>Unpublished</Typography>
                </Box>
                <Typography
                    color="text.secondary"
                    variant="body2"
                >
                    Republish to put it back online.
                </Typography>
            </>
        )}
        {publishState.status === PublishStatus.Published && (
            <>
                <Box sx={{alignItems: "center", display: "flex", gap: 1}}>
                    <StatusLight statusValue="green" />
                    <Typography sx={{fontWeight: 600}}>Live</Typography>
                </Box>
                <PublishedNetworkUrl url={publishState.url} />
                <Divider />
                <Button
                    disabled={isUnpublishing}
                    onClick={() => onUnpublish(publishState)}
                    size="small"
                    sx={{alignSelf: "flex-start", color: "error.light", minWidth: 0, p: 0, textTransform: "none"}}
                >
                    {isUnpublishing ? "Unpublishing..." : "Unpublish"}
                </Button>
            </>
        )}
        {publishState.status === PublishStatus.Publishing && (
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
                    This can take a minute.
                </Typography>
            </>
        )}
    </Box>
)
