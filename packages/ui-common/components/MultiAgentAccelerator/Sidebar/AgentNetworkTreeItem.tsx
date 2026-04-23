// Need to disable restricted imports because we want to import all MUI icons dynamically
// eslint-disable-next-line no-restricted-imports
import * as MuiIcons from "@mui/icons-material"
import BookmarkIcon from "@mui/icons-material/Bookmark"
import Delete from "@mui/icons-material/Delete"
import DownloadIcon from "@mui/icons-material/Download"
import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import IconButton from "@mui/material/IconButton"
import {useTheme} from "@mui/material/styles"
import Tooltip from "@mui/material/Tooltip"
import {
    TreeItemContent,
    TreeItemGroupTransition,
    TreeItemLabel,
    TreeItemProps,
    TreeItemRoot,
} from "@mui/x-tree-view/TreeItem"
import {TreeItemProvider} from "@mui/x-tree-view/TreeItemProvider"
import {useTreeItem} from "@mui/x-tree-view/useTreeItem"
import {FC, useRef} from "react"

import {NodeIndex} from "./TreeBuilder"
import {downloadFile, toSafeFilename} from "../../../utils/File"
import {cleanUpAgentName} from "../../AgentChat/Utils"

// Palette of colors we can use for tags
const TAG_COLORS = [
    "--bs-accent2-light",
    "--bs-accent1-medium",
    "--bs-accent3-medium",
    "--bs-accent3-dark",
    "--bs-green",
    "--bs-orange",
    "--bs-pink",
    "--bs-secondary",
    "--bs-yellow",
] as const

// Define a type for the TAG_COLORS array
type TagColor = (typeof TAG_COLORS)[number]

// Keep track of which tags have which colors so that the same tag always has the same color
const tagsToColors = new Map<string, TagColor>()

export interface AgentNetworkNodeProps extends TreeItemProps {
    readonly nodeIndex: NodeIndex
    readonly onDeleteNetwork?: (network: string, isExpired: boolean) => void
    readonly networkIconSuggestions: Record<string, string>
    readonly temporaryNetworkExpirationTimes?: Record<string, Date>
    readonly temporaryNetworkHoconStrings?: Record<string, string | null>
}

/**
 * Helper function to determine if a temporary network is expired based on its expiration date
 * @param expirationDate - Date object representing the expiration time of the temporary network
 * @returns boolean indicating whether the temporary network is expired
 */
const isTemporaryNetworkExpired = (expirationDate: Date): boolean => {
    return Date.now() > expirationDate.getTime()
}

/**
 * Custom Tree Item for MUI RichTreeView to display agent networks with tags
 * @param props - see AgentNetworkNode interface
 * @returns JSX.Element containing the custom tree item
 */
