import type { NextApiRequest, NextApiResponse } from 'next'

import AWSUtils from '../../../utils/aws'

export default (req: NextApiRequest, res: NextApiResponse) => {

  /* 
  This route is an internal route used to validate an object on S3.
  The params required in the Body are:
  - bucket: Name of Bucket
  - region: Region where the bucket is
  - key: Path to the file
  */

  if (req.method === 'POST') {

    // Unpack the data
    
    const { bucket, key, region } = req.body
    

    // Get the S3 Object
    const s3 = new AWSUtils().GetS3Obj(region)

    // Create the desired Params
    const params = { Bucket: bucket, Key: key }

    // Check if File exists
    s3.headObject(params).on('success', function(response) {
      res.status(200).json({ message: response.data })
    }).on('error',function(error){
         //error return a object with status code 404
         res.status(404).json({ message: error.message })
    }).send();

  }
 
}