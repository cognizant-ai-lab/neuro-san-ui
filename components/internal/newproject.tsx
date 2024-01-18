import {Button, Checkbox, Collapse, Modal, Radio, RadioChangeEvent, Space, Tooltip} from "antd"
import {CheckboxChangeEvent} from "antd/es/checkbox"
// eslint-disable-next-line import/no-named-as-default
import Debug from "debug"
import {InfoSignIcon} from "evergreen-ui"
import httpStatus from "http-status"
import {NextRouter, useRouter} from "next/router"
import {useSession} from "next-auth/react"
import prettyBytes from "pretty-bytes"
import {FormEvent, useEffect, useRef, useState} from "react"
import {Container, Form} from "react-bootstrap"
import ClipLoader from "react-spinners/ClipLoader"

import {checkValidity} from "./dataprofile/dataprofileutils"
import ProfileTable from "./dataprofile/profiletable"
import {MaximumBlue} from "../../const"
import {GrpcError} from "../../controller/base_types"
import {CreateProfile} from "../../controller/dataprofile/generate"
import {Profile} from "../../controller/dataprofile/types"
import {DataSource} from "../../controller/datasources/types"
import {updateDataSource} from "../../controller/datasources/update"
import AccessionDataTag from "../../controller/datatag/accession"
import {DataTag, DataTagFields} from "../../controller/datatag/types"
import {uploadFile} from "../../controller/files/upload"
import {NotificationType, sendNotification} from "../../controller/notification"
import AccessionProject from "../../controller/projects/accession"
import {Project} from "../../controller/projects/types"
import {getFileName, splitFilename, toSafeFilename} from "../../utils/file"
import {empty} from "../../utils/objects"
import BlankLines from "../blanklines"

const debug = Debug("new_project")

// Only allow files up to this size to be uploaded as data sources
const MAX_ALLOWED_UPLOAD_SIZE_BYTES = 200 * 1000 * 1000 // 200 MB in "decimal"

// We only support this file type for training data files
const EXPECTED_FILE_TYPE = "text/csv"

// For making things opaque or translucent
const SEMI_OPAQUE = 0.5
const OPAQUE = 1.0

// Declare the Props for this component
interface NewProps {
    // For testing
    id: string

    // A flag to tell if it is to be used in a
    // DataSource mode only
    ProjectID?: number

    // A call back function that tells the view
    // to update its state to reflect the new addition
    // if it has succeeded
    UpdateHook?: () => void
}

const {Panel} = Collapse

