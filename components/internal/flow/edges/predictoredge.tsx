// Import Flow Renderer
import {
  EdgeProps,
  getBezierPath,
  getMarkerEnd,
} from 'react-flow-renderer';

const PredictorEdge: React.FC<EdgeProps> = ({ id, sourceX, sourceY,
                                        targetX, targetY,
                                        sourcePosition, targetPosition,
                                        style = {}, markerEnd
                                        }) => {
    const edgePath = getBezierPath({
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

export default PredictorEdge;