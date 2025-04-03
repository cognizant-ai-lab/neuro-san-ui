import DeleteOutline from "@mui/icons-material/DeleteOutline"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Grid from "@mui/material/Grid2"
import Input from "@mui/material/Input"
import List from "@mui/material/List"
import ListItem from "@mui/material/ListItem"
import ListItemButton from "@mui/material/ListItemButton"
import ListItemIcon from "@mui/material/ListItemIcon"
import ListItemText from "@mui/material/ListItemText"
import TextField from "@mui/material/TextField"
import Tooltip from "@mui/material/Tooltip"
import {ReactElement, MouseEvent as ReactMouseEvent, useEffect, useState} from "react"
import {DragDropContext, Draggable, Droppable} from "react-beautiful-dnd"
import {AiFillEdit, AiFillWarning} from "react-icons/ai"

import {reasonToHumanReadable} from "../../../controller/datasources/conversion"
import {DataTagFieldCAOType, DataTagFieldDataType, DataTagFieldValued, Profile} from "../../../generated/metadata"
import {empty, jsonStringifyInOrder} from "../../../utils/objects"
import {ChatBot} from "../../ChatBot/ChatBot"
import {ConfirmationModal} from "../../confirmationModal"
import {MUIAlert} from "../../MUIAlert"

interface ProfileTableProps {
    id: string
    Profile: Profile
    ProfileUpdateHandler: (value: Profile) => void

    // enable/disable saving of profile
    readonly updatePermission?: boolean
}

