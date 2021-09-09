export const DummyExperiment = {
    id: "Housing Prediction",
    flow: [
        {
            "id": "f03b-a5e3-a56c-ee68-0e4db36f3cd",
            "type": "prescriptornode",
            "data": {
              "NodeID": "f03b-a5e3-a56c-ee68-0e4db36f3cd",
              "SelectedDataTag": {
                "time": null,
                "id": "b21d554-e74b-d761-ebb-c6cfb5340",
                "version": "2dM1aNdhywe6N1bvzDSWYbYW1kxTFBaW",
                "dataSource": "Housing Data 3",
                "dataSourceVersion": null,
                "description": null,
                "fields": {
                  "households": {
                    "dataType": "INT32",
                    "espType": "CONTEXT"
                  },
                  "housing_median_age": {
                    "dataType": "INT32",
                    "espType": "CONTEXT"
                  },
                  "latitude": {
                    "dataType": "INT32",
                    "espType": "CONTEXT"
                  },
                  "longitude": {
                    "dataType": "INT32",
                    "espType": "CONTEXT"
                  },
                  "median_house_value": {
                    "dataType": "INT32",
                    "espType": "OUTCOME"
                  },
                  "median_income": {
                    "dataType": "INT32",
                    "espType": "CONTEXT"
                  },
                  "ocean_proximity": {
                    "dataType": "INT32",
                    "espType": "CONTEXT"
                  },
                  "population": {
                    "dataType": "INT32",
                    "espType": "CONTEXT"
                  },
                  "total_bedrooms": {
                    "dataType": "INT32",
                    "espType": "CONTEXT"
                  },
                  "total_rooms": {
                    "dataType": "INT32",
                    "espType": "CONTEXT"
                  }
                }
              },
              "state": {
                "network": {
                  "inputs": [
                    {
                      "name": "Context",
                      "size": 9,
                      "values": [
                        "float"
                      ]
                    }
                  ],
                  "hidden_layers": [
                    {
                      "layer_name": "hidden_1",
                      "layer_type": "dense",
                      "layer_params": {
                        "units": 18,
                        "activation": "tanh",
                        "use_bias": true
                      }
                    }
                  ],
                  "outputs": [
                    {
                      "name": "Action",
                      "size": 0,
                      "activation": "linear",
                      "use_bias": true
                    }
                  ]
                },
                "evolution": {
                  "nb_generations": 40,
                  "population_size": 10,
                  "nb_elites": 5,
                  "parent_selection": "tournament",
                  "remove_population_pct": 0.8,
                  "mutation_type": "gaussian_noise_percentage",
                  "mutation_probability": 0.1,
                  "mutation_factor": 0.1,
                  "initialization_distribution": "orthogonal",
                  "initialization_range": 1,
                  "fitness": [
                    {
                      "metric_name": "naa",
                      "maximize": "true"
                    },
                    {
                        "metric_name": "score",
                        "maximize": "true"
                      }
                  ]
                },
                "LEAF": {
                  "representation": "NNWeights"
                },
                "caoState": {
                  "context": {
                    "households": true,
                    "housing_median_age": true,
                    "latitude": true,
                    "longitude": true,
                    "median_income": true,
                    "ocean_proximity": true,
                    "population": true,
                    "total_bedrooms": true,
                    "total_rooms": true
                  },
                  "action": {},
                  "outcome": {}
                }
              },
              "EvaluatorOverrideCode": "def evaluate_candidate(self, candidate: object) -> Dict[str, object]:\n\"\"\"\nThis function receives a candidate and can be\nmodified to provide alternate fitness calculations.\n:param candidate: a candidate model to evaluate\n:return: a dictionary of metrics\n\"\"\"\n\n# Fetch the CAO Map\nCAO_MAP = self.CAO_MAP\n\n# Fetc the Context and the Actions\ncontext_data: pd.DataFrame = self.data[CAO_MAP[\"context\"]]\n\n# Declare a metrics container\nmetrics = {}\n\n# Loop over the outcomes\nfor outcome_list in CAO_MAP[\"outcome\"]:\n\n    # Get the actions\n    actions_df = pd.DataFrame(candidate.predict(context_data))\n    consolidated_df = pd.concat(\n        [context_data, actions_df]\n    )\n\n    # If the predictor has only one outcome attached\n    if len(outcome_list) == 1:\n        predictor = self.get_predictor(outcome_list[0])\n\n        metrics[outcome_list[0]] = np.mean(predictor.predict(consolidated_df))\n    else:\n        # If a predictor predcits multiple outcomes\n        outcomes = predictor.predict(consolidated_df)\n        for idx, outcome in enumerate(outcome_list):\n            metrics[outcome] = np.mean(outcomes[:, idx])\n\nreturn metrics        \n"
            },
            "position": {
              "x": 760,
              "y": 80
            }
          }
          
    ]
}

