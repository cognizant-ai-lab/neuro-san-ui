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

/**
 * Gets a URL parameter value from the current browser URL
 * @param paramName The name of the parameter to retrieve
 * @returns The parameter value or null if not found
 */
export const getUrlParameter = (paramName: string): string | null => {
    if (typeof window === "undefined") {
        return null // SSR safety
    }
    
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get(paramName)
}

/**
 * Sets a URL parameter in the browser URL without reloading the page
 * @param paramName The name of the parameter to set
 * @param value The value to set, or null to remove the parameter
 */
export const setUrlParameter = (paramName: string, value: string | null): void => {
    if (typeof window === "undefined") {
        return // SSR safety
    }
    
    const url = new URL(window.location.href)
    
    if (value === null) {
        url.searchParams.delete(paramName)
    } else {
        url.searchParams.set(paramName, value)
    }
    
    window.history.replaceState({}, "", url.toString())
}