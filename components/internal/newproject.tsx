// React components
import {useState} from 'react'
import {useSession} from 'next-auth/react'

// 3rd Party components
import {Button, Collapse, Radio, RadioChangeEvent, Space} from 'antd'
import {Container, Form} from "react-bootstrap"
import prettyBytes from 'pretty-bytes'

// Custom Components developed by us
import ProfileTable from "./flow/profiletable";
import {NotificationType, sendNotification} from "../../controller/notification"
import Debug from "debug";
import {Project} from "../../controller/projects/types"
import {uploadFile} from "../../controller/files/upload"

// Controllers for new project
import {BrowserFetchProfile} from "../../controller/dataprofile/generate"
import {DataTag, DataTagFields} from "../../controller/datatag/types"
import {AccessionDatasource} from "../../controller/datasources/accession"
import AccessionDataTag from "../../controller/datatag/accession"
import AccessionProject from "../../controller/projects/accession"
import {Profile} from "../../controller/dataprofile/types"
import {DataSource} from "../../controller/datasources/types"

// Constants
import {MaximumBlue} from "../../const"

const debug = Debug("new_project")

// Only allow files up to this size to be uploaded as data sources
const MAX_ALLOWED_UPLOAD_SIZE_BYTES = 200 * 1000 * 1000  // 200 MB in "decimal"

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
    This function adds a component form to add a new project to the system. Despite the name, also used when editing
    an existing project, for example to add new data sources of experiments to the project.
    */

    const [inputFields, setInputFields] = useState({
        projectName: "",
        description: "",
        datasetName: "",
        s3Key: "",
        uploadedFileS3Key: ""
    })

    const s3Option = 1
    const localFileOption = 2

    // State variable for the created data profile
    const [profile, setProfile] = useState(null)

    // Data source currently chosen by the user using the radio buttons
    const [chosenDataSource, setChosenDataSource] = useState(s3Option)

    const { data: session } = useSession()

    // For file upload
    const [selectedFile, setSelectedFile] = useState(null);

    // Decide which S3Key to use based on radio buttons
    function getS3Key() {
        return chosenDataSource === s3Option ? inputFields.s3Key : inputFields.uploadedFileS3Key;
    }

    /* Terminology:
        data source = where to find the data (S3 URL, etc.), headers, stats about number of rows etc
        data tag = list of fields with CAO type, data type, whether categorical or continuous etc.
        data profile = data source + data tag

        See proto/metadata.proto for specs.
    */

    // Create data source based on user selections
    const CreateDataSource = async () => {
        const s3Key = getS3Key();

        console.debug("inputFields", inputFields)

        // Create the Data source Message
        const dataProfile: DataSource = {
            s3_key: s3Key
        }

        debug("Data profile: ", dataProfile)

        // Trigger the Data Source Controller
        const tmpProfile: Profile = await BrowserFetchProfile(dataProfile)

        // If Data Source creation failed, everything fails
        if (tmpProfile === null) {
            return
        }
        console.debug("profile", tmpProfile)
        setProfile(tmpProfile)
    }

    //
    const CreateDataProfile = async () => {
        const projectId = props.ProjectID

        // Create the project if the project does not exist
        if (!projectId) {
            // Unpack the Project Variables
            const {projectName, description} = inputFields

            // Create the Project message
            const projectMessage: Project = {
                name: projectName,
                description: description
            }
            debug("Project: ", projectMessage)

            // Trigger the Project Controller
            const accessionProjectResp: Project = await AccessionProject(projectMessage)

            // If Project creation failed, everything fails
            if (accessionProjectResp === null) { return }

            sendNotification(NotificationType.success, `Project ${projectName} created`)
        }

        // Unpack Data Source Variables
        const {datasetName} = inputFields
        const s3Key = getS3Key();

        const dataSourceMessage: DataSource = {
            project_id: projectId,
            name: datasetName,
            s3_key: s3Key
        }

        const savedDataSource = await AccessionDatasource(dataSourceMessage)
        if (savedDataSource) {
            sendNotification(NotificationType.success, `Data source ${datasetName} created`)
        }
        debug("Saved Data Source: ", savedDataSource)

        // Unpack the values for datafields
        const inputFieldsMapped: DataTagFields = {}

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
        // Trigger the Data tag Controller

        const savedDataTag = await AccessionDataTag(dataTagMessage)
        if (savedDataTag) {
            sendNotification(NotificationType.success, "Data tag created")
        }
        debug("Saved DT: ", savedDataTag)

        // Inform the view to update its state
        props.UpdateHook && props.UpdateHook(savedDataSource)

        // Redirect if new project creation
        if (!props.ProjectID) {
            window.location.href = `/projects/${projectId}`
        }
    }

    // Allow data source set-up if it's an existing project (meaning it has a ProjectID already, and user is not
    // creating a new project) or if the user has already filled out the relevant project info fields for a new
    // project.
    const enabledDataSourceSection = props.ProjectID || (inputFields.projectName && inputFields.description)

    const enabledDataTagSection = enabledDataSourceSection &&
                                    inputFields.datasetName &&
                                    profile &&
                                    (chosenDataSource === s3Option && !!inputFields.s3Key) ||
                                    (chosenDataSource === localFileOption && !!inputFields.uploadedFileS3Key)

    const startIndexOffset = props.ProjectID ? -1 : 0

    const profileTable = <ProfileTable Profile={profile} ProfileUpdateHandler={setProfile} />

    const changeHandler = (event) => {
        setSelectedFile(event.target.files[0])
    }

    const handleSubmission = () => {
        // Make sure file is within our size limit
        const fileTooLarge = (selectedFile.size > MAX_ALLOWED_UPLOAD_SIZE_BYTES)
        if (fileTooLarge) {
            sendNotification(NotificationType.error,
`File "${selectedFile.name}" is ${prettyBytes(selectedFile.size)} in size, which exceeds the maximum allowed file 
size of ${prettyBytes(MAX_ALLOWED_UPLOAD_SIZE_BYTES)}`)
            return
        }

        // Prompt user if not CSV file
        if (selectedFile.type !== "text/csv") {
            console.debug(selectedFile.type)
            if (!confirm("Only CSV files are supported, but the file you have selected " +
                "does not appear to be a CSV file. Proceed anyway?")) {
                return
            }
        }

        // Determine where in S3 to store the file. For now, based on user name (from Github) and filename.
        // Assumption: all Github usernames and all local filenames are valid for S3 paths. This...may be risky.
        const s3Path = `data/${session.user.name}/${selectedFile.name}`
        setInputFields(
            {...inputFields, uploadedFileS3Key: s3Path}
        )
        uploadFile(selectedFile, s3Path)
    }

    const createButtonEnabled: boolean = !!inputFields.datasetName &&
        (chosenDataSource === s3Option && !!inputFields.s3Key) ||
        (chosenDataSource === localFileOption && !!inputFields.uploadedFileS3Key)

    const isUsingLocalFile = chosenDataSource === localFileOption;

    return <Container>
        <Form onSubmit={event => {event.preventDefault(); CreateDataProfile()}} target="_blank" >
            <Collapse accordion expandIconPosition="right"
                      defaultActiveKey={startIndexOffset === 0 ? 1 : 2}
            >
                { startIndexOffset === 0 &&
                    <Panel header="1. Project Details" key={1}>
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
                <Panel header={`${2 + startIndexOffset}. Define your data source`} key={2}
                       disabled={!enabledDataSourceSection}>
                    <Form.Group>
                        Name
                        <Form.Control
                            name="datasetName"
                            type="text"
                            placeholder="Choose a name for your data source"
                            autoFocus
                            onChange={
                                event => setInputFields(
                                    {...inputFields, datasetName: event.target.value}
                                )}/>
                    </Form.Group>
                    <Radio.Group onChange={(e: RadioChangeEvent) => {setChosenDataSource(e.target.value)}}
                                 value={chosenDataSource}
                                 className="my-3">
                        <Space direction="vertical" size="large">
                            <Radio value={s3Option} >
                                From S3
                                <Form.Group className="my-3">
                                    <Form.Label className="text-left w-full">Key</Form.Label>
                                    <Form.Control
                                        name="s3Key"
                                        type="text"
                                        placeholder="data/somewhere/somefile.csv"
                                        onChange={
                                            event => setInputFields(
                                                {...inputFields, s3Key: event.target.value}
                                        )}
                                        disabled={isUsingLocalFile}
                                    />
                                </Form.Group>
                            </Radio>
                            <Radio value={localFileOption}>
                                <Space direction="vertical" size="middle">
                                    From a local file
                                    <input type="file" name="file" onChange={changeHandler}
                                           disabled={!isUsingLocalFile}/>
                                    {selectedFile ? (
                                        <div style={{
                                            opacity: isUsingLocalFile ? 1.0 : 0.5,
                                            fontSize: "90%"
                                        }}>
                                            <p><b>Filename: </b> {selectedFile.name}, <b>filetype: </b>
                                                {selectedFile.type}, <b>size: </b> {prettyBytes(selectedFile.size)}</p>
                                        </div>
                                    ) : (
                                        <p>Select a file to show details</p>
                                    )}
                                    <div>
                                        <Button disabled={!isUsingLocalFile}
                                                style={{
                                                    background: MaximumBlue,
                                                    borderColor: MaximumBlue,
                                                    color: "white",
                                                    opacity: isUsingLocalFile ? 1.0 : 0.5
                                                }}
                                                onClick={handleSubmission}>
                                            Submit
                                        </Button>
                                    </div>
                                </Space>
                            </Radio>
                        </Space>
                    </Radio.Group>
                    <Form.Group className="mt-2">
                        <Button
                            style={{
                                background: MaximumBlue,
                                borderColor: MaximumBlue,
                                color: "white",
                                opacity: createButtonEnabled ? 1.0 : 0.5
                            }}
                            onClick={CreateDataSource}
                            disabled={
                                !createButtonEnabled
                            }
                        >
                            Connect
                        </Button>
                    </Form.Group>
                </Panel>
                <Panel header={`${3 + startIndexOffset}. Tag your Data`} key="3" disabled={!enabledDataTagSection}>
                    {profileTable}
                </Panel>
            </Collapse>

            <Panel header={<Button
                            type="primary"
                            htmlType="submit"
                            className="w-full mt-2 mb-2"
                            disabled={!enabledDataTagSection}
                            style={
                                {
                                    background: MaximumBlue,
                                    borderColor: MaximumBlue,
                                    color: "white"
                                }}>
                            {`${4 + startIndexOffset}. Create data profile`}
                    </Button>} key="4" >
            </Panel>
        </Form>
    </Container>
}