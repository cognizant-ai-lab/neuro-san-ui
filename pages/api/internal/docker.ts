import type { NextApiRequest, NextApiResponse } from 'next'

export default (req: NextApiRequest, res: NextApiResponse) => {
    var Docker = require('dockerode');
    var docker = new Docker();
    docker.listContainers({all: true}, function(err, containers) {
        containers.forEach((container) => {console.log(container)})
      });
    res.status(200).json({a:1})
}