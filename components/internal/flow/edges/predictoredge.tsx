// Import Flow Renderer
import {
  Edge,
  EdgeProps,
  getBezierPath
} from "reactflow"

type PredictorEdgeData = null

export type PredictorEdge = Edge<PredictorEdgeData>

const EMPTY_OBJECT = {}

const PredictorEdgeComponent: React.FC<EdgeProps<PredictorEdgeData>> = ({ id, sourceX, sourceY,
                                        targetX, targetY,
                                        sourcePosition, targetPosition,
                                        style = EMPTY_OBJECT, markerEnd}) => {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    })

    return <path
                id={id}
                style={style}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
            />
}

export default PredictorEdgeComponent;