export default function NewProject(props: NewProps) {
    /*
    This function adds a component form to add a new project to the system. Despite the name, also used when editing
    an existing project, for example to add new data sources of experiments to the project.
    */

    // Get the router hook
    const router: NextRouter = useRouter()

    // Check if demo user as requested by URL param
    const isDemoUser = "demo" in router.query

    const [inputFields, setInputFields] = useState({
        projectName: "",
        description: "",
        s3Key: "",
        uploadedFileS3Key: "",
    })

    const s3Option = 1
    const localFileOption = 2

    // State variable for project ID
    const [projectId, setProjectId] = useState(props.ProjectID)

    // State variable for the created data profile
    const [profile, setProfile] = useState<Profile | undefined>(null)

    // Data source currently chosen by the user using the radio buttons
    const [chosenDataSource, setChosenDataSource] = useState(localFileOption)

    // For access to logged in session and current user name
    const {data: session} = useSession()
    const currentUser: string = session.user.name

    // For file upload
    const [selectedFile, setSelectedFile] = useState(null)
    const [isUploading, setIsUploading] = useState(false)
    const [fileUploadAcknowledged, setFileUploadAcknowledged] = useState<boolean>(false)

    function getCreateDataProfilePanel() {
        return (
            <Panel
                id="create-project-or-data-profile-button-panel"
                header={
                    <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        // 2/6/23 DEF - Tooltip does not have an id property when compiling
                        title={getCreateProjectButtonTooltip()}
                        placement="leftTop"
                    >
                        <Button
                            id="create-project-or-data-profile-button"
                            type="primary"
                            htmlType="submit"
                            className="w-full mt-2 mb-2"
                            disabled={!enabledDataTagSection}
                            style={{
                                background: MaximumBlue,
                                borderColor: MaximumBlue,
                                color: "white",
                                opacity: enabledDataTagSection ? OPAQUE : SEMI_OPAQUE,
                            }}
                        >
                            {`${4 + startIndexOffset}. ${isNewProject ? "Create project" : "Create data profile"}`}
                        </Button>
                    </Tooltip>
                }
                key="4"
            />
        )
    }

    function getProfileTablePanel() {
        return (
            <Panel
                id="profile-table-panel"
                header={
                    <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        // 2/6/23 DEF - Tooltip does not have an id property when compiling
                        title={enabledDataTagSection ? "" : "Please create your data source first"}
                        placement="leftTop"
                    >
                        <span id="tag-your-data-header">{`${3 + startIndexOffset}. Tag your Data`}</span>
                    </Tooltip>
                }
                key={tagYourDataPanelKey}
                collapsible={enabledDataTagSection ? "header" : "disabled"}
            >
                {profileTable}
            </Panel>
        )
    }

    function getDataSourcePanel() {
        return (
            <Panel
                id="data-source-panel"
                header={
                    <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        // 2/6/23 DEF - Tooltip does not have an id property
                        title={enabledDataSourceSection ? "" : "Please enter project name and description first"}
                        placement="leftTop"
                    >
                        <span id="create-your-data-source-header">
                            {`${2 + startIndexOffset}. Create your data source`}
                        </span>
                    </Tooltip>
                }
                key={dataSourcePanelKey}
                collapsible={enabledDataSourceSection ? "header" : "disabled"}
            >
                <Radio.Group
                    id="data-source-radio"
                    onChange={(e: RadioChangeEvent) => {
                        setChosenDataSource(e.target.value)
                    }}
                    value={chosenDataSource}
                >
                    <Space
                        id="s3-file-space"
                        direction="vertical"
                        size="large"
                    >
                        <Radio
                            id="local-file-radio"
                            value={localFileOption}
                        >
                            {getFileUploadForm()}
                        </Radio>
                        <Collapse // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        // Collapse does not have an id property
                        >
                            <Panel
                                key="advanced_data_source"
                                id="advanced_data_source_panel"
                                header="Advanced"
                            >
                                <Radio
                                    id="s3-file-radio"
                                    value={s3Option}
                                >
                                    {getS3DataForm()}
                                </Radio>
                            </Panel>
                        </Collapse>
                    </Space>
                </Radio.Group>
            </Panel>
        )
    }

    function getProjectDetailsPanel() {
        return (
            <Panel
                id="project-details-panel"
                header={<span id="project-details-header">1. Project Details</span>}
                key={projectDetailsPanelKey}
            >
                <Form.Group
                    id="project-name"
                    className="mb-3"
                >
                    <Form.Label
                        id="project-name-label"
                        className="text-left w-full"
                    >
                        Project Name
                    </Form.Label>
                    <Form.Control
                        id="project-name-input"
                        name="name"
                        ref={projectNameRef}
                        type="text"
                        placeholder="Enter project name"
                        onChange={(event) => setInputFields({...inputFields, projectName: event.target.value})}
                        required
                    />
                    <Form.Control.Feedback
                        type="valid"
                        id="project-name-valid"
                    >
                        Looks good!
                    </Form.Control.Feedback>
                    <Form.Control.Feedback
                        type="invalid"
                        id="project-name-invalid"
                    >
                        Please choose a project name.
                    </Form.Control.Feedback>
                </Form.Group>

                <Form.Group
                    id="project-description"
                    className="mb-3"
                >
                    <Form.Label
                        id="project-description-label"
                        className="text-left w-full"
                    >
                        Description
                    </Form.Label>
                    <Form.Control
                        id="project-description-input"
                        as="textarea"
                        name="description"
                        type="text-area"
                        placeholder="What are you building?"
                        onChange={(event) => setInputFields({...inputFields, description: event.target.value})}
                        required
                    />
                    <Form.Control.Feedback
                        type="valid"
                        id="project-description-valid"
                    >
                        Looks good!
                    </Form.Control.Feedback>
                    <Form.Control.Feedback
                        type="invalid"
                        id="project-description-invalid"
                    >
                        Please enter a project description.
                    </Form.Control.Feedback>
                </Form.Group>
            </Panel>
        )
    }

    function getS3DataForm() {
        return (
            <>
                <div
                    id="s3-file-upload-div"
                    style={{display: "inline-flex"}}
                >
                    From S3
                    <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        // Tooltip does not have an id property when compiling
                        title={
                            "Use this option to use an existing CSV file, which must already be present in the " +
                            "appropriate S3 bucket, for your training data. Contact the LEAF team for assistance."
                        }
                    >
                        <div
                            id="file-upload-bubble"
                            className="ps-1"
                        >
                            <sup id="file-upload-bubble-sup">
                                <InfoSignIcon
                                    id="yo-info-bubble-sup-icon"
                                    color="blue"
                                    size={10}
                                />
                            </sup>
                        </div>
                    </Tooltip>
                </div>
                <Form.Group
                    id="s3-file-group"
                    className="mt-2"
                >
                    <div
                        id="s3-key-div"
                        style={{display: "inline-flex"}}
                    >
                        <Form.Label
                            id="s3-file-key"
                            style={{opacity: isUsingLocalFile ? SEMI_OPAQUE : OPAQUE, paddingTop: 6}}
                        >
                            Key:
                        </Form.Label>
                        <Form.Control
                            id="s3-file-set-input-fields"
                            className="ml-4"
                            name="s3Key"
                            type="text"
                            placeholder="data/somewhere/somefile.csv"
                            onChange={(event) => setInputFields({...inputFields, s3Key: event.target.value})}
                            disabled={isUsingLocalFile}
                            required={!isUsingLocalFile}
                            style={{width: "80ch"}}
                        />
                    </div>
                    <Form.Control.Feedback
                        id="s3-file-looks-good"
                        type="valid"
                    >
                        Looks good!
                    </Form.Control.Feedback>
                    <Form.Control.Feedback
                        id="s3-file-enter-path-advice"
                        type="invalid"
                    >
                        Please enter a path to your CSV file in S3.
                    </Form.Control.Feedback>
                    <Form.Group
                        id="create-data-source-group"
                        className="mt-2"
                    >
                        <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                            // 2/6/23 DEF - Tooltip does not have an id property when compiling
                            title={getCreatButtonTooltip()}
                        >
                            <Button
                                id="create-data-source-button"
                                className="my-4"
                                style={{
                                    background: MaximumBlue,
                                    borderColor: MaximumBlue,
                                    color: "white",
                                    opacity: getCreatButtonTooltip() === null ? OPAQUE : SEMI_OPAQUE,
                                }}
                                onClick={async () => generateDataProfile(getS3Key())}
                                disabled={getCreatButtonTooltip() !== null}
                            >
                                Create
                            </Button>
                        </Tooltip>
                    </Form.Group>
                </Form.Group>
            </>
        )
    }

    function getFileUploadForm() {
        const uploadButtonTooltip = getUploadButtonTooltip()

        return (
            <Space
                id="local-file-space"
                direction="vertical"
                size="middle"
            >
                <div
                    id="local-file-upload-div"
                    style={{display: "inline-flex"}}
                >
                    From a local file
                    <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        // Tooltip does not have an id property when compiling
                        title={`Use this option to upload a CSV file containing your training data. \
                                        Note: file size limited to ${prettyBytes(MAX_ALLOWED_UPLOAD_SIZE_BYTES)}.`}
                    >
                        <div
                            id="file-upload-bubble"
                            className="ps-1"
                        >
                            <sup id="file-upload-bubble-sup">
                                <InfoSignIcon
                                    id="yo-info-bubble-sup-icon"
                                    color="blue"
                                    size={10}
                                />
                            </sup>
                        </div>
                    </Tooltip>
                </div>
                <div id="upload-file-info-div">
                    <input
                        disabled={!isUsingLocalFile}
                        id="new-project-local-file"
                        name="file"
                        onChange={changeHandler}
                        ref={fileInputRef}
                        type="file"
                    />
                    {selectedFile ? (
                        <div
                            id="file-info-div"
                            style={{
                                opacity: isUsingLocalFile ? OPAQUE : SEMI_OPAQUE,
                                fontSize: "90%",
                            }}
                        >
                            <p id="file-info">
                                <b
                                    id="file-name"
                                    className="mr-2"
                                >
                                    Filename:
                                </b>
                                {selectedFile.name},
                                <b
                                    id="file-type"
                                    className="mx-2"
                                >
                                    filetype:
                                </b>
                                <span
                                    id="file_type_span"
                                    style={{color: selectedFile.type === EXPECTED_FILE_TYPE ? "black" : "red"}}
                                >
                                    {selectedFile.type}
                                </span>{" "}
                                <b
                                    id="file-size"
                                    className="mx-2"
                                >
                                    size:
                                </b>
                                {prettyBytes(selectedFile.size)}
                            </p>
                        </div>
                    ) : (
                        <p
                            id="select-a-file"
                            className="mt-1"
                        >
                            Select a file to show details.
                        </p>
                    )}
                </div>
                <div id="uploading-div">
                    {isUploading ? (
                        <label id="uploading-label">
                            Uploading {selectedFile.name}
                            <span
                                id="uploading-clip-loader-span"
                                className="ml-2"
                            >
                                <ClipLoader // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                    // 2/6/23 DEF - ClipLoader doesn't have id property when compiling
                                    color={MaximumBlue}
                                    loading={true}
                                    size={14}
                                />
                            </span>
                        </label>
                    ) : (
                        <>
                            <Checkbox
                                id="agree_checkbox"
                                checked={fileUploadAcknowledged}
                                onChange={(e: CheckboxChangeEvent) => {
                                    setFileUploadAcknowledged(e.target.checked)
                                }}
                            >
                                <strong id="warning">
                                    I confirm that the file I am about to upload does NOT contain sensitive customer
                                    data or personally identifiable information (PII).
                                </strong>
                            </Checkbox>
                            <BlankLines // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                numLines={2}
                            />
                            <Tooltip // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                // 2/6/23 DEF - Tooltip does not have an id property when compiling
                                title={uploadButtonTooltip}
                            >
                                <Button
                                    id="upload-file-button"
                                    disabled={uploadButtonTooltip !== null}
                                    style={{
                                        background: MaximumBlue,
                                        borderColor: MaximumBlue,
                                        color: "white",
                                        opacity: uploadButtonTooltip ? SEMI_OPAQUE : OPAQUE,
                                    }}
                                    onClick={handleFileUpload}
                                >
                                    Upload
                                </Button>
                            </Tooltip>
                        </>
                    )}
                </div>
            </Space>
        )
    }

    // Decide which S3Key to use based on radio buttons
    function getS3Key() {
        return chosenDataSource === s3Option ? inputFields.s3Key : inputFields.uploadedFileS3Key
    }

    /* Terminology:
        data source = where to find the data (S3 URL, etc.), headers, stats about number of rows etc
        data tag = list of fields with CAO type, data type, whether categorical or continuous etc.
        data profile = data source + data tag

        See proto/metadata.proto for specs.
    */

    // Create data source based on user selections
    const generateDataProfile = async (s3Key: string) => {
        // Create the Data source Message
        const dataSource: DataSource = {
            s3_key: s3Key,

            // Currently only demo users are allowed to skip the NaN check. The idea is they will use an LLM
            // to fill in the NaNs later.
            options: {
                allow_nans: isDemoUser,
            },

            request_user: currentUser,
        }

        debug("Data source: ", dataSource)

        // Trigger the Data Source Controller
        const response: Response = await CreateProfile(dataSource)
        if (response.status !== httpStatus.OK) {
            // Maybe "invalid request"?
            if (response.status === httpStatus.BAD_REQUEST) {
                const responseStatus: GrpcError = await response.json()
                sendNotification(NotificationType.error, "Failed to create profile", `"${responseStatus.message}"`)
            } else {
                // Something we're not expecting -- show error
                console.error(await response.text())
                sendNotification(
                    NotificationType.error,
                    `Failed to create profile: "${response.statusText}"`,
                    "See browser console for more information"
                )
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
        const description = (
            <>
                Rows: {`${tmpProfile.data_source.num_rows}`}
                <br id="data-source-columns" />
                Columns: {`${tmpProfile.data_source.num_cols}`}
                <br id="data-source-rejection-reasons" />
                {anyColumnsRejected &&
                    `WARNING: ${Object.keys(rejectedColumns).length} column(s) were rejected from your data source. ` +
                        'Proceed to "Tag your Data" to see which columns and why.'}
            </>
        )

        sendNotification(notificationType, "Data source successfully Created.", description)

        // Save profile
        setProfile(tmpProfile)
        return null
    }

    // Persists the profile with associated tags and data source
    const createDataSourceAndDataTag = async (event: FormEvent<HTMLFormElement>, s3Key: string) => {
        event.preventDefault()

        let tmpProjectId = projectId

        const form = event.currentTarget

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
                request_user: currentUser,
            }
            debug("Project: ", projectMessage)

            // Trigger the Project Controller
            const accessionProjectResp: Project = await AccessionProject(projectMessage, "create")

            // If Project creation failed, everything fails
            if (accessionProjectResp === null) {
                return
            }

            sendNotification(NotificationType.success, `Project "${projectName}" created`)
            setProjectId(accessionProjectResp.id)

            // capture the new ID for use below
            tmpProjectId = accessionProjectResp.id
        }

        let datasetName: string
        if (isUsingLocalFile) {
            // If it's a file upload, use the name of the file the user selected for the dataset name.
            datasetName = selectedFile.name
        } else {
            // User selected an existing S3 object, so use its "file name" for the dataset name
            datasetName = getFileName(inputFields.s3Key)
        }

        const dataSourceMessage: DataSource = {
            project_id: tmpProjectId,
            name: datasetName,
            s3_key: s3Key,
            request_user: currentUser,
            rejectedColumns: profile.data_source.rejectedColumns,
            headers: profile.data_source.headers,
            options: {},
        }

        const savedDataSource: DataSource = await updateDataSource(dataSourceMessage)
        if (!savedDataSource) {
            // Failed to save data source -- can't continue. For now, controller shows error popup.
            return
        }

        debug("Saved Data Source: ", savedDataSource)

        // Unpack the values for data fields
        const inputFieldsMapped: DataTagFields = {}

        // Loop over the Data fields
        Object.keys(profile.data_tag.fields).forEach((fieldName) => {
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
                is_ordered: dataField.is_ordered,
            }
        })

        // Construct the Data tag Message
        const dataTagMessage: DataTag = {
            fields: inputFieldsMapped,
            data_source_id: savedDataSource.id,
            request_user: currentUser,
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
            void router.push({
                pathname: `/projects/${tmpProjectId}`,
                query: router.query,
            })
        }
    }

    const startIndexOffset = props.ProjectID ? -1 : 0

    const idPrefix = props.id
    const profileTable = (
        <ProfileTable
            id={`${idPrefix}-profile-table`}
            Profile={profile}
            ProfileUpdateHandler={setProfile}
        />
    )

    const changeHandler = (event) => {
        setSelectedFile(event.target.files[0])
    }

    const handleFileUpload = async () => {
        // Make sure file is within our size limit
        const fileTooLarge = selectedFile.size > MAX_ALLOWED_UPLOAD_SIZE_BYTES
        const fileName = selectedFile.name
        if (fileTooLarge) {
            sendNotification(
                NotificationType.error,
                `File "${fileName}" is ${prettyBytes(selectedFile.size)} in size, which exceeds the maximum
allowed file size of ${prettyBytes(MAX_ALLOWED_UPLOAD_SIZE_BYTES)}`
            )
            return
        }

        // Prompt user if not CSV file
        if (selectedFile.type !== EXPECTED_FILE_TYPE) {
            Modal.confirm({
                title: <span id="csv-confirm-title">Is &quot;{fileName}&quot; a CSV file?</span>,
                content: (
                    <span id="csv-confirm-message">
                        Only CSV files are supported, but the file you have selected of type &quot;${selectedFile.type}
                        &quot; does not appear to be a CSV file.
                        <br id="csv-confirm-message-1" />
                        <br id="csv-confirm-message-1" />
                        Are you sure you wish to proceed?
                    </span>
                ),
                okButtonProps: {
                    id: "csv-confirm-ok-button",
                },
                okText: "Confirm",
                onOk: async () => {
                    await proceedWithFileUpload(fileName)
                },
                cancelButtonProps: {
                    id: "csv-confirm-cancel-button",
                },
            })
        } else {
            // File known to be a CSV. No need for a dialog.
            await proceedWithFileUpload(fileName)
        }
    }

    const proceedWithFileUpload = async (fileName: string) => {
        // Make sure file is within our size limit
        // Determine where in S3 to store the file. For now, based on user name (from Github) and filename.
        // Assumption: all Github usernames and all local filenames are valid for S3 paths. This...may be risky.
        setIsUploading(true)

        // Split into filename + extension
        // eslint-disable-next-line no-shadow
        const {name, ext} = splitFilename(fileName)

        // Sanitize both name and extension in preparation for S3 path
        const safePath = toSafeFilename(name)
        const safeExt = ext.length > 0 ? toSafeFilename(ext) : "csv"

        const s3Path = `data/${session.user.name}/${safePath}.${safeExt}`
        setInputFields({
            ...inputFields,
            uploadedFileS3Key: s3Path,
        })

        try {
            // Upload the user's file and create the data source
            await uploadFile(selectedFile, s3Path)
            await generateDataProfile(s3Path)
        } finally {
            setIsUploading(false)
        }
    }

    // Keys for the various panels
    const projectDetailsPanelKey = 1
    const dataSourcePanelKey = 2
    const tagYourDataPanelKey = 3

    const isUsingLocalFile = chosenDataSource === localFileOption
    const isUsingS3Source = !isUsingLocalFile

    const isNewProject = startIndexOffset === 0

    const projectNameRef = useRef<HTMLInputElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Set focus on relevant field depending on if we're creating a new project or modifying existing
    useEffect(() => {
        setTimeout(
            () =>
                isNewProject
                    ? projectNameRef.current && projectNameRef.current.focus()
                    : fileInputRef.current && fileInputRef.current.focus(),
            500
        )
    }, [])

    // Tell user why button is disabled
    function getUploadButtonTooltip() {
        if (!isUsingLocalFile) {
            return "Only available when using the file upload option"
        } else if (!selectedFile) {
            return "Please select a file first"
        } else if (!fileUploadAcknowledged) {
            return "Please check the box to acknowledge that your file does not contain sensitive data"
        } else {
            // returning null means no tooltip shown, meaning the button should be enabled
            return null
        }
    }

    // Tell user why button is disabled
    function getCreatButtonTooltip() {
        if (isUploading) {
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

    const enabledDataTagSection =
        enabledDataSourceSection &&
        !isUploading &&
        profile &&
        ((chosenDataSource === s3Option && Boolean(inputFields.s3Key)) ||
            (chosenDataSource === localFileOption && Boolean(inputFields.uploadedFileS3Key)))

    // Tell user why button is disabled
    function getCreateProjectButtonTooltip() {
        if (!profile) {
            return "Please name and create your data source first"
        } else {
            // returning null means no tooltip shown, meaning the button should be enabled
            return null
        }
    }

    const propsId = `${props.id}`

    return (
        <Container id={`${propsId}`}>
            <Form
                id="create-data-profile"
                onSubmit={(event) => void createDataSourceAndDataTag(event, getS3Key())}
                target="_blank"
                // We set noValidate to turn off the intrinsic HTML 5 validation since we'll be using Bootstrap's
                // validation instead.
                noValidate
                // Setting this next property to "true" causes the "invalid feedback" to appear immediately.
                // Normally one would only set this after the user attempts to submit the form, but we have a complex
                // form here with multiple "submit"-type steps so that doesn't work for us.
                validated={true}
            >
                <Collapse // eslint-disable-line enforce-ids-in-jsx/missing-ids
                    // 2/6/23 DEF - Collapse does not have an id property when compiling
                    accordion
                    expandIconPosition="end"
                    defaultActiveKey={isNewProject ? projectDetailsPanelKey : dataSourcePanelKey}
                >
                    {isNewProject && getProjectDetailsPanel()}
                    {getDataSourcePanel()}
                    {getProfileTablePanel()}
                </Collapse>

                {getCreateDataProfilePanel()}
            </Form>
        </Container>
    )
}
