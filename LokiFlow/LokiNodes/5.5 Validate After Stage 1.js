// Validate After Stage 1 - Data Integrity Check
const input = $input.first().json;

console.log("=== VALIDATE AFTER STAGE 1 ===");

const errors = [];
const warnings = [];

// Detect if this is BEFORE or AFTER Stage 1 execution
const hasStage1Result = input.stageResults && input.stageResults.stage1;
const hasStage1Output = input.output && input.output.stage === "health_snapshot";

console.log("Stage 1 result exists:", hasStage1Result);
console.log("Stage 1 output exists:", hasStage1Output);

// CRITICAL: Check metadata section (should exist from Node 2)
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

// CRITICAL: Check context section (should exist from Node 2)
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

// CRITICAL: Check stageResults section (should exist from Node 2, but may be empty)
if (!input.stageResults) {
  errors.push("CRITICAL: Missing stageResults section");
} else {
  // Only validate Stage 1 result if it should exist (i.e., this node runs AFTER Stage 1 AI Agent)
  if (hasStage1Result || hasStage1Output) {
    const stage1 = input.stageResults.stage1 || input.output;

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
  } else {
    // Stage 1 hasn't executed yet - this validation node is positioned BEFORE Stage 1
    console.log("ℹ️ NOTE: Stage 1 result not found - this validation runs BEFORE Stage 1 AI Agent");
    console.log("ℹ️ RECOMMENDATION: Move this validation node AFTER Stage 1 AI Agent in workflow");
    warnings.push("Validation running before Stage 1 execution - only validating structure from Node 2");
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
