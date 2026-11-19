// Need to disable restricted imports because we want to import all MUI icons dynamically
// eslint-disable-next-line no-restricted-imports
import * as MuiIcons from "@mui/icons-material"
import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import IconButton from "@mui/material/IconButton"
import {styled, SxProps, Theme, useTheme} from "@mui/material/styles"
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
import {motion} from "motion/react"
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

//#endregion Types and Interfaces

// Step size around the color wheel. This gives maximum color separation between tags while still being visually
// appealing.
const GOLDEN_ANGLE_DEGREES = 137.5

/**
 * Tinted chip style for the tag at a given position in the list. OKLCH keeps the perceived lightness the same for
 * every hue, so the label stays readable in both themes.
 * @param index - the tag's position in the list
 * @returns sx styles for the tag's Chip
 */
const tagChipSx =
    (index: number): SxProps<Theme> =>
    (theme) => {
        const hueDegrees = (index * GOLDEN_ANGLE_DEGREES) % 360
        return {
            margin: "0.25rem",
            fontWeight: 500,
            color: `oklch(0.42 0.14 ${hueDegrees})`,
            backgroundColor: `oklch(0.65 0.15 ${hueDegrees} / 0.14)`,
            border: `1px solid oklch(0.6 0.15 ${hueDegrees} / 0.55)`,
            ...theme.applyStyles("dark", {
                color: `oklch(0.86 0.1 ${hueDegrees})`,
                backgroundColor: `oklch(0.7 0.15 ${hueDegrees} / 0.22)`,
                borderColor: `oklch(0.72 0.14 ${hueDegrees} / 0.7)`,
            }),
        }
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

    const {
        getContextProviderProps,
        getRootProps,
        getContentProps,
        getLabelProps,
        getGroupTransitionProps,
        status: itemStatus,
    } = useTreeItem({itemId, children, label, disabled})

    const theme = useTheme()
    const sheen = getSheen(theme)

    const rootRef = useRef<HTMLLIElement>(null)

    const isParent = Array.isArray(children) && children.length > 0
    const isChild = !isParent

    const tags = item.tags ?? []

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
        muiIconElement = itemStatus.expanded ? (
            <MuiIcons.DriveFolderUpload sx={{fontSize: "0.85rem", color: "text.secondary"}} />
        ) : (
            <MuiIcons.Folder sx={{fontSize: "0.85rem", color: "text.secondary"}} />
        )
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
                            transition={{type: "spring", stiffness: 420, damping: 34, mass: 0.7}}
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
                                            typography: "body2",
                                            ...(isParent && {
                                                color: "text.secondary",
                                                fontWeight: theme.typography.fontWeightMedium,
                                                letterSpacing: theme.typography.button.letterSpacing,
                                                textTransform: "uppercase",
                                                typography: "subtitle1",
                                            }),
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
                                        .map((tag, index) => (
                                            <Chip
                                                key={tag}
                                                label={tag}
                                                sx={tagChipSx(index)}
                                            />
                                        ))}
                                    placement="right"
                                    arrow={true}
                                >
                                    <MuiIcons.Bookmark sx={{fontSize: "0.75rem", color: "secondary.main"}} />
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
                                                <MuiIcons.Download sx={{fontSize: "0.75rem"}} />
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
                                            <MuiIcons.Edit sx={{fontSize: "0.75rem"}} />
                                        </ActionIconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Delete network">
                                    <MuiIcons.Delete
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
