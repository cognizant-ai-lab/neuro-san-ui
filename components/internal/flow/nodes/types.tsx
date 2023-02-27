// Import Custom Components
import { NodeTypes as RFNodeTypes } from 'react-flow-renderer'
import DataSourceNodeComponent, { DataSourceNode, DataSourceNodeData } from './datasourcenode'
import PredictorNodeComponent, { PredictorNode, PredictorNodeData } from './predictornode'
import PrescriptorNodeComponent, { PrescriptorNode, PrescriptorNodeData } from './prescriptornode'
import UncertaintyModelNodeComponent, { UncertaintyModelNode, UncertaintyModelNodeData } from './uncertaintyModelNode'

// Based on the declared nodes above we declare a constant holder
// to reference the Node objects. These references are later passed
// to the Flow component to render the graph
const NodeTypes: RFNodeTypes = {
    datanode: DataSourceNodeComponent,
    predictornode: PredictorNodeComponent,
    prescriptornode: PrescriptorNodeComponent,
    uncertaintymodelnode: UncertaintyModelNodeComponent
}

export type NodeData = DataSourceNodeData | PredictorNodeData | PrescriptorNodeData | UncertaintyModelNodeData;

export type NodeType = DataSourceNode | PredictorNode | PrescriptorNode | UncertaintyModelNode;

export default NodeTypes;
