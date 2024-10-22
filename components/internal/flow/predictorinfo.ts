import {BaseParameterType, ConfigurableNodeParameter} from "./nodes/generic/types"
/*
Configuration settings and constants for predictor configuration popup
 */

interface PredictorNodeParameters {
    [key: string]: ConfigurableNodeParameter
}

interface PredictorParams {
    [key: string]: PredictorNodeParameters
}

// eslint-disable-next-line no-shadow
enum MaxFeatures {
    "auto" = "auto",
    "sqrt" = "sqrt",
    "log2" = "log2",
}

// eslint-disable-next-line no-shadow
enum Booster {
    "gbtree" = "gbtree",
    "gblinear" = "gblinear",
    "dart" = "dart",
}

// eslint-disable-next-line no-shadow
enum TreeMethod {
    "auto" = "auto",
    "exact" = "exact",
    "approx" = "approx",
    "hist" = "hist",
    "gpu_hist" = "gpu_hist",
}

// eslint-disable-next-line no-shadow
enum ImportanceType {
    "gain" = "gain",
    "weight" = "weight",
    "cover" = "cover",
    "total_Gain" = "total_gain",
    "total_Cover" = "total_cover",
}

// eslint-disable-next-line no-shadow
enum SupportedRegressionCriterion {
    "mse" = "mse",
    "mae" = "mae",
}

// eslint-disable-next-line no-shadow
enum SupportedClassificationCriterion {
    "gini" = "gini",
    "entropy" = "entropy",
    "log_loss" = "log_loss",
}

// The NUM in the enum name is a hack to get around rendering enums that are actual numbers.
// eslint-disable-next-line no-shadow
enum Verbosity {
    "NUM_ZERO" = "0",
    "NUM_ONE" = "1",
    "NUM_TWO" = "2",
    "NUM_THREE" = "3",
}

