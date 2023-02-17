// Import Flow Renderer
import {
  MarkerType,
  Position,
  getBezierPath,
  getMarkerEnd,
} from 'react-flow-renderer';
import { EdgeProps } from './proptype';

const PredictorEdge: React.FC<EdgeProps> = ({ id, sourceX, sourceY,
                                        targetX, targetY,
                                        sourcePosition, targetPosition,
                                        style = {}, arrowHeadType,
                                        markerEndId
                                        }) => {
    const edgePath = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    })
    const markerEnd = getMarkerEnd(arrowHeadType, markerEndId)

    return <path
                id={id}
                style={style}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
            />
}

export default PredictorEdge;