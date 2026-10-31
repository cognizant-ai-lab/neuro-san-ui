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

import ClearIcon from "@mui/icons-material/Clear"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import IconButton from "@mui/material/IconButton"
import InputAdornment from "@mui/material/InputAdornment"
import MenuItem from "@mui/material/MenuItem"
import Select from "@mui/material/Select"
import TextField from "@mui/material/TextField"
import {FC, useState} from "react"

import {FadingCheckmark, useCheckmarkFade} from "./FadingCheckmark"
import {SettingsSubsection} from "./SettingsLayout"
import {SettingsRow} from "./SettingsRow"
import {checkHealth} from "../../controller/publish/Publish"
import {useEnvironmentStore} from "../../state/Environment"
import {useSettingsStore} from "../../state/Settings"
import {normalizeUrlInput, Protocol, stripProtocol} from "../../utils/Url"
import {StatusLight} from "../Common/StatusLight"

export const DEFAULT_PUBLISH_SERVER_LABEL = "Use the default publishing server"
export const ORG_NAME_LABEL = "Org name"
export const PUBLISH_SERVER_HOST_LABEL = "Publishing server host"
export const SAVE_PUBLISHING_LABEL = "Save publishing settings"
export const TEST_PUBLISH_SERVER_LABEL = "Test publishing server"

// Just wide enough for the longest label, "Org name *", so the fields get the rest of the row
const LABEL_WIDTH = "5.5rem"

interface PublishSettingsProps {
    readonly id: string
}

/**
 * "Publishing Server" part of the External Services section of the Settings dialog: the server that networks are
 * published to, and the org name sent with each publish.
 */
export const PublishSettings: FC<PublishSettingsProps> = ({id}) => {
    const updateSettings = useSettingsStore((state) => state.updateSettings)
    const savedServerUrl = useSettingsStore((state) => state.settings.publish.serverUrl) ?? ""
    const savedOrgName = useSettingsStore((state) => state.settings.publish.orgName) ?? ""
    const defaultServerUrl = useEnvironmentStore((state) => state.publishServerUrl) ?? ""
    const effectiveServerUrl = savedServerUrl || defaultServerUrl

    const [protocol, setProtocol] = useState<Protocol>(effectiveServerUrl.startsWith("http://") ? "http" : "https")
    const [hostInput, setHostInput] = useState(stripProtocol(effectiveServerUrl))
    const [isServerReachable, setIsServerReachable] = useState<boolean | null>(null)
    const [orgNameInput, setOrgNameInput] = useState(savedOrgName)
    const savedCheckmark = useCheckmarkFade()

    const normalized = normalizeUrlInput(hostInput, protocol)
    const serverUrl = normalized.host ? `${normalized.protocol}://${normalized.host}` : ""
    const orgName = orgNameInput.trim()

    const hasChanges = serverUrl !== effectiveServerUrl || orgName !== savedOrgName

    const handleHostChange = (host: string) => {
        setHostInput(host)
        setIsServerReachable(null)
    }

    const handleTest = async () => {
        setIsServerReachable(await checkHealth(serverUrl))
    }

    const handleDefault = () => {
        const defaultServer = normalizeUrlInput(defaultServerUrl, "https")
        handleHostChange(defaultServer.host)
        setProtocol(defaultServer.protocol)
    }

    const handleSave = () => {
        savedCheckmark.trigger()
        // Only save a server that differs from the default, so a change to the default still applies
        const serverOverride = serverUrl && serverUrl !== defaultServerUrl ? serverUrl : null
        updateSettings({publish: {serverUrl: serverOverride, orgName: orgName || null}})
    }

    return (
        <SettingsSubsection title="Publishing Server">
            <SettingsRow
                id={`${id}-server-row`}
                label="Server"
                labelWidth={LABEL_WIDTH}
                tooltip="URL for the publishing server, where networks are published."
            >
                <Select<Protocol>
                    aria-label="Publishing server protocol"
                    onChange={(e) => {
                        setProtocol(e.target.value)
                        setIsServerReachable(null)
                    }}
                    size="small"
                    sx={{minWidth: 100, flexShrink: 0}}
                    value={protocol}
                >
                    <MenuItem value="https">https://</MenuItem>
                    <MenuItem value="http">http://</MenuItem>
                </Select>
                <TextField
                    onBlur={() => {
                        setHostInput(normalized.host)
                        setProtocol(normalized.protocol)
                    }}
                    onChange={(e) => handleHostChange(e.target.value)}
                    placeholder="publish.example.com"
                    size="small"
                    slotProps={{
                        htmlInput: {"aria-label": PUBLISH_SERVER_HOST_LABEL},
                        input: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="Clear publishing server"
                                        edge="end"
                                        onClick={() => handleHostChange("")}
                                        size="small"
                                    >
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{flex: 1}}
                    value={hostInput}
                />
                <StatusLight
                    id={`${id}-status-light`}
                    statusValue={isServerReachable === null ? "unknown" : isServerReachable ? "green" : "red"}
                />
                <Button
                    aria-label={TEST_PUBLISH_SERVER_LABEL}
                    disabled={!serverUrl}
                    onClick={handleTest}
                    size="small"
                    variant="contained"
                >
                    Test
                </Button>
                {defaultServerUrl && (
                    <Button
                        aria-label={DEFAULT_PUBLISH_SERVER_LABEL}
                        disabled={serverUrl === defaultServerUrl}
                        onClick={handleDefault}
                        size="small"
                        variant="contained"
                    >
                        Default
                    </Button>
                )}
            </SettingsRow>
            <SettingsRow
                id={`${id}-org-name-row`}
                label={
                    <>
                        {ORG_NAME_LABEL}
                        <Box
                            aria-hidden={true}
                            component="span"
                            sx={{color: "error.main"}}
                        >
                            {" *"}
                        </Box>
                    </>
                }
                labelWidth={LABEL_WIDTH}
                tooltip="Your team or organization. Networks are published under it, and it's needed to publish."
            >
                <TextField
                    onChange={(e) => setOrgNameInput(e.target.value)}
                    size="small"
                    slotProps={{htmlInput: {"aria-label": ORG_NAME_LABEL}}}
                    sx={{flex: 1}}
                    value={orgNameInput}
                />
            </SettingsRow>
            <Box sx={{alignItems: "center", display: "flex", gap: 1}}>
                <Button
                    aria-label={SAVE_PUBLISHING_LABEL}
                    disabled={!hasChanges}
                    id={`${id}-publishing-save`}
                    onClick={handleSave}
                    size="small"
                    variant="contained"
                >
                    Save
                </Button>
                <FadingCheckmark show={savedCheckmark.show} />
            </Box>
        </SettingsSubsection>
    )
}
