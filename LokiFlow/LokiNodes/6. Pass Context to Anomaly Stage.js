// Pass Context to Anomaly Stage - Standardized Structure Version
const input = $input.first().json;

console.log("=== PASS TO ANOMALY INPUT (Standardized) ===");
console.log("Has metadata?", input.metadata ? "YES" : "NO");
console.log("Has stageResults?", input.stageResults ? "YES" : "NO");
console.log("Has stageResults.stage1?", input.stageResults?.stage1 ? "YES" : "NO");

// Get Stage 1 result from standardized structure (with legacy fallback)
const stage1Result = input.stageResults?.stage1 || input.output || input;

// CRITICAL: Pass EVERYTHING to anomaly stage (preserve standardized structure)
return [{
  json: {
    // Preserve entire standardized structure
    ...input,

    // Mark that this needs anomaly check
    requireAnomalyCheck: true,

    // Stage 1 result reference for the anomaly agent prompt (both new and legacy)
    stage1_result: stage1Result,  // Legacy field for prompt compatibility

    // Ensure stageResults.stage1 is set
    stageResults: {
      ...input.stageResults,
      stage1: stage1Result
    }
  }
}];