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
import {styled} from "@mui/material/styles"
import Typography from "@mui/material/Typography"
import {FC} from "react"

import {PublishedNetworkUrl} from "./PublishedNetworkUrl"
import {Published, PublishState, PublishStatus} from "../../../state/Publish"
import {StatusLight} from "../../Common/StatusLight"

// #region: Styled Components

// A small text button for the panel's actions
const PanelAction = styled(Button)({
    minWidth: 0,
    padding: 0,
    textTransform: "none",
})

const PanelActions = styled(Box)(({theme}) => ({
    display: "flex",
    gap: theme.spacing(3),
}))

const PanelNote = styled(Typography)(({theme}) => ({
    ...theme.typography.body2,
    color: theme.palette.text.secondary,
}))

const PanelTitle = styled(Typography)({
    fontWeight: 600,
})

const StatusRow = styled(Box)(({theme}) => ({
    alignItems: "center",
    display: "flex",
    gap: theme.spacing(1),
}))

// #endregion: Styled Components

interface PublishPanelProps {
    readonly publishState: PublishState
    readonly id: string
    readonly onRepublish: () => void
    readonly onUnpublish: (published: Published) => void
}

/**
 * Details of publishing a network: progress while publishing, the live URL once published, or that it's unpublished.
 */
export const PublishPanel: FC<PublishPanelProps> = ({id, onRepublish, onUnpublish, publishState}) => (
    <Box
        id={id}
        sx={{display: "flex", flexDirection: "column", gap: 1.5, p: 2, width: "22rem"}}
    >
        {publishState.status === PublishStatus.Unpublished && (
            <>
                <StatusRow>
                    <StatusLight statusValue="unknown" />
                    <PanelTitle>Unpublished</PanelTitle>
                </StatusRow>
                <PanelNote>Republish to put it back online.</PanelNote>
            </>
        )}
        {publishState.status === PublishStatus.Published && (
            <>
                <StatusRow>
                    <StatusLight statusValue="green" />
                    <PanelTitle>Live</PanelTitle>
                </StatusRow>
                <PublishedNetworkUrl url={publishState.url} />
                <Divider />
                <PanelActions>
                    <PanelAction
                        disabled={publishState.isUnpublishing}
                        onClick={onRepublish}
                        size="small"
                        sx={{color: "var(--bs-secondary)"}}
                    >
                        Republish
                    </PanelAction>
                    <PanelAction
                        disabled={publishState.isUnpublishing}
                        onClick={() => onUnpublish(publishState)}
                        size="small"
                        sx={{color: "error.light"}}
                    >
                        {publishState.isUnpublishing ? "Unpublishing..." : "Unpublish"}
                    </PanelAction>
                </PanelActions>
            </>
        )}
        {publishState.status === PublishStatus.Publishing && (
            <>
                <PanelTitle>Putting it online...</PanelTitle>
                <LinearProgress
                    aria-label="Publishing progress"
                    sx={{"& .MuiLinearProgress-bar": {backgroundColor: "var(--bs-secondary)"}}}
                />
                <PanelNote>This can take a few minutes.</PanelNote>
            </>
        )}
    </Box>
)