export default function ProfileTable(props: ProfileTableProps) {
    const {Profile: profile, updatePermission} = props
    const setProfile = props.ProfileUpdateHandler
    const [fieldBeingEditedName, setFieldBeingEditedName] = useState(null)
    const [showFieldEditor, setShowFieldEditor] = useState(false)
    const [confirmationModalStatus, setConfirmationModalStatus] = useState(false)
    const [currentCategoryValues, setCurrentCategoryValues] = useState([])
    const [categoryOrder, setCategoryOrder] = useState([])
    const [newItem, setNewItem] = useState(null)
    const [dataSetCategories, setDataSetCategories] = useState({})

    // Declare table headers
    const tableHeaders = [
        "Field Name",
        "ESP Type/Error",
        "Data Type",
        "Valued",
        "Values",
        "Min",
        "Max",
        "Mean",
        "Sum",
        "Std Dev",
        "Has NaN",
    ]

    // Create Table header elements
    const tableHeaderElements: ReactElement[] = []

    function isContinuous(field: string) {
        return fields[field].valued === "CONTINUOUS"
    }

    tableHeaders.forEach((header) => {
        tableHeaderElements.push(
            <th
                id={header}
                key={header}
                scope="col"
                className="py-3 text-center text-xs font-medium text-gray-500"
            >
                {header}
            </th>
        )
    })

    // Color codes for the various types of rows in the fields table
    const caoColorCoding = {
        CONTEXT: "#87b4e3",
        ACTION: "#79f5f1",
        OUTCOME: "#b4e5af",
        REJECTED: "#ebbfc3",
    }

    const tableCellClassName = "py-3 text-center text-xs font-medium text-gray-900"

    // Fields are in arbitrary order as returned from DataProfiler (gRPC runtime jumbles the keys since maps are
    // defined as not having a key order)
    const fields = profile ? profile.dataTag.fields : {}

    // Headers should be in CSV column order. For backward compatibility, use data tag fields if headers missing
    const headers = profile
        ? (profile?.dataSource?.headers?.length && profile.dataSource.headers) || Object.keys(fields)
        : []

    // Only display fields that weren't dropped by DataProfiler due to errors
    const fieldsInCsvOrder = headers.filter((header) => Object.keys(fields).includes(header))

    // Accumulate rows, one per field
    const fieldRows = fieldsInCsvOrder.map((field) => (
        <tr
            id={field}
            key={field}
            style={{backgroundColor: caoColorCoding[fields[field].espType], height: "1rem", padding: 0, margin: 0}}
        >
            {/*Field name*/}
            <td
                id={`${field}-name`}
                className={tableCellClassName}
            >
                <span id={`${field}-name-label`}>{field}</span>
            </td>

            {/*CAO type*/}
            <td
                id={`${field}-esp-type`}
                className={tableCellClassName}
            >
                <select
                    id={`${field}-esp-type-select`}
                    name={`${field}-espType`}
                    value={fields[field].espType}
                    className="w-18"
                    onChange={(event) => {
                        const profileCopy = {...profile}
                        profileCopy.dataTag.fields[field].espType = DataTagFieldCAOType[event.target.value]
                        setProfile(profileCopy)
                    }}
                >
                    <option
                        id={`${field}-esp-type-context`}
                        value="CONTEXT"
                        disabled={!updatePermission}
                    >
                        CONTEXT
                    </option>
                    <option
                        id={`${field}-esp-type-action`}
                        value="ACTION"
                        disabled={!updatePermission}
                    >
                        ACTION
                    </option>
                    <option
                        id={`${field}-esp-type-outcome`}
                        value="OUTCOME"
                        disabled={!updatePermission}
                    >
                        OUTCOME
                    </option>
                </select>
            </td>

            {/*Data type -- float, int etc. */}
            <td
                id={`${field}-data-type`}
                className={tableCellClassName}
            >
                <select
                    id={`${field}-data-type-select`}
                    name={`${field}-dataType`}
                    value={fields[field].dataType}
                    onChange={(event) => {
                        const profileCopy = {...profile}
                        profileCopy.dataTag.fields[field].dataType = DataTagFieldDataType[event.target.value]
                        setProfile(profileCopy)
                    }}
                >
                    <option
                        id={`${field}-data-type-int`}
                        value="INT"
                        disabled={!updatePermission}
                    >
                        INT
                    </option>
                    <option
                        id={`${field}-data-type-string`}
                        value="STRING"
                        disabled={!updatePermission}
                    >
                        STRING
                    </option>
                    <option
                        id={`${field}-data-type-float`}
                        value="FLOAT"
                        disabled={!updatePermission}
                    >
                        FLOAT
                    </option>
                    <option
                        id={`${field}-data-type-bool`}
                        value="BOOL"
                        disabled={!updatePermission}
                    >
                        BOOL
                    </option>
                </select>
            </td>

            {/*Valued type (categorical or continuous)*/}
            <td
                id={`${field}-data-continuity`}
                className={tableCellClassName}
            >
                <select
                    id={`${field}-data-continuity-select`}
                    name={`${field}-valued`}
                    value={fields[field].valued}
                    onChange={(event) => {
                        const profileCopy = {...profile}
                        profileCopy.dataTag.fields[field].valued = DataTagFieldValued[event.target.value]
                        setProfile(profileCopy)
                    }}
                >
                    <option
                        id={`${field}-data-continuity-categorical`}
                        value="CATEGORICAL"
                        disabled={!updatePermission}
                    >
                        CATEGORICAL
                    </option>
                    <option
                        id={`${field}-data-continuity-continuous`}
                        value="CONTINUOUS"
                        disabled={!updatePermission}
                    >
                        CONTINUOUS
                    </option>
                </select>
            </td>

            {/*Available values, if categorical*/}
            <td
                id={`${field}-categorical`}
                className={tableCellClassName}
            >
                {fields[field].valued === "CATEGORICAL" ? (
                    <span
                        id={`${field}-categorical-span`}
                        style={{display: "flex"}}
                    >
                        <select
                            id={`${field}-categorical-select`}
                            name={`${field}-values`}
                            defaultValue=""
                        >
                            <option
                                id={`${field}-categorical-click-for-values`}
                                value=""
                                disabled
                                hidden
                            >
                                Click for values:
                            </option>
                            {fields[field].discreteCategoricalValues.map((item) => (
                                <option
                                    id={`${field}-categorical-value-${item}`}
                                    value={item}
                                    key={item}
                                    disabled
                                >
                                    {item}
                                </option>
                            ))}
                        </select>
                        {updatePermission ? (
                            <button
                                id={`${field}-set-current-category-values`}
                                onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                                    // Don't want to submit form here!
                                    e.preventDefault()

                                    setFieldBeingEditedName(field)
                                    setCurrentCategoryValues(fields[field].discreteCategoricalValues)
                                    setCategoryOrder(fields[field].discreteCategoricalValues)
                                    setShowFieldEditor(true)
                                }}
                            >
                                <AiFillEdit
                                    id={`${field}-set-current-category-values-fill`}
                                    size="14"
                                    style={{cursor: "pointer"}}
                                />
                            </button>
                        ) : null}
                    </span>
                ) : (
                    "N/A"
                )}
            </td>

            {/*Min value*/}
            <td
                id={`${field}-min-range`}
                className={tableCellClassName}
            >
                {isContinuous(field) ? (
                    <Box id={`${field}-min-range-data`}>
                        <Input
                            id={`${field}-min-range-control`}
                            className="m-0 p-0 mx-auto"
                            sx={{width: "16ch", backgroundColor: "var(--bs-white)"}}
                            name={`${field}-min-range`}
                            type="number"
                            value={fields[field].range[0]}
                            disabled={!updatePermission}
                            onChange={(event) => {
                                const profileCopy = {...profile}
                                profileCopy.dataTag.fields[field].range[0] = parseFloat(event.target.value)
                                setProfile(profileCopy)
                            }}
                        />
                    </Box>
                ) : (
                    "N/A"
                )}
            </td>

            {/*Max value*/}
            <td
                id={`${field}-max-range`}
                className={tableCellClassName}
            >
                {isContinuous(field) ? (
                    <Box id={`${field}-max-range-group`}>
                        <Input
                            id={`${field}-max-range-control`}
                            className="m-0 p-0 mx-auto"
                            sx={{width: "16ch", backgroundColor: "var(--bs-white)"}}
                            name={`${field}-max-range`}
                            type="number"
                            value={fields[field].range[1]}
                            disabled={!updatePermission}
                            onChange={(event) => {
                                const profileCopy = {...profile}
                                profileCopy.dataTag.fields[field].range[1] = parseFloat(event.target.value)
                                setProfile(profileCopy)
                            }}
                        />
                    </Box>
                ) : (
                    "N/A"
                )}
            </td>

            {/*Mean*/}
            <td
                id={`${field}-mean`}
                className={tableCellClassName}
            >
                {isContinuous(field) ? fields[field].mean : "N/A"}
            </td>

            {/*Sum*/}
            <td
                id={`${field}-sum`}
                className={tableCellClassName}
            >
                {isContinuous(field) ? fields[field].sum : "N/A"}
            </td>

            {/*Stddev*/}
            <td
                id={`${field}-std-dev`}
                className={tableCellClassName}
            >
                {isContinuous(field) ? fields[field].stdDev : "N/A"}
            </td>

            {/*has nan*/}
            <td
                id={`${field}-has-nan`}
                className={tableCellClassName}
            >
                {fields[field].hasNan.toString()}
            </td>
        </tr>
    ))

    function getRejectedColumnRows() {
        if (!profile?.dataSource?.rejectedColumns) {
            return []
        }

        const rejectedColumns = profile.dataSource.rejectedColumns
        return rejectedColumns && !empty(rejectedColumns)
            ? Object.keys(rejectedColumns).map((columnName) => (
                  <tr
                      id={`${columnName}-rejected-row`}
                      key={columnName}
                      style={{backgroundColor: caoColorCoding.REJECTED, whiteSpace: "nowrap"}}
                  >
                      <td
                          id={`${columnName}-rejected-data`}
                          className={tableCellClassName}
                      >
                          <span
                              id={`${columnName}-rejected`}
                              className="px-2 text-xs leading-5 font-semibold rounded-full flex-nowrap opacity-50"
                              style={{display: "flex", flexWrap: "nowrap"}}
                          >
                              <AiFillWarning
                                  id={`${columnName}-rejected-fill-warning`}
                                  size="20"
                                  className="mr-2"
                              />
                              {columnName}
                          </span>
                      </td>
                      <td
                          id={`${columnName}-rejection-reason-data`}
                          className={tableCellClassName}
                      >
                          <span
                              id={`${columnName}-rejection-reason`}
                              className="px-2 text-xs leading-5 font-semibold rounded-full flex-nowrap opacity-50"
                          >
                              {`${rejectedColumns[columnName]}: ${reasonToHumanReadable(rejectedColumns[columnName])}`}
                          </span>
                      </td>
                  </tr>
              ))
            : []
    }

    // Separate set of rows for any columns the data profiler had issues with
    const rejectedColumnRows = getRejectedColumnRows()

    // Add together error rows + valid rows to get all table rows
    const allRows = fieldRows.concat(rejectedColumnRows)

    function deleteValue(val: string) {
        let tmpValues = currentCategoryValues.slice()
        tmpValues = tmpValues.filter((item) => item !== val)
        setCurrentCategoryValues(tmpValues)
    }

    const renderCategoryDragList = (val: string, index: number) => {
        return (
            <Draggable // eslint-disable-line enforce-ids-in-jsx/missing-ids
                // 2/6/23 DEF - Draggable doesn't have an id
                // property when compiling
                key={val}
                draggableId={val}
                index={index}
            >
                {(providedInner, snapshot) => {
                    const opacity = snapshot.isDragging ? "50%" : "100%"
                    return (
                        <Grid
                            id={`${val}-row`}
                            sx={{opacity: opacity}}
                            ref={providedInner.innerRef}
                            {...providedInner.draggableProps}
                            {...providedInner.dragHandleProps}
                            size={12}
                        >
                            {dataSetCategories[fieldBeingEditedName]?.has(val) ? null : (
                                <ListItem
                                    id={`${val}-value`}
                                    disablePadding={true}
                                    sx={{border: "1px solid lightgray", borderRadius: "4px", marginBottom: "12px"}}
                                >
                                    <ListItemButton id={`${val}-value-button`}>
                                        <ListItemIcon id={`${val}-delete-value-fill`}>
                                            <Tooltip
                                                id={`${val}-delete-value-tooltip`}
                                                title="Delete this value"
                                                arrow
                                            >
                                                <DeleteOutline
                                                    id={`${val}-delete-value`}
                                                    sx={{
                                                        color: "var(--bs-primary)",
                                                        fontSize: "1rem",
                                                        "&:hover": {
                                                            color: "var(--bs-red)",
                                                        },
                                                    }}
                                                    onClick={() => {
                                                        deleteValue(val)
                                                    }}
                                                />
                                            </Tooltip>
                                        </ListItemIcon>
                                        <ListItemText
                                            id={val}
                                            primary={val}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            )}
                        </Grid>
                    )
                }}
            </Draggable>
        )
    }

    const saveHandler = () => {
        const profileCopy = {...profile}

        if (profileCopy.dataTag.fields) {
            profileCopy.dataTag.fields[fieldBeingEditedName].discreteCategoricalValues = currentCategoryValues
        }
        setProfile(profileCopy)

        setCategoryOrder(currentCategoryValues)
        setCurrentCategoryValues([])
        setFieldBeingEditedName(undefined)
        setShowFieldEditor(false)
        setConfirmationModalStatus(false)
    }

    const renderConfirmationModal = () => (
        <ConfirmationModal
            cancelBtnLabel="Leave without saving"
            closeable={false}
            content={
                <p id="confirm-changes-text">
                    You are about to exit without saving. Changes will be lost. Do you want to save your changes before
                    leaving?
                </p>
            }
            handleCancel={() => {
                setConfirmationModalStatus(false)
            }}
            handleOk={() => {
                saveHandler()
            }}
            id="confirm-categorical-values-dialog"
            maskCloseable={false}
            okBtnLabel="Save changes"
            title="Unsaved Changes"
        />
    )

    const editCategoryValuesModalContent = (
        <Grid
            id="field-container"
            container={true}
        >
            <Grid id="field-being-edited-row">
                <label id="field-being-edited">Field: {fieldBeingEditedName} </label>
            </Grid>
            <Grid
                id="field-editor-drag-msg-row "
                size={12}
            >
                (drag to re-order)
            </Grid>
            <Grid
                id="values-droppable-row"
                size={12}
                sx={{marginTop: "1rem"}}
            >
                {/* Drag-drop list of values */}
                {
                    <Droppable // eslint-disable-line enforce-ids-in-jsx/missing-ids
                        // 2/6/23 DEF - Droppable doesn't have an id property when compiling
                        droppableId="values"
                    >
                        {(provided) => (
                            <Grid id="values-droppable-container">
                                <List
                                    id="values-droppable-listgroup"
                                    ref={provided.innerRef}
                                    sx={{marginTop: "8px"}}
                                    {...provided.droppableProps}
                                >
                                    {
                                        profile && fieldBeingEditedName
                                            ? currentCategoryValues.map((val, index) => {
                                                  return renderCategoryDragList(val, index)
                                              })
                                            : [] // empty list by default
                                    }
                                </List>
                                {provided.placeholder}
                            </Grid>
                        )}
                    </Droppable>
                }
            </Grid>
            <Grid
                id="add-category-value-row"
                size={12}
                sx={{marginTop: "1rem"}}
            >
                <TextField
                    id="add-category-value-input"
                    placeholder="My new category"
                    label="New category"
                    onChange={(event) => {
                        setNewItem(event.target.value)
                    }}
                    slotProps={{
                        inputLabel: {
                            shrink: true,
                        },
                    }}
                    sx={{
                        "& .MuiInputBase-root": {
                            height: "2.5rem",
                        },
                    }}
                />
                <Button
                    id="add-category-value-button"
                    onClick={() => {
                        setCurrentCategoryValues([...currentCategoryValues, newItem])
                    }}
                    disabled={!newItem || currentCategoryValues.includes(newItem)}
                    variant="outlined"
                    sx={{
                        height: "2.5rem",
                        backgroundColor: "var(--bs-primary) !important",
                        color: "var(--bs-white) !important",
                        marginLeft: "1rem",
                        borderRadius: "var(--bs-border-radius)",
                    }}
                >
                    Add
                </Button>
            </Grid>
        </Grid>
    )

    const renderEditCategoryValuesModal = () => (
        <ConfirmationModal
            cancelBtnLabel="Leave without saving"
            closeable={false}
            content={editCategoryValuesModalContent}
            handleCancel={() => {
                if (jsonStringifyInOrder(categoryOrder) !== jsonStringifyInOrder(currentCategoryValues)) {
                    setConfirmationModalStatus(true)
                    setShowFieldEditor(false)
                    return
                }
                setShowFieldEditor(false)
                setFieldBeingEditedName(undefined)
            }}
            handleOk={() => {
                saveHandler()
            }}
            id="edit-categorical-values-dialog"
            maskCloseable={false}
            okBtnLabel="Save changes"
            title="Edit categorical values"
        />
    )

    useEffect(() => {
        const categoryMap = {}
        fieldsInCsvOrder.forEach((field) => {
            if (fields[field].valued !== "CATEGORICAL") {
                return
            }

            if (!categoryMap[field]) {
                categoryMap[field] = new Set([]) // pending BE implementation
            }
        })

        setDataSetCategories(categoryMap)
    }, [profile])

    const propsId = props.id
    // Wrap everything in a DragDropContext as recommended by react-beautiful-dnd doc
    return (
        <DragDropContext // eslint-disable-line enforce-ids-in-jsx/missing-ids
            // 2/6/23 DEF - DragDropContext does not have an id property when compiling
            onDragEnd={(dragResult) => {
                // Prevent dragging out of bounds
                if (!dragResult.destination) {
                    return
                }

                // Reorder list based on where user dropped item
                const items = currentCategoryValues.slice()
                const [reorderedItem] = items.splice(dragResult.source.index, 1)
                items.splice(dragResult.destination.index, 0, reorderedItem)
                setCurrentCategoryValues(items)
            }}
        >
            {!updatePermission ? (
                <MUIAlert
                    id="no-permission-message"
                    severity="error"
                    sx={{marginBottom: 0}}
                >
                    🔒 You do not have the required permissions to make changes to this project.
                </MUIAlert>
            ) : null}
            <Box
                id={propsId}
                sx={{display: "flex", flexDirection: "column"}}
            >
                {showFieldEditor && renderEditCategoryValuesModal()}
                {confirmationModalStatus && renderConfirmationModal()}
                <Box
                    id="profile-table-div"
                    sx={{
                        alignItems: "center",
                        borderBottomWidth: 1,
                        borderColor: "gray.200",
                        borderRadius: 1,
                        boxShadow: 1,
                        display: "inline-block",
                        minWidth: "100%",
                        marginX: {sm: 6, lg: 8},
                        marginY: 2,
                        overflow: "hidden",
                        overflowX: "auto",
                        paddingY: 2,
                    }}
                >
                    <table
                        id="profile-table"
                        className="min-w-full divide-y divide-gray-200"
                    >
                        <thead
                            id="profile-table-header"
                            className="bg-gray-50"
                        >
                            <tr id="profile-table-header-elements">{tableHeaderElements}</tr>
                        </thead>
                        <tbody
                            id="profile-table-all-rows"
                            className="bg-white divide-y divide-gray-200"
                        >
                            {allRows}
                        </tbody>
                    </table>
                </Box>
            </Box>
            <ChatBot
                id="chatbot"
                userAvatar={undefined}
                pageContext={ProfileTable.pageContext}
            />
        </DragDropContext>
    )
}

ProfileTable.pageContext =
    "This page is for defining the properties of your data source. For each column of your " +
    "data, you can specify the column type, the role the column plays within your experiment (context, action, " +
    "outcome) and whether the column is categorical or numeric. For categorical columns, you can edit the set of " +
    "values, but this should be done with caution since by adding new values you are stepping outside your training " +
    "data. On this page you can also view statistics about your data source such as the mean, sum and standard " +
    "deviation for each numeric column."
