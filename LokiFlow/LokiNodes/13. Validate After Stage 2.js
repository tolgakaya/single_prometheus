// Validate After Stage 2 - Data Integrity Check
const input = $input.first().json;

console.log("=== VALIDATE AFTER STAGE 2 ===");

const errors = [];
const warnings = [];

// Check metadata (should still exist)
if (!input.metadata || !input.metadata.analysisId) {
  errors.push("CRITICAL: metadata.analysisId lost after Stage 2");
}

// Check context (should still exist)
if (!input.context || !input.context.timeRange) {
  errors.push("CRITICAL: context.timeRange lost after Stage 2");
}

// Check service dependencies in context
if (!input.context.serviceDependencies) {
  warnings.push("Missing context.serviceDependencies - cascade detection may be limited");
}

// CRITICAL: Check stageResults section
if (!input.stageResults) {
  errors.push("CRITICAL: stageResults section lost");
} else {
  // Previous stages should still exist
  if (!input.stageResults.stage1) {
    errors.push("CRITICAL: stageResults.stage1 lost after Stage 2");
  }

  if (!input.stageResults.stage1_5_anomaly) {
    warnings.push("stageResults.stage1_5_anomaly missing (anomaly may have been skipped)");
  }

  // Check Stage 2 result
  if (!input.stageResults.stage2) {
    errors.push("CRITICAL: Missing stageResults.stage2");
  } else {
    const stage2 = input.stageResults.stage2;

    // Validate Stage 2 required fields
    if (!stage2.stage || stage2.stage !== "pattern_analysis") {
      errors.push("CRITICAL: Invalid stage2.stage value");
    }

    if (!stage2.patterns_identified) {
      errors.push("CRITICAL: Missing stage2.patterns_identified");
    } else {
      // Check for empty patterns (potential issue)
      const hasPatterns = stage2.patterns_identified.dominant_errors?.length > 0 ||
                         stage2.patterns_identified.cascade_path?.length > 0 ||
                         stage2.patterns_identified.affected_services?.length > 0;

      if (!hasPatterns) {
        warnings.push("No patterns identified in Stage 2");
      }
    }

    if (!stage2.correlations) {
      warnings.push("Missing stage2.correlations");
    }

    if (stage2.confidence_score === undefined) {
      warnings.push("Missing stage2.confidence_score");
    } else if (stage2.confidence_score === 0) {
      warnings.push("Stage 2 confidence score is 0 - verify actual analysis");
    }

    if (!stage2.tools_executed || stage2.tools_executed.length === 0) {
      warnings.push("No tools executed in Stage 2");
    } else if (stage2.tools_executed.length < 3) {
      warnings.push(`Only ${stage2.tools_executed.length}/3 required tools executed in Stage 2`);
    }

    if (stage2.proceed_to_stage3 === undefined) {
      errors.push("CRITICAL: Missing stage2.proceed_to_stage3 decision");
    }
  }
}

// Check enrichments section (should have cascade analysis by now)
if (!input.enrichments) {
  warnings.push("Missing enrichments section");
} else {
  if (!input.enrichments.cascadeAnalysis) {
    warnings.push("Missing enrichments.cascadeAnalysis from Cascade Failure Detector");
  }
  if (!input.enrichments.serviceImpact) {
    warnings.push("Missing enrichments.serviceImpact from Cascade Failure Detector");
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
  throw new Error(`Stage 2 Validation Failed: ${errors.join(', ')}`);
}

console.log("✅ Stage 2 Validation PASSED");
console.log("================================\n");

// Pass data through with validation metadata
return [{
  json: {
    ...input,
    _validation: {
      stage: "stage2",
      validated_at: new Date().toISOString(),
      errors: errors,
      warnings: warnings,
      passed: errors.length === 0
    }
  }
}];
