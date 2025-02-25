import AdjustRoundedIcon from "@mui/icons-material/AdjustRounded"
import HubOutlinedIcon from "@mui/icons-material/HubOutlined"
import ScatterPlotOutlinedIcon from "@mui/icons-material/ScatterPlotOutlined"
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
    Edge,
    EdgeProps,
    EdgeTypes,
    MarkerType,
    NodeChange,
    ReactFlow,
    ReactFlowInstance,
    Node as RFNode,
    NodeTypes as RFNodeTypes,
    useStore,
} from "reactflow"

import "reactflow/dist/style.css"
import {AgentNode, AgentNodeProps, NODE_HEIGHT, NODE_WIDTH} from "./AgentNode"
import {AnimatedEdge} from "./AnimatedEdge"
import {BACKGROUND_COLORS, BASE_RADIUS, DEFAULT_FRONTMAN_X_POS, DEFAULT_FRONTMAN_Y_POS, LEVEL_SPACING} from "./const"
import {layoutLinear, layoutRadial} from "./GraphLayouts"
import {ConnectivityInfo} from "../../generated/neuro_san/api/grpc/agent"

// #region: Types
interface AgentFlowProps {
    agentsInNetwork: ConnectivityInfo[]
    id: string
    selectedAgentId?: string
}

type Layout = "radial" | "linear"
// #endregion: Types

