import {NodeTypes as RFNodeTypes} from "reactflow"

import DataSourceNodeComponent, {DataSourceNode, DataSourceNodeData} from "./datasourcenode"
import ConfigurableNodeComponent, {ConfigurableNode, ConfigurableNodeData} from "./generic/configurableNode"
import PredictorNodeComponent from "./predictornode"
import PrescriptorNodeComponent, {PrescriptorNode, PrescriptorNodeData} from "./prescriptornode"

// Based on the declared nodes above we declare a constant holder to reference the Node objects. These references are
// later passed to the Flow component to render the graph
const NodeTypes: RFNodeTypes = {
    activation_node: ConfigurableNodeComponent,
    analytics_node: ConfigurableNodeComponent,
    category_reducer_node: ConfigurableNodeComponent,
    confabulator_node: ConfigurableNodeComponent,
    datanode: DataSourceNodeComponent,
    predictornode: PredictorNodeComponent,
    prescriptornode: PrescriptorNodeComponent,
    uncertaintymodelnode: ConfigurableNodeComponent,
}

export type NodeData = DataSourceNodeData | PrescriptorNodeData | ConfigurableNodeData

export type NodeType = DataSourceNode | PrescriptorNode | ConfigurableNode

export default NodeTypes
