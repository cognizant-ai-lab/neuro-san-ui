## Overview

This document provides an overview of how to deploy the Multi-Agent Accelerator UI ("MAUI") to a production
environment. It is aimed at DevOps engineers or anyone responsible for deploying and maintaining the UI in a cloud
environment.

## Supported Environments

MAUI is designed to be deployed in a cloud environment such as Kubernetes, AWS EKS or similar.
Examples of supported environments include Amazon Web Services (AWS) and Microsoft Azure, but any environment that
supports Docker containers should be compatible.

## Prerequisites

- A cloud environment with Kubernetes or similar container orchestration capabilities.
- Access to the Docker image for MAUI (available in Amazon ECR or build your own).
- Appropriate permissions to deploy and manage resources in the target environment, including opening ports and
  configuring networking.
- A domain name and SSL certificate if you want to serve the UI over HTTPS (optional but recommended).
- A backend instance of the Neuro SAN services that the UI can connect to.
- A key for OpenAI API access

## Deployment Instructions

MAUI is deployed as a Docker container. The Docker image is built and pushed to Amazon ECR as part of
the CI/CD pipeline but you can also build your own Docker image.

### Building the Docker Image

Skip this step if you have access to a pre-built Docker image for MAUI.

To build the Docker image yourself, run the following command from the root of the repository. Inspect the script for
the various options available.

```bash
./apps/main/deploy/build.sh
```

To run the resulting Docker image locally for testing, you can use the following command. Note that some
environment variables must be supplied as described in the script. See `.env.sample` for reference.

```bash
./apps/main/deploy/run.sh
```

Deploying image to a cloud service provider is outside the scope of this document.

## Authentication

The process described above results in a deployment of the UI that is not protected by any authentication mechanism.
For production deployments, it is strongly advised that you set up authentication to prevent unauthorized access to the
application. This can be done using a variety of methods such as an AWS ALB with authentication via OIDC.
Further details on how to set this up are outside the scope of this document. Please contact the Cognizant AI Lab team
for more information.
