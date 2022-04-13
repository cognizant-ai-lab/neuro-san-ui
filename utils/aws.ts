import AWS from 'aws-sdk'
import {NotificationType, sendNotification} from '../controller/notification'

var debug = require('debug')('aws')

export default class AWSUtils {

    constructor() {
        /*
        This function loads the environment variables and creates
        and initializes the AWS Object.
        ENV:
            AWS_ACCESS_KEY_ID
            AWS_SECRET_ACCESS_KEY
        */
        AWS.config.update({
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        })
    }

    UploadFile(bucketName: string, region: string, key: string, fileBody) {

        /*
        This function is used to upload a file to S3.
        @bucketName: Name of the bucket to which the upload must happen
        @region: Region of the bucket
        @key: Key to where the file must be uplodaded
        @fileBody: Body of the file
        */
    
        const s3 = this.GetS3Obj(region)
    
        const params = {
            Bucket: bucketName,
            Body: fileBody,
            Key: key
        }
        s3.putObject(params)
            .on('httpUploadProgress', (evt) => {
                debug(evt)
                debug(Math.round((evt.loaded / evt.total) * 100))
            })
            .send((err) => {
                // Notify the UI
                if (!err) {
                    sendNotification(NotificationType.success, "Successfully uploaded Dataset")
                } else {
                    sendNotification(NotificationType.error, "Failed to upload Dataset", err.toString())
                }
            })
    
    }

    DownloadStream(bucketName: string, region: string, key: string) {
        /*
        This function is used to download a file from S3 into memory.
        @bucketName: Name of the bucket to which the upload must happen
        @region: Region of the bucket
        @key: Key to where the file must be uplodaded
        */
        const s3 = this.GetS3Obj(region)
        const params = {
            Bucket: bucketName,
            Key: key
        }

        return s3.getObject(params).createReadStream()

    }

    ConstructURL(bucketName: string, region: string, key: string) {
        return `s3://${bucketName}/${key}`
    }

    GetS3Obj(region: string) {
        return new AWS.S3({
            region: region
        })
    }

}
