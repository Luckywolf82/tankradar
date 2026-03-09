{
  "meta": {
    "status": "transitional",
    "generatedBy": "manual_seed",
    "timestamp": "2026-03-09T18:30:00Z",
    "note": "This file is machine-readable but not yet automatically written by audit functions."
  },
  "phase2_matching_engine": {
    "distance_tests": {
      "15m": { "signal": 30, "status": "CONFIRMED", "test_case": "Shell @ 15.01m" },
      "50m": { "signal": 20, "status": "INTEGRATION_CONFIRMED", "test_case": "implicit in multi-candidate" },
      "100m": { "signal": 10, "status": "CONFIRMED", "test_case": "Shell @ 100.38m" },
      "200m": { "signal": 5, "status": "INTEGRATION_CONFIRMED", "test_case": "implicit in multi-candidate" },
      ">300m": { "signal": 0, "status": "NOT_TESTED_NOT_BLOCKING", "test_case": null }
    },
    "auto_match_gate": {
      "status": "CONFIRMED_WORKING",
      "gate_1_score_threshold": 65,
      "gate_1_status": "PASS",
      "gate_2_dominance_gap_threshold": 10,
      "gate_2_status": "PASS"
    },
    "dominance_gap": {
      "status": "CONFIRMED_WORKING"
    },
    "chain_normalization": {
      "status": "CONFIRMED"
    },
    "name_similarity": {
      "status": "CONFIRMED"
    }
  },
  "catalog_state": {
    "trondheim_total_stations": 142,
    "duplicates_detected": true,
    "duplicates_classification": "data_quality_issue_not_matching_engine_defect",
    "exact_coordinate_duplicates": [
      {
        "name": "Coop Midt-Norge SA",
        "distance": "0m",
        "status": "EXACT_DUPLICATE"
      }
    ],
    "possible_near_duplicates": [
      {
        "name": "Uno-X Ladetorget",
        "distance": "~233m",
        "status": "POSSIBLE_NEAR_DUPLICATE"
      }
    ]
  },
  "locked_files_state": {
    "matchStationForUserReportedPrice": "UNCHANGED",
    "auditPhase2DominanceGap": "UNCHANGED",
    "getNearbyStationCandidates": "UNCHANGED",
    "validateDistanceBands": "UNCHANGED"
  }
}