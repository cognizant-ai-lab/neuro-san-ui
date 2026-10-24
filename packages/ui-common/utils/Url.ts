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

export type Protocol = "http" | "https"

const URL_PROTOCOL_REGEX = /^https?:\/\//iu
const HTTP_PROTOCOL_REGEX = /^http:\/\//iu

export const stripProtocol = (value: string) => (value ?? "").replace(URL_PROTOCOL_REGEX, "")

/** Treat a server base URL with or without its optional trailing slash as the same server. */
export const stripTrailingSlash = (value: string): string => value.replace(/\/$/u, "")

/**
 * Normalize a server URL input by stripping the protocol and determining the protocol to use.
 * @param value The input URL value to normalize.
 * @param fallbackProtocol The protocol to use if the input value does not specify one.
 * @return An object containing the normalized host and protocol.
 */
export const normalizeUrlInput = (value: string, fallbackProtocol: Protocol) => {
    const trimmedValue = value.trim()
    const hasProtocol = URL_PROTOCOL_REGEX.exec(trimmedValue)

    return {
        host: stripProtocol(trimmedValue),
        protocol: hasProtocol ? (HTTP_PROTOCOL_REGEX.test(trimmedValue) ? "http" : "https") : fallbackProtocol,
    } satisfies {
        host: string
        protocol: Protocol
    }
}
