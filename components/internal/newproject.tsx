// Import React component
import { useState } from 'react'

// Import 3rd Party components
import { Collapse } from 'antd'
import { Container, Form, Button } from "react-bootstrap"

// Import required interface to create a new project
import AccessionProject from "../../controller/projects/accession"
import { Project } from "../../controller/projects/types"
import { Profile } from "../../controller/dataprofile/types"
import { DataSource } from "../../controller/datasources/types"
import {DataTag, DataTagFields} from "../../controller/datatag/types";
import { AccessionDatasourceS3 } from "../../controller/datasources/accession"
import AccessionDataTag from "../../controller/datatag/accession";

// Import constants
import { MaximumBlue } from "../../const"

// Import Utils
import uuid from 'react-uuid'
import AWSUtils from "../../utils/aws"

// Declare the Props for this component
export interface NewProps {

    // A flag to tell if it is to be used in a 
    // DataSource mode only
    ProjectID?: string

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

    const [profile, setProfile] = useState(null)

    // Define a function to unpack the form and trigger the controller
    // to register the project
    const TriggerProjectDataSourceAccessionController = async () => {

        // ################################ Accession Project ###########################
        let name
        if (!props.ProjectID) {
            // Unpack the Project Variables
            let {projectName, description} = inputFields

            // Create the Project message
            let projectMessage: Project = {
                id: projectName,
                description: description,
                // time: new Date().toString()
            }
            console.log("Project: ", projectMessage)

            // Trigger the Project Controller
            const accessionProjectResp: Project = await AccessionProject(projectMessage)

            // If Project creation failed, everything fails
            if (accessionProjectResp === null) { return }

            name = projectName

        } else {
            name = props.ProjectID
        }

        // ################################ Accession Data Source ###########################
        // Unpack Data Source Variables
        let {datasetName, bucketName, s3Key, region} = inputFields

        // Create the Data source Message
        let dataSourceMessage: DataSource = {
            project: name,
            id: datasetName,
            s3_url: new AWSUtils().ConstructURL(
                bucketName,
                region,
                s3Key
            )
        }
        console.log("Datasource: ", dataSourceMessage)

         // Trigger the Data Source Controller
         const profile: Profile = await AccessionDatasourceS3(dataSourceMessage)

         // If Data Source creation failed, everything fails
         if (profile === null) { return }
        setProfile(profile)

    }

