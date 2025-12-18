// Validate After Stage 1 - Data Integrity Check
const input = $input.first().json;

console.log("=== VALIDATE AFTER STAGE 1 ===");

const errors = [];
const warnings = [];

// CRITICAL: Check metadata section
if (!input.metadata) {
  errors.push("CRITICAL: Missing metadata section");
} else {
  if (!input.metadata.analysisId) {
    errors.push("CRITICAL: Missing metadata.analysisId");
  }
  if (!input.metadata.timestamp) {
    warnings.push("Missing metadata.timestamp");
  }
  if (!input.metadata.priority) {
    warnings.push("Missing metadata.priority");
  }
}

// CRITICAL: Check context section
if (!input.context) {
  errors.push("CRITICAL: Missing context section");
} else {
  if (!input.context.timeRange) {
    errors.push("CRITICAL: Missing context.timeRange");
  } else {
    if (!input.context.timeRange.startISO || !input.context.timeRange.endISO) {
      errors.push("CRITICAL: Missing timeRange ISO timestamps");
    }
  }
}

// CRITICAL: Check stageResults section
if (!input.stageResults) {
  errors.push("CRITICAL: Missing stageResults section");
} else {
  // Check Stage 1 result
  if (!input.stageResults.stage1) {
    errors.push("CRITICAL: Missing stageResults.stage1");
  } else {
    const stage1 = input.stageResults.stage1;

    // Validate Stage 1 required fields
    if (!stage1.stage || stage1.stage !== "health_snapshot") {
      errors.push("CRITICAL: Invalid stage1.stage value");
    }
    if (!stage1.status) {
      errors.push("CRITICAL: Missing stage1.status");
    }
    if (!stage1.metrics) {
      errors.push("CRITICAL: Missing stage1.metrics");
    } else {
      if (stage1.metrics.total_logs === undefined) {
        warnings.push("Missing stage1.metrics.total_logs");
      }
      if (stage1.metrics.error_count === undefined) {
        warnings.push("Missing stage1.metrics.error_count");
      }
    }
    if (!stage1.tools_executed || stage1.tools_executed.length === 0) {
      warnings.push("No tools executed in Stage 1");
    }
  }
}

// Check enrichments section exists (should be empty at this point)
if (!input.enrichments) {
  warnings.push("Missing enrichments section");
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
  throw new Error(`Stage 1 Validation Failed: ${errors.join(', ')}`);
}

console.log("✅ Stage 1 Validation PASSED");
console.log("=================================\n");

// Pass data through with validation metadata
return [{
  json: {
    ...input,
    _validation: {
      stage: "stage1",
      validated_at: new Date().toISOString(),
      errors: errors,
      warnings: warnings,
      passed: errors.length === 0
    }
  }
}];