export const DummyRun1 = {
    metrics: {
        "experiment_stats.csv": [
            {
                "generation": 1,
                "checkpoint_id": "amex-optimizer-test-3/1/20201218-014459",
                "max_naa": 8362553.48663629,
                "min_naa": 5815769.672326158,
                "mean_naa": 6454032.980878184,
                "elites_mean_naa": 7029359.286628418,
                "cid_min_naa": "1_72",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 771081.1568360206,
                "elites_mean_score": 779488.9617286343,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 2,
                "checkpoint_id": "amex-optimizer-test-3/2/20201218-014529",
                "max_naa": 8362553.48663629,
                "min_naa": 6223184.104274093,
                "mean_naa": 6870643.2896345,
                "elites_mean_naa": 7254427.952120086,
                "cid_min_naa": "2_17",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 791790.8762119146,
                "elites_mean_score": 839884.3281685539,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 3,
                "checkpoint_id": "amex-optimizer-test-3/3/20201218-014557",
                "max_naa": 8362553.48663629,
                "min_naa": 6494253.240489943,
                "mean_naa": 7067791.499818436,
                "elites_mean_naa": 7404785.580799781,
                "cid_min_naa": "2_35",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 845951.4190633455,
                "elites_mean_score": 851713.3571147195,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 4,
                "checkpoint_id": "amex-optimizer-test-3/4/20201218-014627",
                "max_naa": 8362553.48663629,
                "min_naa": 6495497.127708625,
                "mean_naa": 7146414.791227754,
                "elites_mean_naa": 7457810.350713137,
                "cid_min_naa": "4_51",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 874577.9071028378,
                "elites_mean_score": 856530.1474163976,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 5,
                "checkpoint_id": "amex-optimizer-test-3/5/20201218-014656",
                "max_naa": 8362553.48663629,
                "min_naa": 6309042.493394278,
                "mean_naa": 7142351.07082082,
                "elites_mean_naa": 7525374.69965996,
                "cid_min_naa": "5_94",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 873589.1210467971,
                "elites_mean_score": 855414.6864739594,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 6,
                "checkpoint_id": "amex-optimizer-test-3/6/20201218-014726",
                "max_naa": 8362553.48663629,
                "min_naa": 6580400.932152871,
                "mean_naa": 7258320.275908479,
                "elites_mean_naa": 7490016.086082863,
                "cid_min_naa": "6_19",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 855364.8605963823,
                "elites_mean_score": 868618.4907033287,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 7,
                "checkpoint_id": "amex-optimizer-test-3/7/20201218-014758",
                "max_naa": 8362553.48663629,
                "min_naa": 6640755.578594709,
                "mean_naa": 7230695.636505222,
                "elites_mean_naa": 7496186.326409313,
                "cid_min_naa": "7_55",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 862737.7240889482,
                "elites_mean_score": 866445.4398115199,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 8,
                "checkpoint_id": "amex-optimizer-test-3/8/20201218-014828",
                "max_naa": 8362553.48663629,
                "min_naa": 6544207.469007873,
                "mean_naa": 7169526.15173972,
                "elites_mean_naa": 7471296.7394001875,
                "cid_min_naa": "8_88",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 872027.8487589969,
                "elites_mean_score": 868643.6682962959,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 9,
                "checkpoint_id": "amex-optimizer-test-3/9/20201218-014859",
                "max_naa": 8362553.48663629,
                "min_naa": 6387324.063847291,
                "mean_naa": 7219977.549133764,
                "elites_mean_naa": 7471296.7394001875,
                "cid_min_naa": "9_53",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 864311.0383544913,
                "elites_mean_score": 868643.6682962959,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 10,
                "checkpoint_id": "amex-optimizer-test-3/10/20201218-014929",
                "max_naa": 8362553.48663629,
                "min_naa": 6520308.807423663,
                "mean_naa": 7251643.667180759,
                "elites_mean_naa": 7473229.920095334,
                "cid_min_naa": "10_16",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 862546.165801331,
                "elites_mean_score": 878182.6914531225,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 11,
                "checkpoint_id": "amex-optimizer-test-3/11/20201218-014957",
                "max_naa": 8362553.48663629,
                "min_naa": 6572149.055825175,
                "mean_naa": 7269137.3159015905,
                "elites_mean_naa": 7587337.775206732,
                "cid_min_naa": "11_56",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 849658.9101881821,
                "elites_mean_score": 853649.7426104981,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 12,
                "checkpoint_id": "amex-optimizer-test-3/12/20201218-015027",
                "max_naa": 8362553.48663629,
                "min_naa": 6691735.6224399945,
                "mean_naa": 7280415.974986694,
                "elites_mean_naa": 7600822.372540745,
                "cid_min_naa": "12_91",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 851786.4060331173,
                "elites_mean_score": 855121.4295111892,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 13,
                "checkpoint_id": "amex-optimizer-test-3/13/20201218-015057",
                "max_naa": 8362553.48663629,
                "min_naa": 6415982.811457664,
                "mean_naa": 7289250.313552835,
                "elites_mean_naa": 7648249.982808305,
                "cid_min_naa": "13_65",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 859045.7166359584,
                "elites_mean_score": 833073.3507966286,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 14,
                "checkpoint_id": "amex-optimizer-test-3/14/20201218-015129",
                "max_naa": 8362553.48663629,
                "min_naa": 6372557.697029085,
                "mean_naa": 7277662.237501256,
                "elites_mean_naa": 7678145.686325813,
                "cid_min_naa": "14_17",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 845663.0136137503,
                "elites_mean_score": 822009.4418470197,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 15,
                "checkpoint_id": "amex-optimizer-test-3/15/20201218-015157",
                "max_naa": 8362553.48663629,
                "min_naa": 6501801.352082985,
                "mean_naa": 7283314.652403803,
                "elites_mean_naa": 7657097.435297218,
                "cid_min_naa": "15_89",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 850917.7754980811,
                "elites_mean_score": 842951.7444782618,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 16,
                "checkpoint_id": "amex-optimizer-test-3/16/20201218-015227",
                "max_naa": 8362553.48663629,
                "min_naa": 6545697.335884908,
                "mean_naa": 7326355.9914897,
                "elites_mean_naa": 7681678.309263555,
                "cid_min_naa": "16_36",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 829806.3438805122,
                "elites_mean_score": 814559.1478911863,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 17,
                "checkpoint_id": "amex-optimizer-test-3/17/20201218-015256",
                "max_naa": 8362553.48663629,
                "min_naa": 6665695.839507839,
                "mean_naa": 7277493.209039377,
                "elites_mean_naa": 7684647.051492857,
                "cid_min_naa": "17_77",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 854492.7253612765,
                "elites_mean_score": 817352.3813279315,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 18,
                "checkpoint_id": "amex-optimizer-test-3/18/20201218-015325",
                "max_naa": 8362553.48663629,
                "min_naa": 6507649.880796038,
                "mean_naa": 7305332.786945755,
                "elites_mean_naa": 7665763.321935305,
                "cid_min_naa": "18_52",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 840714.3298223381,
                "elites_mean_score": 846770.2488026259,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 19,
                "checkpoint_id": "amex-optimizer-test-3/19/20201218-015354",
                "max_naa": 8362553.48663629,
                "min_naa": 6255287.511895334,
                "mean_naa": 7271473.529982354,
                "elites_mean_naa": 7686766.318971069,
                "cid_min_naa": "19_42",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 868121.239835524,
                "elites_mean_score": 818892.814297007,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 20,
                "checkpoint_id": "amex-optimizer-test-3/20/20201218-015423",
                "max_naa": 8362553.48663629,
                "min_naa": 6744648.959388793,
                "mean_naa": 7352943.006653222,
                "elites_mean_naa": 7686548.295651632,
                "cid_min_naa": "20_41",
                "cid_max_naa": "1_2",
                "max_score": 1157592.87457573,
                "min_score": 195174.2583290057,
                "mean_score": 834671.6383186701,
                "elites_mean_score": 821218.8528071379,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            }
        ]
    },
    "20.csv": [
        {
            "cid": "1_1",
            "identity": "(none)",
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 6935946.605196845,
            "score": 1157592.87457573
        },
        {
            "cid": "1_2",
            "identity": "(none)",
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 8362553.48663629,
            "score": 195174.2583290057
        },
        {
            "cid": "19_38",
            "identity": null,
            "NSGA-II_crowding_distance": 0.696009545,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 8070150.846233067,
            "score": 532244.3908050386
        },
        {
            "cid": "11_59",
            "identity": null,
            "NSGA-II_crowding_distance": 0.397468807,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 7381222.034333756,
            "score": 1069225.1776757124
        },
        {
            "cid": "6_68",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3811732476,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 7605279.892099494,
            "score": 1017667.0253882718
        },
        {
            "cid": "17_83",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1773199353,
            "NSGA-II_rank": 1,
            "is_elite": false,
            "naa": 7972522.077352171,
            "score": 601903.5163885792
        },
        {
            "cid": "14_29",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3054986456,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 7700317.920105331,
            "score": 917645.6566618584
        },
        {
            "cid": "14_35",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3474170533,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 7892723.572954839,
            "score": 741062.9473212801
        },
        {
            "cid": "12_65",
            "identity": null,
            "NSGA-II_crowding_distance": 0.4039403831,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 7169471.943028314,
            "score": 1106193.3155623914
        },
        {
            "cid": "18_18",
            "identity": null,
            "NSGA-II_crowding_distance": 0.6510368147,
            "NSGA-II_rank": 2,
            "is_elite": false,
            "naa": 7777474.811770583,
            "score": 850218.980262202
        },
        {
            "cid": "20_11",
            "identity": null,
            "NSGA-II_crowding_distance": 0.908336329,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 7344515.442727672,
            "score": 696515.3223442053
        },
        {
            "cid": "20_12",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2444242324,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 7547115.409354388,
            "score": 764575.4620223223
        },
        {
            "cid": "20_13",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3289833574,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 7219500.105261814,
            "score": 954969.0840534176
        },
        {
            "cid": "20_14",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 7033140.828831235,
            "score": 1030760.9929506176
        },
        {
            "cid": "20_15",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1809842242,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 7231736.698061582,
            "score": 950693.1276815912
        },
        {
            "cid": "20_16",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2224867662,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 7044316.117187126,
            "score": 1011041.5448070904
        },
        {
            "cid": "20_17",
            "identity": null,
            "NSGA-II_crowding_distance": 1.1406637523,
            "NSGA-II_rank": 9,
            "is_elite": false,
            "naa": 7480845.498443857,
            "score": 612791.9796349475
        },
        {
            "cid": "20_18",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1661731007,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 7612984.85111092,
            "score": 662149.5408251736
        },
        {
            "cid": "20_19",
            "identity": null,
            "NSGA-II_crowding_distance": 0.6669280258,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 7243367.115670812,
            "score": 898523.525338117
        },
        {
            "cid": "20_20",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 7762921.296502733,
            "score": 724637.596863625
        },
        {
            "cid": "20_21",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2558180467,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 7635617.614977343,
            "score": 644274.6482293992
        },
        {
            "cid": "20_22",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2660372531,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 7492088.767983857,
            "score": 770030.7880906065
        },
        {
            "cid": "20_23",
            "identity": null,
            "NSGA-II_crowding_distance": 0.303847312,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 7262237.785865656,
            "score": 914631.497315678
        },
        {
            "cid": "20_24",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2153817091,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 7192218.355256367,
            "score": 921749.7876586048
        },
        {
            "cid": "20_25",
            "identity": null,
            "NSGA-II_crowding_distance": 0.312712151,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 7369179.83717761,
            "score": 774712.7011718831
        },
        {
            "cid": "20_26",
            "identity": null,
            "NSGA-II_crowding_distance": 0.7398290033,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 7118847.790481148,
            "score": 891308.5971252666
        },
        {
            "cid": "20_27",
            "identity": null,
            "NSGA-II_crowding_distance": 0.281072899,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 7147410.956466294,
            "score": 986429.0909832816
        },
        {
            "cid": "20_28",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2332372787,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 7044408.07804408,
            "score": 949797.9789899868
        },
        {
            "cid": "20_29",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 8,
            "is_elite": false,
            "naa": 7629258.915001863,
            "score": 627430.1182705975
        },
        {
            "cid": "20_30",
            "identity": null,
            "NSGA-II_crowding_distance": 0.6075011887,
            "NSGA-II_rank": 2,
            "is_elite": false,
            "naa": 7205810.341447515,
            "score": 1047661.5736540912
        },
        {
            "cid": "20_31",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 2,
            "is_elite": false,
            "naa": 7784551.831194983,
            "score": 720846.047979188
        },
        {
            "cid": "20_32",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1697232808,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 7545064.594351324,
            "score": 787457.5577920964
        },
        {
            "cid": "20_33",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2609604459,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 7589637.115995583,
            "score": 692429.0952041788
        },
        {
            "cid": "20_34",
            "identity": null,
            "NSGA-II_crowding_distance": 0.605617054,
            "NSGA-II_rank": 9,
            "is_elite": false,
            "naa": 7121872.980303217,
            "score": 817871.61288262
        },
        {
            "cid": "20_35",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3336925343,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 6919591.618482175,
            "score": 955773.0236740762
        },
        {
            "cid": "20_36",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 7710712.291805913,
            "score": 699096.2355828108
        },
        {
            "cid": "20_37",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 7656391.977065247,
            "score": 659116.2918792588
        },
        {
            "cid": "20_38",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 6810676.971761994,
            "score": 993054.3775679128
        },
        {
            "cid": "20_39",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2203035793,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 7513927.253673161,
            "score": 774742.9444054037
        },
        {
            "cid": "20_40",
            "identity": null,
            "NSGA-II_crowding_distance": 1.1559738503,
            "NSGA-II_rank": 9,
            "is_elite": false,
            "naa": 7181033.536229021,
            "score": 670925.2691542635
        },
        {
            "cid": "20_41",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 6744648.959388793,
            "score": 1027040.415717138
        },
        {
            "cid": "20_42",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 7123104.556540187,
            "score": 1037625.0670147724
        },
        {
            "cid": "20_43",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 2,
            "is_elite": false,
            "naa": 6893792.578967315,
            "score": 1066837.3333626334
        },
        {
            "cid": "20_44",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 11,
            "is_elite": false,
            "naa": 6933597.855262648,
            "score": 826325.7071238803
        },
        {
            "cid": "20_45",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3317954829,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 7411265.9065233795,
            "score": 681090.9026530491
        },
        {
            "cid": "20_46",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1115156445,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 7238363.506635659,
            "score": 948147.725121472
        },
        {
            "cid": "20_47",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3371035291,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 7397994.447631698,
            "score": 712942.9880177554
        },
        {
            "cid": "20_48",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2287193036,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 7492272.875594864,
            "score": 790868.6872873461
        },
        {
            "cid": "20_49",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3275193732,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 6983121.929531924,
            "score": 989835.753111915
        },
        {
            "cid": "20_50",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2263622859,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 7103494.225868491,
            "score": 991407.2893059064
        },
        {
            "cid": "20_51",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2140614926,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 7651639.45361245,
            "score": 763090.444675295
        },
        {
            "cid": "20_52",
            "identity": null,
            "NSGA-II_crowding_distance": 0.8364532633,
            "NSGA-II_rank": 8,
            "is_elite": false,
            "naa": 7187960.730029617,
            "score": 869054.081709463
        },
        {
            "cid": "20_53",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 7644858.114969036,
            "score": 594813.6575691511
        },
        {
            "cid": "20_54",
            "identity": null,
            "NSGA-II_crowding_distance": 0.4879041408,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 7340673.370486245,
            "score": 845081.209730317
        },
        {
            "cid": "20_55",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2895012632,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 7411752.779612923,
            "score": 844889.0939384362
        },
        {
            "cid": "20_56",
            "identity": null,
            "NSGA-II_crowding_distance": 0.9610270047,
            "NSGA-II_rank": 8,
            "is_elite": false,
            "naa": 7546567.652468545,
            "score": 646439.4256340874
        },
        {
            "cid": "20_57",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2242229566,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 7173305.842392849,
            "score": 940052.7982212616
        },
        {
            "cid": "20_58",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 9,
            "is_elite": false,
            "naa": 7511926.445836469,
            "score": 562618.8933985512
        },
        {
            "cid": "20_59",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3909138015,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 7226028.766831451,
            "score": 983068.4669343102
        },
        {
            "cid": "20_60",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3649923969,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 7661243.263559048,
            "score": 676476.3477316167
        },
        {
            "cid": "20_61",
            "identity": null,
            "NSGA-II_crowding_distance": 0.4801462121,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 7559671.485119159,
            "score": 656022.4537764895
        },
        {
            "cid": "20_62",
            "identity": null,
            "NSGA-II_crowding_distance": 0.5101567959,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 7298695.71792313,
            "score": 951369.350890865
        },
        {
            "cid": "20_63",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2740597544,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 7501343.248960713,
            "score": 717667.440856037
        },
        {
            "cid": "20_64",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3183474962,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 7798995.730834065,
            "score": 854334.1676259794
        },
        {
            "cid": "20_65",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3512367299,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 7122041.320701326,
            "score": 974067.0095199496
        },
        {
            "cid": "20_66",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 10,
            "is_elite": false,
            "naa": 7110752.251470954,
            "score": 772177.9899529351
        },
        {
            "cid": "20_67",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3293989945,
            "NSGA-II_rank": 2,
            "is_elite": false,
            "naa": 7553398.40686424,
            "score": 856313.8305953996
        },
        {
            "cid": "20_68",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2703199242,
            "NSGA-II_rank": 2,
            "is_elite": false,
            "naa": 7512442.692334697,
            "score": 861243.6193051141
        },
        {
            "cid": "20_69",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3351743558,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 7151351.543220054,
            "score": 988782.1577701658
        },
        {
            "cid": "20_70",
            "identity": null,
            "NSGA-II_crowding_distance": 0.6226218524,
            "NSGA-II_rank": 9,
            "is_elite": false,
            "naa": 7132652.418958211,
            "score": 713253.3233389653
        },
        {
            "cid": "20_71",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2155190641,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 7316431.782659794,
            "score": 827175.3924032985
        },
        {
            "cid": "20_72",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 9,
            "is_elite": false,
            "naa": 7090534.902821553,
            "score": 867342.3440921702
        },
        {
            "cid": "20_73",
            "identity": null,
            "NSGA-II_crowding_distance": 0.7555894265,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 7354770.458468995,
            "score": 769352.9796228292
        },
        {
            "cid": "20_74",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 6890473.158513858,
            "score": 994277.8796688212
        },
        {
            "cid": "20_75",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2005293281,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 7948820.925094321,
            "score": 621048.7141261101
        },
        {
            "cid": "20_76",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 7680851.4691890655,
            "score": 570194.3315203264
        },
        {
            "cid": "20_77",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2036933049,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 7489631.960039425,
            "score": 831927.1318246752
        },
        {
            "cid": "20_78",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 10,
            "is_elite": false,
            "naa": 7085252.4291076185,
            "score": 860614.5243890357
        },
        {
            "cid": "20_79",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1826772434,
            "NSGA-II_rank": 2,
            "is_elite": false,
            "naa": 7358586.196468963,
            "score": 986543.1289266754
        },
        {
            "cid": "20_80",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3198826897,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 7550752.641493951,
            "score": 668583.977818099
        },
        {
            "cid": "20_81",
            "identity": null,
            "NSGA-II_crowding_distance": 0.6447487269,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 7214148.881350303,
            "score": 852805.3819749788
        },
        {
            "cid": "20_82",
            "identity": null,
            "NSGA-II_crowding_distance": 0.249321552,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 7290330.934736272,
            "score": 834695.2240772708
        },
        {
            "cid": "20_83",
            "identity": null,
            "NSGA-II_crowding_distance": 0.4985580172,
            "NSGA-II_rank": 2,
            "is_elite": false,
            "naa": 7456674.777146911,
            "score": 912272.4965885665
        },
        {
            "cid": "20_84",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3076865655,
            "NSGA-II_rank": 8,
            "is_elite": false,
            "naa": 7192056.680180159,
            "score": 837325.0129507568
        },
        {
            "cid": "20_85",
            "identity": null,
            "NSGA-II_crowding_distance": 0.324778361,
            "NSGA-II_rank": 2,
            "is_elite": false,
            "naa": 7378406.906650846,
            "score": 981677.780912876
        },
        {
            "cid": "20_86",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1915449813,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 6849599.239200415,
            "score": 1019404.956398508
        },
        {
            "cid": "20_87",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3481593015,
            "NSGA-II_rank": 2,
            "is_elite": false,
            "naa": 7343617.71016006,
            "score": 1031369.5948302904
        },
        {
            "cid": "20_88",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2109283496,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 7193654.115487202,
            "score": 881258.8441072828
        },
        {
            "cid": "20_89",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 12,
            "is_elite": false,
            "naa": 6901751.09798867,
            "score": 834377.831410852
        },
        {
            "cid": "20_90",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2073462406,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 6898735.191579798,
            "score": 1014724.5087477812
        },
        {
            "cid": "20_91",
            "identity": null,
            "NSGA-II_crowding_distance": 0.6389550741,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 7478984.118456039,
            "score": 848121.505436885
        },
        {
            "cid": "20_92",
            "identity": null,
            "NSGA-II_crowding_distance": 0.4874903671,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 7526640.706979821,
            "score": 767026.1447414563
        },
        {
            "cid": "20_93",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2967851497,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 7671133.319567,
            "score": 758244.3499633152
        },
        {
            "cid": "20_94",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 8,
            "is_elite": false,
            "naa": 6752671.642416043,
            "score": 943160.3913303628
        },
        {
            "cid": "20_95",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 11,
            "is_elite": false,
            "naa": 6908049.333335286,
            "score": 844715.7936888058
        },
        {
            "cid": "20_96",
            "identity": null,
            "NSGA-II_crowding_distance": 0.4764786964,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 7691976.90366519,
            "score": 700213.1726065674
        },
        {
            "cid": "20_97",
            "identity": null,
            "NSGA-II_crowding_distance": 0.8265136566,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 7332150.13806194,
            "score": 954874.634415319
        },
        {
            "cid": "20_98",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3622922717,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 7431926.661624277,
            "score": 793731.4576592968
        },
        {
            "cid": "20_99",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1973677465,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 7065693.886294205,
            "score": 941534.3434392782
        },
        {
            "cid": "20_100",
            "identity": null,
            "NSGA-II_crowding_distance": 1.0090061325,
            "NSGA-II_rank": 8,
            "is_elite": false,
            "naa": 7212389.252026964,
            "score": 780706.8132018913
        }
    ]
}

