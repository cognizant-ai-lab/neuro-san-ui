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

declare module "hocon-parser" {
    /**
     * Parse a HOCON (or JSON, which is a HOCON subset) string into a plain object.
     * The library ships no type declarations, so we provide a minimal one here.
     */
    const parseHocon: (text: string) => unknown
    export default parseHocon
}
