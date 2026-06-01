window.TRUSTMEBRO_RESULTS = {
  "generated_at": "2026-06-01T00:00:00Z",
  "models": {
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
      "task_id": "awilix-async-container-initialization",
      "language": "typescript",
      "model": "oracle-gold",
      "reward": 1,
      "patch_applied": true,
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