export const AgentNetworkTreeItem: FC<AgentNetworkNodeProps> = ({
    children,
    disabled,
    itemId,
    label,
    networkIconSuggestions,
    nodeIndex,
    onDeleteNetwork,
    temporaryNetworkExpirationTimes,
    temporaryNetworkHoconStrings,
}) => {
    const theme = useTheme()

    // We know all labels are strings because we set them that way in the tree view items
    const labelString = label as string
    const displayLabel = nodeIndex.get(itemId)?.displayName || cleanUpAgentName(labelString)

    const {getContextProviderProps, getRootProps, getContentProps, getLabelProps, getGroupTransitionProps} =
        useTreeItem({itemId, children, label, disabled})

    const rootRef = useRef<HTMLLIElement>(null)

    const isParent = Array.isArray(children) && children.length > 0
    const isChild = !isParent

    const agentNode = nodeIndex?.get(itemId)?.agentInfo

    // Only child items (the actual networks, not the containing folders) have tags. Retrieve tags from the
    // networkFolders data structure passed in as a prop. This could in theory be a custom property for the
    // RichTreeView item, but that isn't well-supported at this time.
    // Discussion: https://stackoverflow.com/questions/69481071/material-ui-how-to-pass-custom-props-to-a-custom-treeitem
    const tags = isChild ? agentNode?.tags || [] : []

    // Assign colors to tags as needed and store in tagsToColors map
    for (const tag of tags) {
        if (!tagsToColors.has(tag)) {
            const color = TAG_COLORS[tagsToColors.size % TAG_COLORS.length]
            tagsToColors.set(tag, color)
        }
    }

    // Determine if expired (temporary networks only)
    const expirationTime = temporaryNetworkExpirationTimes?.[itemId]
    const isTemporaryNetwork = Boolean(expirationTime)
    const isExpired = isChild && isTemporaryNetwork && isTemporaryNetworkExpired(expirationTime)
    const networkHocon = isTemporaryNetwork ? temporaryNetworkHoconStrings?.[itemId] : null

    const iconNameSuggestion = isTemporaryNetwork ? "HourglassTop" : isChild ? networkIconSuggestions?.[itemId] : null

    let muiIconElement = null
    if (iconNameSuggestion && MuiIcons[iconNameSuggestion as keyof typeof MuiIcons]) {
        const IconComponent = MuiIcons[iconNameSuggestion as keyof typeof MuiIcons]
        muiIconElement = <IconComponent sx={{fontSize: "1rem"}} />
    } else if (iconNameSuggestion) {
        console.warn(`Icon "${iconNameSuggestion}" not found in MUI icons library.`)
    }

    return (
        <TreeItemProvider {...getContextProviderProps()}>
            <TreeItemRoot
                {...getRootProps()}
                ref={rootRef}
                data-itemid={itemId}
            >
                <TreeItemContent
                    {...getContentProps()}
                    sx={{
                        cursor: isExpired ? "not-allowed" : "pointer",
                    }}
                >
                    <Box sx={{display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%"}}>
                        <Box sx={{display: "flex", alignItems: "center", gap: "0.25rem"}}>
                            <Tooltip
                                title={
                                    isChild && isExpired
                                        ? "Expired"
                                        : expirationTime && `Expires at ${expirationTime.toLocaleString()}`
                                }
                            >
                                <Box sx={{display: "flex", alignItems: "center", gap: "0.25rem"}}>
                                    {muiIconElement}
                                    <TreeItemLabel
                                        {...getLabelProps()}
                                        sx={{
                                            fontWeight: isParent ? "bold" : "normal",
                                            fontSize: isParent ? "1rem" : "0.9rem",
                                            color: isParent ? "var(--heading-color)" : null,
                                            opacity: isExpired ? 0.25 : 1,
                                            "&:hover": {
                                                textDecoration: "underline",
                                            },
                                        }}
                                    >
                                        {displayLabel}
                                    </TreeItemLabel>
                                </Box>
                            </Tooltip>
                            {isChild && tags?.length > 0 ? (
                                <Tooltip
                                    title={tags
                                        .slice()
                                        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
                                        .map((tag) => (
                                            <Chip
                                                key={tag}
                                                label={tag}
                                                style={{
                                                    margin: "0.25rem",
                                                    backgroundColor: `var(${tagsToColors.get(tag) || TAG_COLORS[0]})`,
                                                }}
                                            />
                                        ))}
                                    placement="right"
                                    arrow={true}
                                >
                                    <BookmarkIcon sx={{fontSize: "0.75rem", color: "var(--bs-accent1-medium)"}} />
                                </Tooltip>
                            ) : null}
                            {isTemporaryNetwork && networkHocon && (
                                <Tooltip title={isExpired ? "Expired" : "Download network definition"}>
                                    <span>
                                        <IconButton
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (isExpired) {
                                                    return
                                                }

                                                const fileName = `${toSafeFilename(labelString)}.hocon`
                                                downloadFile(networkHocon, fileName)
                                            }}
                                            disabled={isExpired}
                                            aria-label="Download network definition"
                                            size="small"
                                            sx={{
                                                padding: 0,
                                                color: "var(--bs-secondary)",
                                                "&:hover": {color: "var(--bs-secondary-dark)"},
                                                "&.Mui-disabled": {
                                                    color: "var(--bs-secondary)",
                                                    opacity: 0.3,
                                                },
                                            }}
                                        >
                                            <DownloadIcon sx={{fontSize: "0.75rem"}} />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            )}
                        </Box>
                        {isChild && isTemporaryNetwork && (
                            <Tooltip title="Delete network">
                                <Delete
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDeleteNetwork?.(itemId, isExpired)
                                    }}
                                    sx={{
                                        cursor: "pointer",
                                        fontSize: "1rem",
                                        "&:hover": {color: theme.palette.warning.main},
                                    }}
                                />
                            </Tooltip>
                        )}
                    </Box>
                </TreeItemContent>
                {children && <TreeItemGroupTransition {...getGroupTransitionProps()} />}
            </TreeItemRoot>
        </TreeItemProvider>
    )
}
