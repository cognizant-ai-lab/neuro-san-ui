import {Card, CardContent, CardHeader} from "@mui/material"
import Tooltip from "@mui/material/Tooltip"
import {FC, useEffect} from "react"
import {BsDatabaseGear} from "react-icons/bs"
import {Handle, NodeProps, Position, Node as RFNode} from "reactflow"

import {DataSource, DataTag} from "../../../../generated/metadata"
import {TaggedDataInfo} from "../../../../pages/projects/[projectID]/experiments/new"

export interface DataSourceNodeData {
    // Project ID that this new experiment belongs to.
    readonly ProjectID: number

    // Reference to the selected
    DataSource?: DataSource
    DataTag?: DataTag

    // We get passed the Node Definitions and a hook to update the definition
    readonly SelfStateUpdateHandler
    idExtension?: string

    // Flag to determine whether node is in read only state
    readOnlyNode?: boolean

    // Tagged Data list for data source node
    taggedDataList?: TaggedDataInfo[]
}

export type DataSourceNode = RFNode<DataSourceNodeData>

const DataSourceNodeComponent: FC<NodeProps<DataSourceNodeData>> = (props) => {
    const data = props.data
    const {
        idExtension = "",
        readOnlyNode = false,
        taggedDataList = [],
    }: {idExtension?: string; readOnlyNode?: boolean; taggedDataList?: TaggedDataInfo[]} = data
    const projectId: number = data.ProjectID
    const dataSource: DataSource = data.DataSource

    // Set the Selected Data Source Id at initialization of data tags
    useEffect(() => {
        if (taggedDataList.length > 0) {
            data.SelfStateUpdateHandler(taggedDataList[0].DataSource, taggedDataList[0].LatestDataTag)
        }
    }, [taggedDataList])

    // Return the data source node card
    return (
        <Card
            id={`data-source-card${idExtension}`}
            style={{
                padding: 0,
                width: "8rem",
                height: "4.5rem",
                boxShadow: "0 0.5rem 1rem rgba(0, 0, 0, 0.15)",
            }}
        >
            <CardHeader
                id={`data-source-header${idExtension}`}
                title="Data Source"
                titleTypographyProps={{
                    sx: {fontSize: "15px", color: "var(--bs-primary)"},
                }}
                sx={{backgroundColor: "rgba(33, 37, 41, 0.03)", paddingTop: "5px", paddingBottom: "4px"}}
            />
            <CardContent
                id={`data-source-body${idExtension}`}
                sx={{paddingTop: "8px", marginBottom: 0}}
            >
                <div
                    id="analytics-div"
                    style={{position: "absolute", top: "5px", right: "10px"}}
                >
                    <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        enterDelay={1000}
                        title="Analyze your data with the help of an LLM"
                    >
                        <a
                            id="analytics-link"
                            href={
                                `/analyticsChat/?projectID=${projectId}&` +
                                "dataSourceID=" +
                                `${taggedDataList?.length && (dataSource?.id || taggedDataList[0].DataSource.id)}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <span id={`datasource-${idExtension}-analytics-span`}>
                                <BsDatabaseGear id={`datasource-${idExtension}-tooltip-data-analytics`} />
                            </span>
                        </a>
                    </Tooltip>
                </div>
                {taggedDataList.length > 0 ? (
                    <select
                        // Hack: Disabling entire dropdown here for READONLY Nodes because of
                        // focus issue causing disabled options to never lose drag focus in flow nodes.
                        // We can revisit this if more options are added to DataSource Node
                        disabled={readOnlyNode}
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
                                (dataTmp) => Number(event.target.value) === Number(dataTmp.DataSource.id)
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
            </CardContent>
            <Handle
                id={`data-source-handle${idExtension}`}
                type="source"
                position={Position.Right}
            />
        </Card>
    )
}

export default DataSourceNodeComponent
