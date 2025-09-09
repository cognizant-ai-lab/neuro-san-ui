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
