import {Col, Container, Form, ListGroup, Row} from "react-bootstrap"
import {AiFillDelete, AiFillEdit, AiFillWarning} from "react-icons/ai";
import React, {useState} from "react";
import {Button, Checkbox, Input, Modal} from 'antd';
import {DragDropContext, Draggable, Droppable} from 'react-beautiful-dnd';
import {DataType} from "../../../controller/datatag/types";
import {empty} from "../../../utils/objects";
import {reasonToHumanReadable} from "../../../controller/datasources/types";
import {Profile} from "../../../controller/dataprofile/types"

export interface ProfiletableProps {
    Profile: Profile
    ProfileUpdateHandler: (value: Profile) => void
}

export default function ProfileTable(props: ProfiletableProps) {

    const profile = props.Profile
    const setProfile = props.ProfileUpdateHandler
    const [fieldBeingEditedName, setFieldBeingEditedName] = useState(null)
    const [showFieldEditor, setFieldEditorVisible] = useState(false)
    const [currentCategoryValues, setCurrentCategoryValues] = useState([])
    const [currentCategoryOrdered, setCurrentCategoryOrdered] = useState(false)
    const [newItem, setNewItem] = useState(null)

    // Declare table headers
    const TableHeaders = [
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
        "Has Nan",
    ]
    // Create Table header elements
    const tableHeaderElements: React.ReactElement[] = [];
    TableHeaders.forEach(header => {
        tableHeaderElements.push(
            <th key={header}
                scope="col"
                className="px-10 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
                { header }
            </th>
        )
    })

    // Color codes for the various types of rows in the fields table
    const caoColorCoding = {
        "CONTEXT":  "#8BBEE8FF",
        "ACTION":   "#D7A9E3FF",
        "OUTCOME":  "#A8D5BAFF",
        "REJECTED": "#D4B4B4FF"
    }

    const tableCellClassName = "px-10 py-3 text-center text-xs font-medium text-gray-900 tracking-wider"
    const rangeTableCellClassName = "px-2 py-3 text-center text-xs font-medium text-gray-900 tracking-wider"

    const fieldRows = profile != null
    ? Object.keys(profile.data_tag.fields).map((field) =>
        <tr key={field} style={{backgroundColor: caoColorCoding[profile.data_tag.fields[field].esp_type]}}>
            <td className={tableCellClassName}>
                <span className={"px-2 inline-flex text-xs leading-5 font-semibold rounded-full"}>
                    {field}
                </span>
            </td>
            <td className={tableCellClassName}>
                <select id="data-field-select"
                    name={`${field}-esp_type`}
                    value={profile.data_tag.fields[field].esp_type}
                    className="w-32"
                    onChange={event => {
                        const profileCopy = {...profile}
                        profileCopy.data_tag.fields[field].esp_type = event.target.value
                        setProfile(profileCopy)
                    }}
                >
                    <option id="data-field-context" value="CONTEXT">CONTEXT</option>
                    <option id="data-field-action" value="ACTION">ACTION</option>
                    <option id="data-field-outcome" value="OUTCOME">OUTCOME</option>
                </select>
            </td>
            <td className={tableCellClassName}>
                <select id="data-type-select"
                    name={`${field}-data_type`}
                    value={profile.data_tag.fields[field].data_type}
                    className="w-32"
                    onChange={event => {
                        const profileCopy = {...profile}
                        profileCopy.data_tag.fields[field].data_type = DataType[event.target.value]
                        setProfile(profileCopy)
                    }}
                >
                    <option id="data-type-int" value="INT">INT</option>
                    <option id="data-type-string" value="STRING">STRING</option>
                    <option id="data-type-float" value="FLOAT">FLOAT</option>
                    <option id="data-type-bool" value="BOOL">BOOL</option>
                </select>
            </td>
            <td className={tableCellClassName}>
                <select id="data-continuity-select"
                    name={`${field}-valued`}
                    value={profile.data_tag.fields[field].valued}
                    className="w-32"
                    onChange={event => {
                        const profileCopy = {...profile}
                        profileCopy.data_tag.fields[field].valued = event.target.value
                        setProfile(profileCopy)
                    }}
                >
                    <option id="categorical-option"
                        value="CATEGORICAL">
                        CATEGORICAL
                    </option>
                    <option id="continuous-option"
                        value="CONTINUOUS">
                        CONTINUOUS
                    </option>
                </select>
            </td>
            <td className={tableCellClassName}>
                {profile.data_tag.fields[field].valued === "CATEGORICAL" ?
                    <span style={{"display": "flex"}}>
                    <select id="categorical-select"
                        name={`${field}-values`}
                        className="w-32"
                    >
                        <option id="categorical-click-for-values"
                            value="" disabled selected>
                            Click for values:
                        </option>
                        {
                            profile.data_tag.fields[field].discrete_categorical_values.map(
                                (item) => (<option id={ `categorical-value-${item}` }
                                                value={item} key={item} disabled>{item}</option>))
                        }
                    </select>
                    <button id="set-current-category-values"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            // Don't want to submit form here!
                            e.preventDefault()

                            setFieldBeingEditedName(field)
                            setCurrentCategoryValues(profile.data_tag.fields[field].discrete_categorical_values)
                            setFieldEditorVisible(true)
                        }}
                    > <AiFillEdit size='14' style={{cursor: "pointer"}}/> </button>
                    </span> : "N/A"
                }
            </td>
            <td className={rangeTableCellClassName}>
                {profile.data_tag.fields[field].valued === "CONTINUOUS" ?
                    <Form.Group className="mb-3">
                        <Form.Control
                            name={`${field}-min-range`}
                            type="number"
                            value={profile.data_tag.fields[field].range[0]}
                            onChange={event => {
                                const profileCopy = {...profile}
                                profileCopy.data_tag.fields[field].range[0] = parseFloat(event.target.value)
                                setProfile(profileCopy)
                            }}/>
                    </Form.Group> : "N/A"
                }
            </td>
            <td className={rangeTableCellClassName}>
                {profile.data_tag.fields[field].valued === "CONTINUOUS" ? <Form.Group className="mb-3">
                    <Form.Control
                        name={`${field}-max-range`}
                        type="number"
                        value={profile.data_tag.fields[field].range[1]}
                        onChange={event => {
                            const profileCopy = {...profile};
                            profileCopy.data_tag.fields[field].range[1] = parseFloat(event.target.value)
                            setProfile(profileCopy)
                        }}/>
                </Form.Group> : "N/A"
                }
            </td>
            <td className={tableCellClassName}>
                {profile.data_tag.fields[field].valued === "CONTINUOUS" ? profile.data_tag.fields[field].mean : "N/A"}
            </td>
            <td className={tableCellClassName}>
                {profile.data_tag.fields[field].valued === "CONTINUOUS" ? profile.data_tag.fields[field].sum : "N/A"}
            </td>
            <td className={tableCellClassName}>
                {profile.data_tag.fields[field].valued === "CONTINUOUS" ? profile.data_tag.fields[field].std_dev : "N/A"}
            </td>
            <td className={tableCellClassName}>
                {profile.data_tag.fields[field].has_nan.toString()}
            </td>
        </tr>
    )
    : []

    function getRejectedColumnRows() {
        if (!profile || !profile.data_source || !profile.data_source.rejectedColumns) {
            return []
        }

        const rejectedColumns = profile.data_source.rejectedColumns;
        return rejectedColumns && !empty(rejectedColumns)
            ? Object.keys(rejectedColumns)
                .map((name) =>
                    <tr key={name} style={{backgroundColor: caoColorCoding.REJECTED, whiteSpace: "nowrap"}}>
                        <td className={tableCellClassName}>
                            <span className={"px-2 text-xs leading-5 font-semibold rounded-full flex-nowrap opacity-50"}
                                  style={{display: "flex", flexWrap: "nowrap"}}>
                                <AiFillWarning size="20" className="mr-2"/>
                                {name}
                            </span>
                        </td>
                        <td className={tableCellClassName}>
                            <span
                                className={"px-2 text-xs leading-5 font-semibold rounded-full flex-nowrap opacity-50"}>
                                {`${rejectedColumns[name]}: ${reasonToHumanReadable(rejectedColumns[name])}`}
                            </span>
                        </td>
                        {/* Hack to pad table row. There must be a better way. */}
                        {[...Array(9)].map((_, i) => <td key={i}/>)}
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
        <Modal title="Edit categorical values"
               visible={showFieldEditor}
               destroyOnClose={true}
               onOk={(e: React.MouseEvent<HTMLElement>) => {
                   // Don't want to submit form here!
                   e.preventDefault()

                   const profileCopy = {...profile}

                   profileCopy.data_tag.fields[fieldBeingEditedName].discrete_categorical_values = currentCategoryValues
                   profileCopy.data_tag.fields[fieldBeingEditedName].is_ordered = currentCategoryOrdered
                   setProfile(profileCopy)

                   setCurrentCategoryValues([])
                   setFieldBeingEditedName(undefined)
                   setFieldEditorVisible(false)
               }}
               onCancel={() => {
                   setFieldEditorVisible(false)
                   setFieldBeingEditedName(undefined)
               }}
        >
            <Container>
                <Row>
                    <label>Field: {fieldBeingEditedName}</label>
                </Row>
                <Row className="pt-3">
                    <Checkbox
                        value={currentCategoryOrdered}
                        onChange={e => setCurrentCategoryOrdered(e.target.value)}
                    >
                        Ordered (drag to re-order)
                    </Checkbox>
                </Row>
                <p/>
                <Row>
                    {/* Drag-drop list of values */}
                    {<Droppable droppableId="values">
                        {(provided) => (
                            <Container>
                                <ListGroup as="ol"
                                           id="listgroup"
                                           ref={provided.innerRef}
                                           {...provided.droppableProps}
                                >
                                    {
                                        profile && fieldBeingEditedName ? currentCategoryValues.map((val, index) => {
                                            return (
                                                <Draggable key={val} draggableId={val} index={index}>
                                                    {(provided, snapshot) => {
                                                        const opacity =
                                                            snapshot.isDragging ? "opacity-50" : "opacity-100"
                                                        return <Row className={"my-1 " + opacity}
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                        >
                                                            <Col className="mx-0 px-1">
                                                                <ListGroup.Item as="li" className="values">
                                                                    <div>
                                                                        {val}
                                                                    </div>
                                                                </ListGroup.Item>
                                                            </Col>
                                                            <Col className="d-flex vertical-align-middle mx-0 px-1">
                                                                <button id="delete-value"
                                                                    onClick={() => {
                                                                        deleteValue(val)
                                                                    }}
                                                                >
                                                                    <AiFillDelete
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
                <Row className="pt-4">
                    <label>Add category value:</label>
                </Row>
                <Row className="pt-1">
                    <Input.Group compact>
                        <Input style={{width: 'calc(100% - 200px)'}}
                           placeholder="Enter value"
                           onChange={
                               event => {
                                   setNewItem(event.target.value)
                               }
                           }
                        >
                        </Input>
                        <Button type="primary"
                            onClick ={() => {
                                setCurrentCategoryValues([...currentCategoryValues, newItem])
                            }}
                                disabled={!Boolean(newItem) || currentCategoryValues.includes(newItem)}
                        >
                            Add
                        </Button>
                    </Input.Group>
                </Row>
            </Container>
        </Modal>

    // Wrap everything in a DragDropContext as recommended by react-beautiful-dnd doc
    return <DragDropContext
        onDragEnd={(dragResult) => {
            // Prevent dragging out of bounds
            if (!dragResult.destination) return;

            // Reorder list based on where user dropped item
            const items = currentCategoryValues.slice()
            const [reorderedItem] = items.splice(dragResult.source.index, 1);
            items.splice(dragResult.destination.index, 0, reorderedItem);
            setCurrentCategoryValues(items)
        }
    }>
        <div className="flex flex-col mt-4">
            {editCategoryValuesModal}
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                    <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>{tableHeaderElements}</tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {allRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </DragDropContext>
}