const SUPPORTED_REGRESSION_MODELS: PredictorParams = {
    "Random Forest": {
        n_estimators: {
            default_value: 100,
            description: "The number of trees in the forest.",
            type: BaseParameterType.INT,
        },
        criterion: {
            default_value: "mse",
            description: `The function to measure the quality of a split. 
                           Supported criteria are "mse" for the mean squared error, 
                           which is equal to variance reduction as feature selection 
                           criterion, and "mae" for the mean absolute error.`,
            type: BaseParameterType.ENUM,
            enum: SupportedRegressionCriterion,
        },
        max_depth: {
            default_value: 100,
            description: `The maximum depth of the tree. 
                           If None, then nodes are expanded until all 
                           leaves are pure or until all leaves contain less than 
                           min_samples_split samples.`,
            type: BaseParameterType.INT,
        },
        min_samples_split: {
            default_value: 2,
            description: "The minimum number of samples required to split an internal node.",
            type: BaseParameterType.FLOAT,
        },
        min_samples_leaf: {
            default_value: 1,
            description: `
            The minimum number of samples required to be at a leaf node. 
            A split point at any depth will only be considered if it 
            leaves at least min_samples_leaf training samples in each of the left and right branches. 
            This may have the effect of smoothing the model, especially in regression.

            If int, then consider min_samples_leaf as the minimum number.
            If float, then min_samples_leaf is a fraction and ceil(min_samples_leaf * n_samples) 
            are the minimum number of samples for each node.
            `,
            type: BaseParameterType.FLOAT,
        },
        min_weight_fraction_leaf: {
            default_value: 0.0,
            description: `The minimum weighted fraction of the sum total of
                           weights (of all the input samples) required to be at a leaf node. 
                           Samples have equal weight when sample_weight is not provided.`,
            type: BaseParameterType.FLOAT,
        },
        max_features: {
            default_value: "auto",
            description: `
            The number of features to consider when looking for the best split:

            If int, then consider max_features features at each split.
            If float, then max_features is a fraction and round(max_features * n_features) features are considered
            at each split.
            If auto, then max_features=n_features.
            If sqrt, then max_features=sqrt(n_features).
            If log2, then max_features=log2(n_features).
            If None, then max_features=n_features.
            Note: the search for a split does not stop until at least one valid partition of the node samples 
            is found, even if it requires to effectively inspect more than max_features features.
            `,
            type: BaseParameterType.ENUM,
            enum: MaxFeatures,
        },
        max_leaf_nodes: {
            default_value: 100,
            description: `Grow trees with max_leaf_nodes in best-first fashion. 
                           Best nodes are defined as relative reduction in impurity. 
                           If None then unlimited number of leaf nodes.`,
            type: BaseParameterType.INT,
        },
        min_impurity_decrease: {
            default_value: 0.0,
            description: `
            A node will be split if this split induces a decrease of the impurity greater than or equal 
            to this value.

            The weighted impurity decrease equation is the following:
            
            N_t / N * (impurity - N_t_R / N_t * right_impurity
                                - N_t_L / N_t * left_impurity)
            where N is the total number of samples, N_t is the number of samples at the current node, 
            N_t_L is the number of samples in the left child, and N_t_R is the number of samples in the right child.
            
            N, N_t, N_t_R and N_t_L all refer to the weighted sum, if sample_weight is passed.
            `,
            type: BaseParameterType.FLOAT,
        },
        bootstrap: {
            default_value: true,
            description: `Whether bootstrap samples are used when building trees. 
                           If false, the whole dataset is used to build each tree.`,
            type: BaseParameterType.BOOLEAN,
        },
        oob_score: {
            default_value: false,
            description: "whether to use out-of-bag samples to estimate the R^2 on unseen data",
            type: BaseParameterType.BOOLEAN,
        },
        n_jobs: {
            default_value: 1,
            description:
                "The number of jobs to run in parallel. fit, predict, decision_path and apply are all parallelized " +
                "over the trees. None means 1 unless in a joblib.parallel_backend context. -1 means using all " +
                "processors. See Glossary for more details.",
            type: BaseParameterType.INT,
        },
        random_state: {
            default_value: 0,
            description: `Controls both the randomness of the bootstrapping of the samples 
                           used when building trees (if bootstrap=True) and the sampling of the 
                           features to consider when looking for the best split at each 
                           node (if max_features < n_features)`,
            type: BaseParameterType.INT,
        },
        warm_start: {
            default_value: false,
            description: `When set to True, reuse the solution of the previous call to 
                           fit and add more estimators to the ensemble, otherwise, just fit a whole new forest.`,
            type: BaseParameterType.BOOLEAN,
        },
        ccp_alpha: {
            default_value: 0.0,
            description:
                "Complexity parameter used for Minimal Cost-Complexity Pruning. The subtree with the largest cost " +
                "complexity that is smaller than ccp_alpha will be chosen. By default, no pruning is performed. ",
            type: BaseParameterType.FLOAT,
        },
        max_samples: {
            default_value: 1,
            description: `
            If bootstrap is True, the number of samples to draw from X to train each base estimator.
            
            If None (default), then draw X.shape[0] samples.
            If int, then draw max_samples samples.
            If float, then draw max_samples * X.shape[0] samples. 
            Thus, max_samples should be in the interval (0, 1).
            `,
            type: BaseParameterType.FLOAT,
        },
    },
    "Linear Regressor": {
        fit_intercept: {
            default_value: true,
            description: `Whether to calculate the intercept for this model. 
                           If set to False, no intercept will be used in calculations 
                           (i.e. data is expected to be centered).`,
            type: BaseParameterType.BOOLEAN,
        },
        normalize: {
            default_value: false,
            description: `This parameter is ignored when fit_intercept is set to False. 
                           If True, the regressors X will be normalized before regression by 
                           subtracting the mean and dividing by the l2-norm.`,
            type: BaseParameterType.BOOLEAN,
        },
        positive: {
            default_value: false,
            description: `When set to True, forces the coefficients to be positive. 
                           This option is only supported for dense arrays.`,
            type: BaseParameterType.BOOLEAN,
        },
    },
    XGBoost: {
        n_estimators: {
            default_value: 100,
            description: `Number of gradient boosted trees.  
                           Equivalent to number of boosting rounds.`,
            type: BaseParameterType.INT,
        },
        max_depth: {
            default_value: 6,
            description: "Maximum tree depth for base learners.",
            type: BaseParameterType.INT,
        },
        learning_rate: {
            default_value: 0.3,
            description: "Boosting learning rate (xgb's 'eta')",
            type: BaseParameterType.FLOAT,
        },
        verbosity: {
            default_value: 1,
            description: "The degree of verbosity. Valid values are 0 (silent) - 3 (debug).",
            type: BaseParameterType.ENUM,
            enum: Verbosity,
        },
        booster: {
            default_value: "gbtree",
            description: "Specify which booster to use: gbtree, gblinear or dart.",
            type: BaseParameterType.ENUM,
            enum: Booster,
        },
        tree_method: {
            default_value: "auto",
            description: `
                Specify which tree method to use.  Default to auto.  If this parameter
                is set to default, XGBoost will choose the most conservative option
                available.  It's recommended to study this option from parameters
                document.
                `,
            type: BaseParameterType.ENUM,
            enum: TreeMethod,
        },
        n_jobs: {
            default_value: 1,
            description: `
            Number of parallel threads used to run xgboost.  When used with other Scikit-Learn
            algorithms like grid search, you may choose which algorithm to parallelize and
            balance the threads.  Creating thread contention will significantly slow dowm both
            algorithms.
            `,
            type: BaseParameterType.INT,
        },
        gamma: {
            default_value: 0.0,
            description: `Minimum loss reduction required to make a further 
                           partition on a leaf node of the tree.`,
            type: BaseParameterType.FLOAT,
        },
        min_child_weight: {
            default_value: 1.0,
            description: `Minimum loss reduction required to make a further 
                           partition on a leaf node of the tree.`,
            type: BaseParameterType.FLOAT,
        },
        max_delta_step: {
            default_value: 0.0,
            description: "Maximum delta step we allow each tree's weight estimation to be.",
            type: BaseParameterType.FLOAT,
        },
        subsample: {
            default_value: 1.0,
            description: "Subsample ratio of the training instance.",
            type: BaseParameterType.FLOAT,
        },
        colsample_bytree: {
            default_value: 1.0,
            description: "Subsample ratio of columns when constructing each tree.",
            type: BaseParameterType.FLOAT,
        },
        colsample_bylevel: {
            default_value: 1.0,
            description: "Subsample ratio of columns for each level.",
            type: BaseParameterType.FLOAT,
        },
        colsample_bynode: {
            default_value: 1.0,
            description: "Subsample ratio of columns for each split.",
            type: BaseParameterType.FLOAT,
        },
        reg_alpha: {
            default_value: 0.0,
            description: "L1 regularization term on weights",
            type: BaseParameterType.FLOAT,
        },
        reg_lambda: {
            default_value: 0.0,
            description: "L2 regularization term on weights",
            type: BaseParameterType.FLOAT,
        },
        scale_pos_weight: {
            default_value: 1.0,
            description: "Balancing of positive and negative weights.",
            type: BaseParameterType.FLOAT,
        },
        random_state: {
            default_value: 0,
            description: "Random number seed.",
            type: BaseParameterType.INT,
        },
        base_score: {
            default_value: 0.5,
            description: "The initial prediction score of all instances, global bias.",
            type: BaseParameterType.FLOAT,
        },
        num_parallel_tree: {
            default_value: 1,
            description: "Used for boosting random forest.",
            type: BaseParameterType.INT,
        },
        importance_type: {
            default_value: "gain",
            description: `
            The feature importance type for the feature_importances. property:
            either "gain", "weight", "cover", "total_gain" or "total_cover".
            `,
            type: BaseParameterType.ENUM,
            enum: ImportanceType,
        },
    },
    Databricks: {
        model_uri: {
            default_value: "models:/<model_name>/<stage>",
            description: `
            The location, in URI format, of the MLflow model. For example:
            s3://my_bucket/path/to/model
            runs:/<mlflow_run_id>/run-relative/path/to/model
            models:/<model_name>/<model_version>
            models:/<model_name>/<stage>
            `,
            type: BaseParameterType.STRING,
        },
        DATABRICKS_HOST: {
            default_value: "https://cog-leaftest.cloud.databricks.com",
            description: "The URL of the Databricks™ host",
            type: BaseParameterType.STRING,
        },
        DATABRICKS_TOKEN: {
            default_value: "",
            description: "A generated token to access the Databricks™ instance",
            type: BaseParameterType.PASSWORD,
        },
    },
    Transformer: {},
    LLM: {},
}
const SUPPORTED_CLASSIFICATION_MODELS: PredictorParams = {
    "Random Forest": {
        n_estimators: {
            default_value: 100,
            description: "The number of trees in the forest.",
            type: BaseParameterType.INT,
        },
        criterion: {
            default_value: "gini",
            description: `The function to measure the quality of a split. 
                           Supported criteria are "gini" for the Gini impurity and
                           both "log_loss" and "entropy" for the Shannon information
                           gain.`,
            type: BaseParameterType.ENUM,
            enum: SupportedClassificationCriterion,
        },
        max_depth: {
            default_value: 100,
            description: `The maximum depth of the tree. 
                           If None, then nodes are expanded until all 
                           leaves are pure or until all leaves contain less than 
                           min_samples_split samples.`,
            type: BaseParameterType.INT,
        },
        min_samples_split: {
            default_value: 2,
            description: `
            The minimum number of samples required to split an internal node:
            If int, then consider min_samples_split as the minimum number.
            If float, then min_samples_split is a fraction and ceil(min_samples_split * n_samples) are the minimum 
            number of samples for each split.`,
            type: BaseParameterType.FLOAT,
        },
        min_samples_leaf: {
            default_value: 1,
            description: `
            The minimum number of samples required to be at a leaf node. 
            A split point at any depth will only be considered if it 
            leaves at least min_samples_leaf training samples in each of the left and right branches. 
            This may have the effect of smoothing the model, especially in regression.

            If int, then consider min_samples_leaf as the minimum number.
            If float, then min_samples_leaf is a fraction and ceil(min_samples_leaf * n_samples) 
            are the minimum number of samples for each node.
            `,
            type: BaseParameterType.FLOAT,
        },
        min_weight_fraction_leaf: {
            default_value: 0.0,
            description: `The minimum weighted fraction of the sum total of
                           weights (of all the input samples) required to be at a leaf node. 
                           Samples have equal weight when sample_weight is not provided.`,
            type: BaseParameterType.FLOAT,
        },
        max_features: {
            default_value: "auto",
            description: `
            The number of features to consider when looking for the best split:

            If int, then consider max_features features at each split.
            If float, then max_features is a fraction and round(max_features * n_features) features are considered
            at each split.
            If auto, then max_features=n_features.
            If sqrt, then max_features=sqrt(n_features).
            If log2, then max_features=log2(n_features).
            If None, then max_features=n_features.
            Note: the search for a split does not stop until at least one valid partition of the node samples 
            is found, even if it requires to effectively inspect more than max_features features.
            `,
            type: BaseParameterType.ENUM,
            enum: MaxFeatures,
        },
        max_leaf_nodes: {
            default_value: 100,
            description: `Grow trees with max_leaf_nodes in best-first fashion. 
                           Best nodes are defined as relative reduction in impurity. 
                           If None then unlimited number of leaf nodes.`,
            type: BaseParameterType.INT,
        },
        min_impurity_decrease: {
            default_value: 0.0,
            description: `
            A node will be split if this split induces a decrease of the impurity greater than or equal 
            to this value.

            The weighted impurity decrease equation is the following:
            
            N_t / N * (impurity - N_t_R / N_t * right_impurity
                                - N_t_L / N_t * left_impurity)
            where N is the total number of samples, N_t is the number of samples at the current node, 
            N_t_L is the number of samples in the left child, and N_t_R is the number of samples in the right child.
            
            N, N_t, N_t_R and N_t_L all refer to the weighted sum, if sample_weight is passed.
            `,
            type: BaseParameterType.FLOAT,
        },
        bootstrap: {
            default_value: true,
            description: `Whether bootstrap samples are used when building trees. 
                           If false, the whole dataset is used to build each tree.`,
            type: BaseParameterType.BOOLEAN,
        },
        oob_score: {
            default_value: false,
            description: "whether to use out-of-bag samples to estimate the R^2 on unseen data",
            type: BaseParameterType.BOOLEAN,
        },
        n_jobs: {
            default_value: 1,
            description: `The number of jobs to run in parallel. fit, predict, 
                           decision_path and apply are all parallelized over the trees. 
                           None means 1 unless in a joblib.parallel_backend context. 
                           -1 means using all processors. See Glossary for more details.`,
            type: BaseParameterType.INT,
        },
        random_state: {
            default_value: 0,
            description: `Controls both the randomness of the bootstrapping of the samples 
                           used when building trees (if bootstrap=True) and the sampling of the 
                           features to consider when looking for the best split at each 
                           node (if max_features < n_features)`,
            type: BaseParameterType.INT,
        },
        warm_start: {
            default_value: false,
            description: `When set to True, reuse the solution of the previous call to 
                           fit and add more estimators to the ensemble, otherwise, just fit a whole new forest.`,
            type: BaseParameterType.BOOLEAN,
        },
        ccp_alpha: {
            default_value: 0.0,
            description: `Complexity parameter used for Minimal Cost-Complexity Pruning. 
                           The subtree with the largest cost complexity that is smaller than 
                           ccp_alpha will be chosen. By default, no pruning is performed. `,
            type: BaseParameterType.FLOAT,
        },
        max_samples: {
            default_value: 1,
            description: `
            If bootstrap is True, the number of samples to draw from X to train each base estimator.
            
            If None (default), then draw X.shape[0] samples.
            If int, then draw max_samples samples.
            If float, then draw max_samples * X.shape[0] samples. 
            Thus, max_samples should be in the interval (0, 1).
            `,
            type: BaseParameterType.FLOAT,
        },
    },
}

