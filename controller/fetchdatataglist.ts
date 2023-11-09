import {DataSources} from "./datasources/types";
import {BrowserFetchDataSources} from "./datasources/fetch";
import {TaggedDataInfo, TaggedDataInfoList} from "../pages/projects/[projectID]/experiments/new";
import {DataTag, DataTags} from "./datatag/types";
import {BrowserFetchDataTags} from "./datatag/fetch";

export default async function loadDataTags(requestUser, projectId): Promise<TaggedDataInfoList> {
    const dataSources: DataSources = await BrowserFetchDataSources(requestUser, projectId)
    if (!dataSources || dataSources.length === 0) {
        return null
    }

    const taggedDataList: TaggedDataInfoList = []
    for (let iter = 0; iter < dataSources.length; iter += 1) {
        const dataSource = dataSources[iter]
        const dataTags: DataTags = await BrowserFetchDataTags(requestUser, dataSource.id)
        if (dataTags?.length > 0) {
            const taggedData: TaggedDataInfo = {
                DataSource: dataSource,
                LatestDataTag: dataTags[0]
            }
            taggedDataList.push(taggedData)
        }
    }
    return taggedDataList
}

export async function loadDataTag(requestUser: string, dataSourceId: number): Promise<DataTag> {
    const dataTags: DataTags = await BrowserFetchDataTags(requestUser, dataSourceId)
    if (dataTags && dataTags.length > 0) {
        return dataTags[0]
    }

    return null
}