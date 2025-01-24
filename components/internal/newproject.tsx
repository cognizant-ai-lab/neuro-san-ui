import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Checkbox from "@mui/material/Checkbox"
import CircularProgress from "@mui/material/CircularProgress"
import Container from "@mui/material/Container"
import FormControlLabel from "@mui/material/FormControlLabel"
import TextField from "@mui/material/TextField"
import Tooltip from "@mui/material/Tooltip"
import {Radio, RadioChangeEvent, Space} from "antd"
import debugModule from "debug"
import httpStatus from "http-status"
import {NextRouter, useRouter} from "next/router"
import prettyBytes from "pretty-bytes"
import {useEffect, useRef, useState} from "react"

import {checkValidity} from "./dataprofile/dataprofileutils"
import ProfileTable from "./dataprofile/profiletable"
import {MAX_ALLOWED_CATEGORIES, MAX_DATA_PROFILE_ALLOWED_CATEGORIES} from "../../const"
import {GrpcError} from "../../controller/base_types"
import {createProfile} from "../../controller/dataprofile/generate"
import {updateDataSource} from "../../controller/datasources/update"
import updateDataTag from "../../controller/datatag/update"
import {uploadFile} from "../../controller/files/upload"
import {Project} from "../../controller/projects/types"
import updateProject from "../../controller/projects/update"
import {DataSource, DataSourceDataSourceType, DataTag, DataTagField, Profile} from "../../generated/metadata"
import {useAuthentication} from "../../utils/authentication"
import {getFileName, splitFilename, toSafeFilename} from "../../utils/file"
import {empty} from "../../utils/objects"
import {ConfirmationModal} from "../confirmationModal"
import {InfoTip} from "../infotip"
import {MUIAccordion} from "../MUIAccordion"
import {NotificationType, sendNotification} from "../notification"

const debug = debugModule("newProject")

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

