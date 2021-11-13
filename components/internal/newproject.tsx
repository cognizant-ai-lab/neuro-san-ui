// Import React component
import { useState } from 'react'

// Import 3rd Party components
import { Collapse } from 'antd'
import { Container, Form, Button } from "react-bootstrap"

// Import required interface to create a new project
import AccessionProject from "../../controller/projects/accession"
import { Profile } from "../../controller/dataprofile/types"
import { DataSource } from "../../controller/datasources/types"
import {DataTag, DataTagFields} from "../../controller/datatag/types";
import { AccessionDatasource } from "../../controller/datasources/accession"
import AccessionDataTag from "../../controller/datatag/accession";

// Import constants
import { MaximumBlue } from "../../const"

// Import Utils
import uuid from 'react-uuid'
import AWSUtils from "../../utils/aws"
import {Project} from "../../controller/projects/types";
import {FiSettings} from "react-icons/all";
import ProfileTable from "./flow/profiletable";
import {BrowserFetchProfile} from "../../controller/dataprofile/generate";

var debug = require('debug')('new_project')

// Declare the Props for this component
export interface NewProps {

    // A flag to tell if it is to be used in a 
    // DataSource mode only
    ProjectID?: number

    // A call back function that tells the view
    // to update its state to reflect the new addition 
    // if it has succeeded
    UpdateHook?: any

}

const { Panel } = Collapse

