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

// Restricted imports are disabled because icons are looked up by name at runtime, so all of them are needed.
// eslint-disable-next-line no-restricted-imports
import * as MuiIcons from "@mui/icons-material"

export type MuiIconName = keyof typeof MuiIcons

/**
 * Resolves an icon name, such as one suggested by an LLM, to the name of a MUI icon component.
 *
 * Tries the exact name first. If that fails, falls back to a case-insensitive match, because some Material icon
 * names break camel case (for example "Splitscreen", not "SplitScreen") and suggestions often get them wrong. No two
 * MUI icon names differ only by case, so the fallback cannot pick the wrong icon.
 *
 * Returns the name rather than the component so callers can render `MuiIcons[name]` directly, which React treats as
 * a static component.
 *
 * @param iconName The icon component name, without the "Icon" suffix.
 * @returns The MUI icon component name, or undefined if there is no MUI icon with that name.
 */
export const getMuiIconName = (iconName: string | undefined): MuiIconName | undefined => {
    if (!iconName) {
        return undefined
    }

    if (MuiIcons[iconName as MuiIconName]) {
        return iconName as MuiIconName
    }

    const lowerCaseName = iconName.toLowerCase()
    return (Object.keys(MuiIcons) as MuiIconName[]).find((candidate) => candidate.toLowerCase() === lowerCaseName)
}
