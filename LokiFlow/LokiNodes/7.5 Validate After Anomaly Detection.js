// Validate After Anomaly Detection - Data Integrity Check
const input = $input.first().json;

console.log("=== VALIDATE AFTER ANOMALY DETECTION ===");

const errors = [];
const warnings = [];

// Check metadata (should still exist)
if (!input.metadata || !input.metadata.analysisId) {
  errors.push("CRITICAL: metadata.analysisId lost after anomaly detection");
}

// Check context (should still exist)
if (!input.context || !input.context.timeRange) {
  errors.push("CRITICAL: context.timeRange lost after anomaly detection");
}

// CRITICAL: Check stageResults section
if (!input.stageResults) {
  errors.push("CRITICAL: stageResults section lost");
} else {
  // Stage 1 should still exist
  if (!input.stageResults.stage1) {
    errors.push("CRITICAL: stageResults.stage1 lost after anomaly detection");
  }

  // Check Stage 1.5 (Anomaly Detection)
  if (!input.stageResults.stage1_5_anomaly) {
    errors.push("CRITICAL: Missing stageResults.stage1_5_anomaly");
  } else {
    const anomaly = input.stageResults.stage1_5_anomaly;

    // Check if performed
    if (anomaly.performed === undefined) {
      errors.push("CRITICAL: Missing stage1_5_anomaly.performed flag");
    }

    if (anomaly.performed === true) {
      // If performed, validate required fields
      if (!anomaly.anomaly_scores) {
        errors.push("CRITICAL: Missing stage1_5_anomaly.anomaly_scores");
      } else {
        // Validate all 4 scores exist
        const scores = anomaly.anomaly_scores;
        if (scores.moving_average === undefined) {
          errors.push("Missing anomaly_scores.moving_average");
        }
        if (scores.std_deviation === undefined) {
          errors.push("Missing anomaly_scores.std_deviation");
        }
        if (scores.rate_change === undefined) {
          errors.push("Missing anomaly_scores.rate_change");
        }
        if (scores.spike_ratio === undefined) {
          errors.push("Missing anomaly_scores.spike_ratio");
        }

        // Check if all scores are 0.0 (potential mock data)
        const allZero = Object.values(scores).every(s => s === 0 || s === 0.0);
        if (allZero) {
          warnings.push("All anomaly scores are 0.0 - verify actual calculation occurred");
        }
      }

      if (!anomaly.tools_executed || anomaly.tools_executed.length === 0) {
        warnings.push("No tools executed in Anomaly Detection");
      } else if (anomaly.tools_executed.length < 4) {
        warnings.push(`Only ${anomaly.tools_executed.length}/4 anomaly tools executed`);
      }
    } else if (anomaly.performed === false) {
      // If not performed, should have reason
      if (!anomaly.reason_skipped) {
        warnings.push("Anomaly detection skipped but no reason provided");
      }
    }
  }
}

// Log validation results
console.log("Validation Results:");
console.log("- Errors:", errors.length);
console.log("- Warnings:", warnings.length);

if (errors.length > 0) {
  console.log("\n❌ ERRORS:");
  errors.forEach(err => console.log("  - " + err));
}

if (warnings.length > 0) {
  console.log("\n⚠️ WARNINGS:");
  warnings.forEach(warn => console.log("  - " + warn));
}

// Throw error if critical validation failed
if (errors.length > 0) {
  throw new Error(`Anomaly Detection Validation Failed: ${errors.join(', ')}`);
}

console.log("✅ Anomaly Detection Validation PASSED");
console.log("==========================================\n");

// Pass data through with validation metadata
return {
  json: {
    ...input,
    _validation: {
      stage: "stage1_5_anomaly",
      validated_at: new Date().toISOString(),
      errors: errors,
      warnings: warnings,
      passed: errors.length === 0
    }
  }
};
