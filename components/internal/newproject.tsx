// React components
import {FormEvent, useEffect, useRef, useState} from 'react'
import {useSession} from 'next-auth/react'

// 3rd Party components
import ClipLoader from "react-spinners/ClipLoader";
import prettyBytes from 'pretty-bytes'
import status from "http-status"
import {Button, Collapse, Radio, RadioChangeEvent, Space, Tooltip} from 'antd'
import {Container, Form} from "react-bootstrap"
import {checkValidity} from "./dataprofile/dataprofileutils";

// Custom Components developed by us
import ProfileTable from "./flow/profiletable";
import {NotificationType, sendNotification} from "../../controller/notification"
import Debug from "debug";
import {Project} from "../../controller/projects/types"
import {uploadFile} from "../../controller/files/upload"
import {splitFilename, toSafeFilename} from "../../utils/file"

// Controllers for new project
import {CreateProfile} from "../../controller/dataprofile/generate"
import {DataTag, DataTagFields} from "../../controller/datatag/types"
import {AccessionDatasource} from "../../controller/datasources/accession"
import AccessionDataTag from "../../controller/datatag/accession"
import AccessionProject from "../../controller/projects/accession"
import {Profile} from "../../controller/dataprofile/types"
import {DataSource} from "../../controller/datasources/types"

// Constants
import {MaximumBlue} from "../../const"
import {empty} from "../../utils/objects"
import {GrpcError} from "../../controller/base_types"

const debug = Debug("new_project")

// Only allow files up to this size to be uploaded as data sources
const MAX_ALLOWED_UPLOAD_SIZE_BYTES = 200 * 1000 * 1000  // 200 MB in "decimal"

// Declare the Props for this component
interface NewProps {

    // For testing
    id: string,

    // A flag to tell if it is to be used in a
    // DataSource mode only
    ProjectID?: number

    // A call back function that tells the view
    // to update its state to reflect the new addition
    // if it has succeeded
    UpdateHook?: () => void
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

    // State variable for project ID
    const [projectId, setProjectId] = useState(props.ProjectID)

    // State variable for the created data profile
    const [profile, setProfile] = useState<Profile | undefined>(null)

    // Data source currently chosen by the user using the radio buttons
    const [chosenDataSource, setChosenDataSource] = useState(s3Option)

    // For access to logged in session and current user name
    const { data: session } = useSession()
    const currentUser: string = session.user.name

    // For file upload
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

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

        // Create the Data source Message
        const dataSource: DataSource = {
            s3_key: s3Key
        }

        debug("Data source: ", dataSource)

        // Trigger the Data Source Controller
        const response: Response = await CreateProfile(dataSource)
        if (response.status != status.OK) {
            // Maybe "invalid request"?
            if (response.status == status.BAD_REQUEST) {
                const status: GrpcError = await response.json()
                sendNotification(NotificationType.error, "Failed to create profile", `"${status.message}"`)
            } else {
                // Something we're not expecting -- show error
                console.error(await response.text())
                sendNotification(NotificationType.error, `Failed to create profile: "${response.statusText}"`,
                    "See browser console for more information")
            }
            return null
        }

        // If we got this far, profile was created successfully
        const tmpProfile: Profile = await response.json()

        // Notify user
        // Check for any columns discarded by backend
        const rejectedColumns = tmpProfile.data_source.rejectedColumns

        const anyColumnsRejected = rejectedColumns && !empty(rejectedColumns)
        const notificationType = anyColumnsRejected ? NotificationType.warning : NotificationType.success
        const description =
            <>
                Rows: {`${tmpProfile.data_source.num_rows}`}
                <br id="data-source-columns"/>
                Columns: {`${tmpProfile.data_source.num_cols}`}
                <br id="data-source-rejection-reasons"/>
                {anyColumnsRejected &&
                    `WARNING: ${Object.keys(rejectedColumns).length} column(s) were rejected from your data source. Proceed to "Tag your Data" to see which columns and why.`}
            </>

        sendNotification(notificationType, "Data source successfully Created.", description)

