## Copyright

Copyright 2026 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

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

To build the Docker image yourself, follow these steps:

...

### Deploying to Kubernetes

...

## Authentication

...
