/*
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
*/

import IconButton from "@mui/material/IconButton"
import {styled} from "@mui/material/styles"

/**
 * The small action buttons on a sidebar network row (publish, download, edit, delete), all the same size. Disabled
 * buttons keep their color and only dim.
 */
export const ActionIconButton = styled(IconButton)(({theme}) => ({
    padding: 0,
    color: (theme.vars ?? theme).palette.primary.main,
    "&:hover": {color: (theme.vars ?? theme).palette.primary.dark},
    "&.Mui-disabled": {
        opacity: 0.3,
    },
    "& .MuiSvgIcon-root": {
        fontSize: "0.75rem",
    },
}))
