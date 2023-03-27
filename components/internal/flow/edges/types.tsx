// Import Custom Components
import { EdgeTypes as RFEdgeTypes } from 'reactflow';
import PredictorEdgeComponent, { PredictorEdge } from './predictoredge';
import PrescriptorEdgeComponent, { PrescriptorEdge } from './prescriptoredge'

// Based on the declared edges above we declare a constant holder
// to reference the Node objects. These references are later passed
// to the Flow component to render the graph
const EdgeTypes: RFEdgeTypes = {
    prescriptoredge: PrescriptorEdgeComponent,
    predictoredge: PredictorEdgeComponent
}

export type EdgeType = PrescriptorEdge | PredictorEdge;

export default EdgeTypes;
