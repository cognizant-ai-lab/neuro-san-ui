/*
Copyright 2025 Cognizant Technology Solutions Corp, www.cognizant.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

// MUI zIndex information:
// github.com/mui/material-ui/blob/master/packages/mui-material/src/styles/zIndex.js
// mui.com/material-ui/customization/z-index/

import {Theme} from "@mui/material/styles"

const DEFAULT_Z_INDEX = 500

export const getZIndex = (layer: number, appTheme: Theme): number => {
    switch (layer) {
        case 1:
            return DEFAULT_Z_INDEX
        case 2:
            // MUI Drawer has a default z-index of 1200 and at least one of elements utilizing LAYER_2 is in
            // an MUI Drawer, however, we also want to ensure that LAYER_2 is below the modal, which currently has a
            // default z-index of 1300.
            return (appTheme.zIndex.modal + appTheme.zIndex.drawer) / 2
        default:
            return DEFAULT_Z_INDEX
    }
}
