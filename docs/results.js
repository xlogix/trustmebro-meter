window.TRUSTMEBRO_RESULTS = {
  "generated_at": "2026-06-01T16:20:00Z",
  "models": {
    "glm-4.5-air": {
      "n_trials": 3,
      "n_patch_applied": 3,
      "pass_rate": 0,
      "avg_dimension": {
        "behavioral_coverage": 0,
        "integration": 1,
        "error_path": 0,
        "test_honesty": 1,
        "stubs_left": 1
      },
      "total_gaps": 0,
      "gaps_per_trial": 0,
      "avg_cost_usd": 2.053498333333334
    },
    "glm-4.6": {
      "n_trials": 1,
      "n_patch_applied": 1,
      "pass_rate": 0,
      "avg_dimension": {
        "behavioral_coverage": 0,
        "integration": 1,
        "error_path": 0,
        "test_honesty": 1,
        "stubs_left": 1
      },
      "total_gaps": 0,
      "gaps_per_trial": 0,
      "avg_cost_usd": 8.0276
    },
    "oracle-gold": {
      "n_trials": 1,
      "n_patch_applied": 1,
      "pass_rate": 1,
      "avg_dimension": {
        "behavioral_coverage": 1,
        "integration": 1,
        "error_path": 0,
        "test_honesty": 1,
        "stubs_left": 1
      },
      "total_gaps": 0,
      "gaps_per_trial": 0,
      "avg_cost_usd": null
    }
  },
  "records": [
    {
      "task_id": "arktype-json-schema-refs-dependencies",
      "language": "typescript",
      "model": "glm-4.5-air",
      "reward": 0,
      "patch_applied": true,
      "added_lines": 0,
      "prod_added_lines": 0,
      "gave_up": true,
      "binaryPass": false,
      "dimensions": {
        "behavioral_coverage": {
          "score": 0,
          "evaluated": true,
          "findingsCount": 0
        },
        "integration": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        },
        "error_path": {
          "score": 0,
          "evaluated": false,
          "findingsCount": 0
        },
        "test_honesty": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        },
        "stubs_left": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        }
      },
      "gaps": [],
      "tokens": {
        "input": 98428,
        "output": 1650,
        "cache": 96001
      },
      "cost_usd": 0.1013855
    },
    {
      "task_id": "cliffy-config-file-parsing",
      "language": "typescript",
      "model": "glm-4.5-air",
      "reward": 0,
      "patch_applied": true,
      "added_lines": 0,
      "prod_added_lines": 0,
      "gave_up": true,
      "binaryPass": false,
      "dimensions": {
        "behavioral_coverage": {
          "score": 0,
          "evaluated": true,
          "findingsCount": 0
        },
        "integration": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        },
        "error_path": {
          "score": 0,
          "evaluated": false,
          "findingsCount": 0
        },
        "test_honesty": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        },
        "stubs_left": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        }
      },
      "gaps": [],
      "tokens": {
        "input": 32137,
        "output": 1095,
        "cache": 67
      },
      "cost_usd": 0.1877585
    },
    {
      "task_id": "drizzle-orm-window-function-builders",
      "language": "typescript",
      "model": "glm-4.5-air",
      "reward": 0,
      "patch_applied": true,
      "added_lines": 795,
      "prod_added_lines": 795,
      "gave_up": false,
      "binaryPass": false,
      "dimensions": {
        "behavioral_coverage": {
          "score": 0,
          "evaluated": true,
          "findingsCount": 0
        },
        "integration": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        },
        "error_path": {
          "score": 0,
          "evaluated": false,
          "findingsCount": 0
        },
        "test_honesty": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        },
        "stubs_left": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        }
      },
      "gaps": [],
      "tokens": {
        "input": 7033844,
        "output": 32846,
        "cache": 6898388
      },
      "cost_usd": 5.871351000000002
    },
    {
      "task_id": "awilix-async-container-initialization",
      "language": "typescript",
      "model": "glm-4.6",
      "reward": 0,
      "patch_applied": true,
      "added_lines": 1140,
      "prod_added_lines": 543,
      "gave_up": false,
      "binaryPass": false,
      "dimensions": {
        "behavioral_coverage": {
          "score": 0,
          "evaluated": true,
          "findingsCount": 0
        },
        "integration": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        },
        "error_path": {
          "score": 0,
          "evaluated": false,
          "findingsCount": 0
        },
        "test_honesty": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        },
        "stubs_left": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        }
      },
      "gaps": [],
      "tokens": {
        "input": 12967099,
        "output": 46257,
        "cache": 12880960
      },
      "cost_usd": 8.0276
    },
    {
      "task_id": "awilix-async-container-initialization",
      "language": "typescript",
      "model": "oracle-gold",
      "reward": 1,
      "patch_applied": true,
      "added_lines": 575,
      "prod_added_lines": 575,
      "gave_up": false,
      "binaryPass": true,
      "dimensions": {
        "behavioral_coverage": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        },
        "integration": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        },
        "error_path": {
          "score": 0,
          "evaluated": false,
          "findingsCount": 0
        },
        "test_honesty": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        },
        "stubs_left": {
          "score": 1,
          "evaluated": true,
          "findingsCount": 0
        }
      },
      "gaps": [],
      "tokens": {
        "input": null,
        "output": null,
        "cache": null
      },
      "cost_usd": null
    }
  ]
};
