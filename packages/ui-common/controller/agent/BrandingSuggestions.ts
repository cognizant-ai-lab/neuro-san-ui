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

import {postJsonRequest} from "./common/JsonRequest"
import BRANDING_SUGGESTER_NETWORK from "./networks/branding_suggester.json"
import {queryNeuroSanInBrowser} from "./NeuroSanBrowserQuery"
import {getApiKey, useSettingsStore} from "../../state/Settings"
import {BrandingSuggestions} from "../Types/Branding"

// Name the branding suggester network runs under in the in-browser neuro-san package
const BRANDING_SUGGESTER_NAME = "branding_suggester"

/**
 * Get LLM suggestions for branding colors and an icon based on the company name. This is used to customize the UI
 * colors to match the user's company branding.
 *
 * @note If the user has saved their own OpenAI API key, the suggestions come from an agent network run in the browser
 * by the neuro-san package. Otherwise they come from the server.
 *
 * @param company The name of the company to get branding suggestions for.
 * @returns A promise that resolves to the suggested branding colors and icon.
 */
export const getBrandingSuggestions = async (company: string): Promise<BrandingSuggestions> => {
    const openAiApiKey = getApiKey(useSettingsStore.getState().settings.apiKeys, "OpenAI")

    return openAiApiKey
        ? queryNeuroSanInBrowser<BrandingSuggestions>(
              BRANDING_SUGGESTER_NETWORK,
              BRANDING_SUGGESTER_NAME,
              {company},
              openAiApiKey
          )
        : postJsonRequest<BrandingSuggestions>("/api/branding", {company})
}
