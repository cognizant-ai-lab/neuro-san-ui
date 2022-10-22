// React components
import {Card as BlueprintCard, Elevation} from "@blueprintjs/core"
import {Popover, Text,} from "evergreen-ui"
import {ReactElement} from 'react'

// 3rd party components
import {Card} from "react-bootstrap"
import {GrSettingsOption} from "react-icons/gr"

// React Flow
import {
    Handle,
    Position as HandlePosition
} from 'react-flow-renderer'

// Define an interface for the structure
// of the nodes
export interface PredictorNodeData {
    // The ID of the nodes. This will
    // be important to issues name to
    // form elements. The form elements thus
    // will be named nodeID-formElementType
    readonly NodeID: string,

    readonly placeHolder: string
}

export default function RioNode(props): ReactElement {
    /*
    This function is responsible to render the Predictor Node
    */


    // Create the Component structure
    return <BlueprintCard
        interactive={ true } 
        elevation={ Elevation.TWO } 
        style={ { padding: 0, width: "10rem", height: "4rem" } }>
                
            <Card border="warning" style={{ height: "100%" }}>
                <Card.Body className="flex justify-center content-center">
                    <Text className="mr-2">{ "RIO" }</Text>
                    <Popover content={
                        <>
                          <p>Configure node</p>
                        </>
                    }>
                        <div className="flex">
                            <button type="button"
                                    className="mt-1"
                                    style={{height: 0}}>
                                <GrSettingsOption />
                            </button>
                        </div>
                    </Popover>
                </Card.Body>
            </Card>
            <Handle type="source" position={HandlePosition.Right} />
            <Handle type="target" position={HandlePosition.Left} />
        </BlueprintCard>
}