export const DummyRun2 = {
    metrics: {
        "experiment_stats.csv": [
            {
                "generation": 1,
                "checkpoint_id": "amex-optimizer-test-3/1/20201218-020159",
                "max_naa": 9904835.130666263,
                "min_naa": 9179639.283628598,
                "mean_naa": 9408832.75597216,
                "elites_mean_naa": 9522169.658229653,
                "cid_min_naa": "1_15",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1135994.8082949892,
                "elites_mean_score": 1131038.9956675686,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 2,
                "checkpoint_id": "amex-optimizer-test-3/2/20201218-020231",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9540205.101715373,
                "elites_mean_naa": 9690184.199975371,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1129917.9924533593,
                "elites_mean_score": 1079651.3201131844,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 3,
                "checkpoint_id": "amex-optimizer-test-3/3/20201218-020302",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9656938.191301364,
                "elites_mean_naa": 9675559.546491206,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1108061.1623974894,
                "elites_mean_score": 1112979.3077820526,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 4,
                "checkpoint_id": "amex-optimizer-test-3/4/20201218-020331",
                "max_naa": 9904835.130666263,
                "min_naa": 9254098.768714126,
                "mean_naa": 9635509.016635332,
                "elites_mean_naa": 9705023.81938521,
                "cid_min_naa": "4_60",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1128676.5426841795,
                "elites_mean_score": 1097394.2846936532,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 5,
                "checkpoint_id": "amex-optimizer-test-3/5/20201218-020404",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9656805.470960047,
                "elites_mean_naa": 9698323.458313204,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1125325.6035070524,
                "elites_mean_score": 1134772.7344416608,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 6,
                "checkpoint_id": "amex-optimizer-test-3/6/20201218-020438",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9634241.449522246,
                "elites_mean_naa": 9691463.25037289,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1148833.851621217,
                "elites_mean_score": 1119507.9780760463,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 7,
                "checkpoint_id": "amex-optimizer-test-3/7/20201218-020512",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9655521.681519523,
                "elites_mean_naa": 9704833.385935996,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1132190.6123067208,
                "elites_mean_score": 1119758.0957049637,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 8,
                "checkpoint_id": "amex-optimizer-test-3/8/20201218-020551",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9653741.291384872,
                "elites_mean_naa": 9708396.671859372,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1152587.901693532,
                "elites_mean_score": 1108293.4961341822,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 9,
                "checkpoint_id": "amex-optimizer-test-3/9/20201218-020623",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9678610.64770869,
                "elites_mean_naa": 9700199.449377283,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1127640.1544104265,
                "elites_mean_score": 1137756.9398495303,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 10,
                "checkpoint_id": "amex-optimizer-test-3/10/20201218-020653",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9666481.628338989,
                "elites_mean_naa": 9723898.535072206,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1148896.6311110414,
                "elites_mean_score": 1141358.4647480776,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 11,
                "checkpoint_id": "amex-optimizer-test-3/11/20201218-020726",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9679790.858461712,
                "elites_mean_naa": 9723058.78325074,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1133025.8900523474,
                "elites_mean_score": 1141420.2178379802,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 12,
                "checkpoint_id": "amex-optimizer-test-3/12/20201218-020805",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9663908.09955236,
                "elites_mean_naa": 9723058.78325074,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1141223.5078133885,
                "elites_mean_score": 1141420.21783798,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 13,
                "checkpoint_id": "amex-optimizer-test-3/13/20201218-020837",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9672881.859346382,
                "elites_mean_naa": 9737760.486865249,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1143831.0118369556,
                "elites_mean_score": 1137908.7024025184,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 14,
                "checkpoint_id": "amex-optimizer-test-3/14/20201218-020908",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9671324.596791709,
                "elites_mean_naa": 9737760.486865245,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1156413.7444685686,
                "elites_mean_score": 1137908.702402518,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 15,
                "checkpoint_id": "amex-optimizer-test-3/15/20201218-020939",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9664408.454235416,
                "elites_mean_naa": 9723090.708982918,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1154110.6815276905,
                "elites_mean_score": 1138185.093139729,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 16,
                "checkpoint_id": "amex-optimizer-test-3/16/20201218-021016",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9662265.090973122,
                "elites_mean_naa": 9723568.688680876,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1147868.317526206,
                "elites_mean_score": 1138194.8335586863,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 17,
                "checkpoint_id": "amex-optimizer-test-3/17/20201218-021046",
                "max_naa": 9904835.130666263,
                "min_naa": 9260215.8137073,
                "mean_naa": 9649952.972506726,
                "elites_mean_naa": 9726185.808937833,
                "cid_min_naa": "17_68",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1157925.8883870004,
                "elites_mean_score": 1124172.4351033517,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 18,
                "checkpoint_id": "amex-optimizer-test-3/18/20201218-021116",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9671266.500065047,
                "elites_mean_naa": 9724509.921702163,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1140165.8567741404,
                "elites_mean_score": 1124807.872338844,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 19,
                "checkpoint_id": "amex-optimizer-test-3/19/20201218-021158",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9679652.754555568,
                "elites_mean_naa": 9724509.921702163,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1144632.866694587,
                "elites_mean_score": 1124807.872338844,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            },
            {
                "generation": 20,
                "checkpoint_id": "amex-optimizer-test-3/20/20201218-021236",
                "max_naa": 9904835.130666263,
                "min_naa": 9264254.738092365,
                "mean_naa": 9665704.44034084,
                "elites_mean_naa": 9724509.921702163,
                "cid_min_naa": "1_1",
                "cid_max_naa": "1_2",
                "max_score": 1213016.9701426548,
                "min_score": 803394.0089587739,
                "mean_score": 1145509.2241001446,
                "elites_mean_score": 1124807.872338844,
                "cid_min_score": "1_2",
                "cid_max_score": "1_1"
            }
        ]
    },
    "20.csv": [
        {
            "cid": "1_1",
            "identity": "(none)",
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 9264254.738092365,
            "score": 1213016.9701426548
        },
        {
            "cid": "1_2",
            "identity": "(none)",
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 9904835.130666263,
            "score": 803394.0089587739
        },
        {
            "cid": "8_38",
            "identity": null,
            "NSGA-II_crowding_distance": 0.7140839998,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 9858331.553490609,
            "score": 936407.5375980254
        },
        {
            "cid": "17_94",
            "identity": null,
            "NSGA-II_crowding_distance": 0.5957954368,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 9851739.79436813,
            "score": 1061947.0813211363
        },
        {
            "cid": "15_72",
            "identity": null,
            "NSGA-II_crowding_distance": 0.5734672661,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 9578039.890673611,
            "score": 1212813.4173896995
        },
        {
            "cid": "13_68",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3827443127,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 9851628.850303022,
            "score": 1176172.9450784512
        },
        {
            "cid": "15_45",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1877436532,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 9791790.97986938,
            "score": 1211961.7662031788
        },
        {
            "cid": "16_37",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2526373209,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 9679468.01524607,
            "score": 1212345.2501412288
        },
        {
            "cid": "18_63",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1693202666,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 9833839.666407788,
            "score": 1207281.5962525848
        },
        {
            "cid": "5_42",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1594807762,
            "NSGA-II_rank": 1,
            "is_elite": true,
            "naa": 9631170.597904392,
            "score": 1212738.150302708
        },
        {
            "cid": "20_11",
            "identity": null,
            "NSGA-II_crowding_distance": 0.6516565294,
            "NSGA-II_rank": 11,
            "is_elite": false,
            "naa": 9630546.365672365,
            "score": 1150223.0006105916
        },
        {
            "cid": "20_12",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2567905863,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 9737401.02228066,
            "score": 1204069.122504681
        },
        {
            "cid": "20_13",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1639266646,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 9647831.915329922,
            "score": 1191981.951394155
        },
        {
            "cid": "20_14",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 11,
            "is_elite": false,
            "naa": 9503524.889787303,
            "score": 1176814.9730978154
        },
        {
            "cid": "20_15",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 12,
            "is_elite": false,
            "naa": 9463467.156894911,
            "score": 1166227.836632899
        },
        {
            "cid": "20_16",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 9,
            "is_elite": false,
            "naa": 9702401.148974378,
            "score": 1089353.5447709109
        },
        {
            "cid": "20_17",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2640531158,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 9716174.791792406,
            "score": 1137255.4175894991
        },
        {
            "cid": "20_18",
            "identity": null,
            "NSGA-II_crowding_distance": 0.0770671005,
            "NSGA-II_rank": 1,
            "is_elite": false,
            "naa": 9792088.82661663,
            "score": 1207457.1900264798
        },
        {
            "cid": "20_19",
            "identity": null,
            "NSGA-II_crowding_distance": 1.3517108144,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 9774167.705024822,
            "score": 1171598.2771582978
        },
        {
            "cid": "20_20",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1246140772,
            "NSGA-II_rank": 9,
            "is_elite": false,
            "naa": 9693389.312126009,
            "score": 1159158.3749796497
        },
        {
            "cid": "20_21",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 9,
            "is_elite": false,
            "naa": 9533818.814185884,
            "score": 1188470.700691412
        },
        {
            "cid": "20_22",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3926751874,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 9600225.488691747,
            "score": 1204482.2177282562
        },
        {
            "cid": "20_23",
            "identity": null,
            "NSGA-II_crowding_distance": 0.7519384498,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 9775441.24403344,
            "score": 1031641.1139615742
        },
        {
            "cid": "20_24",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2851692095,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 9680983.422774505,
            "score": 1204639.2347755446
        },
        {
            "cid": "20_25",
            "identity": null,
            "NSGA-II_crowding_distance": 0.4486651009,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 9640702.888181208,
            "score": 1205610.4488780545
        },
        {
            "cid": "20_26",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2800188011,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 9486904.995758193,
            "score": 1199230.0258488243
        },
        {
            "cid": "20_27",
            "identity": null,
            "NSGA-II_crowding_distance": 1.0564323249,
            "NSGA-II_rank": 10,
            "is_elite": false,
            "naa": 9528394.03824327,
            "score": 1186703.5583539188
        },
        {
            "cid": "20_28",
            "identity": null,
            "NSGA-II_crowding_distance": 0.7517376453,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 9762301.836135736,
            "score": 1134441.325887784
        },
        {
            "cid": "20_29",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 9678311.968580063,
            "score": 1208038.8903543933
        },
        {
            "cid": "20_30",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 2,
            "is_elite": false,
            "naa": 9832716.56758812,
            "score": 990989.0115031184
        },
        {
            "cid": "20_31",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2171819808,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 9734138.237013392,
            "score": 1103258.6898305933
        },
        {
            "cid": "20_32",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 9803769.966884742,
            "score": 969002.861723482
        },
        {
            "cid": "20_33",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3458191753,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 9697420.8154272,
            "score": 1175762.1846048152
        },
        {
            "cid": "20_34",
            "identity": null,
            "NSGA-II_crowding_distance": 0.6300369067,
            "NSGA-II_rank": 8,
            "is_elite": false,
            "naa": 9543082.98492069,
            "score": 1188655.1887386008
        },
        {
            "cid": "20_35",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 9823769.742585452,
            "score": 1112609.593098908
        },
        {
            "cid": "20_36",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 10,
            "is_elite": false,
            "naa": 9451753.246491857,
            "score": 1187778.6290451558
        },
        {
            "cid": "20_37",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3291299287,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 9661857.132413248,
            "score": 1183327.9477790424
        },
        {
            "cid": "20_38",
            "identity": null,
            "NSGA-II_crowding_distance": 0.8906385348,
            "NSGA-II_rank": 11,
            "is_elite": false,
            "naa": 9530742.66919167,
            "score": 1157440.992659286
        },
        {
            "cid": "20_39",
            "identity": null,
            "NSGA-II_crowding_distance": 0.4367210175,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 9723169.915810306,
            "score": 1156142.676681796
        },
        {
            "cid": "20_40",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2751805935,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 9716024.093317242,
            "score": 1170343.983523006
        },
        {
            "cid": "20_41",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 8,
            "is_elite": false,
            "naa": 9533764.852262836,
            "score": 1188788.7836695963
        },
        {
            "cid": "20_42",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2424125756,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 9675903.46848281,
            "score": 1191225.3327417849
        },
        {
            "cid": "20_43",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 9715036.010792814,
            "score": 1044085.8684907572
        },
        {
            "cid": "20_44",
            "identity": null,
            "NSGA-II_crowding_distance": 0.7049126693,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 9740701.280797262,
            "score": 1093607.7248884928
        },
        {
            "cid": "20_45",
            "identity": null,
            "NSGA-II_crowding_distance": 1.4490119911,
            "NSGA-II_rank": 8,
            "is_elite": false,
            "naa": 9551764.97041864,
            "score": 1168454.686665595
        },
        {
            "cid": "20_46",
            "identity": null,
            "NSGA-II_crowding_distance": 0.7045614067,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 9760336.606208954,
            "score": 1111766.6364630084
        },
        {
            "cid": "20_47",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 12,
            "is_elite": false,
            "naa": 9647818.309984395,
            "score": 1108402.31544505
        },
        {
            "cid": "20_48",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1341395347,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 9631737.167064913,
            "score": 1194568.0018422166
        },
        {
            "cid": "20_49",
            "identity": null,
            "NSGA-II_crowding_distance": 0.4478272747,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 9732416.07910822,
            "score": 1206174.097341858
        },
        {
            "cid": "20_50",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3959714262,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 9787127.15510764,
            "score": 1066615.9302371864
        },
        {
            "cid": "20_51",
            "identity": null,
            "NSGA-II_crowding_distance": 0.4036258276,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 9700789.610375486,
            "score": 1201403.0548078362
        },
        {
            "cid": "20_52",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1648527875,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 9718653.898342708,
            "score": 1181506.7180429262
        },
        {
            "cid": "20_53",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 13,
            "is_elite": false,
            "naa": 9500394.16432604,
            "score": 1147322.0567199131
        },
        {
            "cid": "20_54",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 9573771.172865609,
            "score": 1201047.6389756894
        },
        {
            "cid": "20_55",
            "identity": null,
            "NSGA-II_crowding_distance": 1.0454563764,
            "NSGA-II_rank": 8,
            "is_elite": false,
            "naa": 9691446.211782698,
            "score": 1166051.6163344549
        },
        {
            "cid": "20_56",
            "identity": null,
            "NSGA-II_crowding_distance": 0.5008493708,
            "NSGA-II_rank": 11,
            "is_elite": false,
            "naa": 9667386.110879922,
            "score": 1059057.719420704
        },
        {
            "cid": "20_57",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 13,
            "is_elite": false,
            "naa": 9644285.792821346,
            "score": 1049412.2013309672
        },
        {
            "cid": "20_58",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3101893996,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 9693371.84713637,
            "score": 1166152.4800823524
        },
        {
            "cid": "20_59",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 11,
            "is_elite": false,
            "naa": 9687152.219311949,
            "score": 1043122.0712576224
        },
        {
            "cid": "20_60",
            "identity": null,
            "NSGA-II_crowding_distance": 0.8674919811,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 9709969.890799165,
            "score": 1161074.0575539295
        },
        {
            "cid": "20_61",
            "identity": null,
            "NSGA-II_crowding_distance": 0.1488472497,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 9616715.890188435,
            "score": 1198740.3378981675
        },
        {
            "cid": "20_62",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 9762851.511775536,
            "score": 982253.4297229236
        },
        {
            "cid": "20_63",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3245067169,
            "NSGA-II_rank": 8,
            "is_elite": false,
            "naa": 9703196.803673156,
            "score": 1153940.2588878542
        },
        {
            "cid": "20_64",
            "identity": null,
            "NSGA-II_crowding_distance": 1.2260372462,
            "NSGA-II_rank": 12,
            "is_elite": false,
            "naa": 9592403.54430208,
            "score": 1149383.2128548503
        },
        {
            "cid": "20_65",
            "identity": null,
            "NSGA-II_crowding_distance": 0.444278971,
            "NSGA-II_rank": 11,
            "is_elite": false,
            "naa": 9638774.42850735,
            "score": 1148973.4420389167
        },
        {
            "cid": "20_66",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 2,
            "is_elite": false,
            "naa": 9664714.950563628,
            "score": 1210896.1470429103
        },
        {
            "cid": "20_67",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 14,
            "is_elite": false,
            "naa": 9461172.30891782,
            "score": 1145674.455015289
        },
        {
            "cid": "20_68",
            "identity": null,
            "NSGA-II_crowding_distance": 2.0,
            "NSGA-II_rank": 14,
            "is_elite": false,
            "naa": 9476409.78475554,
            "score": 1129260.4449319378
        },
        {
            "cid": "20_69",
            "identity": null,
            "NSGA-II_crowding_distance": 1.1546864134,
            "NSGA-II_rank": 13,
            "is_elite": false,
            "naa": 9553302.637106815,
            "score": 1145441.195085635
        },
        {
            "cid": "20_70",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 8,
            "is_elite": false,
            "naa": 9705210.67406823,
            "score": 1150060.6213622573
        },
        {
            "cid": "20_71",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3396769561,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 9570890.53219181,
            "score": 1193291.9512075626
        },
        {
            "cid": "20_72",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 9810880.991674358,
            "score": 1034646.530986499
        },
        {
            "cid": "20_73",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 9458172.067866446,
            "score": 1199951.870896697
        },
        {
            "cid": "20_74",
            "identity": null,
            "NSGA-II_crowding_distance": 0.5018000784,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 9781647.74043212,
            "score": 1080965.8038356963
        },
        {
            "cid": "20_75",
            "identity": null,
            "NSGA-II_crowding_distance": 0.4382440565,
            "NSGA-II_rank": 11,
            "is_elite": false,
            "naa": 9660911.988931175,
            "score": 1090977.4450894992
        },
        {
            "cid": "20_76",
            "identity": null,
            "NSGA-II_crowding_distance": 0.5543571232,
            "NSGA-II_rank": 11,
            "is_elite": false,
            "naa": 9658886.627888853,
            "score": 1111459.6504554648
        },
        {
            "cid": "20_77",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 9508874.3889768,
            "score": 1205110.845484967
        },
        {
            "cid": "20_78",
            "identity": null,
            "NSGA-II_crowding_distance": 0.7577224622,
            "NSGA-II_rank": 9,
            "is_elite": false,
            "naa": 9694333.774505144,
            "score": 1156961.0435413665
        },
        {
            "cid": "20_79",
            "identity": null,
            "NSGA-II_crowding_distance": 0.9281636555,
            "NSGA-II_rank": 2,
            "is_elite": false,
            "naa": 9778619.239303809,
            "score": 1208267.3641722556
        },
        {
            "cid": "20_80",
            "identity": null,
            "NSGA-II_crowding_distance": 0.9435676751,
            "NSGA-II_rank": 10,
            "is_elite": false,
            "naa": 9689577.91733932,
            "score": 1145512.3963593082
        },
        {
            "cid": "20_81",
            "identity": null,
            "NSGA-II_crowding_distance": 0.6559707883,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 9755223.137115704,
            "score": 1190613.7657365834
        },
        {
            "cid": "20_82",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3650623725,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 9528620.801078629,
            "score": 1199055.0148783703
        },
        {
            "cid": "20_83",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 14,
            "is_elite": false,
            "naa": 9637035.344982136,
            "score": 1030274.9406595028
        },
        {
            "cid": "20_84",
            "identity": null,
            "NSGA-II_crowding_distance": 1.1454348735,
            "NSGA-II_rank": 9,
            "is_elite": false,
            "naa": 9640980.122451017,
            "score": 1165867.6002450606
        },
        {
            "cid": "20_85",
            "identity": null,
            "NSGA-II_crowding_distance": 0.5128122616,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 9658500.39188811,
            "score": 1178190.1545944975
        },
        {
            "cid": "20_86",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 10,
            "is_elite": false,
            "naa": 9691845.93902818,
            "score": 998037.7257488492
        },
        {
            "cid": "20_87",
            "identity": null,
            "NSGA-II_crowding_distance": 0.2503865098,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 9717994.864525776,
            "score": 1114851.167654385
        },
        {
            "cid": "20_88",
            "identity": null,
            "NSGA-II_crowding_distance": 0.4555348114,
            "NSGA-II_rank": 12,
            "is_elite": false,
            "naa": 9602633.447452553,
            "score": 1138983.9559464671
        },
        {
            "cid": "20_89",
            "identity": null,
            "NSGA-II_crowding_distance": 0.4379645752,
            "NSGA-II_rank": 7,
            "is_elite": false,
            "naa": 9587260.216996577,
            "score": 1181693.5427740607
        },
        {
            "cid": "20_90",
            "identity": null,
            "NSGA-II_crowding_distance": 0.186129763,
            "NSGA-II_rank": 5,
            "is_elite": false,
            "naa": 9708683.082547585,
            "score": 1183466.8607970271
        },
        {
            "cid": "20_91",
            "identity": null,
            "NSGA-II_crowding_distance": 0.8884318421,
            "NSGA-II_rank": 10,
            "is_elite": false,
            "naa": 9669436.773612488,
            "score": 1159361.5514799105
        },
        {
            "cid": "20_92",
            "identity": null,
            "NSGA-II_crowding_distance": 1.3100507481,
            "NSGA-II_rank": 2,
            "is_elite": false,
            "naa": 9829328.18131156,
            "score": 1192209.5242976027
        },
        {
            "cid": "20_93",
            "identity": null,
            "NSGA-II_crowding_distance": 0.3785717077,
            "NSGA-II_rank": 9,
            "is_elite": false,
            "naa": 9681628.194629405,
            "score": 1161842.2531593556
        },
        {
            "cid": "20_94",
            "identity": null,
            "NSGA-II_crowding_distance": 0.381265621,
            "NSGA-II_rank": 8,
            "is_elite": false,
            "naa": 9696506.20049935,
            "score": 1160661.903144581
        },
        {
            "cid": "20_95",
            "identity": null,
            "NSGA-II_crowding_distance": null,
            "NSGA-II_rank": 4,
            "is_elite": false,
            "naa": 9580419.382261552,
            "score": 1206757.2140238064
        },
        {
            "cid": "20_96",
            "identity": null,
            "NSGA-II_crowding_distance": 0.5930260948,
            "NSGA-II_rank": 3,
            "is_elite": false,
            "naa": 9763015.342217796,
            "score": 1201743.761515026
        },
        {
            "cid": "20_97",
            "identity": null,
            "NSGA-II_crowding_distance": 0.546853186,
            "NSGA-II_rank": 6,
            "is_elite": false,
            "naa": 9642150.809585184,
            "score": 1183818.250500067
        },
        {
            "cid": "20_98",
            "identity": null,
            "NSGA-II_crowding_distance": 1.613093193,
            "NSGA-II_rank": 13,
            "is_elite": false,
            "naa": 9611412.940782676,
            "score": 1109808.6750636722
        },
        {
            "cid": "20_99",
            "identity": null,
            "NSGA-II_crowding_distance": 0.7739627538,
            "NSGA-II_rank": 12,
            "is_elite": false,
            "naa": 9617497.72216598,
            "score": 1130912.978666311
        },
        {
            "cid": "20_100",
            "identity": null,
            "NSGA-II_crowding_distance": 0.6899492519,
            "NSGA-II_rank": 2,
            "is_elite": false,
            "naa": 9687274.097364502,
            "score": 1210376.4421263388
        }
    ]
}