const AgentFlow: FC<AgentFlowProps> = ({agentsInNetwork, id, selectedAgentId}) => {
    // Save this as a mutable ref so child nodes see updates
    const selectedAgentIdRef = useRef<string>(selectedAgentId)
    const selectedSourceAgentId = useRef<string | undefined>(undefined)

    useEffect(() => {
        selectedAgentIdRef.current = selectedAgentId
    }, [selectedAgentId])

    const getSelectedAgentId = useCallback<() => string>(() => selectedAgentIdRef.current, [selectedAgentIdRef.current])
    const getSelectedSourceAgentId = useCallback<() => string>(
        () => selectedSourceAgentId.current,
        [selectedSourceAgentId.current]
    )

    const [flowInstance, setFlowInstance] = useState<ReactFlowInstance>(null)

    const [nodes, setNodes] = useState<RFNode<AgentNodeProps>[]>([])
    const [edges, setEdges] = useState<Edge<EdgeProps>[]>([])

    const [layout, setLayout] = useState<Layout>("radial")

    const [enableRadialGuides, setEnableRadialGuides] = useState<boolean>(true)

    useEffect(() => {
        flowInstance && setTimeout(flowInstance.fitView, 50)
    }, [flowInstance, nodes.length, edges.length, layout])

    // Create the flow layout depending on user preference
    useEffect(() => {
        if (agentsInNetwork?.length === 0) {
            return
        }

        switch (layout) {
            case "linear": {
                const linearLayout = layoutLinear(agentsInNetwork, getSelectedAgentId, getSelectedSourceAgentId)
                linearLayout.nodes && setNodes(linearLayout.nodes)
                linearLayout.edges && setEdges(linearLayout.edges)
                break
            }
            case "radial":
            default: {
                const radialLayout = layoutRadial(agentsInNetwork, getSelectedAgentId, getSelectedSourceAgentId)
                radialLayout.nodes && setNodes(radialLayout.nodes)
                radialLayout.edges && setEdges(radialLayout.edges)
                break
            }
        }
    }, [agentsInNetwork, layout, selectedAgentId, selectedSourceAgentId])

    const onNodesChange = useCallback((changes: NodeChange[]) => {
        setNodes((ns) =>
            applyNodeChanges<AgentNodeProps>(
                // For now we only allow dragging, no updates
                changes.filter((c) => c.type === "position"),
                ns
            )
        )
    }, [])

    const onInit = useCallback((reactFlowInstance: ReactFlowInstance) => {
        /*
        Helper function to adjust the flow when it is loaded.
        */
        reactFlowInstance.fitView()
        setFlowInstance(reactFlowInstance)
    }, [])

    // Highlight first edge we find connected to active agent. SOMETIMES THIS WILL BE WRONG if there are multiple
    // edges to the active agent but this is a start.
    // TODO: we really only want to highlight the one from the sender to the active agent, but we don't have
    // origins info yet. We don't know _who_ sent the message to the active agent so for now, we guess.
    useEffect(() => {
        let sourceAgentId: string

        /* eslint-disable newline-per-chained-call */
        const selectedAgentFirstEdge = edges.find((edge) => {
            if (edge.target.toLowerCase().trim() === getSelectedAgentId().toLowerCase().trim()) {
                sourceAgentId = edge.source // This is expected, we want the source if it's target
                return true
            }
            return false
        })
        /* eslint-enable newline-per-chained-call */

        if (sourceAgentId) {
            selectedSourceAgentId.current = sourceAgentId
        } else {
            selectedSourceAgentId.current = null
        }

        const edgesCopy = edges.map((edge: Edge<EdgeProps>) => ({
            ...edge,
            style: {
                strokeWidth: edge.id === selectedAgentFirstEdge?.id ? 3 : undefined,
                stroke: edge.id === selectedAgentFirstEdge?.id ? "var(--bs-primary)" : undefined,
            },
            markerEnd:
                edge.id === selectedAgentFirstEdge?.id
                    ? {
                          type: MarkerType.Arrow,
                          color: "darkblue", // var(--bs-primary) doesn't work here for some reason
                          width: 15,
                          height: 15,
                      }
                    : undefined,
            type: edge.id === selectedAgentFirstEdge?.id ? "animatedEdge" : undefined,
        }))

        setEdges(edgesCopy)
    }, [selectedAgentId])

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
            animatedEdge: AnimatedEdge,
        }),
        [AnimatedEdge]
    )

    // Figure out the maximum depth of the network
    const maxDepth = useMemo(() => {
        return nodes?.reduce((max, node) => (node.data.depth > max ? node.data.depth : max), 0)
    }, [nodes])

    // Generate radial guides for the network to guide the eye in the radial layout
    const getRadialGuides = () => {
        // If it's just Frontman, no need to draw guides
        if (maxDepth === 0) {
            return null
        }

        const circles = Array.from({length: maxDepth}).map((_, i) => (
            // eslint-disable-next-line enforce-ids-in-jsx/missing-ids
            <circle
                id={`radial-guide-${BASE_RADIUS + (i + 1) * LEVEL_SPACING}`}
                key={`radial-guide-${BASE_RADIUS + (i + 1) * LEVEL_SPACING}`}
                cx={DEFAULT_FRONTMAN_X_POS + NODE_WIDTH / 2}
                cy={DEFAULT_FRONTMAN_Y_POS + NODE_HEIGHT / 2}
                r={BASE_RADIUS + (i + 1) * LEVEL_SPACING}
                stroke="var(--bs-gray-medium)"
                fill="none"
                opacity="1"
            />
        ))

        return (
            <svg
                id={`${id}-radial-guides`}
                style={{
                    position: "absolute",
                    top: 0,
                    width: "100%",
                    left: 0,
                    height: "100%",
                    pointerEvents: "none", // Prevents blocking interactions with React Flow
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

    // Generate Legend for depth coloring
    function getLegend() {
        return (
            <Box
                id={`${id}-legend`}
                sx={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    backgroundColor: "white",
                    padding: "5px",
                    borderRadius: "5px",
                    boxShadow: "0 0 5px rgba(0,0,0,0.3)",
                    display: "flex",
                    flexDirection: "row",
                }}
            >
                <Typography
                    id={`${id}-legend-label`}
                    sx={{
                        fontSize: "10px",
                    }}
                >
                    Depth
                </Typography>
                {/*Frontman legend is different since it uses a non-palette color*/}
                <Box
                    id={`${id}-legend-depth-0`}
                    key={0}
                    style={{
                        alignItems: "center",
                        backgroundColor: "var(--bs-secondary)",
                        borderRadius: "50%",
                        color: "var(--bs-white)",
                        display: "flex",
                        height: "15px",
                        justifyContent: "center",
                        marginLeft: "5px",
                        width: "15px",
                    }}
                >
                    <Typography
                        id={`${id}-legend-depth-0-text`}
                        sx={{
                            fontSize: "8px",
                        }}
                    >
                        {0}
                    </Typography>
                </Box>
                {Array.from({length: Math.min(maxDepth, BACKGROUND_COLORS.length)}, (_, i) => (
                    <Box
                        id={`${id}-legend-depth-${i}`}
                        key={i + 1}
                        style={{
                            alignItems: "center",
                            backgroundColor: BACKGROUND_COLORS[i],
                            borderRadius: "50%",
                            color: i >= 4 ? "var(--bs-white)" : "var(--bs-primary)",
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
                            {i + 1}
                        </Typography>
                    </Box>
                ))}
            </Box>
        )
    }

    return (
        <Box
            id={`${id}-outer-box`}
            sx={{height: "100%", width: "100%"}}
            style={{}}
        >
            <ReactFlow
                id={`${id}-react-flow`}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onInit={onInit}
                fitView={true}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                connectionMode={ConnectionMode.Loose}
            >
                {layout === "radial" && maxDepth > 0 && getLegend()}
                <Background id={`${id}-background`} />
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
                                    backgroundColor: layout === "radial" ? "var(--bs-gray-lighter" : undefined,
                                }}
                            >
                                <HubOutlinedIcon
                                    id="radial-layout-icon"
                                    sx={{color: "black"}}
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
                                    backgroundColor: layout === "linear" ? "var(--bs-gray-lighter" : undefined,
                                }}
                            >
                                <ScatterPlotOutlinedIcon
                                    id="linear-layout-icon"
                                    sx={{color: "black"}}
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
                                    backgroundColor:
                                        layout === "radial" && enableRadialGuides ? "var(--bs-gray-lighter" : undefined,
                                }}
                                disabled={layout !== "radial"}
                            >
                                <AdjustRoundedIcon
                                    id="radial-guides-icon"
                                    sx={{color: "black"}}
                                />
                            </ControlButton>
                        </span>
                    </Tooltip>
                </Controls>
                {enableRadialGuides && getRadialGuides()}
            </ReactFlow>
        </Box>
    )
}

export default AgentFlow