        // Save profile
        setProfile(tmpProfile)
    }

    // Persists the profile with associated tags and data source
    const createDataProfile = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        let tmpProjectId = projectId

        const form = event.currentTarget;

        // HTML validation
        if (!form.checkValidity()) {
            event.stopPropagation()
            return
        }

        // Validate consistency of fields
        const isValid = profile && checkValidity(profile.data_tag.fields)
        if (!isValid) {
            return
        }

        // Create the project if the project does not exist
        if (!projectId) {
            // Unpack the Project Variables
            const {projectName, description} = inputFields

            // Create the Project message
            const projectMessage: Project = {
                name: projectName,
                description: description,
                request_user: currentUser
            }
            debug("Project: ", projectMessage)

            // Trigger the Project Controller
            const accessionProjectResp: Project = await AccessionProject(projectMessage, "create")

            // If Project creation failed, everything fails
            if (accessionProjectResp === null) { return }

            sendNotification(NotificationType.success, `Project "${projectName}" created`)
            setProjectId(accessionProjectResp.id)

            // capture the new ID for use below
            tmpProjectId = accessionProjectResp.id
        }

        // Unpack Data Source Variables
        const {datasetName} = inputFields
        const s3Key = getS3Key();

        const dataSourceMessage: DataSource = {
            project_id: tmpProjectId,
            name: datasetName,
            s3_key: s3Key,
            request_user: currentUser,
            rejectedColumns: profile.data_source.rejectedColumns,
            headers: profile.data_source.headers
        }

        const savedDataSource: DataSource = await AccessionDatasource(dataSourceMessage)
        if (!savedDataSource) {
            // Failed to save data source -- can't continue. For now, controller shows error popup.
            return
        }

        debug("Saved Data Source: ", savedDataSource)

        // Unpack the values for data fields
        const inputFieldsMapped: DataTagFields = {}

        // Loop over the Data fields
        Object.keys(profile.data_tag.fields).forEach(fieldName => {

            const dataField = profile.data_tag.fields[fieldName]

            // Set the value
            inputFieldsMapped[fieldName] = {
                // Get the esp-type
                esp_type: dataField.esp_type,

                // Get the Data type
                data_type: dataField.data_type,
                sum: dataField.sum,
                std_dev: dataField.std_dev,
                range: dataField.range,
                discrete_categorical_values: dataField.discrete_categorical_values,
                has_nan: dataField.has_nan,
                valued: dataField.valued,
                mean: dataField.mean,
                is_ordered: dataField.is_ordered
            }

        })

        // Construct the Data tag Message
        const dataTagMessage: DataTag = {
            fields: inputFieldsMapped,
            data_source_id: savedDataSource.id,
            request_user: currentUser
        }

        debug("DataTag: ", dataTagMessage)
        // Trigger the Data tag Controller

        const savedDataTag = await AccessionDataTag(dataTagMessage)
        if (savedDataTag) {
            sendNotification(NotificationType.success, `Data profile "${datasetName}" created`)
        }
        debug("Saved DT: ", savedDataTag)

        // Inform the view to update its state
        props.UpdateHook && props.UpdateHook()

        // Redirect if new project creation
        if (!props.ProjectID) {
            window.location.href = `/projects/${tmpProjectId}`
        }
    }

    const startIndexOffset = props.ProjectID ? -1 : 0

    const idPrefix = props.id
    const profileTable = <ProfileTable id={ `${idPrefix}-profile-table` }
                                        Profile={profile}
                                        ProfileUpdateHandler={setProfile} />

    const changeHandler = (event) => {
        setSelectedFile(event.target.files[0])
    }

    const handleFileUpload = async () => {
        // Make sure file is within our size limit
        const fileTooLarge = (selectedFile.size > MAX_ALLOWED_UPLOAD_SIZE_BYTES)
        const fileName = selectedFile.name;
        if (fileTooLarge) {
            sendNotification(NotificationType.error,
                `File "${fileName}" is ${prettyBytes(selectedFile.size)} in size, which exceeds the maximum 
allowed file size of ${prettyBytes(MAX_ALLOWED_UPLOAD_SIZE_BYTES)}`)
            return
        }

        // Prompt user if not CSV file
        if (selectedFile.type !== "text/csv") {
            if (!confirm(`Only CSV files are supported, but the file you have selected of type "${selectedFile.type}" 
does not appear to be a CSV file. Proceed anyway?`)) {
                return
            }
        }

        // Determine where in S3 to store the file. For now, based on user name (from Github) and filename.
        // Assumption: all Github usernames and all local filenames are valid for S3 paths. This...may be risky.
        setIsUploading(true)
        
        // Split into filename + extension
        const {name, ext} = splitFilename(fileName)
        
        // Sanitize both name and extension in preparation for S3 path
        const safePath = toSafeFilename(name)
        const safeExt = ext.length > 0 ? toSafeFilename(ext) : "csv"
        
        const s3Path = `data/${session.user.name}/${safePath}.${safeExt}`
        setInputFields(
            {...inputFields, uploadedFileS3Key: s3Path}
        )

        uploadFile(selectedFile, s3Path)
            .then(() => sendNotification(NotificationType.success, `File "${fileName}" uploaded`))
            .finally(() => setIsUploading(false))
    }


    // Keys for the various panels
    const projectDetailsPanelKey = 1;
    const dataSourcePanelKey = 2;
    const tagYourDataPanelKey = 3;

    const isUsingLocalFile = chosenDataSource === localFileOption
    const isUsingS3Source = !isUsingLocalFile

    const isNewProject = startIndexOffset === 0;

    const datasetNameRef = useRef<HTMLInputElement>()
    const projectNameRef = useRef<HTMLInputElement>()

    // Set focus on relevant field depending on if we're creating a new project or modifying existing
    useEffect(() => {setTimeout(() => isNewProject
            ? projectNameRef.current && projectNameRef.current.focus()
            : datasetNameRef.current && datasetNameRef.current.focus(),
        500)
    }, [])

    // Tell user why button is disabled
    function getUploadButtonTooltip() {
        if (!isUsingLocalFile) {
            return "Only available when using the file upload option"
        } else if (!selectedFile){
            return "Please select a file first"
        } else {
            // returning null means no tooltip shown, meaning the button should be enabled
            return null
        }
    }

    // Tell user why button is disabled
    function getCreatButtonTooltip() {
        if (!inputFields.datasetName) {
            return "Please select a name for your data source"
        } else if (isUploading) {
            return "Please wait until upload is complete"
        } else if (isUsingS3Source && !inputFields.s3Key) {
            return "Please enter an S3 key for your data source or choose a local file"
        } else if (isUsingLocalFile && !inputFields.uploadedFileS3Key) {
            return "Please upload a file for your data source"
        } else {
            // returning null means no tooltip shown, meaning the button should be enabled
            return null
        }
    }

    // Allow data source set-up if it's an existing project (meaning it has a ProjectID already, and user is not
    // creating a new project) or if the user has already filled out the relevant project info fields for a new
    // project.
    const enabledDataSourceSection = props.ProjectID || (inputFields.projectName && inputFields.description)

    const enabledDataTagSection = enabledDataSourceSection &&
        !isUploading &&
        inputFields.datasetName &&
        profile &&
        ((chosenDataSource === s3Option && !!inputFields.s3Key) ||
            (chosenDataSource === localFileOption && !!inputFields.uploadedFileS3Key))

    // Tell user why button is disabled
    function getCreateProjectButtonTooltip() {
        if (!profile) {
            return "Please name and create your data source first"
        }
        else {
            // returning null means no tooltip shown, meaning the button should be enabled
            return null
        }
    }

    const propsId = `${props.id}`

    return <Container id={ `${propsId}` }>
        <Form id="create-data-profile"
            onSubmit={event => void createDataProfile(event)}
            target="_blank"

            // We set noValidate to turn off the intrinsic HTML 5 validation since we'll be using Bootstrap's
            // validation instead.
            noValidate

            // Setting this next property to "true" causes the "invalid feedback" to appear immediately. Normally one
            // would only set this after the user attempts to submit the form, but we have a complex form here with
            // multiple "submit"-type steps so that doesn't work for us.
            validated={true}
        >
            <Collapse       // eslint-disable-line enforce-ids-in-jsx/missing-ids 
                            // 2/6/23 DEF - Collapse does not have an id property when compiling
                accordion expandIconPosition="right"
                defaultActiveKey={isNewProject ? projectDetailsPanelKey : dataSourcePanelKey}
            >
                { isNewProject &&
                    <Panel id="project-details-panel"
                           header="1. Project Details"
                           key={projectDetailsPanelKey}>
                        <Form.Group id="project-name" className="mb-3">
                            <Form.Label id="project-name-label" className="text-left w-full">
                                Project Name
                            </Form.Label>
                            <Form.Control id="project-name-input" 
                                name="name"
                                ref={projectNameRef}
                                type="text" 
                                placeholder="Enter project name" 
                                onChange={
                                    event => setInputFields(
                                        {...inputFields, projectName: event.target.value}
                                    )}
                                required
                            />
                            <Form.Control.Feedback type="valid" id="project-name-valid">
                                Looks good!
                            </Form.Control.Feedback>
                            <Form.Control.Feedback type="invalid" id="project-name-invalid">
                                Please choose a project name.
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group id="project-description" className="mb-3">
                            <Form.Label id="project-description-label" className="text-left w-full">
                                Description
                            </Form.Label>
                            <Form.Control id="project-description-input"
                                as="textarea" 
                                name="description" 
                                type="text-area" 
                                placeholder="What are you building?" 
                                onChange={
                                    event => setInputFields(
                                        {...inputFields, description: event.target.value}
                                )}
                                required
                            />
                            <Form.Control.Feedback type="valid" id="project-description-valid">
                                Looks good!
                            </Form.Control.Feedback>
                            <Form.Control.Feedback type="invalid" id="project-description-invalid">
                                Please enter a project description.
                            </Form.Control.Feedback>
                        </Form.Group>      
                    </Panel>
                }
                <Panel id="data-source-panel"
                    header={
                        <Tooltip        // eslint-disable-line enforce-ids-in-jsx/missing-ids 
                                        // 2/6/23 DEF - Tooltip does not have an id property when compiling
                            title={!enabledDataSourceSection ? "Please enter project name and description first": ""}
                            placement="leftTop">
                            {`${2 + startIndexOffset}. Create your data source`}
                        </Tooltip>
                    }
                    key={dataSourcePanelKey}
                    collapsible={enabledDataSourceSection ? "header": "disabled"}>
                    <Form.Group id="data-source-name">
                        Name
                        <Form.Control id="data-source-name-input"
                            name="datasetName"
                            ref={datasetNameRef}
                            type="text"
                            placeholder="Choose a name for your data source"
                            onChange={
                                event => setInputFields(
                                    {...inputFields, datasetName: event.target.value}
                                )}
                            required
                        />
                        <Form.Control.Feedback type="valid" id="data-source-valid">
                            Looks good!
                        </Form.Control.Feedback>
                        <Form.Control.Feedback type="invalid" id="data-source-invalid">
                            Please choose a name for your data source.
                        </Form.Control.Feedback>
                    </Form.Group>
                    <Radio.Group id="data-source-radio" 
                        onChange={(e: RadioChangeEvent) => {setChosenDataSource(e.target.value)}}
                        value={chosenDataSource}
                        className="my-3">
                        <Space id="s3-file-space" direction="vertical" size="large">
                            <Radio id="s3-file-radio" value={s3Option}>
                                From S3
                                <Form.Group id="s3-file-group" className="my-3">
                                    <Form.Label id="s3-file-key" className="text-left w-full">
                                        Key
                                    </Form.Label>
                                    <Form.Control id="s3-file-set-input-fields"
                                        name="s3Key"
                                        type="text"
                                        placeholder="data/somewhere/somefile.csv"
                                        onChange={
                                            event => setInputFields(
                                                {...inputFields, s3Key: event.target.value}
                                        )}
                                        disabled={isUsingLocalFile}
                                        required={!isUsingLocalFile}
                                    />
                                    <Form.Control.Feedback id="s3-file-looks-good" type="valid">
                                        Looks good!
                                    </Form.Control.Feedback>
                                    <Form.Control.Feedback id="s3-file-enter-path-advice" type="invalid">
                                        Please enter a path to your CSV file in S3.
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </Radio>
                            <Radio id="local-file-radio" value={localFileOption}>
                                <Space id="local-file-space"
                                    direction="vertical" size="middle">
                                    From a local file
                                    <input type="file" name="file" onChange={changeHandler}
                                           id="new-project-local-file" 
                                           disabled={!isUsingLocalFile}/>
                                    {selectedFile ? (
                                        <div id="file-info-div" style={{
                                            opacity: isUsingLocalFile ? 1.0 : 0.5,
                                            fontSize: "90%"
                                        }}>
                                            <p id="file-info">
                                                <b id="file-name">
                                                    Filename:
                                                </b>
                                                {selectedFile.name},
                                                <b id="file-type">
                                                    filetype:
                                                </b>
                                                {selectedFile.type},
                                                <b id="file-size">
                                                    size:
                                                </b>
                                                {prettyBytes(selectedFile.size)}
                                            </p>
                                        </div>
                                    ) : (
                                        <p id="select-a-file">
                                            Select a file to show details
                                        </p>
                                    )}
                                    <div id="uploading-div">
                                        {isUploading
                                            ? <label id="uploading-label">
                                                    Uploading {selectedFile.name}
                                                    <span id="uploading-clip-loader-span" className="ml-2">
                                                        <ClipLoader // eslint-disable-line enforce-ids-in-jsx/missing-ids 
                                                            // 2/6/23 DEF - ClipLoader doesn't have id property when compiling
                                                            color={MaximumBlue} loading={true} size={14}/>
                                                    </span>
                                              </label>
                                            : <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids 
                                                    // 2/6/23 DEF - Tooltip does not have an id property when compiling
                                                    title={getUploadButtonTooltip()}>
                                                    <Button id="upload-file-button"
                                                            disabled={getUploadButtonTooltip() !== null}
                                                            style={{
                                                                background: MaximumBlue,
                                                                borderColor: MaximumBlue,
                                                                color: "white",
                                                                opacity: isUsingLocalFile && selectedFile ? 1.0 : 0.5
                                                            }}
                                                            onClick={handleFileUpload}>
                                                        Upload
                                                    </Button>
                                                </Tooltip>
                                        }
                                    </div>
                                </Space>
                            </Radio>
                        </Space>
                    </Radio.Group>
                    <Form.Group id="create-data-source-group" className="mt-2">
                        <Tooltip        // eslint-disable-line enforce-ids-in-jsx/missing-ids 
                                        // 2/6/23 DEF - Tooltip does not have an id property when compiling
                            title={getCreatButtonTooltip()}>
                            <Button id="create-data-source-button"
                                style={{
                                    background: MaximumBlue,
                                    borderColor: MaximumBlue,
                                    color: "white",
                                    opacity: getCreatButtonTooltip() === null ? 1.0 : 0.5
                                }}
                                onClick={CreateDataSource}
                                disabled={getCreatButtonTooltip() !== null}
                            >
                                Create
                            </Button>
                        </Tooltip>
                    </Form.Group>
                </Panel>
                <Panel id="profile-table-panel"
                    header={
                        <Tooltip        // eslint-disable-line enforce-ids-in-jsx/missing-ids 
                                        // 2/6/23 DEF - Tooltip does not have an id property when compiling
                                title={!enabledDataTagSection ? "Please name and create your data source first": ""}
                                placement="leftTop">
                            {`${3 + startIndexOffset}. Tag your Data`}
                        </Tooltip>
                    }
                    key={tagYourDataPanelKey}
                    collapsible={enabledDataTagSection ? "header": "disabled"}>
                    {profileTable}
                </Panel>
            </Collapse>

            <Panel id="create-project-or-data-profile-button-panel"
                header={
                    <Tooltip        // eslint-disable-line enforce-ids-in-jsx/missing-ids 
                                    // 2/6/23 DEF - Tooltip does not have an id property when compiling
                        title={getCreateProjectButtonTooltip()} placement="leftTop">
                        <Button id="create-project-or-data-profile-button"
                            type="primary"
                            htmlType="submit"
                            className="w-full mt-2 mb-2"
                            disabled={!enabledDataTagSection}
                            style={{
                                background: MaximumBlue,
                                borderColor: MaximumBlue,
                                color: "white",
                                opacity: enabledDataTagSection ? 1.0 : 0.5
                            }}
                        >
                            {`${4 + startIndexOffset}. ` + (isNewProject ? "Create project" : "Create data profile")}
                        </Button>
                    </Tooltip>
                }
                key="4">
            </Panel>
        </Form>
    </Container>
}
