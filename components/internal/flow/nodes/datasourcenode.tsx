import React from "react";

// Import 3rd pary components
import { Card } from "react-bootstrap"
// Import React Flow
import {
    Handle,
    Position
} from 'react-flow-renderer'

import { Card as BleuprintCard, Elevation } from "@blueprintjs/core";

// Import types
import { 
    TaggedDataInfoList 
} from '../../../../pages/projects/[projectID]/experiments/new'

var debug = require('debug')('data_source_node')


export interface DataSourceNodeData {
    // Project ID that this new experiment belongs to.
    readonly ProjectID: string,

    // Data sources available
    readonly TaggedDataList: TaggedDataInfoList,

    // Data sources Selected
    readonly SelectedDataTag: any,

    // We get passed the Node Definitions and a hook to update the definition
    readonly SelfStateUpdateHandler: any,
}

export default function DataSourceNode(props): React.ReactElement {
    /*
    This function is responsible to render a form to select a
    DataSource.
    NOTE: THIS RENDERS FORMS ELEMENT BUT NOT THE FORM ITSELF
    THE FORM MUST BE RENDERED AS A PARENT CONTAINER OF THIS.
    */

    const data: DataSourceNodeData = props.data

    // Extract the DataTag Names
    const DataSourceNames: string[] = data.TaggedDataList.map(data => data.DataSource.name)

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
                            <select name='dataset' className="w-24"
                                onChange={
                                    event => {
                                        debug("Selected: ", event.target.value)
                                        const filteredSelectedData = data.TaggedDataList.filter(
                                            data => event.target.value === data.DataSource.name
                                        )[0]
                                        debug("FDS: ", filteredSelectedData)
                                        data.SelfStateUpdateHandler(
                                            filteredSelectedData
                                        )
                                    }
                                }
                                >
                                { DataSourceNames.map(dataSource => 
                                        <option key={dataSource} value={dataSource}>{dataSource}</option>
                                )}
                            </select>
                        </div>
                    </div>
                </Card.Body>
            </Card>
            <Handle type="source" position={Position.Right} />
        </BleuprintCard>
        
}
