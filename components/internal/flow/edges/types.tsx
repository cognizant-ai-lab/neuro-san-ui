// Import Custom Components
import PredictorEdge from './predictoredge';
import PrescriptorEdge from './prescriptoredge'

// Based on the declared edges above we declare a constant holder
// to reference the Node objects. These references are later passed
// to the Flow component to render the graph
const EdgeTypes = {
    prescriptoredge: PrescriptorEdge,
    predictoredge: PredictorEdge
}

export default EdgeTypes;
