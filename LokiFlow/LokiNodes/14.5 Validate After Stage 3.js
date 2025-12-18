// Validate After Stage 3 - Final Data Integrity Check
const input = $input.first().json;

console.log("=== VALIDATE AFTER STAGE 3 (FINAL) ===");

const errors = [];
const warnings = [];

// Check metadata (should still exist)
if (!input.metadata || !input.metadata.analysisId) {
  errors.push("CRITICAL: metadata.analysisId lost at final stage");
}

// Check context (should still exist)
if (!input.context || !input.context.timeRange) {
  errors.push("CRITICAL: context.timeRange lost at final stage");
}

// CRITICAL: Check stageResults section - should have ALL stages
if (!input.stageResults) {
  errors.push("CRITICAL: stageResults section lost");
} else {
  // Verify ALL previous stages are still present
  if (!input.stageResults.stage1) {
    errors.push("CRITICAL: stageResults.stage1 lost at final stage");
  }

  if (!input.stageResults.stage1_5_anomaly) {
    warnings.push("stageResults.stage1_5_anomaly missing in final output");
  }

  if (!input.stageResults.stage2) {
    errors.push("CRITICAL: stageResults.stage2 lost at final stage");
  }

  // Check Stage 3 result (may be null if Stage 3 wasn't executed)
  if (input.stageResults.stage3) {
    const stage3 = input.stageResults.stage3;

    // Validate Stage 3 required fields
    if (!stage3.stage || stage3.stage !== "root_cause_analysis") {
      errors.push("CRITICAL: Invalid stage3.stage value");
    }

    if (!stage3.root_cause) {
      errors.push("CRITICAL: Missing stage3.root_cause");
    } else {
      if (!stage3.root_cause.component) {
        errors.push("Missing stage3.root_cause.component");
      }
      if (!stage3.root_cause.issue_type) {
        errors.push("Missing stage3.root_cause.issue_type");
      }
      if (!stage3.root_cause.evidence || stage3.root_cause.evidence.length === 0) {
        warnings.push("No evidence provided for root cause");
      }
      if (stage3.root_cause.confidence === undefined) {
        warnings.push("Missing root_cause.confidence score");
      }
    }

    if (!stage3.technical_details) {
      warnings.push("Missing stage3.technical_details");
    }

    if (!stage3.recommended_actions || stage3.recommended_actions.length === 0) {
      warnings.push("No recommended actions provided in Stage 3");
    }

    if (!stage3.tools_executed || stage3.tools_executed.length === 0) {
      warnings.push("No tools executed in Stage 3");
    }
  } else {
    // Stage 3 is null - verify this was intentional
    const shouldHaveStage3 = input.metadata?.proceed_to_stage3 ||
                            input.proceed_to_stage3 ||
                            input.stageResults.stage2?.proceed_to_stage3;

    if (shouldHaveStage3) {
      errors.push("CRITICAL: Stage 3 should have been executed but result is missing");
    } else {
      console.log("Stage 3 was not executed (proceed_to_stage3=false) - this is OK");
    }
  }
}

// Check enrichments section (should be fully populated)
if (!input.enrichments) {
  warnings.push("Missing enrichments section in final output");
} else {
  if (!input.enrichments.cascadeAnalysis) {
    warnings.push("Missing enrichments.cascadeAnalysis in final output");
  }
  if (!input.enrichments.serviceImpact) {
    warnings.push("Missing enrichments.serviceImpact in final output");
  }
  if (!input.enrichments.recommendation) {
    warnings.push("Missing enrichments.recommendation in final output");
  }
}

// Verify legacy compatibility fields are present
if (!input.analysisId) {
  warnings.push("Legacy field 'analysisId' missing (compatibility issue)");
}

if (!input.timeRange) {
  warnings.push("Legacy field 'timeRange' missing (compatibility issue)");
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
  throw new Error(`Stage 3 Final Validation Failed: ${errors.join(', ')}`);
}

console.log("✅ Stage 3 Final Validation PASSED");
console.log("✅ ALL STAGES VALIDATED SUCCESSFULLY");
console.log("=======================================\n");

// Pass data through with final validation metadata
return [{
  json: {
    ...input,
    _validation: {
      stage: "stage3_final",
      validated_at: new Date().toISOString(),
      errors: errors,
      warnings: warnings,
      passed: errors.length === 0,
      all_stages_validated: true
    }
  }
}];
