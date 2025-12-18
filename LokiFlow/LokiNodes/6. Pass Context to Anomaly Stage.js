// Pass Context to Anomaly Stage - FINAL FIXED VERSION
const input = $input.first().json;

console.log("=== PASS TO ANOMALY INPUT ===");
console.log("Input keys:", Object.keys(input));
console.log("Has output?", input.output ? "YES" : "NO");
console.log("Has timeRange?", input.timeRange ? "YES" : "NO");

// CRITICAL: Pass EVERYTHING to anomaly stage
return [{
  json: {
    // Pass ALL input data as-is
    ...input,
    // Mark that this needs anomaly check
    requireAnomalyCheck: true,
    // Stage 1 result reference for the anomaly agent prompt
    stage1_result: input.output || input
  }
}];