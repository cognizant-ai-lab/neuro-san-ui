import AdjustRoundedIcon from "@mui/icons-material/AdjustRounded"
import HubOutlinedIcon from "@mui/icons-material/HubOutlined"
import ScatterPlotOutlinedIcon from "@mui/icons-material/ScatterPlotOutlined"
import {ToggleButton, ToggleButtonGroup} from "@mui/material"
import Box from "@mui/material/Box"
import Tooltip from "@mui/material/Tooltip"
import Typography from "@mui/material/Typography"
import {FC, useCallback, useEffect, useMemo, useRef, useState} from "react"
import {
    applyNodeChanges,
    Background,
    ConnectionMode,
    ControlButton,
    Controls,
    EdgeTypes,
    NodeChange,
    ReactFlow,
    NodeTypes as RFNodeTypes,
    useReactFlow,
    useStore,
} from "reactflow"

import "reactflow/dist/style.css"
import {AgentNode, AgentNodeProps, NODE_HEIGHT, NODE_WIDTH} from "./AgentNode"
import {
    BACKGROUND_COLORS,
    BACKGROUND_COLORS_DARK_IDX,
    BASE_RADIUS,
    DEFAULT_FRONTMAN_X_POS,
    DEFAULT_FRONTMAN_Y_POS,
    HEATMAP_COLORS,
    LEVEL_SPACING,
} from "./const"
import {layoutLinear, layoutRadial} from "./GraphLayouts"
import {PlasmaEdge} from "./PlasmaEdge"
import {ConnectivityInfo, Origin} from "../../generated/neuro-san/OpenAPITypes"
import {usePreferences} from "../../state/Preferences"
import {ZIndexLayers} from "../../utils/zIndexLayers"

// #region: Types
export interface AgentFlowProps {
    readonly agentCounts?: Map<string, number>
    readonly agentsInNetwork: ConnectivityInfo[]
    readonly id: string
    readonly includedAgentIds: string[]
    readonly isAwaitingLlm?: boolean
    readonly originInfo?: Origin[]
}

type Layout = "radial" | "linear"
// #endregion: Types

