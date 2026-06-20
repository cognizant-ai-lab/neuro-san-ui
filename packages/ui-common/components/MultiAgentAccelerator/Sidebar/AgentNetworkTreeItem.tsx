// Need to disable restricted imports because we want to import all MUI icons dynamically
// eslint-disable-next-line no-restricted-imports
import * as MuiIcons from "@mui/icons-material"
import BookmarkIcon from "@mui/icons-material/Bookmark"
import Delete from "@mui/icons-material/Delete"
import DownloadIcon from "@mui/icons-material/Download"
import Edit from "@mui/icons-material/Edit"
import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import IconButton from "@mui/material/IconButton"
import Tooltip from "@mui/material/Tooltip"
import {useTreeItemModel} from "@mui/x-tree-view/hooks"
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

import {AgentNetworkTreeItemModel} from "./TreeBuilder"
import {downloadFile, toSafeFilename} from "../../../utils/File"
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
    readonly onDeleteNetwork?: (network: string, isExpired: boolean) => void
    readonly onEditNetwork?: (network: string) => void
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
    onDeleteNetwork,
    onEditNetwork,
}) => {
    const item = useTreeItemModel<AgentNetworkTreeItemModel>(itemId)

    // We know all labels are strings because we set them that way in the tree view items
    const labelString = label as string

    const {getContextProviderProps, getRootProps, getContentProps, getLabelProps, getGroupTransitionProps} =
        useTreeItem({itemId, children, label, disabled})

    const rootRef = useRef<HTMLLIElement>(null)

    const isParent = Array.isArray(children) && children.length > 0
    const isChild = !isParent

    const tags = item.tags ?? []

    // Assign colors to tags as needed and store in tagsToColors map
    for (const tag of tags) {
        if (!tagsToColors.has(tag)) {
            const color = TAG_COLORS[tagsToColors.size % TAG_COLORS.length]
            tagsToColors.set(tag, color)
        }
    }

    // Determine if expired (temporary networks only)
    const expirationTime = item?.temporaryNetworkExpirationTime
    const isTemporaryNetwork = Boolean(expirationTime)
    const isExpired = isChild && isTemporaryNetwork && isTemporaryNetworkExpired(expirationTime)
    const networkJson = item?.temporaryNetworkJson ?? null

    const iconNameSuggestion = item.iconSuggestion

    let muiIconElement

    // If the item is a child (i.e., a network), we want to render an icon next to it.
    if (isChild) {
        if (iconNameSuggestion) {
            if (MuiIcons[iconNameSuggestion as keyof typeof MuiIcons]) {
                // If the icon name suggestion is valid, use it to render the icon
                const IconComponent = MuiIcons[iconNameSuggestion as keyof typeof MuiIcons]
                muiIconElement = <IconComponent sx={{fontSize: "1rem"}} />
            } else {
                // If the icon name suggestion is not valid, use a default icon
                muiIconElement = <MuiIcons.Hub sx={{fontSize: "1rem"}} />
            }
        } else {
            // If no icon name suggestion is provided, use a default icon
            muiIconElement = <MuiIcons.Hub sx={{fontSize: "1rem"}} />
        }
    } else {
        // Use folder icon for parent items (i.e., folders)
        muiIconElement = <MuiIcons.Folder sx={{fontSize: "1rem"}} />
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
                                        {item.displayName}
                                    </TreeItemLabel>
                                </Box>
                            </Tooltip>
                            {isChild && tags.length > 0 ? (
                                <Tooltip
                                    title={[...tags]
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
                        </Box>
                        {isChild && isTemporaryNetwork && (
                            <Box sx={{display: "flex", alignItems: "center", gap: "0.25rem", marginLeft: "auto"}}>
                                {networkJson && (
                                    <Tooltip title={isExpired ? "Expired" : "Download network definition"}>
                                        <span>
                                            <IconButton
                                                onClick={(e) => {
                                                    e.stopPropagation()

                                                    const fileName = `${toSafeFilename(labelString)}.json`
                                                    downloadFile(networkJson, fileName)
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
                                <Tooltip title="Edit this network">
                                    <span>
                                        <IconButton
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onEditNetwork?.(itemId)
                                            }}
                                            disabled={isExpired}
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
                                            <Edit sx={{fontSize: "0.75rem"}} />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Delete network">
                                    <Delete
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDeleteNetwork?.(itemId, isExpired)
                                        }}
                                        sx={{
                                            color: "var(--bs-secondary)",
                                            "&:hover": {color: (theme) => theme.palette.warning.main},
                                            "&.Mui-disabled": {
                                                color: "var(--bs-secondary)",
                                                opacity: 0.3,
                                            },
                                            cursor: "pointer",
                                            fontSize: "1rem",
                                        }}
                                    />
                                </Tooltip>
                            </Box>
                        )}
                    </Box>
                </TreeItemContent>
                {children && <TreeItemGroupTransition {...getGroupTransitionProps()} />}
            </TreeItemRoot>
        </TreeItemProvider>
    )
}
