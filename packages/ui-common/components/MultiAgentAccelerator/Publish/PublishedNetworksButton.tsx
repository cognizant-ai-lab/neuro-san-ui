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

import Button from "@mui/material/Button"
import Tooltip from "@mui/material/Tooltip"
import {FC, useState} from "react"

import {PUBLISH_SETTINGS_REQUIRED_MESSAGE} from "./Publish"
import {PublishedNetworksDialog} from "./PublishedNetworksDialog"
import {useEnvironmentStore} from "../../../state/Environment"
import {usePublishServerUrl} from "../../../state/Publish"
import {useSettingsStore} from "../../../state/Settings"

/** Opens the org's published sites, including those whose source networks are gone. */
export const PublishedNetworksButton: FC = () => {
    const enablePublishing = useEnvironmentStore((state) => state.enablePublishing)
    const serverUrl = usePublishServerUrl()
    const orgName = useSettingsStore((state) => state.settings.publish.orgName)
    const [isOpen, setIsOpen] = useState(false)
    const isConfigured = Boolean(serverUrl && orgName)

    if (!enablePublishing) return null

    return (
        <>
            <Tooltip title={isConfigured ? "" : PUBLISH_SETTINGS_REQUIRED_MESSAGE}>
                <span>
                    <Button
                        disabled={!isConfigured}
                        onClick={() => setIsOpen(true)}
                        size="small"
                    >
                        Published networks
                    </Button>
                </span>
            </Tooltip>
            {isOpen && serverUrl && orgName && (
                <PublishedNetworksDialog
                    key={`${serverUrl} ${orgName}`}
                    onClose={() => setIsOpen(false)}
                    target={{serverUrl, orgName}}
                />
            )}
        </>
    )
}