export default function NewProject(props: NewProps) {
    /*
    This function adds a component form to add a new project to the system. Despite the name, also used when editing
    an existing project, for example to add new data sources of experiments to the project.
    */

    // Get the router hook
    const router: NextRouter = useRouter()

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
    const {data: session} = useAuthentication()
    const currentUser: string = session.user.name

    // For file upload
    const [selectedFile, setSelectedFile] = useState(null)
    const [isUploading, setIsUploading] = useState(false)
    const [fileUploadAcknowledged, setFileUploadAcknowledged] = useState<boolean>(false)

    // For CSV Confirm dialog
    const [csvConfirmDialogOpen, setCsvConfirmDialogOpen] = useState<boolean>(false)

    function getCreateDataProfileButton() {
        return (
            <Tooltip
                id="create-project-or-data-profile-button-tooltip"
                title={getCreateProjectButtonTooltip()}
            >
                <span id="create_project_span">
                    <Button
                        id="create-project-or-data-profile-button"
                        disabled={!enabledDataTagSection}
                        fullWidth={true}
                        sx={{
                            backgroundColor: "var(--bs-primary) !important",
                            border: "solid 1px var(--bs-primary)",
                            borderRadius: "var(--bs-border-radius)",
                            color: "white !important",
                            fontSize: "0.9em",
                            marginTop: "0.5em",
                            opacity: enabledDataTagSection ? OPAQUE : SEMI_OPAQUE,
                        }}
                        onClick={createDataSourceAndDataTag}
                    >
                        {`${4 + startIndexOffset}. ${isNewProject ? "Create project" : "Create data profile"}`}
                    </Button>
                </span>
            </Tooltip>
        )
    }

    function getProfileTablePanel() {
        return (
            <MUIAccordion
                id="profile-table-panel"
                key={tagYourDataPanelKey}
                items={[
                    {
                        title: (
                            <Tooltip
                                id="tag-your-data-header-tooltip"
                                title={enabledDataTagSection ? "" : "Please create your data source first"}
                                placement="left-start"
                            >
                                <span id="tag-your-data-header">{`${3 + startIndexOffset}. Tag your Data`}</span>
                            </Tooltip>
                        ),
                        content: <>{profileTable}</>,
                        disabled: !enabledDataTagSection,
                    },
                ]}
            />
        )
    }

    function getDataSourcePanel() {
        return (
            <MUIAccordion
                id="data-source-panel"
                key={dataSourcePanelKey}
                items={[
                    {
                        title: (
                            <Tooltip
                                id="create-your-data-source-header-tooltip"
                                title={
                                    enabledDataSourceSection ? "" : "Please enter project name and description first"
                                }
                                placement="left-start"
                            >
                                <span id="create-your-data-source-header">
                                    {`${2 + startIndexOffset}. Create your data source`}
                                </span>
                            </Tooltip>
                        ),
                        content: (
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
                                    <MUIAccordion
                                        id="advanced_data_source_panel"
                                        items={[
                                            {
                                                title: "Advanced",
                                                content: (
                                                    <Radio
                                                        id="s3-file-radio"
                                                        value={s3Option}
                                                    >
                                                        {getS3DataForm()}
                                                    </Radio>
                                                ),
                                            },
                                        ]}
                                    />
                                </Space>
                            </Radio.Group>
                        ),
                        disabled: !enabledDataSourceSection,
                    },
                ]}
            />
        )
    }

    function getProjectDetailsPanel() {
        return (
            <MUIAccordion
                id="project-details-panel"
                key={projectDetailsPanelKey}
                items={[
                    {
                        title: <span id="project-details-header">1. Project Details</span>,
                        content: (
                            <>
                                <Box
                                    id="project-name-box"
                                    display="block"
                                >
                                    <TextField
                                        id="project-name-input"
                                        name="name"
                                        ref={projectNameRef}
                                        type="text"
                                        label="Project Name"
                                        placeholder="My project name"
                                        onChange={(event) =>
                                            setInputFields({...inputFields, projectName: event.target.value})
                                        }
                                        sx={{width: "100%"}}
                                        slotProps={{
                                            inputLabel: {
                                                shrink: true,
                                            },
                                            input: {
                                                sx: {borderRadius: "var(--bs-border-radius)", height: "3rem"},
                                            },
                                        }}
                                    />
                                </Box>
                                <Box
                                    id="project-description-box"
                                    display="block"
                                    sx={{marginTop: "1rem"}}
                                >
                                    <TextField
                                        id="project-description-input"
                                        name="description"
                                        label="Description"
                                        placeholder="What are you building?"
                                        onChange={(event) =>
                                            setInputFields({...inputFields, description: event.target.value})
                                        }
                                        sx={{width: "100%"}}
                                        slotProps={{
                                            inputLabel: {
                                                shrink: true,
                                            },
                                            input: {
                                                sx: {borderRadius: "var(--bs-border-radius)", height: "3rem"},
                                            },
                                        }}
                                    />
                                </Box>
                            </>
                        ),
                    },
                ]}
            />
        )
    }

    function getS3DataForm() {
        const shouldDisableS3Create = getS3CreateButtonTooltip() !== null || chosenDataSource === localFileOption
        return (
            <>
                <Box
                    id="s3-file-upload-div"
                    style={{display: "inline-flex"}}
                >
                    From S3
                    <InfoTip
                        id="file-upload-bubble"
                        info={
                            "Use this option to use an existing CSV file, which must already be present in the " +
                            "appropriate S3 bucket, for your training data. Contact Cognizant AI Labs for assistance."
                        }
                    />
                </Box>
                <Box
                    id="s3-file-set-input-fields"
                    display="block"
                    sx={{marginTop: "1rem"}}
                >
                    <TextField
                        id="s3-file-set-input-fields"
                        name="s3Key"
                        type="text"
                        label="S3 Key"
                        placeholder="data/somewhere/somefile.csv"
                        onChange={(event) => setInputFields({...inputFields, s3Key: event.target.value})}
                        disabled={isUsingLocalFile}
                        required={!isUsingLocalFile}
                        sx={{width: "80ch"}}
                        slotProps={{
                            inputLabel: {
                                shrink: true,
                            },
                            input: {
                                sx: {borderRadius: "var(--bs-border-radius)", height: "3rem"},
                            },
                        }}
                    />
                </Box>
                <Box
                    id="create-data-source-button-box"
                    display="block"
                    sx={{marginTop: "1rem"}}
                >
                    <Tooltip
                        id="create-data-source-button-tooltip"
                        title={getS3CreateButtonTooltip()}
                    >
                        <span id="create-data-source-button-span">
                            <Button
                                id="create-data-source-button"
                                sx={{
                                    background: "var(--bs-primary) !important",
                                    borderColor: "var(--bs-primary)  !important",
                                    borderRadius: "var(--bs-border-radius)",
                                    color: "var(--bs-white)  !important",
                                    opacity: shouldDisableS3Create ? SEMI_OPAQUE : OPAQUE,
                                    "&:disabled": {
                                        cursor: "default",
                                        pointerEvents: "all !important",
                                    },
                                }}
                                onClick={async () => generateDataProfile(getS3Key())}
                                disabled={shouldDisableS3Create}
                            >
                                Create
                            </Button>
                        </span>
                    </Tooltip>
                </Box>
            </>
        )
    }

    function getFileUploadForm() {
        const uploadButtonTooltip = getUploadButtonTooltip()
        const shouldDisableFileUpload = uploadButtonTooltip !== null

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
                    <InfoTip
                        id="file-upload-bubble"
                        info={`Use this option to upload a CSV file containing your training data. \
                                        Note: file size limited to ${prettyBytes(MAX_ALLOWED_UPLOAD_SIZE_BYTES)}.`}
                    />
                </div>
                <div id="upload-file-info-div">
                    <input
                        id="new-project-local-file"
                        disabled={!isUsingLocalFile}
                        name="file"
                        onChange={changeHandler}
                        ref={fileInputRef}
                        type="file"
                    />
                    {selectedFile ? (
                        <Box
                            id="file-info-div"
                            sx={{
                                opacity: isUsingLocalFile ? OPAQUE : SEMI_OPAQUE,
                                fontSize: "90%",
                            }}
                        >
                            <b id="file-name">Filename:</b> {selectedFile.name}, <b id="file-type">filetype: </b>
                            <span
                                id="file_type_span"
                                style={{
                                    color: selectedFile.type === EXPECTED_FILE_TYPE ? "black" : "var(--bs-red)",
                                }}
                            >
                                {`${selectedFile.type}, `}
                            </span>{" "}
                            <b id="file-size">size:</b> {prettyBytes(selectedFile.size)}
                        </Box>
                    ) : (
                        <p id="select-a-file">Select a file to show details.</p>
                    )}
                </div>
                <div id="uploading-div">
                    {isUploading ? (
                        <label id="uploading-label">
                            Uploading {selectedFile.name}
                            <span id="uploading-clip-loader-span">
                                <CircularProgress
                                    id="uploading-clip-loader"
                                    sx={{color: "var(--bs-primary)"}}
                                    size={14}
                                />
                            </span>
                        </label>
                    ) : (
                        <>
                            <FormControlLabel // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                label={
                                    // MUI will not accept the `sx` prop on this element
                                    <strong
                                        id="warning"
                                        style={{fontSize: "0.75em"}}
                                    >
                                        I confirm that the file I am about to upload does NOT contain sensitive customer
                                        data or personally identifiable information (PII).
                                    </strong>
                                }
                                control={
                                    <Checkbox
                                        id="agree_checkbox"
                                        checked={fileUploadAcknowledged}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setFileUploadAcknowledged(e.target.checked)
                                        }}
                                    />
                                }
                            />
                            <Box
                                id="upload-file-button-box"
                                display="block"
                            >
                                <Tooltip
                                    id="upload-file-button-tooltip"
                                    title={uploadButtonTooltip}
                                >
                                    <span id="upload-file-button-span">
                                        <Button
                                            id="upload-file-button"
                                            disabled={shouldDisableFileUpload}
                                            sx={{
                                                marginTop: "1rem",
                                                background: "var(--bs-primary) !important",
                                                borderColor: "var(--bs-primary) !important",
                                                borderRadius: "var(--bs-border-radius)",
                                                color: "var(--bs-white) !important",
                                                opacity: shouldDisableFileUpload ? SEMI_OPAQUE : OPAQUE,
                                                "&:disabled": {
                                                    cursor: "default",
                                                    pointerEvents: "all !important",
                                                },
                                            }}
                                            onClick={handleFileUpload}
                                        >
                                            Upload
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Box>
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
            s3Key: s3Key,

            options: {
                allow_nans: true,
                // This is the max number of categories any categorical column can have
                // https://leaf-ai.atlassian.net/browse/UN-2078
                max_categories: MAX_DATA_PROFILE_ALLOWED_CATEGORIES,
            },

            requestUser: currentUser,
            createdAt: undefined,
            updatedAt: undefined,
            id: undefined,
            name: undefined,
            type: DataSourceDataSourceType.CSV,
            s3Url: undefined,
            s3Version: undefined,
            dataTags: undefined,
            headers: undefined,
            numRows: undefined,
            numCols: undefined,
            hidden: undefined,
            ProjectId: undefined,
            mask: undefined,
            owner: undefined,
            lastEditedBy: undefined,
            rejectedColumnsBlob: undefined,
            rejectedColumns: undefined,
            dataReferenceId: undefined,
        }

        debug("Data source: ", dataSource)

        // Trigger the Data Source Controller
        const response: Response = await createProfile(dataSource)
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
        const tmpProfile: Profile = Profile.fromJSON(await response.json())

        // Notify user
        // Check for any columns discarded by backend
        const rejectedColumns = tmpProfile.dataSource.rejectedColumns

        const anyColumnsRejected = rejectedColumns && !empty(rejectedColumns)
        const notificationType = anyColumnsRejected ? NotificationType.warning : NotificationType.success
        const description = (
            <>
                Rows: {`${tmpProfile.dataSource.numRows}`}
                <br id="data-source-columns" />
                Columns: {`${tmpProfile.dataSource.numCols}`}
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
    const createDataSourceAndDataTag = async () => {
        let tmpProjectId = projectId

        // Validate consistency of fields
        const isValid = profile && checkValidity(profile.dataTag.fields)
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
            const accessionProjectResp: Project = await updateProject(projectMessage, "create")

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
            ProjectId: tmpProjectId,
            name: datasetName,
            s3Key: getS3Key(),
            requestUser: currentUser,
            rejectedColumns: profile.dataSource.rejectedColumns,
            headers: profile.dataSource.headers,
            options: {},
            createdAt: undefined,
            updatedAt: undefined,
            id: undefined,
            type: DataSourceDataSourceType.CSV,
            s3Url: undefined,
            s3Version: undefined,
            dataTags: undefined,
            numRows: undefined,
            numCols: undefined,
            hidden: undefined,
            mask: undefined,
            owner: undefined,
            lastEditedBy: undefined,
            rejectedColumnsBlob: undefined,
            dataReferenceId: undefined,
        }

        const savedDataSource: DataSource = await updateDataSource(dataSourceMessage)
        if (!savedDataSource) {
            // Failed to save data source -- can't continue. For now, controller shows error popup.
            return
        }

        debug("Saved Data Source: ", savedDataSource)

        // Unpack the values for data fields
        const inputFieldsMapped: Record<string, DataTagField> = {}

        const fields = profile?.dataTag?.fields
        let hasNaNField = false
        let hasTooManyCategories = false
        // Loop over the Data fields
        Object.keys(fields).forEach((fieldName) => {
            const dataField = fields[fieldName]
            // If the any field in the dataTag contains hasNan === true
            // set the hasNaNField to true
            if (dataField.hasNan) {
                hasNaNField = true
            }

            if (
                dataField.valued === "CATEGORICAL" &&
                dataField.discreteCategoricalValues.length > MAX_ALLOWED_CATEGORIES
            ) {
                hasTooManyCategories = true
            }

            // Set the value
            inputFieldsMapped[fieldName] = {
                // Get the esp-type
                espType: dataField.espType,

                // Get the Data type
                dataType: dataField.dataType,
                sum: dataField.sum,
                stdDev: dataField.stdDev,
                range: dataField.range,
                discreteCategoricalValues: dataField.discreteCategoricalValues,
                hasNan: dataField.hasNan,
                valued: dataField.valued,
                mean: dataField.mean,
                isOrdered: dataField.isOrdered,
            }
        })

        // Construct the Data tag Message
        const dataTagMessage: DataTag = {
            fields: inputFieldsMapped,
            DataSourceId: savedDataSource.id,
            requestUser: currentUser,
            createdAt: undefined,
            updatedAt: undefined,
            id: undefined,
            description: undefined,
            hidden: undefined,
            owner: undefined,
            lastEditedBy: undefined,
        }

        debug("DataTag: ", dataTagMessage)
        // Trigger the Data tag Controller
        const savedDataTag = await updateDataTag(dataTagMessage)
        if (savedDataTag) {
            sendNotification(NotificationType.success, `Data profile "${datasetName}" created`)
        }

        // Send notification if data source contains a field where hasNan === true.
        if (hasNaNField) {
            sendNotification(
                NotificationType.warning,
                "This Project's data source contains rows that have NaN values. A confabulator node will need to be " +
                    "added to fill in the NaN values."
            )
        }
        if (hasTooManyCategories) {
            sendNotification(
                NotificationType.warning,
                `This Project's data source contains a Categorical row(s) that has greater than 
                ${MAX_ALLOWED_CATEGORIES} categories. A category reducer node will need to be added.`
            )
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
            updatePermission
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
            setCsvConfirmDialogOpen(true)
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
    function getS3CreateButtonTooltip() {
        if (isUploading) {
            return "Please wait until upload is complete"
        } else if (isUsingS3Source && !inputFields.s3Key) {
            return "Please enter an S3 key for your data source or choose a local file"
        } else if (isUsingLocalFile) {
            return "Only available when using the S3 data source option"
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

    const propsId = props.id

    // TODO: get this to work
    // defaultActiveKey={isNewProject ? projectDetailsPanelKey : dataSourcePanelKey}
    return (
        <>
            <Container id={propsId}>
                {isNewProject && getProjectDetailsPanel()}
                {getDataSourcePanel()}
                {getProfileTablePanel()}
                {getCreateDataProfileButton()}
            </Container>
            {csvConfirmDialogOpen && (
                <ConfirmationModal
                    content={
                        <span id="csv-confirm-message">
                            Only CSV files are supported, but the file you have selected of type &quot;$
                            {selectedFile.type}
                            &quot; does not appear to be a CSV file.
                            <br id="csv-confirm-message-1" />
                            <br id="csv-confirm-message-2" />
                            Are you sure you wish to proceed?
                        </span>
                    }
                    handleCancel={() => {
                        setCsvConfirmDialogOpen(false)
                    }}
                    handleOk={async () => {
                        await proceedWithFileUpload(selectedFile.name)
                        setCsvConfirmDialogOpen(false)
                    }}
                    id="csv-confirm-dialog"
                    title={<span id="csv-confirm-title">Is &quot;{selectedFile.name}&quot; a CSV file?</span>}
                />
            )}
        </>
    )
}
