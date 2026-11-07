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
import {styled, useTheme} from "@mui/material/styles"
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
import {motion, useReducedMotion} from "motion/react"
import {FC, useRef} from "react"

import {AgentNetworkTreeItemModel} from "./TreeBuilder"
import {useEnvironmentStore} from "../../../state/Environment"
import {usePublishServerUrl} from "../../../state/Publish"
import {getSheen, SHEEN_EASE, sheenGradient} from "../../../Theme/sheen"
import {downloadFile} from "../../../utils/File"
import {PublishIconButton} from "../Publish/PublishIconButton"

//#region Constants

// Accessible names shared between each action's tooltip title and its aria-label.
export const EDIT_NETWORK_LABEL = "Edit this network"
export const DOWNLOAD_NETWORK_DEFINITION_LABEL = "Download network definition"

// Palette of theme colors we can use for tags (MUI palette keys; each has .main and .contrastText)
const TAG_COLORS = ["primary", "secondary", "info", "success", "warning", "error"] as const

// Shared styling for the row's action buttons (download, edit, ...). Disabled state keeps the base
// color and only dims via opacity.
const ActionIconButton = styled(IconButton)(({theme}) => ({
    padding: 0,
    color: (theme.vars ?? theme).palette.primary.main,
    "&:hover": {color: (theme.vars ?? theme).palette.primary.dark},
    "&.Mui-disabled": {
        opacity: 0.3,
    },
}))

//#endregion Constants

//#region Types and Interfaces
export interface AgentNetworkNodeProps extends TreeItemProps {
    readonly onDeleteNetwork?: (network: string, isExpired: boolean) => void
    readonly onEditNetwork?: (network: string) => void
}
// Define a type for the TAG_COLORS array
type TagColor = (typeof TAG_COLORS)[number]

//#endregion Types and Interfaces

// Keep track of which tags have which colors so that the same tag always has the same color
const tagsToColors = new Map<string, TagColor>()

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

    const {
        getContextProviderProps,
        getRootProps,
        getContentProps,
        getLabelProps,
        getGroupTransitionProps,
        status: itemStatus,
    } = useTreeItem({itemId, children, label, disabled})

    const reduceMotion = useReducedMotion()
    const theme = useTheme()
    const sheen = getSheen(theme)

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
    const networkHocon = item?.temporaryNetworkHocon ?? null
    const enablePublishing = useEnvironmentStore((state) => state.enablePublishing)
    const publishServerUrl = usePublishServerUrl()
    const networkName = item?.temporaryNetworkName
    const showPublishButton = enablePublishing && Boolean(publishServerUrl) && networkHocon && networkName

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
        muiIconElement = <MuiIcons.Folder sx={{fontSize: "0.85rem", color: "text.secondary"}} />
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
                        borderRadius: "10px",
                        cursor: isExpired ? "not-allowed" : "pointer",
                        position: "relative",
                        transition: `background-color 0.2s ${SHEEN_EASE}`,
                        // The selected look is drawn by the gliding indicator below, not a background
                        "&.Mui-selected, &.Mui-selected:hover, &.Mui-selected.Mui-focused": {
                            backgroundColor: "transparent",
                        },
                    }}
                >
                    {itemStatus.selected && (
                        // Selected network: accent tint with a slim iridescent bar on the left edge. Shares a layoutId
                        // across items so it springs from the previously selected network to the new one.
                        <motion.span
                            aria-hidden={true}
                            className="agent-network-selection-indicator"
                            layoutId="agent-network-selection"
                            style={{
                                backgroundColor: sheen.tint,
                                backgroundImage: sheenGradient(theme, 180),
                                backgroundPosition: "left 2px center",
                                backgroundRepeat: "no-repeat",
                                backgroundSize: "3px 65%",
                                borderRadius: "10px",
                                boxShadow: `inset 0 0 0 1px ${sheen.glassBorder}`,
                                inset: 0,
                                pointerEvents: "none",
                                position: "absolute",
                                zIndex: 0,
                            }}
                            transition={
                                reduceMotion ? {duration: 0} : {type: "spring", stiffness: 420, damping: 34, mass: 0.7}
                            }
                        />
                    )}
                    <Box
                        sx={{
                            alignItems: "center",
                            display: "flex",
                            justifyContent: "space-between",
                            position: "relative",
                            width: "100%",
                            zIndex: 1,
                        }}
                    >
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
                                            // Folders read as small uppercase section labels (overline style)
                                            fontWeight: isParent ? 600 : "normal",
                                            fontSize: isParent ? "0.7rem" : "0.9rem",
                                            letterSpacing: isParent ? "0.12em" : null,
                                            textTransform: isParent ? "uppercase" : null,
                                            color: isParent ? "text.secondary" : null,
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
                                                sx={{
                                                    margin: "0.25rem",
                                                    backgroundColor: `${tagsToColors.get(tag) || TAG_COLORS[0]}.main`,
                                                    color: `${tagsToColors.get(tag) || TAG_COLORS[0]}.contrastText`,
                                                }}
                                            />
                                        ))}
                                    placement="right"
                                    arrow={true}
                                >
                                    <BookmarkIcon sx={{fontSize: "0.75rem", color: "secondary.main"}} />
                                </Tooltip>
                            ) : null}
                        </Box>
                        {isChild && isTemporaryNetwork && (
                            <Box sx={{display: "flex", alignItems: "center", gap: "0.25rem", marginLeft: "auto"}}>
                                {showPublishButton && (
                                    <PublishIconButton
                                        isExpired={isExpired}
                                        displayName={item.displayName}
                                        hocon={networkHocon}
                                        id={`${itemId}-publish`}
                                        networkId={itemId}
                                        networkName={networkName}
                                    />
                                )}
                                {networkHocon && (
                                    <Tooltip title={isExpired ? "Expired" : DOWNLOAD_NETWORK_DEFINITION_LABEL}>
                                        <span>
                                            <ActionIconButton
                                                onClick={(e) => {
                                                    // The button is disabled while expired, so no need to guard here.
                                                    e.stopPropagation()
                                                    downloadFile(networkHocon, item.downloadFileName, "text/plain")
                                                }}
                                                disabled={isExpired}
                                                aria-label={DOWNLOAD_NETWORK_DEFINITION_LABEL}
                                                size="small"
                                            >
                                                <DownloadIcon sx={{fontSize: "0.75rem"}} />
                                            </ActionIconButton>
                                        </span>
                                    </Tooltip>
                                )}
                                <Tooltip title={EDIT_NETWORK_LABEL}>
                                    <span>
                                        <ActionIconButton
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onEditNetwork?.(itemId)
                                            }}
                                            disabled={isExpired}
                                            aria-label={EDIT_NETWORK_LABEL}
                                            size="small"
                                        >
                                            <Edit sx={{fontSize: "0.75rem"}} />
                                        </ActionIconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Delete network">
                                    <Delete
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDeleteNetwork?.(itemId, isExpired)
                                        }}
                                        sx={{
                                            color: "primary.main",
                                            "&:hover": {color: "error.main"},
                                            "&.Mui-disabled": {
                                                opacity: 0.3,
                                            },
                                            cursor: "pointer",
                                            fontSize: "0.75rem",
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