    const TriggerDataTagAccession = async () => {
        // ################################ Accession Data Tag ###########################
        let projectName

        if (props.ProjectID) {
            projectName = props.ProjectID
        } else {
            projectName = inputFields.projectName
        }

        // Unpack the values for datafields
        let inputFieldsMapped: DataTagFields = {}
        // Loop over the Data fields
        Object.keys(profile.dataTag.fields).forEach(fieldName => {

            const datafield = profile.dataTag.fields[fieldName]

            // Set the value
            inputFieldsMapped[fieldName] = {
                // Get the esp-type
                esp_type: datafield.espType,

                // Get the Data type
                data_type: datafield.dataType,
                sum: datafield.sum,
                std_dev: datafield.stdDev,
                range: datafield.range,
                discrete_categorical_values: datafield.discreteCategoricalValues,
                has_nan: datafield.hasNan,
                valued: datafield.valued,
                mean: datafield.mean
            }

        })

        // Construct the Data tag Message
        const dataTagMessage: DataTag = {
            // time: new Date().toDateString(),
            fields: inputFieldsMapped,
            data_source: inputFields.datasetName,
            id: uuid()
        }

        console.log("DataTag: ", dataTagMessage)

        // Trigger the Data tag Controller
        const savedDataTag = await AccessionDataTag(dataTagMessage)
        console.log("Saved DT: ", savedDataTag)

        // Inform the view to update its state
        props.UpdateHook && props.UpdateHook()

        // Redirect
        window.location.href = `/projects/${projectName}`
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

    return <Container>

        <Form onSubmit={event => {event.preventDefault(); TriggerDataTagAccession()}} target="_blank">

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
                        }} type="button" onClick={TriggerProjectDataSourceAccessionController}>Connect</Button>

                </Panel>
                <Panel header={`${3 + startIndexOffset}. Tag your Data`} key="3" disabled={!EnabledDataTagSection}>
                    <div className="grid grid-cols-4 gap-4 mb-2 border-b-2 border-b-black" >
                        <h6>Field</h6>
                        <h6>ESP Type</h6>
                        <h6>Data Type</h6>
                        <h6>Valued</h6>
                    </div>
                    {profile != null && Object.keys(profile.dataTag.fields).map((field, _) =>
                        <>
                            <div key={`${field}-row`} className="grid grid-cols-4 gap-4 mb-2" >
                                <label>{ field }</label>
                                <select
                                    name={`${field}-esp_type`}
                                    value={ profile.dataTag.fields[field].espType }
                                    className="w-32"
                                    onChange={event => {
                                        let profileCopy = {...profile}
                                        profileCopy.dataTag.fields[field].espType = event.target.value
                                        setProfile(profileCopy)
                                    }}
                                >
                                        <option value="CONTEXT">CONTEXT</option>
                                        <option value="ACTION">ACTION</option>
                                        <option value="OUTCOME">OUTCOME</option>
                                </select>
                                <select
                                    name={`${field}-data_type`}
                                    value={ profile.dataTag.fields[field].dataType }
                                    className="w-32"
                                    onChange={event => {
                                        let profileCopy = {...profile}
                                        profileCopy.dataTag.fields[field].dataType = event.target.value
                                        setProfile(profileCopy)
                                    }}
                                    >
                                        <option value="INT">INT</option>
                                        <option value="STRING">STRING</option>
                                        <option value="FLOAT">FLOAT</option>
                                        <option value="BOOL">BOOL</option>
                                </select>
                                <select
                                    name={`${field}-valued`}
                                    value={ profile.dataTag.fields[field].valued }
                                    className="w-32"
                                    onChange={event => {
                                        let profileCopy = {...profile}
                                        profileCopy.dataTag.fields[field].valued = event.target.value
                                        setProfile(profileCopy)
                                    }}
                                >
                                    <option value="CATEGORICAL">CATEGORICAL</option>
                                    <option value="CONTINUOUS">CONTINUOUS</option>
                                </select>
                            </div>
                            <div>
                                {
                                    profile.dataTag.fields[field].valued === "CONTINUOUS" &&
                                    <div className="grid grid-cols-6 gap-4 mb-2">
                                        <Form.Group className="mb-3">
                                            <Form.Label className="text-left w-full">Min</Form.Label>
                                            <Form.Control
                                                name={`${field}-min-range`}
                                                type="number"
                                                value={profile.dataTag.fields[field].range[0]}
                                                onChange={event => {
                                                    let profileCopy = {...profile}
                                                    profileCopy.dataTag.fields[field].range[0] = parseFloat(event.target.value)
                                                    setProfile(profileCopy)
                                                }} />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="text-left w-full">Max</Form.Label>
                                            <Form.Control
                                                name={`${field}-max-range`}
                                                type="number"
                                                value={profile.dataTag.fields[field].range[1]}
                                                onChange={event => {
                                                    let profileCopy = {...profile}
                                                    profileCopy.dataTag.fields[field].range[1] = parseFloat(event.target.value)
                                                    setProfile(profileCopy)
                                                }} />
                                        </Form.Group>
                                        <div>Mean: {profile.dataTag.fields[field].mean}</div>
                                        <div>Sum: {profile.dataTag.fields[field].sum}</div>
                                        <div>Std Dev: {profile.dataTag.fields[field].stdDev}</div>
                                        <div>Has Nan: {profile.dataTag.fields[field].hasNan.toString()}</div>
                                    </div>
                                }
                                {
                                    profile.dataTag.fields[field].valued === "CATEGORICAL" &&
                                    <>
                                        <div>Has Nan: {profile.dataTag.fields[field].hasNan.toString()}</div>
                                    </>
                                }
                            </div>
                        </>
                    )}
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