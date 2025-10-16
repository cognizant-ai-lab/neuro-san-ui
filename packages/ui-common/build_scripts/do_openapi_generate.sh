#!/usr/bin/env bash

#  Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.
#  
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  
#      http://www.apache.org/licenses/LICENSE-2.0
#  
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

# This script generates types for the web-based Neuro-san API based on an OpenAPI spec.
#
# See https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html for what these do
set -o errexit
set -o errtrace
set -o nounset
set -o pipefail

export NEURO_SAN_SERVER_URL=https://neuro-san-dev.decisionai.ml

yarn openapi-typescript "${NEURO_SAN_SERVER_URL}/api/v1/docs" \
  --enum \
  --immutable \
  --make-paths-enum \
  --empty-objects-unknown \
  --root-types \
  --root-types-no-schema-prefix \
  --output ./generated/neuro-san/NeuroSanClient.ts 
