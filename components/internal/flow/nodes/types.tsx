import {NodeTypes as RFNodeTypes} from "reactflow"

import DataSourceNodeComponent, {DataSourceNode, DataSourceNodeData} from "./datasourcenode"
import ConfigurableNodeComponent, {ConfigurableNode, ConfigurableNodeData} from "./generic/configurableNode"
import PredictorNodeComponent, {PredictorNode, PredictorNodeData} from "./predictornode"
import PrescriptorNodeComponent, {PrescriptorNode, PrescriptorNodeData} from "./prescriptornode"

// Based on the declared nodes above we declare a constant holder to reference the Node objects. These references are
// later passed to the Flow component to render the graph
const NodeTypes: RFNodeTypes = {
    datanode: DataSourceNodeComponent,
    predictornode: PredictorNodeComponent,
    prescriptornode: PrescriptorNodeComponent,
    uncertaintymodelnode: ConfigurableNodeComponent,
    llmnode: ConfigurableNodeComponent,
    category_reducer_node: ConfigurableNodeComponent,
}

export type NodeData = DataSourceNodeData | PredictorNodeData | PrescriptorNodeData | ConfigurableNodeData

export type NodeType = DataSourceNode | PredictorNode | PrescriptorNode | ConfigurableNode

export default NodeTypes
