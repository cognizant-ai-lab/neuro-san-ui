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
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {FC} from "react"

const BYOK_TOOLTIP_TEXT =
    "API keys are stored locally in your browser's memory for the duration of your session only " +
    "and are only sent to the Neuro SAN service for use with the associated LLM provider when you use " +
    "this application to interact with networks.\n" +
    "Testing or saving a key sends it directly to the selected provider to verify it. " +
    "Your keys are not stored on our servers.\n" +
    "When you close this tab or your browser, your keys will be permanently cleared from memory and " +
    "you will need to enter them again to use services that require them."

/**
 * Tooltip explaining how user-provided API keys are stored in session memory and transmitted.
 *
 * @return Tooltip element with explanatory text
 */
export const ByokStorageTooltip: FC = () => (
    <Tooltip title={BYOK_TOOLTIP_TEXT}>
        <Typography
            sx={{
                alignSelf: "flex-start",
                color: "var(--bs-secondary)",
                cursor: "help",
                fontSize: "0.7rem",
                lineHeight: 1,
                mt: 0.5,
            }}
            variant="caption"
        >
            <Box
                component="span"
                sx={{mr: 0.5}}
            >
                ⓘ
            </Box>
            <Box
                component="span"
                sx={{
                    borderBottom: "1px dashed",
                    pb: 0.25,
                }}
            >
                How are my keys stored and used?
            </Box>
        </Typography>
    </Tooltip>
)
