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
 * This function is used to clear and reset all mocks before each test.
 * This helps to ensure that each test is isolated and does not depend on the state of any previous tests, avoiding
 * difficult-to-debug "Heisenbugs".
 *
 * @param resetModules If true, reset the module registry before each test. This slows tests down but is useful for
 * tests that touch global module state or environment variables. Use thoughtfully.
 */
type StrictMockOptions = {
    resetModules?: boolean
}

export const withStrictMocks = (options: StrictMockOptions = {}) => {
    const {resetModules = false} = options

    beforeEach(() => {
        jest.resetAllMocks()
        jest.restoreAllMocks()
        if (resetModules) {
            jest.resetModules()
        }
    })
}