const AgentFlow: FC<AgentFlowProps> = ({
    agentCounts,
    agentsInNetwork,
    id,
    isAwaitingLlm,
    includedAgentIds,
    originInfo,
}) => {
    const {fitView} = useReactFlow()

    const handleResize = useCallback(() => {
        fitView() // Adjusts the view to fit after resizing
    }, [fitView, isAwaitingLlm])

    useEffect(() => {
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [handleResize])

    // Save this as a mutable ref so child nodes see updates
    const originInfoRef = useRef<Origin[]>(originInfo)

    useEffect(() => {
        originInfoRef.current = originInfo
    }, [originInfo])

    const getOriginInfo = useCallback<() => Origin[]>(() => originInfoRef.current, [originInfoRef.current])

    const getIncludedAgentIds = useCallback<() => string[]>(() => includedAgentIds, [includedAgentIds])

    const [layout, setLayout] = useState<Layout>("radial")

    const [coloringOption, setColoringOption] = useState<"depth" | "heatmap">("depth")

    const [enableRadialGuides, setEnableRadialGuides] = useState<boolean>(true)

    const {darkMode} = usePreferences()

    // Shadow color for icon. TODO: use MUI theme system instead.
    const shadowColor = darkMode ? "255, 255, 255" : "0, 0, 0"

    const isHeatmap = coloringOption === "heatmap"

    // Create the flow layout depending on user preference
    // Memoize layoutResult so it only recalculates when relevant data changes
    const layoutResult = useMemo(
        () =>
            layout === "linear"
                ? layoutLinear(
                      // agentCounts key is optional, so we check if it's defined
                      isHeatmap ? agentCounts : undefined,
                      agentsInNetwork,
                      getIncludedAgentIds,
                      getOriginInfo,
                      isAwaitingLlm
                  )
                : layoutRadial(
                      // agentCounts key is optional, so we check if it's defined
                      isHeatmap ? agentCounts : undefined,
                      agentsInNetwork,
                      getIncludedAgentIds,
                      getOriginInfo,
                      isAwaitingLlm
                  ),
        [
            layout,
            coloringOption,
            agentCounts,
            agentsInNetwork,
            includedAgentIds,
            originInfo,
            isAwaitingLlm,
            getIncludedAgentIds,
            getOriginInfo,
        ]
    )

    const [nodes, setNodes] = useState(layoutResult.nodes)

    // Sync up the nodes with the layout result
    useEffect(() => {
        setNodes(layoutResult.nodes)
    }, [layoutResult.nodes])

    const edges = layoutResult.edges

    useEffect(() => {
        // Schedule a fitView after the layout is set to ensure the view is adjusted correctly
        setTimeout(() => {
            fitView()
        }, 50)
    }, [agentsInNetwork, layout])

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        setNodes((ns) =>
            applyNodeChanges<AgentNodeProps>(
                // For now we only allow dragging, no updates
                changes.filter((c) => c.type === "position"),
                ns
            )
        )
    }, [])

    const transform = useStore((state) => state.transform)

    // Why not just a "const"? See: https://reactflow.dev/learn/customization/custom-nodes
    // "It’s important that the nodeTypes are memoized or defined outside of the component. Otherwise React creates
    // a new object on every render which leads to performance issues and bugs."
    const nodeTypes: RFNodeTypes = useMemo(
        () => ({
            agentNode: AgentNode,
        }),
        [AgentNode]
    )

    const edgeTypes: EdgeTypes = useMemo(
        () => ({
            plasmaEdge: PlasmaEdge,
        }),
        [PlasmaEdge]
    )

    // Figure out the maximum depth of the network
    const maxDepth = useMemo(() => {
        return nodes?.reduce((max, node) => Math.max(node.data.depth, max), 0) + 1
    }, [nodes])

    // Generate radial guides for the network to guide the eye in the radial layout
    const getRadialGuides = () => {
        const circles = Array.from({length: maxDepth}).map((_, i) => (
            <circle
                id={`radial-guide-${BASE_RADIUS + (i + 1) * LEVEL_SPACING}`}
                key={`radial-guide-${BASE_RADIUS + (i + 1) * LEVEL_SPACING}`}
                cx={DEFAULT_FRONTMAN_X_POS + NODE_WIDTH / 2}
                cy={DEFAULT_FRONTMAN_Y_POS + NODE_HEIGHT / 2}
                r={BASE_RADIUS + (i + 1) * LEVEL_SPACING}
                stroke="var(--bs-gray-medium)"
                fill="none"
                opacity="0.25"
            />
        ))

        return (
            <svg
                id={`${id}-radial-guides`}
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                }}
            >
                <g
                    id={`${id}-radial-guides-group`}
                    transform={`translate(${transform[0]}, ${transform[1]}) scale(${transform[2]})`}
                >
                    {circles}
                </g>
            </svg>
        )
    }

    // Generate Legend for depth or heatmap colors
    function getLegend() {
        const palette = isHeatmap ? HEATMAP_COLORS : BACKGROUND_COLORS
        const title = isHeatmap ? "Heat" : "Depth"
        const length = isHeatmap ? HEATMAP_COLORS.length : Math.min(maxDepth, BACKGROUND_COLORS.length)
        return (
            <Box
                id={`${id}-legend`}
                sx={{
                    position: "absolute",
                    top: "5px",
                    right: "10px",
                    padding: "5px",
                    borderRadius: "5px",
                    boxShadow: `0 0 5px rgba(${shadowColor}, 0.3)`,
                    display: "flex",
                    alignItems: "center",
                    zIndex: ZIndexLayers.LAYER_2,
                }}
            >
                <Typography
                    id={`${id}-legend-label`}
                    sx={{
                        fontSize: "10px",
                        marginLeft: "0.2rem",
                    }}
                >
                    {title}
                </Typography>
                {/* Depth palette */}
                {Array.from({length}, (_, i) => (
                    <Box
                        id={`${id}-legend-depth-${i}`}
                        key={i}
                        style={{
                            alignItems: "center",
                            backgroundColor: palette[i],
                            borderRadius: "50%",
                            color: i < BACKGROUND_COLORS_DARK_IDX ? "var(--bs-primary)" : "var(--bs-white)",
                            display: "flex",
                            height: "15px",
                            justifyContent: "center",
                            marginLeft: "5px",
                            width: "15px",
                        }}
                    >
                        <Typography
                            id={`${id}-legend-depth-${i}-text`}
                            sx={{
                                fontSize: "8px",
                            }}
                        >
                            {i}
                        </Typography>
                    </Box>
                ))}
                <ToggleButtonGroup
                    id={`${id}-coloring-toggle`}
                    value={coloringOption}
                    exclusive={true}
                    onChange={(_, newValue) => {
                        if (newValue !== null) {
                            setColoringOption(newValue)
                        }
                    }}
                    sx={{
                        fontSize: "2rem",
                        zIndex: 10,
                        marginLeft: "0.5rem",
                        backgroundColor: darkMode ? "var(--bs-dark-mode-dim)" : "var(--bs-white)",
                        border: darkMode ? "1px solid var(--bs-gray-medium)" : "1px solid var(--bs-gray-light)",
                    }}
                    size="small"
                >
                    <ToggleButton
                        id={`${id}-depth-toggle`}
                        size="small"
                        value="depth"
                        sx={{
                            fontSize: "0.5rem",
                            height: "1rem",
                            color: darkMode ? "var(--bs-white)" : "var(--bs-dark-mode-dim)",
                            backgroundColor:
                                darkMode && coloringOption === "depth" ? "var(--bs-gray-medium)" : undefined,
                        }}
                    >
                        <Typography
                            id={`${id}-depth-label`}
                            sx={{
                                fontSize: "10px",
                            }}
                        >
                            Depth
                        </Typography>
                    </ToggleButton>
                    <ToggleButton
                        id={`${id}-heatmap-toggle`}
                        size="small"
                        value="heatmap"
                        sx={{
                            fontSize: "0.5rem",
                            height: "1rem",
                            color: darkMode ? "var(--bs-white)" : "var(--bs-black)",
                            backgroundColor: darkMode && isHeatmap ? "var(--bs-gray-medium)" : undefined,
                        }}
                    >
                        <Typography
                            id={`${id}-heatmap-label`}
                            sx={{
                                fontSize: "10px",
                            }}
                        >
                            Heatmap
                        </Typography>
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
        )
    }

    // Get the background color for the control buttons based on the layout and dark mode setting
    const getControlButtonBackgroundColor = (isActive: boolean) => {
        return isActive ? (darkMode ? "var(--bs-gray-dark)" : "var(--bs-gray-lighter)") : undefined
    }

    // Only show radial guides if radial layout is selected, radial guides are enabled, and it's not just Frontman
    const shouldShowRadialGuides = enableRadialGuides && layout === "radial" && maxDepth > 1

    // Generate the control bar for the flow, including layout and radial guides toggles
    const getControls = () => {
        return (
            <Controls
                id="react-flow-controls"
                position="top-left"
                style={{
                    position: "absolute",
                    top: "0px",
                    left: "0px",
                    height: "auto",
                    width: "auto",
                }}
                showInteractive={true}
            >
                <Tooltip
                    id="radial-layout-tooltip"
                    title="Radial layout"
                    placement="right"
                >
                    <span id="radial-layout-span">
                        <ControlButton
                            id="radial-layout-button"
                            onClick={() => setLayout("radial")}
                            style={{
                                backgroundColor: getControlButtonBackgroundColor(layout === "radial"),
                            }}
                        >
                            <HubOutlinedIcon
                                id="radial-layout-icon"
                                sx={{color: darkMode ? "var(--bs-white)" : "var(--bs-dark-mode-dim)"}}
                            />
                        </ControlButton>
                    </span>
                </Tooltip>
                <Tooltip
                    id="linear-layout-tooltip"
                    title="Linear layout"
                    placement="right"
                >
                    <span id="linear-layout-span">
                        <ControlButton
                            id="linear-layout-button"
                            onClick={() => setLayout("linear")}
                            style={{
                                backgroundColor: getControlButtonBackgroundColor(layout === "linear"),
                            }}
                        >
                            <ScatterPlotOutlinedIcon
                                id="linear-layout-icon"
                                sx={{color: darkMode ? "var(--bs-white)" : "var(--bs-dark-mode-dim)"}}
                            />
                        </ControlButton>
                    </span>
                </Tooltip>
                <Tooltip
                    id="radial-guides-tooltip"
                    title={`Enable/disable radial guides${
                        layout === "radial" ? "" : " (only available in radial layout)"
                    }`}
                    placement="right"
                >
                    <span id="radial-guides-span">
                        <ControlButton
                            id="radial-guides-button"
                            onClick={() => setEnableRadialGuides(!enableRadialGuides)}
                            style={{
                                backgroundColor: getControlButtonBackgroundColor(enableRadialGuides),
                            }}
                            disabled={layout !== "radial"}
                        >
                            <AdjustRoundedIcon
                                id="radial-guides-icon"
                                sx={{color: darkMode ? "var(--bs-white)" : "var(--bs-dark-mode-dim)"}}
                            />
                        </ControlButton>
                    </span>
                </Tooltip>
            </Controls>
        )
    }

    return (
        <Box
            id={`${id}-outer-box`}
            sx={{
                height: "100%",
                width: "100%",
                "& .react-flow__node": {
                    border: "var(--bs-border-width) var(--bs-border-style) var(--bs-black)",
                    borderRadius: "var(--bs-border-radius-2xl)",
                },
            }}
            className={darkMode ? "dark" : undefined}
        >
            <ReactFlow
                id={`${id}-react-flow`}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                fitView={true}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionMode={ConnectionMode.Loose}
            >
                {!isAwaitingLlm && (
                    <>
                        {agentsInNetwork?.length ? getLegend() : null}
                        <Background id={`${id}-background`} />
                        {getControls()}
                        {shouldShowRadialGuides ? getRadialGuides() : null}
                    </>
                )}
            </ReactFlow>
        </Box>
    )
}

export default AgentFlow
