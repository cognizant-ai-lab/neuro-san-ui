/*
Configuration settings and constants for predictor configuration popup
 */

export interface PredictorParamFields {
    default_value: boolean | number | string,
    description: string,

    // TODO: there's probably a safer and more elegant way to handle types with something like Typescript Generics,
    // rather than putting the name of the type in a string
    type: string | string[] | number[],

    // Value is an optional field that can be used within a form
    // etc to denote user input
    value?: boolean | number | string,
}

export interface PredictorParams {
    [key: string]: PredictorParamFields
}

export interface SupportedModels {
    [key: string]: PredictorParams
}

export const SUPPORTED_REGRESSION_MODELS: SupportedModels = {
    "Linear Regressor": {
        "fit_intercept": {
            "default_value": true,
            "description": `Whether to calculate the intercept for this model. 
                           If set to False, no intercept will be used in calculations 
                           (i.e. data is expected to be centered).`,
            "type": "bool"
        },
        "normalize": {
            "default_value": false,
            "description": `This parameter is ignored when fit_intercept is set to False. 
                           If True, the regressors X will be normalized before regression by 
                           subtracting the mean and dividing by the l2-norm.`,
            "type": "bool"
        },
        "positive": {
            "default_value": false,
            "description": `When set to True, forces the coefficients to be positive. 
                           This option is only supported for dense arrays.`,
            "type": "bool"
        }
    },
    "Random Forest": {
        "n_estimators": {
            "default_value": 100,
            "description": "The number of trees in the forest.",
            "type": "int"
        },
        "criterion": {
            "default_value": "mse",
            "description": `The function to measure the quality of a split. 
                           Supported criteria are mse for the mean squared error, 
                           which is equal to variance reduction as feature selection 
                           criterion, and mae for the mean absolute error. Options: {'mse', 'mae'}`,
            "type": ['mse', 'mae']
        },
        "max_depth": {
            "default_value": 100,
            "description": `The maximum depth of the tree. 
                           If None, then nodes are expanded until all 
                           leaves are pure or until all leaves contain less than 
                           min_samples_split samples.`,
            "type": "int"
        },
        "min_samples_split": {
            "default_value": 2,
            "description": "The minimum number of samples required to split an internal node.",
            "type": "float"
        },
        "min_samples_leaf": {
            "default_value": 1,
            "description": `
            The minimum number of samples required to be at a leaf node. 
            A split point at any depth will only be considered if it 
            leaves at least min_samples_leaf training samples in each of the left and right branches. 
            This may have the effect of smoothing the model, especially in regression.

            If int, then consider min_samples_leaf as the minimum number.
            If float, then min_samples_leaf is a fraction and ceil(min_samples_leaf * n_samples) 
            are the minimum number of samples for each node.
            `,
            "type": "float"
        },
        "min_weight_fraction_leaf": {
            "default_value": 0.0,
            "description": `The minimum weighted fraction of the sum total of
                           weights (of all the input samples) required to be at a leaf node. 
                           Samples have equal weight when sample_weight is not provided.`,
            "type": "float"
        },
        "max_features": {
            "default_value": "auto",
            "description": `
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
            "type": ["auto", "sqrt", "log2"]
        },
        "max_leaf_nodes": {
            "default_value": 100,
            "description": `Grow trees with max_leaf_nodes in best-first fashion. 
                           Best nodes are defined as relative reduction in impurity. 
                           If None then unlimited number of leaf nodes.`,
            "type": "int"
        },
        "min_impurity_decrease": {
            "default_value": 0.0,
            "description": `
            A node will be split if this split induces a decrease of the impurity greater than or equal 
            to this value.

            The weighted impurity decrease equation is the following:
            
            N_t / N * (impurity - N_t_R / N_t * right_impurity
                                - N_t_L / N_t * left_impurity)
            where N is the total number of samples, N_t is the number of samples at the current node, 
            N_t_L is the number of samples in the left child, and N_t_R is the number of samples in the right child.
            
            N, N_t, N_t_R and N_t_L all refer to the weighted sum, if sample_weight is passed.
            `,
            "type": "float"
        },
        "bootstrap": {
            "default_value": true,
            "description": `Whether bootstrap samples are used when building trees. 
                           If false, the whole dataset is used to build each tree.`,
            "type": "bool"
        },
        "oob_score": {
            "default_value": false,
            "description": "whether to use out-of-bag samples to estimate the R^2 on unseen data",
            "type": "bool"
        },
        "n_jobs": {
            "default_value": 1,
            "description": `The number of jobs to run in parallel. fit, predict, 
                           decision_path and apply are all parallelized over the trees. 
                           None means 1 unless in a joblib.parallel_backend context. 
                           -1 means using all processors. See Glossary for more details.`,
            "type": "int"
        },
        "random_state": {
            "default_value": 0,
            "description": `Controls both the randomness of the bootstrapping of the samples 
                           used when building trees (if bootstrap=True) and the sampling of the 
                           features to consider when looking for the best split at each 
                           node (if max_features < n_features)`,
            "type": "int"
        },
        "warm_start": {
            "default_value": false,
            "description": `When set to True, reuse the solution of the previous call to 
                           fit and add more estimators to the ensemble, otherwise, just fit a whole new forest.`,
            "type": "bool"
        },
        "ccp_alpha": {
            "default_value": 0.0,
            "description": `Complexity parameter used for Minimal Cost-Complexity Pruning. 
                           The subtree with the largest cost complexity that is smaller than 
                           ccp_alpha will be chosen. By default, no pruning is performed. `,
            "type": "float"
        },
        "max_samples": {
            "default_value": 1,
            "description": `
            If bootstrap is True, the number of samples to draw from X to train each base estimator.
            
            If None (default), then draw X.shape[0] samples.
            If int, then draw max_samples samples.
            If float, then draw max_samples * X.shape[0] samples. 
            Thus, max_samples should be in the interval (0, 1).
            `,
            "type": "float"
        }
    },
    "XGBoost": {
        "n_estimators": {
            "default_value": 100,
            "description": `Number of gradient boosted trees.  
                           Equivalent to number of boosting rounds.`,
            "type": "int"
        },
        "max_depth": {
            "default_value": 6,
            "description": "Maximum tree depth for base learners.",
            "type": "int"
        },
        "learning_rate": {
            "default_value": 0.3,
            "description": "Boosting learning rate (xgb's 'eta')",
            "type": "float"
        },
        "verbosity": {
            "default_value": 1,
            "description": "The degree of verbosity. Valid values are 0 (silent) - 3 (debug).",
            "type": [0, 1, 2, 3]
        },
        "booster": {
            "default_value": "gbtree",
            "description": "Specify which booster to use: gbtree, gblinear or dart.",
            "type": ['gbtree', 'gblinear', 'dart']
        },
        "tree_method": {
            "default_value": "auto",
            "description":
                `
                Specify which tree method to use.  Default to auto.  If this parameter
                is set to default, XGBoost will choose the most conservative option
                available.  It's recommended to study this option from parameters
                document.
                `,
            "type": ["auto", "exact", "approx", "hist", "gpu_hist"]
        },
        "n_jobs": {
            "default_value": 1,
            "description": `
            Number of parallel threads used to run xgboost.  When used with other Scikit-Learn
            algorithms like grid search, you may choose which algorithm to parallelize and
            balance the threads.  Creating thread contention will significantly slow dowm both
            algorithms.
            `,
            "type": "int"
        },
        "gamma": {
            "default_value": 0.0,
            "description": `Minimum loss reduction required to make a further 
                           partition on a leaf node of the tree.`,
            "type": "float"
        },
        "min_child_weight": {
            "default_value": 1.0,
            "description": `Minimum loss reduction required to make a further 
                           partition on a leaf node of the tree.`,
            "type": "float"
        },
        "max_delta_step": {
            "default_value": 0.0,
            "description": "Maximum delta step we allow each tree's weight estimation to be.",
            "type": "float"
        },
        "subsample": {
            "default_value": 1.0,
            "description": "Subsample ratio of the training instance.",
            "type": "float"
        },
        "colsample_bytree": {
            "default_value": 1.0,
            "description": "Subsample ratio of columns when constructing each tree.",
            "type": "float"
        },
        "colsample_bylevel": {
            "default_value": 1.0,
            "description": "Subsample ratio of columns for each level.",
            "type": "float"
        },
        "colsample_bynode": {
            "default_value": 1.0,
            "description": "Subsample ratio of columns for each split.",
            "type": "float"
        },
        "reg_alpha": {
            "default_value": 0.0,
            "description": "L1 regularization term on weights",
            "type": "float"
        },
        "reg_lambda": {
            "default_value": 0.0,
            "description": "L2 regularization term on weights",
            "type": "float"
        },
        "scale_pos_weight": {
            "default_value": 1.0,
            "description": "Balancing of positive and negative weights.",
            "type": "float"
        },
        "random_state": {
            "default_value": 0,
            "description": "Random number seed.",
            "type": "int"
        },
        "base_score": {
            "default_value": 0.5,
            "description": "The initial prediction score of all instances, global bias.",
            "type": "float"
        },
        "num_parallel_tree": {
            "default_value": 1,
            "description": "Used for boosting random forest.",
            "type": "int"
        },
        "importance_type": {
            "default_value": "gain",
            "description": `
            The feature importance type for the feature_importances. property:
            either "gain", "weight", "cover", "total_gain" or "total_cover".
            `,
            "type": ["gain", "weight", "cover", "total_gain", "total_cover"]
        }
    },
    "Databricks": {
        "model_uri": {
            "default_value": "models:/<model_name>/<stage>",
            "description": `
            The location, in URI format, of the MLflow model. For example:
            s3://my_bucket/path/to/model
            runs:/<mlflow_run_id>/run-relative/path/to/model
            models:/<model_name>/<model_version>
            models:/<model_name>/<stage>
            `,
            "type": "string"
        },
        "DATABRICKS_HOST": {
            "default_value": "https://cog-leaftest.cloud.databricks.com",
            "description": `The URL of the Databricks™ host`,
            "type": "string",
        },
        "DATABRICKS_TOKEN": {
            "default_value": "",
            "description": `A generated token to access the Databricks™ instance`,
            "type": "password",
        }
    }
}
export const SUPPORTED_CLASSIFICATION_MODELS: SupportedModels = {
    "Random Forest": {
        "n_estimators": {
            "default_value": 100,
            "description": "The number of trees in the forest.",
            "type": "int"
        },
        "criterion": {
            "default_value": "mse",
            "description": `The function to measure the quality of a split. 
                           Supported criteria are mse for the mean squared error, 
                           which is equal to variance reduction as feature selection 
                           criterion, and mae for the mean absolute error. Options: {'mse', 'mae'}`,
            "type": ['mse', 'mae']
        },
        "max_depth": {
            "default_value": 100,
            "description": `The maximum depth of the tree. 
                           If None, then nodes are expanded until all 
                           leaves are pure or until all leaves contain less than 
                           min_samples_split samples.`,
            "type": "int"
        },
        "min_samples_split": {
            "default_value": 2,
            "description": "The minimum number of samples required to split an internal node.",
            "type": "float"
        },
        "min_samples_leaf": {
            "default_value": 1,
            "description": `
            The minimum number of samples required to be at a leaf node. 
            A split point at any depth will only be considered if it 
            leaves at least min_samples_leaf training samples in each of the left and right branches. 
            This may have the effect of smoothing the model, especially in regression.

            If int, then consider min_samples_leaf as the minimum number.
            If float, then min_samples_leaf is a fraction and ceil(min_samples_leaf * n_samples) 
            are the minimum number of samples for each node.
            `,
            "type": "float"
        },
        "min_weight_fraction_leaf": {
            "default_value": 0.0,
            "description": `The minimum weighted fraction of the sum total of
                           weights (of all the input samples) required to be at a leaf node. 
                           Samples have equal weight when sample_weight is not provided.`,
            "type": "float"
        },
        "max_features": {
            "default_value": "auto",
            "description": `
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
            "type": ["auto", "sqrt", "log2"]
        },
        "max_leaf_nodes": {
            "default_value": 100,
            "description": `Grow trees with max_leaf_nodes in best-first fashion. 
                           Best nodes are defined as relative reduction in impurity. 
                           If None then unlimited number of leaf nodes.`,
            "type": "int"
        },
        "min_impurity_decrease": {
            "default_value": 0.0,
            "description": `
            A node will be split if this split induces a decrease of the impurity greater than or equal 
            to this value.

            The weighted impurity decrease equation is the following:
            
            N_t / N * (impurity - N_t_R / N_t * right_impurity
                                - N_t_L / N_t * left_impurity)
            where N is the total number of samples, N_t is the number of samples at the current node, 
            N_t_L is the number of samples in the left child, and N_t_R is the number of samples in the right child.
            
            N, N_t, N_t_R and N_t_L all refer to the weighted sum, if sample_weight is passed.
            `,
            "type": "float"
        },
        "bootstrap": {
            "default_value": true,
            "description": `Whether bootstrap samples are used when building trees. 
                           If false, the whole dataset is used to build each tree.`,
            "type": "bool"
        },
        "oob_score": {
            "default_value": false,
            "description": "whether to use out-of-bag samples to estimate the R^2 on unseen data",
            "type": "bool"
        },
        "n_jobs": {
            "default_value": 1,
            "description": `The number of jobs to run in parallel. fit, predict, 
                           decision_path and apply are all parallelized over the trees. 
                           None means 1 unless in a joblib.parallel_backend context. 
                           -1 means using all processors. See Glossary for more details.`,
            "type": "int"
        },
        "random_state": {
            "default_value": 0,
            "description": `Controls both the randomness of the bootstrapping of the samples 
                           used when building trees (if bootstrap=True) and the sampling of the 
                           features to consider when looking for the best split at each 
                           node (if max_features < n_features)`,
            "type": "int"
        },
        "warm_start": {
            "default_value": false,
            "description": `When set to True, reuse the solution of the previous call to 
                           fit and add more estimators to the ensemble, otherwise, just fit a whole new forest.`,
            "type": "bool"
        },
        "ccp_alpha": {
            "default_value": 0.0,
            "description": `Complexity parameter used for Minimal Cost-Complexity Pruning. 
                           The subtree with the largest cost complexity that is smaller than 
                           ccp_alpha will be chosen. By default, no pruning is performed. `,
            "type": "float"
        },
        "max_samples": {
            "default_value": 1,
            "description": `
            If bootstrap is True, the number of samples to draw from X to train each base estimator.
            
            If None (default), then draw X.shape[0] samples.
            If int, then draw max_samples samples.
            If float, then draw max_samples * X.shape[0] samples. 
            Thus, max_samples should be in the interval (0, 1).
            `,
            "type": "float"
        }
    }
}

export const SUPPORTED_METRICS: string[] = [
/*
This list should match the list of supported metrics in the backend.
See SUPPORTED_METRICS in framework/metrics/metrics_manager.py
The string should match exactly the `name` property of the MetricsCalculator.
For instance, "Mean Absolute Error" must match MeanAbsoluteError.name in framework/metrics/mean_absolute_error.py
 */
    "Mean Absolute Error",
    "Mean Squared Error",
    "Root Mean Square Error",
    "F1 score",
    "R2 score",
    "Accuracy score",
    "Matthews correlation coefficient"
]
