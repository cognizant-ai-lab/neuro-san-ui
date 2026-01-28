import * as MuiIcons from "@mui/icons-material"
import BookmarkIcon from "@mui/icons-material/Bookmark"
import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import Tooltip from "@mui/material/Tooltip"
import {useTreeItem} from "@mui/x-tree-view"
import {
    TreeItemContent,
    TreeItemGroupTransition,
    TreeItemLabel,
    TreeItemProps,
    TreeItemRoot,
} from "@mui/x-tree-view/TreeItem"
import {TreeItemProvider} from "@mui/x-tree-view/TreeItemProvider"
import {FC} from "react"

import {AgentInfo} from "../../../generated/neuro-san/NeuroSanClient"
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

interface AgentNetworkNodeProps extends TreeItemProps {
    readonly nodeIndex: Map<string, AgentInfo>
    setSelectedNetwork: (network: string) => void
    shouldDisableTree: boolean
    iconSuggestions: Record<string, string>
}

/**
 * Custom Tree Item for MUI RichTreeView to display agent networks with tags
 * @param props - see AgentNetworkNode interface
 * @returns JSX.Element containing the custom tree item
 */
export const AgentNetworkNode: FC<AgentNetworkNodeProps> = ({
    children,
    disabled,
    itemId,
    label,
    nodeIndex,
    setSelectedNetwork,
    shouldDisableTree,
    iconSuggestions,
}) => {
    // We know all labels are strings because we set them that way in the tree view items
    const labelString = label as string

    const {getContextProviderProps, getRootProps, getContentProps, getLabelProps, getGroupTransitionProps} =
        useTreeItem({itemId, children, label, disabled})

    const isParent = Array.isArray(children) && children.length > 0
    const isChild = !isParent

    const selectNetworkHandler = (network: string) => {
        setSelectedNetwork?.(network)
    }

    const agentNode = nodeIndex?.get(itemId)

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

    // retrieve path for this network

    const path = isChild ? agentNode?.agent_name : null
    const suggestedIconName = isChild ? iconSuggestions?.[itemId] : null

    let muiIconElement = null
    if (suggestedIconName && MuiIcons[suggestedIconName as keyof typeof MuiIcons]) {
        const IconComponent = MuiIcons[suggestedIconName as keyof typeof MuiIcons]
        muiIconElement = <IconComponent sx={{fontSize: "1rem"}} />
    }

    return (
        <TreeItemProvider {...getContextProviderProps()}>
            <TreeItemRoot {...getRootProps()}>
                <TreeItemContent
                    key={labelString}
                    {...getContentProps()}
                    {...(isParent || shouldDisableTree ? {} : {onClick: () => selectNetworkHandler(path)})}
                >
                    <Box sx={{display: "flex", alignItems: "center", gap: "0.25rem"}}>
                        <Box sx={{display: "flex", alignItems: "center", gap: "0.25rem"}}>
                            {muiIconElement}
                            <TreeItemLabel
                                {...getLabelProps()}
                                sx={{
                                    fontWeight: isParent ? "bold" : "normal",
                                    fontSize: isParent ? "1rem" : "0.9rem",
                                    color: isParent ? "var(--heading-color)" : null,
                                    "&:hover": {
                                        textDecoration: "underline",
                                    },
                                }}
                            >
                                {cleanUpAgentName(labelString)}
                            </TreeItemLabel>
                        </Box>
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
                    </Box>
                </TreeItemContent>
                {children && <TreeItemGroupTransition {...getGroupTransitionProps()} />}
            </TreeItemRoot>
        </TreeItemProvider>
    )
}
