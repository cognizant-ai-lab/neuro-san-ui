import {FC, useEffect, useState} from "react"

// Import 3rd party components
import { Card } from "react-bootstrap"

import {
    Handle,
    // eslint-disable-next-line no-shadow
    Node,
    NodeProps,
    Position
} from 'reactflow'

import { Card as BlueprintCard, Elevation } from "@blueprintjs/core";

// Import types
import loadTaggedDataList from "../../../../controller/fetchdatataglist";
import {DataSource} from "../../../../controller/datasources/types";
import {DataTag} from "../../../../controller/datatag/types";
import {useSession} from "next-auth/react";

export interface DataSourceNodeData {
    // Project ID that this new experiment belongs to.
    readonly ProjectID: number,

    // Reference to the selected
    DataSource?: DataSource,
    DataTag?: DataTag,

    // We get passed the Node Definitions and a hook to update the definition
    readonly SelfStateUpdateHandler
}

export type DataSourceNode = Node<DataSourceNodeData>;

const DataSourceNodeComponent: FC<NodeProps<DataSourceNodeData>> = (props) => {

    const data = props.data
    const projectId: number = data.ProjectID

    const [taggedDataList, setTaggedDataList] = useState([])

    // Get the current user
    const { data: session } = useSession()
    const currentUser: string = session.user.name

    // Fetch the Data Sources and the Data Tags
    useEffect(() => {
        async function loadDataTag() { setTaggedDataList(await loadTaggedDataList(currentUser, projectId)) }
        void loadDataTag()
    }, [projectId])

    // Set the Selected Data Source Id at initialization of data tags
    useEffect(() => {
        if (taggedDataList.length > 0) {
            data.SelfStateUpdateHandler(
                taggedDataList[0].DataSource,
                taggedDataList[0].LatestDataTag
            )
        }
    }, [taggedDataList])


    // Create the Component structure
    return <BlueprintCard id="data-source-blueprint-card"
        interactive={ true }
        elevation={ Elevation.TWO }
        style={ { padding: 0, width: "8rem", height: "6rem" } }>
            <Card id="data-source-card" border="warning" style={{height: "100%"}}>
                <Card.Header id="data-source-header">Data Source</Card.Header>
                <Card.Body id="data-source-body">
                    {
                        taggedDataList.length > 0
                        ?   <select name="dataset"
                                id="data-source-node-select-dataset"
                                style={{
                                    fontSize: "10px", width: "100%", textOverflow: "ellipsis", paddingLeft: 4,
                                    paddingRight: 24
                                }}
                                onChange={
                                     event => {
                                         const filteredSelectedData = taggedDataList.filter(
                                             dataTmp => parseInt(event.target.value) === dataTmp.DataSource.id
                                         )[0]
                                         data.SelfStateUpdateHandler(
                                             filteredSelectedData.DataSource,
                                             filteredSelectedData.LatestDataTag
                                         )
                                     }
                                 }
                                 defaultValue={taggedDataList.length > 0 && taggedDataList[0].DataSource.id}
                            >
                                {taggedDataList.map(dataTmp => {
                                    // Hack to get valid id into the option tag
                                    // DEF: Right now there is only ever one data source, but someday
                                    //      there will be more and Vince would like the id to correspond
                                    //      to what is visible so he can verify more easily.
                                    const id = `data-source-node-selected`;
                                    return  <option key={dataTmp.DataSource.id}
                                                id={id}
                                                value={dataTmp.DataSource.id}
                                            >
                                                {dataTmp.DataSource.name}
                                            </option>
                                    })}
                            </select>
                        : "<none>"
                    }
                </Card.Body>
            </Card>
            <Handle id="data-source-handle" type="source" position={Position.Right} />
            <Handle id={ `data-source-target-handle` } type="target" position={Position.Left} />
        </BlueprintCard>

}

export default DataSourceNodeComponent;
