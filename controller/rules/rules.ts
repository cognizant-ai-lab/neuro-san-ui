/**
 * Controller module for interacting with the rules LLM API.
 */

/**
 * Access the API for either rules interpretation or insights.
 *
 * @param requestType Indicates whether we want rules interpretation or insights (deeper analysis by LLM)
 * @param projectTitle Title of current project, to provide context for LLM
 * @param projectDescription Title of current project, to provide context for LLM
 * @param rules Evolved ruleset
 * @param contextFields Context part of CAO
 * @param actionFields Action part of CAO
 * @param outcomeFields Outcome part of CAO
 *
 * @return Response from backend API
 */
export async function fetchLlmRules(
    requestType: string,
    projectTitle: string,
    projectDescription: string,
    rules,
    contextFields: string[],
    actionFields: string[],
    outcomeFields
) {
    return fetch("/api/gpt/rules", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            requestType: requestType,
            projectTitle: projectTitle,
            projectDescription: projectDescription,
            rawRules: rules,
            contextFields: contextFields,
            actionFields: actionFields,
            outcomeFields: outcomeFields,
        }),
    })
}
