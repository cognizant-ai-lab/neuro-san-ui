// Import Custom Components
import DataSourceNode from './datasourcenode'
import PredictorNode from './predictornode'
import PrescriptorNode from './prescriptornode'
import UncertaintyModelNode from './uncertaintyModelNode'

// Based on the declared nodes above we declare a constant holder
// to reference the Node objects. These references are later passed
// to the Flow component to render the graph
const NodeTypes = {
    datanode: DataSourceNode,
    predictornode: PredictorNode,
    prescriptornode: PrescriptorNode,
    uncertaintymodelnode: UncertaintyModelNode
}

export default NodeTypes;
