// Define the Base Colors
export const BaseBlack: string = "#231f20"
export const MayaBlue: string  = "#4CB3CF"
export const MaximumBlue: string  = "#0033a0"
export const Apple: string  = "#6BB445"

export const StatusColors = {
    Finished: "green",
    Failed: "red",
    "In Progress": "blue",
    Queued: "yellow"
}

export const InputDataNodeID: string = 'root'
export const TRAIN_SERVER: string = "http://localhost:8080"
// export const MD_BASE_URL: string = "http://localhost:4000"
export const MD_BASE_URL: string = "http://localhost:30004"
export const THIS_SERVER: string = "http://localhost:3000"
export const AUTHOR: string = "mohak"
export const DEFAULT_DATA_ROOT_KEY: string = "data"
export const LOGO: string = "LEAF"

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
        # If a predictor predcits multiple outcomes
        outcomes = predictor.predict(consolidated_df)
        for idx, outcome in enumerate(outcome_list):
            metrics[outcome] = np.mean(outcomes[:, idx])

return metrics        
`

export const OutputOverrideCode: string = `def override_predictions(self, predictions: pd.Dataframe) -> predictions: pd.Dataframe:
"""
This function receives the predictions from the predictor as a dataframe.
The DataFrame contains the outcomes that have been selected as checkboxes
in the node.
"""

return predictions        
`

export const ESPResultverbs = [
    'max',
    'min',
    'mean',
    'elites_mean'
]
export const DummyObjectives = [
    'naa',
    'score'
]