// Import react components
import { useState } from "react"

// Import Controller
import { DataSource } from "../../controller/datasources/types"
import { AccessionDatasourceS3, ValidateCSV, GetCSVHeaders } from "../../controller/datasources/accession"

// Import third party components
import { Container, Form, Button } from "react-bootstrap"

// Import constants
import { MaximumBlue } from "../../const"

// Declare the Props for this component
export interface NewDataSourceProps {

    readonly ProjectID: string,

    // A call back function that tells the view
    // to update its state to reflect the new addition 
    // if it has successeded
    UpdateDatasetsHook: any

}
// Import Utils
import AWSUtils from "../../utils/aws"

export default function NewDataSource(props: NewDataSourceProps) {

    /* 
    This function adds a component form to add a new Data 
    Source to the system.
    */

    // Since multiple data source can be added, we maintain state of
    // the selected type
    let [accestionMethod, setAccessionMethod] = useState("s3-reference")

    // Declare a closure to create the dataset. This function 
    // is what handles informing the backend
    const HandleFormSubmit = async (event) => {

        // Check the method used
        const method = event.target.method.value

        // Get the dataset name
        const datasetName = event.target.datasetName.value

        // If it is a CSV Upload
        if (method == "csv-upload") {
            
            // Get the file
            const file = event.target.csv.files[0]

            // Let the controller take over
            // AccessionDatasourceCSVUpload(datasetName, props.ProjectID,
            //     FileReader)
        } else if (method == "s3-reference") {

            // Unpack Data Source Variables
            let {datasetName, bucketName, s3Key, region} = event.target

            // Create the Data source Message
            let dataSourceMessage: DataSource = {
                project: props.ProjectID,
                id: datasetName.value,
                s3_url: new AWSUtils().ConstructURL(
                    bucketName.value, 
                    region.value, 
                    s3Key.value
                ),
                time: new Date().toDateString()
            }

            // Validate the Data Source
            const validationResp = await ValidateCSV(bucketName.value, 
                                    s3Key.value, region.value)

            // Return if CSV does not exist
            if (validationResp == null) { return }

            const headers = await GetCSVHeaders(bucketName.value, 
                s3Key.value, region.value)

            // Return if headers can't be fetched
            if (headers == null) { return }

            // Trigger the Data Source Controller
            const accesionDataSourceResp: DataSource = await AccessionDatasourceS3(dataSourceMessage)
        
        }

        props.UpdateDatasetsHook()
    }

    // Create the subform that must be displayed depending on
    // the method of accession of the dataset
    let SubForm: React.ReactElement
    if (accestionMethod === "csv-upload") {
        SubForm = <div>
                    <Form.Group className="mb-3">
                        <Form.Label className="text-left w-full">Dataset Name</Form.Label>
                        <Form.Control name="datasetName" type="text" placeholder="Enter Dataset name" />
                        <Form.Text className="text-muted text-left">
                        Clean Data, Happy Data Scientist
                        </Form.Text>
                    </Form.Group>

                    {/* TODO: Extend to multifile upload */}
                    <Form.Group controlId="formFile" className="mb-3">
                        <Form.Label className="text-left w-full">CSV File: </Form.Label>
                        <input name="csv" type="file" />
                    </Form.Group>
                </div>
    } else if (accestionMethod === "s3-reference") {
        SubForm = <div>
                        <Form.Group className="mb-3">
                            <Form.Label className="text-left w-full">Dataset Name</Form.Label>
                            <Form.Control name="datasetName" type="text" placeholder="Enter Dataset name" />
                            <Form.Text className="text-muted text-left">
                            Clean Data, Happy Data Scientist
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="text-left w-full">Bucket Name</Form.Label>
                            <Form.Control name="bucketName" type="text" placeholder="Enter Bucket name" />
                            <Form.Text className="text-muted text-left">
                            S3 Bucket where the file is located
                            </Form.Text>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="text-left w-full">Key</Form.Label>
                            <Form.Control name="s3Key" type="text" placeholder="data/somwhere/somefile.csv" />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label className="text-left w-full">Bucket Region</Form.Label>
                            <Form.Control name="region" type="text" placeholder="us-east-2" />
                        </Form.Group>
                    </div>
    }

    // Declare the Form that needs to be returned
    return <Container>
        <Form onSubmit={(event) => {event.preventDefault(); HandleFormSubmit(event)}}>
            
            {/* Render the Select Box to chose the method of adding a Dataset */}
            <Form.Group className="mb-3">
                <Form.Label className="text-left w-full">Method</Form.Label>
                <select className="w-full" 
                        defaultValue="s3-reference" 
                        name="method" 
                        placeholder="Method" 
                        onChange={event => setAccessionMethod(event.target.value)}>
                    <option disabled value="csv-upload">Upload file</option>
                    <option value="s3-reference">S3 Reference</option>
                </select>
            </Form.Group>

            {/* Display the subform based on the accession Method */}
            {SubForm}

            <Button variant="primary" 
            type="submit" 
            size="lg" 
            className="w-full" 
            style={{background: MaximumBlue, borderColor: MaximumBlue}}>
                Create
            </Button>

        </Form>
    </Container>
}
