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

    // Get the S3 CSV Stream
    const downloadStream = new AWSUtils().DownloadStream(bucket, region, key)

    // Read Stream
    let readCSV = []
    let stream = require('fast-csv').parseStream(downloadStream).on('data', data => {
            if (stream) { readCSV.push(data) }

            if (readCSV.length > 0) {
                stream.end()
            }
        })
        .on('end', _ => res.status(200).send({message: {headers: readCSV[0]}}) )
        .on('error', err => res.status(400).send({message: err.message}))

  }
 
}