export default function NewProject(props: NewProps) {

    /* 
    This function adds a component form to add a new project to the system.
    */

    const [inputFields, setInputFields] = useState({
        "projectName": "",
        "description": "", 
        "datasetName": "",
        "bucketName": "",
        "s3Key": "",
        "region": "",
    })

    const [projectId, setProjectId] = useState(props.ProjectID)
    const [profile, setProfile] = useState(null)

    // Define a function to unpack the form and trigger the controller
    // to register the project
    const TriggerProfileGeneration = async () => {

        // Unpack Data Source Variables
        let {bucketName, s3Key, region} = inputFields

        // Create the Data source Message
        let dataSourceMessage: DataSource = {
            s3_url: new AWSUtils().ConstructURL(
                bucketName,
                region,
                s3Key
            )
        }

        debug("Datasource: ", dataSourceMessage)

         // Trigger the Data Source Controller
         const profile: Profile = await BrowserFetchProfile(dataSourceMessage)

         // If Data Source creation failed, everything fails
         if (profile === null) { return }
        console.log(profile)
        setProfile(profile)

    }

    const TriggerProjectDataSourceDataTagAccession = async () => {


        let projectId = props.ProjectID
        // Create the project if the project does not exist
        if (!projectId) {
            // Unpack the Project Variables
            let {projectName, description} = inputFields

            // Create the Project message
            let projectMessage: Project = {
                name: projectName,
                description: description
            }
            debug("Project: ", projectMessage)

            // Trigger the Project Controller
            const accessionProjectResp: Project = await AccessionProject(projectMessage)

            // If Project creation failed, everything fails
            if (accessionProjectResp === null) { return }

            projectId = accessionProjectResp.id
            setProjectId(accessionProjectResp.id)

        }

        // Unpack Data Source Variables
        let {datasetName, bucketName, s3Key, region} = inputFields
        let dataSourceMessage: DataSource = {
            project_id: projectId,
            name: datasetName,
            s3_url: new AWSUtils().ConstructURL(
                bucketName,
                region,
                s3Key
            )
        }

        const savedDataSource = await AccessionDatasource(dataSourceMessage)
        console.log("Saved Data Source: ", savedDataSource)

        // Unpack the values for datafields
        let inputFieldsMapped: DataTagFields = {}
        // Loop over the Data fields
        Object.keys(profile.data_tag.fields).forEach(fieldName => {

            const datafield = profile.data_tag.fields[fieldName]

            // Set the value
            inputFieldsMapped[fieldName] = {
                // Get the esp-type
                esp_type: datafield.esp_type,

                // Get the Data type
                data_type: datafield.data_type,
                sum: datafield.sum,
                std_dev: datafield.std_dev,
                range: datafield.range,
                discrete_categorical_values: datafield.discrete_categorical_values,
                has_nan: datafield.has_nan,
                valued: datafield.valued,
                mean: datafield.mean
            }

        })

        // Construct the Data tag Message
        const dataTagMessage: DataTag = {
            fields: inputFieldsMapped,
            data_source_id: savedDataSource.id
        }

        debug("DataTag: ", dataTagMessage)
        console.log("DT: ", dataTagMessage)

        // Trigger the Data tag Controller

        const savedDataTag = await AccessionDataTag(dataTagMessage)
        console.log("Saved DT: ", savedDataTag)

        // Inform the view to update its state
        props.UpdateHook && props.UpdateHook(savedDataSource)

        // Redirect if new project creation
        if (!props.ProjectID) {
            window.location.href = `/projects/${projectId}`
        }
    }

    const EnabledDataSourceSection = props.ProjectID || (inputFields.projectName && 
                                        inputFields.description)
    const EnabledDataTagSection = EnabledDataSourceSection && 
                                    inputFields.datasetName && 
                                    inputFields.bucketName && 
                                    inputFields.s3Key && 
                                    inputFields.region &&
                                    profile != null

    const startIndexOffset = props.ProjectID ? -1 : 0


    let profileTable = <ProfileTable Profile={profile} ProfileUpdateHandler={setProfile} />

    return <Container>

        <Form onSubmit={event => {event.preventDefault(); TriggerProjectDataSourceDataTagAccession()}} target="_blank">

            <Collapse accordion expandIconPosition="right">
                { startIndexOffset === 0 && 
                    <Panel header="1. Project Details" key="1">
                        <Form.Group className="mb-3">
                            <Form.Label className="text-left w-full">Project Name</Form.Label>
                            <Form.Control 
                                name="name" 
                                type="text" 
                                placeholder="Enter project name" 
                                onChange={
                                    event => setInputFields(
                                        {...inputFields, projectName: event.target.value}
                                    )}/>
                            <Form.Text className="text-muted text-left">
                            A start to something great!
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="text-left w-full">Description</Form.Label>
                            <Form.Control
                                as="textarea" 
                                name="description" 
                                type="text-area" 
                                placeholder="What are you building?" 
                                onChange={
                                    event => setInputFields(
                                        {...inputFields, description: event.target.value}
                                )}/>
                        </Form.Group>      
                    </Panel> 
                }
                <Panel header={`${2 + startIndexOffset} . Attach a Data Source`} key="2" disabled={!EnabledDataSourceSection}>
                    <Form.Group className="mb-3">
                        <Form.Label className="text-left w-full">Dataset Name</Form.Label>
                        <Form.Control 
                            name="datasetName" 
                            type="text" 
                            placeholder="A name you will remember" 
                            onChange={
                                event => setInputFields(
                                    {...inputFields, datasetName: event.target.value}
                            )}/>
                        <Form.Text className="text-muted text-left">
                        Clean Data, Happy Data Scientist
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">

                        <Form.Label className="text-left w-full">Bucket Name</Form.Label>
                        <Form.Control 
                            name="bucketName" 
                            type="text"
                            placeholder="Enter Bucket name"
                            onChange={
                                event => setInputFields(
                                    {...inputFields, bucketName: event.target.value}
                            )}/>
                        <Form.Text className="text-muted text-left">
                        S3 Bucket where the file is located
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="text-left w-full">Key</Form.Label>
                        <Form.Control 
                            name="s3Key" 
                            type="text" 
                            placeholder="data/somwhere/somefile.csv"
                            onChange={
                                event => setInputFields(
                                    {...inputFields, s3Key: event.target.value}
                            )} />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="text-left w-full">Bucket Region</Form.Label>
                        <Form.Control 
                            name="region" 
                            type="text" 
                            placeholder="us-east-2"
                            onChange={
                                event => setInputFields(
                                    {...inputFields, region: event.target.value}
                            )} />
                    </Form.Group>
                    <Button style={
                        {
                            background: MaximumBlue, 
                            borderColor: MaximumBlue
                        }} type="button" onClick={TriggerProfileGeneration}>Connect</Button>

                </Panel>

                <Panel header={`${3 + startIndexOffset}. Tag your Data`} key="3" disabled={!EnabledDataTagSection}>
                    {profileTable}
                </Panel>
            </Collapse>

            <Container>
                <Panel header={<Button 
                                variant="primary" 
                                type="submit" 
                                size="sm" 
                                className="w-full mt-2 mb-2" 
                                disabled={!EnabledDataTagSection}
                                style={
                                    {
                                        background: MaximumBlue, 
                                        borderColor: MaximumBlue
                                    }}>
                                {`${4 + startIndexOffset}. Create`}
                        </Button>} key="4" >
                        
                    </Panel>
                </Container>

        </Form>
    </Container>
}