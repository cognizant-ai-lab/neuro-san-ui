import {Card as BlueprintCard, Elevation} from "@blueprintjs/core"
import {useSession} from "next-auth/react"
import {FC, useEffect, useState} from "react"
import {Card} from "react-bootstrap"
import {Handle, NodeProps, Position, Node as RFNode} from "reactflow"

import {DataSource} from "../../../../controller/datasources/types"
import {DataTag} from "../../../../controller/datatag/types"
import loadDataTags from "../../../../controller/fetchdatataglist"
import {NotificationType, sendNotification} from "../../../../controller/notification"

export interface DataSourceNodeData {
    // Project ID that this new experiment belongs to.
    readonly ProjectID: number

    // Reference to the selected
    DataSource?: DataSource
    DataTag?: DataTag

    // We get passed the Node Definitions and a hook to update the definition
    readonly SelfStateUpdateHandler
    idExtension?: string
}

export type DataSourceNode = RFNode<DataSourceNodeData>

const DataSourceNodeComponent: FC<NodeProps<DataSourceNodeData>> = (props) => {
    const data = props.data
    const {idExtension = ""} = data
    const projectId: number = data.ProjectID

    const [taggedDataList, setTaggedDataList] = useState([])

    // Get the current user
    const {data: session} = useSession()
    const currentUser: string = session.user.name

    // Fetch the Data Sources and the Data Tags
    useEffect(() => {
        async function loadDataTag() {
            if (projectId != null) {
                const taggedDataListTmp = await loadDataTags(currentUser, projectId)
                if (taggedDataListTmp != null && taggedDataListTmp.length > 0) {
                    setTaggedDataList(taggedDataListTmp)
                } else {
                    // This is an internal error. Shouldn't have been able to create a project and an experiment
                    // without having data tags!
                    sendNotification(
                        NotificationType.error,
                        "Failed to load Data tags",
                        `Unable to load data tags for project ${projectId} due to an internal error. Your experiment` +
                            "may not behave as expected. Please report this to the development team"
                    )
                }
            }
        }

        void loadDataTag()
    }, [projectId])

    // Set the Selected Data Source Id at initialization of data tags
    useEffect(() => {
        if (taggedDataList.length > 0) {
            data.SelfStateUpdateHandler(taggedDataList[0].DataSource, taggedDataList[0].LatestDataTag)
        }
    }, [taggedDataList])

    // Create the Component structure
    return (
        <BlueprintCard
            id={`data-source-blueprint-card${idExtension}`}
            interactive={true}
            elevation={Elevation.TWO}
            style={{padding: 0, width: "8rem", height: "6rem"}}
        >
            <Card
                id={`data-source-card${idExtension}`}
                border="warning"
                style={{height: "100%"}}
            >
                <Card.Header id={`data-source-header${idExtension}`}>Data Source</Card.Header>
                <Card.Body id={`data-source-body${idExtension}`}>
                    {taggedDataList.length > 0 ? (
                        <select
                            name="dataset"
                            id={`data-source-node-select-dataset${idExtension}`}
                            style={{
                                fontSize: "10px",
                                width: "100%",
                                textOverflow: "ellipsis",
                                paddingLeft: 4,
                                paddingRight: 24,
                            }}
                            onChange={(event) => {
                                const filteredSelectedData = taggedDataList.filter(
                                    (dataTmp) => parseInt(event.target.value) === dataTmp.DataSource.id
                                )[0]
                                data.SelfStateUpdateHandler(
                                    filteredSelectedData.DataSource,
                                    filteredSelectedData.LatestDataTag
                                )
                            }}
                            defaultValue={taggedDataList.length > 0 && taggedDataList[0].DataSource.id}
                        >
                            {taggedDataList.map((dataTmp) => {
                                // Hack to get valid id into the option tag
                                // DEF: Right now there is only ever one data source, but someday
                                //      there will be more and Vince would like the id to correspond
                                //      to what is visible so he can verify more easily.
                                return (
                                    <option
                                        key={dataTmp.DataSource.id}
                                        id={`data-source-node-selected${idExtension}`}
                                        value={dataTmp.DataSource.id}
                                    >
                                        {dataTmp.DataSource.name}
                                    </option>
                                )
                            })}
                        </select>
                    ) : (
                        "<none>"
                    )}
                </Card.Body>
            </Card>
            <Handle
                id={`data-source-handle${idExtension}`}
                type="source"
                position={Position.Right}
            />
            <Handle
                id={`data-source-target-handle${idExtension}`}
                type="target"
                position={Position.Left}
            />
        </BlueprintCard>
    )
}

export default DataSourceNodeComponent
