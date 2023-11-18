import getConfig from "next/config"

// Define the Base Colors
export const MaximumBlue: string = "#000048"
export const Apple: string = "#26EFE9"
const {publicRuntimeConfig} = getConfig()

// Set the env var MD_SERVER_URL
export const MD_BASE_URL: string = publicRuntimeConfig.md_server_url

// Global system flag -- whether authentication (sign-in) is required
export const ENABLE_AUTHENTICATION: boolean = Boolean(JSON.parse(publicRuntimeConfig.enableAuthentication))

// Name to use for application
export const LOGO: string = "Cognizant Neuro® AI Model Orchestrator"
export const GENERIC_LOGO: string = "Autopilot"

// Build version (passed in from build system)
export const UNILEAF_VERSION: string = publicRuntimeConfig.unileafVersion

export const EvaluateCandidateCode: string = `def evaluate_candidate(self, candidate: object) -> Dict[str, object]:
"""
This function receives a candidate and can be
modified to provide alternate fitness calculations.
:param candidate: a candidate model to evaluate
:return: a dictionary of metrics
"""

# Fetch the CAO Map
CAO_MAP = self.CAO_MAP

# Fetc the Context and the Actions
context_data: pd.DataFrame = self.data[CAO_MAP["context"]]

# Declare a metrics container
metrics = {}

# Loop over the outcomes
for outcome_list in CAO_MAP["outcome"]:

    # Get the actions
    actions_df = pd.DataFrame(candidate.predict(context_data))
    consolidated_df = pd.concat(
        [context_data, actions_df]
    )

    # If the predictor has only one outcome attached
    if len(outcome_list) == 1:
        predictor = self.get_predictor(outcome_list[0])

        metrics[outcome_list[0]] = np.mean(predictor.predict(consolidated_df))
    else:
        # If a predictor predicts multiple outcomes
        outcomes = predictor.predict(consolidated_df)
        for idx, outcome in enumerate(outcome_list):
            metrics[outcome] = np.mean(outcomes[:, idx])

return metrics        
`
// prettier-ignore
export const OutputOverrideCode =
`def override_predictions(self, predictions: pd.Dataframe) -> predictions: pd.Dataframe:
"""
This function receives the predictions from the predictor as a dataframe.
The DataFrame contains the outcomes that have been selected as checkboxes
in the node.
"""

return predictions        
`

export const ESPResultverbs = ["max", "min", "mean"]

/* TODO: feels like it should be a stylesheet somewhere. But the current chatbot library we're using seems to
require it in this format. */
export const chatbotTheme = {
    background: "#f5f8fb",
    fontFamily: "var(--bs-body-font-family)",
    headerBgColor: "var(--bs-primary)",
    headerFontColor: "#fff",
    headerFontSize: "15px",
    botBubbleColor: "var(--bs-secondary)",
    botFontColor: "#fff",
    userBubbleColor: "#fff",
    userFontColor: "#4a4a4a",
}