const SUPPORTED_REGRESSOR_METRICS = new Map([
    /*
This list should match the list of supported metrics in the backend.
See SUPPORTED_METRICS in <unileaf_util library>/framework/metrics/metrics_manager.py
The string should match exactly the `name` property of the MetricsCalculator.
For instance, "Mean Absolute Error" must match MeanAbsoluteError.name in framework/metrics/mean_absolute_error.py

This list represents the metrics we want to be available for regressors, and for each one, a flag indicating if
"higher is better" ("score"-type metrics) or "lower is better" ("error"-type metrics). This flag is used to interpret
the RIO improvement and depict it accordingly for the user.

The first item in the list is the default value.
 */
    ["Mean Absolute Error", false], // Default Value
    ["Mean Squared Error", false],
    ["Root Mean Square Error", false],
    ["F1 score", true],
    ["R2 score", true],
    ["Accuracy score", true],
    ["Matthews correlation coefficient", true],
])

const SUPPORTED_CLASSIFIER_METRICS = new Map([
    /*
    This list represents the metrics we want to be available for classifiers.
    The first item in the list is the default value.
     */
    ["F1 score", true], // Default Value
    ["R2 score", true],
    ["Accuracy score", true],
    ["Matthews correlation coefficient", true],
])

export function fetchPredictors(predictorType: string): string[] {
    /*
    This function returns the types for predictor available within a given super-type such as "regressor" or
    "classifier"
    */

    let predictorResp: string[]

    if (predictorType === "regressor") {
        predictorResp = Object.keys(SUPPORTED_REGRESSION_MODELS)
    } else if (predictorType === "classifier") {
        predictorResp = Object.keys(SUPPORTED_CLASSIFICATION_MODELS)
    }

    return predictorResp
}

export function fetchMetrics(predictorType: string) {
    /*
    This function returns the list of supported metrics based on the predictor type.
    */

    return predictorType === "regressor" ? SUPPORTED_REGRESSOR_METRICS : SUPPORTED_CLASSIFIER_METRICS
}

export function fetchParams(predictorType: string, predictorName: string): PredictorNodeParameters {
    /*
    This function returns the configuration parameters for the predictor
    */
    let params

    if (predictorType === "regressor") {
        params = structuredClone(SUPPORTED_REGRESSION_MODELS[predictorName])
    } else if (predictorType === "classifier") {
        params = structuredClone(SUPPORTED_CLASSIFICATION_MODELS[predictorName])
    }

    return params
}
