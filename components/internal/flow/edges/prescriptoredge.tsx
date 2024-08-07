import {FC} from "react"
import {Edge, EdgeProps, getBezierPath} from "reactflow"
type PrescriptorEdgeData = {
    idExtension?: string
}

export type PrescriptorEdge = Edge<PrescriptorEdgeData>

const EMPTY_OBJECT = {}

const PrescriptorEdgeComponent: FC<EdgeProps<PrescriptorEdgeData>> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = EMPTY_OBJECT,
    data,
    markerEnd,
}) => {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    })

    const idExtension = data?.idExtension ?? ""

    // XXX  This could use some GetElementIndex love similar to what is going on
    //      in predictornode, prescriptornode, uncertaintyModelNode
    const flowPrefix = `prescriptoredge-${id}`

    return (
        <path
            id={`${flowPrefix}${idExtension}`}
            style={style}
            className="react-flow__edge-path"
            d={edgePath}
            markerEnd={markerEnd}
        />
    )
}

export default PrescriptorEdgeComponent
