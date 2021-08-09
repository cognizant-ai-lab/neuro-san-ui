// Import React component
import { useState } from 'react'

// Import 3rd Party components
import { Collapse } from 'antd'
import uuid from "react-uuid"
import { Container, Form, Button } from "react-bootstrap"

// Import required interface to create a new project
import AccessionProject from "../../controller/projects/accession"
import { Project } from "../../controller/projects/types"
import { DataSource } from "../../controller/datasources/types"
import { DataTagField, DataTagFields, DataTag } from "../../controller/datatag/types"
import AccessionDataTag from "../../controller/datatag/accession"
import { AccessionDatasourceS3, ValidateCSV, GetCSVHeaders } from "../../controller/datasources/accession"

// Import cosntants
import { MaximumBlue } from "../../const"

// Import Utils
import AWSUtils from "../../utils/aws"

// Declare the Props for this component
export interface NewProps {

    // A flag to tell if it is to be used in a 
    // DataSource mode only
    ProjectID?: string

    // A call back function that tells the view
    // to update its state to reflect the new addition 
    // if it has successeded
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

        // Ordered lists to store the data fields
        // and the mapping
        "datafields": []
    })

    // Define a function to unpack the form and trigger the controller
    // to register the project
    const TriggerController = async (formTarget: EventTarget) => {

        // ################################ Accession Project ###########################
        let name
        if (!props.ProjectID) {
            // Unpack the Project Variables
            let {description} = formTarget
            name = formTarget.name.value

            // Create the Project message
            let projectMessage: Project = {
                id: name,
                description: description.value,
                // time: new Date().toString()
            }
            console.log("Project: ", projectMessage)

            // Trigger the Project Controller
            const accesionProjectResp: Project = await AccessionProject(projectMessage)

            // If Project creation failed, everything fails
            if (accesionProjectResp === null) { return }

        } else {
            name = props.ProjectID
        }

        // ################################ Accession Data Source ###########################
        // Unpack Data Source Variables
        let {datasetName, bucketName, s3Key, region} = formTarget

        // Create the Data source Message
        let dataSourceMessage: DataSource = {
            project: name,
            id: datasetName.value,
            s3_url: new AWSUtils().ConstructURL(
                bucketName.value, 
                region.value, 
                s3Key.value
            ),
            // time: new Date().toDateString()
        }
        console.log("Datasource: ", dataSourceMessage)

         // Trigger the Data Source Controller
         const accesionDataSourceResp: DataSource = await AccessionDatasourceS3(dataSourceMessage)

         // If Data Source creation failed, everything fails
         if (accesionDataSourceResp === null) { return }

        // ################################ Accession Data Tag ###########################

        // Unpack the values for datafields
        let inputFieldsMapped: DataTagFields = {}
        // Loop over the Data fields
        inputFields.datafields.forEach(datafield => {

            const dataTagField: DataTagField = {
                // Get the esp-type
                esp_type: parseInt(formTarget[`${datafield}-esp_type`].value),

                // Get the Data type
                data_type: parseInt(formTarget[`${datafield}-data_type`].value)
            }
            
            // Set the value
            inputFieldsMapped[datafield] = dataTagField

        })

        // Construct the Data tag Message
        const dataTagMessage: DataTag = {
            // time: new Date().toDateString(),
            fields: inputFieldsMapped,
            datasource: datasetName.value,
            id: uuid()
        }

        console.log("DataTag: ", dataTagMessage)

        // Trigger the Data tag Controller
        const accesionDatatagResp: DataTag = await AccessionDataTag(dataTagMessage)


        // Inform the view to update its state
        props.UpdateHook && props.UpdateHook()

        // Redirect
        window.location.href = `/projects/${name}`

    }

    // We need a function to validate the existance of the file on S3
    // and fetch the headers.
    const DataSourceValidation = async() => {
        
        // Validate Existence of CSV 
        const validationResp = await ValidateCSV(inputFields.bucketName,
                    inputFields.s3Key,
                    inputFields.region)
        
        // Return if CSV does not exist
        if (validationResp == null) { return }

        const headers = await GetCSVHeaders(inputFields.bucketName,
            inputFields.s3Key,
            inputFields.region)

        // Return if headers can't be fetched
        if (headers == null) { return }

        // If headers exist update the state
        setInputFields({...inputFields, 
            "datafields": headers})
    }

    const EnabledDataSourceSection = props.ProjectID || (inputFields.projectName && 
                                        inputFields.description)
    const EnabledDataTagSection = EnabledDataSourceSection && 
                                    inputFields.datasetName && 
                                    inputFields.bucketName && 
                                    inputFields.s3Key && 
                                    inputFields.region && inputFields.datafields.length > 0

    const startIndexOffset = props.ProjectID ? -1 : 0
    console.log(startIndexOffset)

    return <Container>

        <Form onSubmit={event => {event.preventDefault(); TriggerController(event.target)}} target="_blank">

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
                        }} type="button" onClick={DataSourceValidation}>Connect</Button>

                </Panel>
                <Panel header={`${3 + startIndexOffset}. Tag your Data`} key="3" disabled={!EnabledDataTagSection}>
                    <div className="grid grid-cols-3 gap-4 mb-2 border-b-2 border-b-black" >
                        <h6>Field</h6>
                        <h6>ESP Type</h6>
                        <h6>Data Type</h6>
                    </div>
                    {inputFields.datafields.map((field, _) => 
                        <div className="grid grid-cols-3 gap-4 mb-2" >
                            <label>{ field }</label>
                            <select
                                name={`${field}-esp_type`}
                                value={ inputFields.datafields[field] } 
                                className="w-32"
                                defaultValue={1}>
                                    <option value={1}>CONTEXT</option>
                                    <option value={2}>ACTION</option>
                                    <option value={3}>OUTCOME</option>
                            </select>
                            <select
                                name={`${field}-data_type`}
                                value={ inputFields.datafields[field] } 
                                className="w-32"
                                defaultValue={1}
                                >
                                    <option value={1}>INT32</option>
                                    <option value={2}>STRING</option>
                            </select>
                        </div>
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