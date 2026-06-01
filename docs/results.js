window.TRUSTMEBRO_RESULTS = {
  "generated_at": "2026-06-01T21:00:00Z",
  "models": {
    "glm-4.5-air": {
      "n_trials": 9,
      "n_patch_applied": 9,
      "pass_rate": 0,
      "avg_dimension": {
        "behavioral_coverage": 0,
        "integration": 0.8888888888888888,
        "error_path": 0,
        "test_honesty": 0.9629629629629631,
        "stubs_left": 0.9629629629629631
      },
      "total_gaps": 8,
      "gaps_per_trial": 0.8888888888888888,
      "avg_cost_usd": 4.030166555555557
    },
    "glm-4.6": {
      "n_trials": 3,
      "n_patch_applied": 3,
      "pass_rate": 0,
      "avg_dimension": {
        "behavioral_coverage": 0,
        "integration": 0.3333333333333333,
        "error_path": 0,
        "test_honesty": 1,
        "stubs_left": 1
      },
      "total_gaps": 9,
      "gaps_per_trial": 3,
      "avg_cost_usd": 6.678346666666666
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
      "task_id": "clack-async-autocomplete-options",
      "language": "typescript",
      "model": "glm-4.5-air",
      "reward": 0,
      "patch_applied": true,
      "added_lines": 465,
      "prod_added_lines": 465,
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
        "input": 8583413,
        "output": 49277,
        "cache": 8522641
      },
      "cost_usd": 5.797105500000001
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
      "task_id": "dynamodb-toolbox-conditional-attribute-requirements",
      "language": "typescript",
      "model": "glm-4.5-air",
      "reward": 0,
      "patch_applied": true,
      "added_lines": 752,
      "prod_added_lines": 580,
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
          "score": 0.6666666666666667,
          "evaluated": true,
          "findingsCount": 1
        },
        "stubs_left": {
          "score": 0.6666666666666667,
          "evaluated": true,
          "findingsCount": 1
        }
      },
      "gaps": [
        {
          "rule": "leftover-stub",
          "file": "src/entity/actions/update/updateItemParams/updateItemParams.ts",
          "line": 58,
          "severity": "soft",
          "evidence": "* @debt type \"TODO: Rework extensions & not cast here (use `ParsedItem<ENTITY, { extension: UpdateItemExtension }>`)\""
        },
        {
          "rule": "skipped-tests",
          "file": "src/requiredIf.test.ts",
          "line": 154,
          "severity": "soft",
          "evidence": "test(...) has no assertion"
        }
      ],
      "tokens": {
        "input": 7146020,
        "output": 27225,
        "cache": 7020805
      },
      "cost_usd": 4.817102499999998
    },
    {
      "task_id": "effect-sse-httpapi-streaming",
      "language": "typescript",
      "model": "glm-4.5-air",
      "reward": 0,
      "patch_applied": true,
      "added_lines": 637,
      "prod_added_lines": 637,
      "gave_up": false,
      "binaryPass": false,
      "dimensions": {
        "behavioral_coverage": {
          "score": 0,
          "evaluated": true,
          "findingsCount": 0
        },
        "integration": {
          "score": 0,
          "evaluated": true,
          "findingsCount": 6
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
      "gaps": [
        {
          "rule": "unwired-export",
          "file": "packages/platform/src/HttpApiSSE.ts",
          "line": 36,
          "severity": "soft",
          "evidence": "export \"formatMessage\" is referenced nowhere else in the workspace"
        },
        {
          "rule": "unwired-export",
          "file": "packages/platform/src/HttpApiSSE.ts",
          "line": 58,
          "severity": "soft",
          "evidence": "export \"formatDataMessage\" is referenced nowhere else in the workspace"
        },
        {
          "rule": "unwired-export",
          "file": "packages/platform/src/HttpApiSSE.ts",
          "line": 82,
          "severity": "soft",
          "evidence": "export \"makeUnionEventEncoder\" is referenced nowhere else in the workspace"
        },
        {
          "rule": "unwired-export",
          "file": "packages/platform/src/HttpApiSSE.ts",
          "line": 121,
          "severity": "soft",
          "evidence": "export \"makeEventDecoder\" is referenced nowhere else in the workspace"
        },
        {
          "rule": "unwired-export",
          "file": "packages/platform/src/HttpApiSSE.ts",
          "line": 135,
          "severity": "soft",
          "evidence": "export \"makeUnionEventDecoder\" is referenced nowhere else in the workspace"
        },
        {
          "rule": "unwired-export",
          "file": "packages/platform/src/HttpApiSchema.ts",
          "line": 513,
          "severity": "soft",
          "evidence": "export \"getSSE\" is referenced nowhere else in the workspace"
        }
      ],
      "tokens": {
        "input": 6470973,
        "output": 22329,
        "cache": 6360664
      },
      "cost_usd": 4.290102
    },
    {
      "task_id": "eicrud-keyset-pagination-cursor",
      "language": "typescript",
      "model": "glm-4.5-air",
      "reward": 0,
      "patch_applied": true,
      "added_lines": 872,
      "prod_added_lines": 718,
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
        "input": 6809075,
        "output": 37320,
        "cache": 6677676
      },
      "cost_usd": 4.928833
    },
    {
      "task_id": "ink-grid-box-layout",
      "language": "typescript",
      "model": "glm-4.5-air",
      "reward": 0,
      "patch_applied": true,
      "added_lines": 165,
      "prod_added_lines": 165,
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
        "input": 11873757,
        "output": 37269,
        "cache": 11719558
      },
      "cost_usd": 7.5624990000000025
    },
    {
      "task_id": "kysely-window-grouping-helpers",
      "language": "typescript",
      "model": "glm-4.5-air",
      "reward": 0,
      "patch_applied": true,
      "added_lines": 1720,
      "prod_added_lines": 1720,
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
        "input": 951993,
        "output": 21957,
        "cache": 915154
      },
      "cost_usd": 2.715362
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
      "task_id": "effect-sse-httpapi-streaming",
      "language": "typescript",
      "model": "glm-4.6",
      "reward": 0,
      "patch_applied": true,
      "added_lines": 350,
      "prod_added_lines": 350,
      "gave_up": false,
      "binaryPass": false,
      "dimensions": {
        "behavioral_coverage": {
          "score": 0,
          "evaluated": true,
          "findingsCount": 0
        },
        "integration": {
          "score": 0,
          "evaluated": true,
          "findingsCount": 6
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
      "gaps": [
        {
          "rule": "unwired-export",
          "file": "packages/platform/src/HttpApiSSE.ts",
          "line": 27,
          "severity": "soft",
          "evidence": "export \"formatMessage\" is referenced nowhere else in the workspace"
        },
        {
          "rule": "unwired-export",
          "file": "packages/platform/src/HttpApiSSE.ts",
          "line": 53,
          "severity": "soft",
          "evidence": "export \"formatDataMessage\" is referenced nowhere else in the workspace"
        },
        {
          "rule": "unwired-export",
          "file": "packages/platform/src/HttpApiSSE.ts",
          "line": 104,
          "severity": "soft",
          "evidence": "export \"makeEventEncoder\" is referenced nowhere else in the workspace"
        },
        {
          "rule": "unwired-export",
          "file": "packages/platform/src/HttpApiSSE.ts",
          "line": 115,
          "severity": "soft",
          "evidence": "export \"makeUnionEventEncoder\" is referenced nowhere else in the workspace"
        },
        {
          "rule": "unwired-export",
          "file": "packages/platform/src/HttpApiSSE.ts",
          "line": 157,
          "severity": "soft",
          "evidence": "export \"makeEventDecoder\" is referenced nowhere else in the workspace"
        },
        {
          "rule": "unwired-export",
          "file": "packages/platform/src/HttpApiSSE.ts",
          "line": 168,
          "severity": "soft",
          "evidence": "export \"makeUnionEventDecoder\" is referenced nowhere else in the workspace"
        }
      ],
      "tokens": {
        "input": 8720789,
        "output": 26611,
        "cache": 8649664
      },
      "cost_usd": 5.345731999999999
    },
    {
      "task_id": "ink-grid-box-layout",
      "language": "typescript",
      "model": "glm-4.6",
      "reward": 0,
      "patch_applied": true,
      "added_lines": 674,
      "prod_added_lines": 529,
      "gave_up": false,
      "binaryPass": false,
      "dimensions": {
        "behavioral_coverage": {
          "score": 0,
          "evaluated": true,
          "findingsCount": 0
        },
        "integration": {
          "score": 0,
          "evaluated": true,
          "findingsCount": 3
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
      "gaps": [
        {
          "rule": "unwired-export",
          "file": "src/grid-layout.ts",
          "line": 67,
          "severity": "soft",
          "evidence": "export \"parseGridTemplate\" is referenced nowhere else in the workspace"
        },
        {
          "rule": "unwired-export",
          "file": "src/grid-layout.ts",
          "line": 81,
          "severity": "soft",
          "evidence": "export \"parseGridLine\" is referenced nowhere else in the workspace"
        },
        {
          "rule": "unwired-export",
          "file": "src/grid-layout.ts",
          "line": 202,
          "severity": "soft",
          "evidence": "export \"computeGridLayout\" is referenced nowhere else in the workspace"
        }
      ],
      "tokens": {
        "input": 9112689,
        "output": 41185,
        "cache": 9035200
      },
      "cost_usd": 6.661708000000002
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
