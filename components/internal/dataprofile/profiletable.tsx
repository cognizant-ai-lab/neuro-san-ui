import {Button, Input, Modal, Space} from "antd"
import {ReactElement, MouseEvent as ReactMouseEvent, useState} from "react"
import {DragDropContext, Draggable, Droppable} from "react-beautiful-dnd"
import {Col, Container, Form, ListGroup, Row} from "react-bootstrap"
import {AiFillDelete, AiFillEdit, AiFillWarning} from "react-icons/ai"

import {Profile} from "../../../controller/dataprofile/types"
import {reasonToHumanReadable} from "../../../controller/datasources/types"
import {DataType} from "../../../controller/datatag/types"
import {empty} from "../../../utils/objects"
import NeuroAIChatbot from "../chatbot/neuro_ai_chatbot"


interface ProfileTableProps {
    id: string
    Profile: Profile
    ProfileUpdateHandler: (value: Profile) => void
}

export default function ProfileTable(props: ProfileTableProps) {
    const profile = props.Profile
    const setProfile = props.ProfileUpdateHandler
    const [fieldBeingEditedName, setFieldBeingEditedName] = useState(null)
    const [showFieldEditor, setShowFieldEditor] = useState(false)
    const [currentCategoryValues, setCurrentCategoryValues] = useState([])
    const [newItem, setNewItem] = useState(null)

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
        "Has NaN"
    ]
    
    // Create Table header elements
    const tableHeaderElements: ReactElement[] = [];

    function isContinuous(field: string) {
        return fields[field].valued === "CONTINUOUS"
    }

    tableHeaders.forEach(header => {
        tableHeaderElements.push(
            <th id={header}
                key={header}
                scope="col"
                className="py-3 text-center text-xs font-medium text-gray-500"

            >
                { header }
            </th>
        )
    })

    // Color codes for the various types of rows in the fields table
    const caoColorCoding = {
        "CONTEXT":  "#87b4e3",
        "ACTION":   "#79f5f1",
        "OUTCOME":  "#b4e5af",
        "REJECTED": "#ebbfc3"
    }

    const tableCellClassName = "py-3 text-center text-xs font-medium text-gray-900"

    // Fields are in arbitrary order as returned from DataProfiler (gRPC runtime jumbles the keys since maps are
    // defined as not having a key order)
    const fields = profile ? profile.data_tag.fields : {}

    // Headers should be in CSV column order. For backward compatibility, use data tag fields if headers missing
    const headers = profile ? profile.data_source.headers || Object.keys(fields) : []

    // Only display fields that weren't dropped by DataProfiler due to errors
    const fieldsInCsvOrder = headers.filter(header => Object.keys(fields).includes(header))

    // Accumulate rows, one per field
    const fieldRows = fieldsInCsvOrder.map((field) =>
        <tr id={ `${field}` }
            key={field}
            style={{backgroundColor: caoColorCoding[fields[field].esp_type]}}
        >
            {/*Field name*/}
            <td id={ `${field}-name` } className={tableCellClassName}>
                <span id={ `${field}-name-label` }
                >
                    {field}
                </span>
            </td>
            
            {/*CAO type*/}
            <td id={ `${field}-esp-type` } className={tableCellClassName}>
                <select id={ `${field}-esp-type-select` }
                    name={`${field}-esp_type`}
                    value={fields[field].esp_type}
                    className="w-18"
                    onChange={event => {
                        const profileCopy = {...profile}
                        profileCopy.data_tag.fields[field].esp_type = event.target.value
                        setProfile(profileCopy)
                    }}
                >
                    <option id={ `${field}-esp-type-context` } value="CONTEXT">CONTEXT</option>
                    <option id={ `${field}-esp-type-action` } value="ACTION">ACTION</option>
                    <option id={ `${field}-esp-type-outcome` } value="OUTCOME">OUTCOME</option>
                </select>
            </td>
            
            {/*Data type -- float, int etc. */}
            <td id={ `${field}-data-type` } className={tableCellClassName}>
                <select id={ `${field}-data-type-select` }
                    name={`${field}-data_type`}
                    value={fields[field].data_type}
                    onChange={event => {
                        const profileCopy = {...profile}
                        profileCopy.data_tag.fields[field].data_type = DataType[event.target.value]
                        setProfile(profileCopy)
                    }}
                >
                    <option id={ `${field}-data-type-int` }    value="INT">INT</option>
                    <option id={ `${field}-data-type-string` } value="STRING">STRING</option>
                    <option id={ `${field}-data-type-float` }  value="FLOAT">FLOAT</option>
                    <option id={ `${field}-data-type-bool` }   value="BOOL">BOOL</option>
                </select>
            </td>
            
            {/*Valued type (categorical or continuous)*/}
            <td id={ `${field}-data-continuity` } className={tableCellClassName} >
                <select id={ `${field}-data-continuity-select` }
                    name={`${field}-valued`}
                    value={fields[field].valued}
                    onChange={event => {
                        const profileCopy = {...profile}
                        profileCopy.data_tag.fields[field].valued = event.target.value
                        setProfile(profileCopy)
                    }}
                >
                    <option id={ `${field}-data-continuity-categorical` }
                        value="CATEGORICAL">
                        CATEGORICAL
                    </option>
                    <option id={ `${field}-data-continuity-continuous` }
                        value="CONTINUOUS">
                        CONTINUOUS
                    </option>
                </select>
            </td>
            
            {/*Available values, if categorical*/}
            <td id={ `${field}-categorical` } className={tableCellClassName} >
                {fields[field].valued === "CATEGORICAL"
                    ?   <span id={ `${field}-categorical-span` } style={{"display": "flex"}}>
                            <select id={ `${field}-categorical-select` }
                                name={`${field}-values`}
                                defaultValue=""
                            >
                                <option id={ `${field}-categorical-click-for-values` }
                                    value="" disabled hidden>
                                    Click for values:
                                </option>
                                {
                                    fields[field].discrete_categorical_values.map((item) => (
                                        <option id={ `${field}-categorical-value-${item}` }
                                                value={item} key={item} disabled>
                                            {item}
                                        </option>
                                    ))
                                }
                            </select>
                            <button id={ `${field}-set-current-category-values` }
                                onClick={(e: ReactMouseEvent<HTMLButtonElement>) => {
                                    // Don't want to submit form here!
                                    e.preventDefault()

                                    setFieldBeingEditedName(field)
                                    setCurrentCategoryValues(fields[field].discrete_categorical_values)
                                    setShowFieldEditor(true)
                                }}
                            >
                                <AiFillEdit id={ `${field}-set-current-category-values-fill` }
                                    size="14" style={{cursor: "pointer"}}/>
                            </button>
                        </span>
                    :   "N/A"
                }
            </td>
            
            {/*Min value*/}
            <td id={ `${field}-min-range` } className={tableCellClassName} >
                {isContinuous(field)
                    ?   <Form.Group id={ `${field}-min-range-data` }>
                            <Form.Control
                                id={`${field}-min-range-control`}
                                className="m-0 p-0 mx-auto"
                                style={{width: "16ch"}}
                                name={`${field}-min-range`}
                                type="number"
                                value={fields[field].range[0]}
                                onChange={event => {
                                    const profileCopy = {...profile}
                                    profileCopy.data_tag.fields[field].range[0] = parseFloat(event.target.value)
                                    setProfile(profileCopy)
                                }}
                            />
                        </Form.Group>
                    :   "N/A"
                }
            </td>
            
            {/*Max value*/}
            <td id={ `${field}-max-range` } className={tableCellClassName}>
                {isContinuous(field)
                    ?   <Form.Group id={ `${field}-max-range-group` }>
                            <Form.Control 
                                id={`${field}-max-range-control`}
                                className="m-0 p-0 mx-auto"
                                style={{width: "16ch"}}
                                name={`${field}-max-range`}
                                type="number"
                                value={fields[field].range[1]}
                                onChange={event => {
                                    const profileCopy = {...profile};
                                    profileCopy.data_tag.fields[field].range[1] = parseFloat(event.target.value)
                                    setProfile(profileCopy)
                                }}
                            />
                        </Form.Group>
                    : "N/A"
                }
            </td>
            
            {/*Mean*/}
            <td id={ `${field}-mean` } className={tableCellClassName}>
                {isContinuous(field) ? fields[field].mean : "N/A"}
            </td>
            
            {/*Sum*/}
            <td id={ `${field}-sum` } className={tableCellClassName}>
                {isContinuous(field) ? fields[field].sum : "N/A"}
            </td>
            
            {/*Stddev*/}
            <td id={ `${field}-std-dev` } className={tableCellClassName}>
                {isContinuous(field) ? fields[field].std_dev : "N/A"}
            </td>

            {/*has nan*/}
            <td id={ `${field}-has-nan` } className={tableCellClassName}>
                {fields[field].has_nan.toString()}
            </td>
        </tr>
    )

    function getRejectedColumnRows() {
        if (!profile || !profile.data_source || !profile.data_source.rejectedColumns) {
            return []
        }

        const rejectedColumns = profile.data_source.rejectedColumns;
        return rejectedColumns && !empty(rejectedColumns)
            ? Object.keys(rejectedColumns)
                .map((columnName) =>
                    <tr id={ `${columnName}-rejected-row` }
                        key={columnName}
                        style={{backgroundColor: caoColorCoding.REJECTED, whiteSpace: "nowrap"}}>
                        <td id={ `${columnName}-rejected-data` } className={tableCellClassName}>
                            <span id={ `${columnName}-rejected` }
                                  className={"px-2 text-xs leading-5 font-semibold rounded-full flex-nowrap opacity-50"}
                                  style={{display: "flex", flexWrap: "nowrap"}}>
                                <AiFillWarning id={ `${columnName}-rejected-fill-warning` } size="20" className="mr-2"/>
                                {columnName}
                            </span>
                        </td>
                        <td id={ `${columnName}-rejection-reason-data` } className={tableCellClassName}>
                            <span id={ `${columnName}-rejection-reason` }
                                className={"px-2 text-xs leading-5 font-semibold rounded-full flex-nowrap opacity-50"}>
                                {`${rejectedColumns[columnName]}: ${reasonToHumanReadable(rejectedColumns[columnName])}`}
                            </span>
                        </td>
                    </tr>
                )
            : []
    }

    // Separate set of rows for any columns the data profiler had issues with
    const rejectedColumnRows = getRejectedColumnRows();

    // Add together error rows + valid rows to get all table rows
    const allRows = fieldRows.concat(rejectedColumnRows)

    function deleteValue(val: string) {
        let tmpValues = currentCategoryValues.slice()
        tmpValues = tmpValues.filter(item => item !== val)
        setCurrentCategoryValues(tmpValues)
    }

    const editCategoryValuesModal =
        <Modal    // eslint-disable-line enforce-ids-in-jsx/missing-ids
                  // 2/6/23 DEF - Modal doesn't have an id property when compiling
                title="Edit categorical values"
                open={showFieldEditor}
                destroyOnClose={true}
                closable={false}
                onOk={(e: ReactMouseEvent<HTMLElement>) => {
                    // Don't want to submit form here!
                    e.preventDefault()

                    const profileCopy = {...profile}

                    profileCopy.data_tag.fields[fieldBeingEditedName].discrete_categorical_values = currentCategoryValues
                    setProfile(profileCopy)

                    setCurrentCategoryValues([])
                    setFieldBeingEditedName(undefined)
                    setShowFieldEditor(false)
                }}
                okButtonProps={{
                    id: "edit-categorical-values-ok-button"
                }}
                okType="default"
                onCancel={() => {
                    setShowFieldEditor(false)
                    setFieldBeingEditedName(undefined)
                }}
                maskClosable={false}
                cancelButtonProps={{
                    id: "edit-categorical-values-cancel-button"
                }}
        >
            <Container id="field-container">
                <Row id="field-being-edited-row">
                    <label id="field-being-edited">Field: {fieldBeingEditedName}</label>
                </Row>
                <Row id="field-editor-drag-msg-row" className="pt-3">
                    (drag to re-order)
                </Row>
                <p id="values-separator"/>
                <Row id="values-droppable-row">
                    {/* Drag-drop list of values */}
                    {<Droppable    // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                   // 2/6/23 DEF - Droppable doesn't have an id property when compiling
                        droppableId="values">
                        {(provided) => (
                            <Container id="values-droppable-container">
                                <ListGroup as="ol"
                                           id="values-droppable-listgroup"
                                           ref={provided.innerRef}
                                           {...provided.droppableProps}
                                >
                                    {
                                        profile && fieldBeingEditedName ? currentCategoryValues.map((val, index) => {
                                            return (
                                                <Draggable    // eslint-disable-line enforce-ids-in-jsx/missing-ids
                                                    // 2/6/23 DEF - Draggable doesn't have an id property when compiling
                                                    key={val} draggableId={val} index={index}>
                                                    {(providedInner, snapshot) => {
                                                        const opacity =
                                                            snapshot.isDragging ? "opacity-50" : "opacity-100"
                                                        return <Row id={ `${val}-row` }
                                                            className={"my-1 " + opacity}
                                                            ref={providedInner.innerRef}
                                                            {...providedInner.draggableProps}
                                                            {...providedInner.dragHandleProps}
                                                        >
                                                            <Col id={ `${val}-value-column` }
                                                                className="mx-0 px-1">
                                                                <ListGroup.Item id={ `${val}-value` }
                                                                    as="li" className="values">
                                                                    <div id={ `${val}` }>
                                                                        {val}
                                                                    </div>
                                                                </ListGroup.Item>
                                                            </Col>
                                                            <Col id={ `${val}-delete-value-column` }
                                                                className="d-flex vertical-align-middle mx-0 px-1">
                                                                <button id={ `${val}-delete-value` }
                                                                    onClick={() => {
                                                                        deleteValue(val)
                                                                    }}
                                                                >
                                                                    <AiFillDelete id={ `${val}-delete-value-fill` }
                                                                        size="14"
                                                                        style={{
                                                                            cursor: "pointer",
                                                                        }}
                                                                        className="hover:text-red-700"/>
                                                                </button>
                                                            </Col>
                                                        </Row>
                                                    }}
                                                </Draggable>
                                            )
                                        }) : [] // empty list by default
                                    }
                                </ListGroup>
                                {provided.placeholder}
                            </Container>
                        )}
                    </Droppable>}
                </Row>
                <Row id="add-category-value-label-row" className="pt-4">
                    <label id="add-category-label">Add category value:</label>
                </Row>
                <Row id="add-category-value-row" className="pt-1">
                    <Space.Compact id="category-values-group">
                        <Input id="add-category-value-input" 
                            style={{width: 'calc(100% - 200px)'}}
                            placeholder="Enter value"
                            onChange={
                                event => {
                                    setNewItem(event.target.value)
                                }
                            }
                         />
                        <Button id="add-category-value-button"
                            type="primary"
                            onClick={() => {
                                setCurrentCategoryValues([...currentCategoryValues, newItem])
                            }}
                                disabled={!newItem || currentCategoryValues.includes(newItem)}
                        >
                            Add
                        </Button>
                    </Space.Compact>
                </Row>
            </Container>
        </Modal>

    const propsId = `${props.id}`

    // Wrap everything in a DragDropContext as recommended by react-beautiful-dnd doc
    return <DragDropContext    // eslint-disable-line enforce-ids-in-jsx/missing-ids
                               // 2/6/23 DEF - DragDropContext does not have an id property when compiling
        onDragEnd={(dragResult) => {
            // Prevent dragging out of bounds
            if (!dragResult.destination) {
                return;
            }

            // Reorder list based on where user dropped item
            const items = currentCategoryValues.slice()
            const [reorderedItem] = items.splice(dragResult.source.index, 1);
            items.splice(dragResult.destination.index, 0, reorderedItem);
            setCurrentCategoryValues(items)
        }
    }>
        <div id={ `${propsId}` }
            className="flex flex-col mt-4">
            {editCategoryValuesModal}
            <div id="profile-table-div"
                className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div id="profile-table-div-3"
                    className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                    <div id="profile-table-div-4"
                        className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                        <table id="profile-table" className="min-w-full divide-y divide-gray-200" 
                        >
                            <thead id="profile-table-header" className="bg-gray-50">
                                <tr id="profile-table-header-elements">
                                    {tableHeaderElements}
                                </tr>
                            </thead>
                            <tbody id="profile-table-all-rows"
                                className="bg-white divide-y divide-gray-200">
                                {allRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        <NeuroAIChatbot  id="chatbot" userAvatar={undefined} pageContext={ProfileTable.pageContext} />
    </DragDropContext>
}

ProfileTable.pageContext = "This page is for defining the properties of your data source. For each column of your " +
    "data, you can specify the column type, the role the column plays within your experiment (context, action, " +
    "outcome) and whether the column is categorical or numeric. For categorical columns, you can edit the set of " +
    "values, but this should be done with caution since by adding new values you are stepping outside your training " +
    "data. On this page you can also view statistics about your data source such as the mean, sum and standard " +
    "deviation for each numeric column."

