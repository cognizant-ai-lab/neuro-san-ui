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

import Alert from "@mui/material/Alert"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import LinearProgress from "@mui/material/LinearProgress"
import Typography from "@mui/material/Typography"
import {FC, useEffect, useState} from "react"

import {PublishTarget, unpublish} from "./Publish"
import {PublishedNetworkUrl} from "./PublishedNetworkUrl"
import {listPublishedNetworks, PublishedNetwork} from "../../../controller/publish/Publish"
import {PublishStatus} from "../../../state/Publish"
import {ConfirmationModal} from "../../Common/ConfirmationModal"
import {MUIDialog} from "../../Common/MUIDialog"

interface PublishedNetworksDialogProps {
    readonly onClose: () => void
    readonly target: PublishTarget
}

/** Lists live deployments independently of the local temporary networks. */
export const PublishedNetworksDialog: FC<PublishedNetworksDialogProps> = ({onClose, target}) => {
    const {serverUrl, orgName} = target
    const [networks, setNetworks] = useState<PublishedNetwork[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshCount, setRefreshCount] = useState(0)
    const [networkToUnpublish, setNetworkToUnpublish] = useState<PublishedNetwork | null>(null)
    const [isUnpublishing, setIsUnpublishing] = useState(false)

    useEffect(() => {
        let isCurrentRequest = true
        setIsLoading(true)
        setError(null)
        const loadNetworks = async () => {
            try {
                const published = await listPublishedNetworks(serverUrl, orgName)
                if (isCurrentRequest) setNetworks(published)
            } catch (e) {
                if (isCurrentRequest) setError(String(e))
            } finally {
                if (isCurrentRequest) setIsLoading(false)
            }
        }
        void loadNetworks()
        return () => {
            isCurrentRequest = false
        }
    }, [serverUrl, orgName, refreshCount])

    const handleUnpublish = async (network: PublishedNetwork) => {
        setNetworkToUnpublish(null)
        setIsUnpublishing(true)
        const succeeded = await unpublish(network, {
            status: PublishStatus.Published,
            serverUrl,
            publishId: network.id,
            url: network.url,
        })
        if (succeeded) setNetworks((current) => current.filter((entry) => entry.id !== network.id))
        setIsUnpublishing(false)
    }

    return (
        <>
            <MUIDialog
                id="published-networks-dialog"
                isOpen={true}
                closeable={!isUnpublishing}
                onClose={() => {
                    if (!isUnpublishing) onClose()
                }}
                title="Published networks"
                paperProps={{width: "36rem", maxWidth: "100%"}}
                footer={
                    <Button
                        disabled={isLoading || isUnpublishing}
                        onClick={() => setRefreshCount((count) => count + 1)}
                    >
                        Refresh
                    </Button>
                }
            >
                <Typography
                    variant="body2"
                    sx={{mb: 2}}
                >
                    Live sites for {orgName}. Sites remain live after their temporary networks expire or are deleted.
                </Typography>
                {isLoading ? (
                    <LinearProgress aria-label="Loading published networks" />
                ) : error ? (
                    <Alert severity="error">Unable to load published networks. {error}</Alert>
                ) : networks.length === 0 ? (
                    <Typography>No published networks.</Typography>
                ) : (
                    <Box sx={{display: "flex", flexDirection: "column", gap: 2}}>
                        {networks.map((network) => (
                            <Box
                                key={network.id}
                                component="section"
                                aria-label={network.name}
                            >
                                <Typography sx={{fontWeight: 600}}>{network.name}</Typography>
                                <PublishedNetworkUrl url={network.url} />
                                <Button
                                    disabled={isUnpublishing}
                                    onClick={() => setNetworkToUnpublish(network)}
                                    size="small"
                                >
                                    Unpublish
                                </Button>
                            </Box>
                        ))}
                    </Box>
                )}
            </MUIDialog>
            {networkToUnpublish && (
                <ConfirmationModal
                    id="published-network-unpublish-confirm"
                    title="Unpublish this network?"
                    content={
                        `"${networkToUnpublish.name}" will be taken offline at ${networkToUnpublish.url}. ` +
                        "Anyone using the link will lose access."
                    }
                    handleCancel={() => setNetworkToUnpublish(null)}
                    handleOk={() => void handleUnpublish(networkToUnpublish)}
                    okBtnLabel="Unpublish"
                />
            )}
        </>
    )
}
