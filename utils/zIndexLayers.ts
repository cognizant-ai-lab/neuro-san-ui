import {APP_THEME} from "../theme"

// MUI zIndex information:
// github.com/mui/material-ui/blob/master/packages/mui-material/src/styles/zIndex.js
// mui.com/material-ui/customization/z-index/

// eslint-disable-next-line no-shadow
export enum ZIndexLayers {
    LAYER_1 = 500,
    // MUI Drawer has a default z-index of 1200 and at least one of elements utilizing LAYER_2 is in an MUI Drawer,
    // however, we also want to ensure that LAYER_2 is below the modal, which currently has a default z-index of 1300.
    // eslint-disable-next-line @typescript-eslint/prefer-literal-enum-member
    LAYER_2 = (APP_THEME.zIndex.modal + APP_THEME.zIndex.drawer) / 2,
}
