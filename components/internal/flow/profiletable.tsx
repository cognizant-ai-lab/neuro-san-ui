import {Button, Form, Modal} from "react-bootstrap"
import {AiFillEdit} from "react-icons/ai";
import EditableList from 'react-list-editable';
import 'react-list-editable/lib/react-list-editable.css';
import React, {useState} from "react";

export interface ProfiletableProps {

    Profile: any
    ProfileUpdateHandler: any

}
export default function ProfileTable(props: ProfiletableProps) {

    const profile = props.Profile
    const setProfile = props.ProfileUpdateHandler
    const [fieldBeingEditedName, setFieldBeingEditedName] = useState(null)
    const [showFieldEditor, setFieldEditorVisible] = useState(false)
    const [currentCategoryValues, setCurrentCategoryValues] = useState([])

    // Declare table headers
    const TableHeaders = [
        "Field Name",
        "ESP Type",
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
    let tableHeaderElements: React.ReactElement[] = []
    TableHeaders.forEach(header => {
        tableHeaderElements.push(
            <th key={header}
                scope="col"
                className="px-10 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                { header }
            </th>
        )
    })

    let fieldRows = []
    if (profile != null) {
        Object.keys(profile.data_tag.fields).map((field, idx) =>
            fieldRows.push(
                <tr key={field}>
                    <td className="px-10 py-3 text-center text-xs font-medium text-gray-900 tracking-wider">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full`}>
                            { field }
                        </span>
                    </td>
                    <td className="px-10 py-3 text-center text-xs font-medium text-gray-900 tracking-wider">
                        <select
                            name={`${field}-esp_type`}
                            value={ profile.data_tag.fields[field].esp_type }
                            className="w-32"
                            onChange={event => {
                                let profileCopy = {...profile}
                                profileCopy.data_tag.fields[field].esp_type = event.target.value
                                setProfile(profileCopy)
                            }}
                        >
                            <option value="CONTEXT">CONTEXT</option>
                            <option value="ACTION">ACTION</option>
                            <option value="OUTCOME">OUTCOME</option>
                        </select>
                    </td>
                    <td className="px-10 py-3 text-center text-xs font-medium text-gray-900 tracking-wider">
                        <select
                            name={`${field}-data_type`}
                            value={ profile.data_tag.fields[field].data_type }
                            className="w-32"
                            onChange={event => {
                                let profileCopy = {...profile}
                                profileCopy.data_tag.fields[field].data_type = event.target.value
                                setProfile(profileCopy)
                            }}
                        >
                            <option value="INT">INT</option>
                            <option value="STRING">STRING</option>
                            <option value="FLOAT">FLOAT</option>
                            <option value="BOOL">BOOL</option>
                        </select>
                    </td>
                    <td className="px-10 py-3 text-center text-xs font-medium text-gray-900 tracking-wider">
                        <select
                            name={`${field}-valued`}
                            value={ profile.data_tag.fields[field].valued }
                            className="w-32"
                            onChange={event => {
                                let profileCopy = {...profile}
                                profileCopy.data_tag.fields[field].valued = event.target.value
                                setProfile(profileCopy)
                            }}
                        >
                            <option value="CATEGORICAL">CATEGORICAL</option>
                            <option value="CONTINUOUS">CONTINUOUS</option>
                        </select>
                    </td>
                    <td className="px-10 py-3 text-center text-xs font-medium text-gray-900 tracking-wider">
                        { profile.data_tag.fields[field].valued === "CATEGORICAL" ?
                            <span style={{"display": "flex"}}>
                            <select
                                name={`${field}-values`}
                                className="w-32"
                                >
                                {
                                    profile.data_tag.fields[field].discrete_categorical_values.map(
                                        (item, index) => (<option value={item} key={item}>{item}</option>))
                                }
                            </select> <button onClick={() => {
                                setFieldBeingEditedName(field)
                                setCurrentCategoryValues(profile.data_tag.fields[field].discrete_categorical_values)
                                setFieldEditorVisible(true)
                            }}> <AiFillEdit size='14' style={{ cursor: "pointer" }}/> </button>
                            </span> : "N/A"
                        }
                    </td>
                    <td className="px-2 py-3 text-center text-xs font-medium text-gray-900 tracking-wider">
                        { profile.data_tag.fields[field].valued === "CONTINUOUS" ?
                            <Form.Group className="mb-3">
                                <Form.Control
                                    name={`${field}-min-range`}
                                    type="number"
                                    value={profile.data_tag.fields[field].range[0]}
                                    onChange={event => {
                                        let profileCopy = {...profile}
                                        profileCopy.data_tag.fields[field].range[0] = parseFloat(event.target.value)
                                        setProfile(profileCopy)
                                    }}/>
                            </Form.Group> : "N/A"
                        }
                    </td>
                    <td className="px-2 py-3 text-center text-xs font-medium text-gray-900 tracking-wider">
                        {profile.data_tag.fields[field].valued === "CONTINUOUS" ? <Form.Group className="mb-3">
                            <Form.Control
                                name={`${field}-max-range`}
                                type="number"
                                value={profile.data_tag.fields[field].range[1]}
                                onChange={event => {
                                    let profileCopy = {...profile}
                                    profileCopy.data_tag.fields[field].range[1] = parseFloat(event.target.value)
                                    setProfile(profileCopy)
                                }}/>
                        </Form.Group> : "N/A"
                        }
                    </td>
                    <td className="px-10 py-3 text-center text-xs font-medium text-gray-900 tracking-wider">
                        { profile.data_tag.fields[field].valued === "CONTINUOUS" ? profile.data_tag.fields[field].mean : "N/A" }
                    </td>
                    <td className="px-10 py-3 text-center text-xs font-medium text-gray-900 tracking-wider">
                        { profile.data_tag.fields[field].valued === "CONTINUOUS" ? profile.data_tag.fields[field].sum : "N/A" }
                    </td>
                    <td className="px-10 py-3 text-center text-xs font-medium text-gray-900 tracking-wider">
                        { profile.data_tag.fields[field].valued === "CONTINUOUS" ? profile.data_tag.fields[field].std_dev : "N/A" }
                    </td>
                    <td className="px-10 py-3 text-center text-xs font-medium text-gray-900 tracking-wider">
                        { profile.data_tag.fields[field].has_nan.toString() }
                    </td>
                </tr>
            ))

    }

    const editCategoryValues =
        <Modal.Dialog
            centered
            size="lg"
            style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: 'translate(-50%, -50%)'
            }}
        >
            <Modal.Header closeButton>
                <Modal.Title className='text-wrap w-100'>Configure values for "{fieldBeingEditedName}"</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <EditableList
                    list={
                        profile && fieldBeingEditedName
                            ? profile.data_tag.fields[fieldBeingEditedName].discrete_categorical_values: []}
                    onListChange={(newList) => {
                        console.log('new vals: ' + newList)
                        setCurrentCategoryValues(newList)
                    }}
                    placeholder='Enter a value'

                />
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={() => setFieldEditorVisible(false)}>Close</Button>
                <Button variant="primary" onClick={() => {
                    const profileCopy = {...profile}
                    console.log('setting: ' + currentCategoryValues)
                    profileCopy.data_tag.fields[fieldBeingEditedName].discrete_categorical_values = currentCategoryValues
                    setCurrentCategoryValues([])
                    setProfile(profileCopy)
                    setFieldEditorVisible(false)
                }}>Save changes</Button>
            </Modal.Footer>
        </Modal.Dialog>

    return <React.Fragment>
        {showFieldEditor ? editCategoryValues : ""}
        <div className="flex flex-col mt-4">
            <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                    <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>{tableHeaderElements}</tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {fieldRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </React.Fragment>
}