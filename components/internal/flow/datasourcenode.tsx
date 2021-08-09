// Import React components
import { useState, useEffect } from 'react'

// Import 3rd pary components
import { Card } from "react-bootstrap"
// Import React Flow
import {
    Handle,
    Position
} from 'react-flow-renderer'

import { Card as BleuprintCard, Elevation } from "@blueprintjs/core";

// Import types
import { DataSources } from "../../../controller/datasources/types"

// Import Controller
import { FetchClientSideDataSources } from '../../../controller/datasources/fetch'
import { ClientFetchCAOMapping } from '../../../controller/datatag/fetch'

// Import Constants
import { 
    InputDataNodeID
} from '../../../const'

export interface DataSourceNodeData {
    // Project ID that this new experiment belongs to.
    readonly ProjectID: string,

    // We get passed the Node Definitions and a hook to update the defintion
    readonly NodeDefs: any,
    readonly UpdateNodeDefs: any,

    // A function to update the state of the CAO Map for the
    // selected data source.
    readonly UpdateSelectedSourceCAOMap: any
}

export default function DataSourceNode(props): React.ReactElement {
    /*
    This function is responsible to render a form to select a
    DataSource.
    NOTE: THIS RENDERS FORMS ELEMENT BUT NOT THE FORM ITSELF
    THE FORM MUST BE RENDERED AS A PARENT CONTAINER OF THIS.
    */

    const data: DataSourceNodeData = props.data

    // Use state to keep track of the availaible data sources
    const [dataSources, setDataSources] = useState([])

    // Create a helper function to update parent states
    const updateParentState = selectedDataSourceObj => {

        let updatedState = {...data.NodeDefs}
        updatedState[InputDataNodeID] = {
            "s3_url": selectedDataSourceObj.s3_url
        }
        data.UpdateNodeDefs(updatedState)
        data.UpdateSelectedSourceCAOMap(ClientFetchCAOMapping(selectedDataSourceObj.id))

    }

    // We use the use Effect hook here to ensure that we can provide
    // no dependancies for state update except for the ProjectID passed through
    // the props. Having no dependancies here would ideally suffice except for the
    // fact that it fails on page refresh. In this specific case it acts
    // as DidComponentUpdate function for class Components or similar to
    // getInitialProps/getServerSideProps for a NextJS Component.
    // Here useEffect also provides no clean up function
    useEffect(() => {

        // Invoke the controller
        const dataSources: DataSources = FetchClientSideDataSources(data.ProjectID)
        setDataSources(dataSources)

        // Update the parent
        updateParentState(dataSources[0])

    }, [data.ProjectID])

    
    // Create the Component structure
    return <BleuprintCard 
        interactive={ true } 
        elevation={ Elevation.TWO } 
        style={ { padding: 0, width: "8rem", height: "6rem" } }>
            <Card border="warning" style={{height: "100%"}}>
                <Card.Header>Data Source</Card.Header>
                <Card.Body>
                    <div className="flex-col flex content-center">
                        <div className="flex justify-between mb-4 content-center">
                            {/* <label className="m-0">Name: </label>  */}
                            <select name='dataset' className="w-24" 
                                onChange={
                                    event => updateParentState(
                                            dataSources.filter(
                                                dataSource => event.target.value === dataSource.id
                                            )[0]
                                        )
                                }>
                                { dataSources.map(dataSource => 
                                        <option key={dataSource.id} value={dataSource.id}>{dataSource.id}</option>
                                )}
                            </select>
                        </div>
                    </div>
                </Card.Body>
            </Card>
            <Handle type="source" position={Position.Right} />
        </BleuprintCard>
        
}
