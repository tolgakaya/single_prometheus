// Combine All Stages - Clean Version
const inputs = $input.all();

console.log("=== COMBINE ALL STAGES DEBUG ===");
console.log("Total inputs:", inputs.length);
inputs.forEach((input, i) => {
  console.log(`Input ${i}:`, {
    hasOutput: !!input.json.output,
    outputStage: input.json.output?.stage,
    hasStage1HealthCheck: !!input.json.stage1_health_check,
    hasStage2Pattern: !!input.json.stage2_pattern_analysis,
    hasTimeRange: !!input.json.timeRange,
    keys: Object.keys(input.json).slice(0, 10)
  });
});

// Find different data sources
let stage3Result = null;
let fullContextData = null;

for (const input of inputs) {
  const data = input.json;
  
  // Stage 3 result
  if (data.output?.stage === "root_cause_analysis" || data.stage === "root_cause_analysis") {
    stage3Result = data.output || data;
  }
  
  // Full context data (from Cascade Failure Detector via Pass Time Context to Stage 3)
  if (data.stage1_health_check || data.stage2_pattern_analysis || (data.timeRange && data.priority)) {
    fullContextData = data;
  }
}

// If no full context found, try to get from node directly
if (!fullContextData) {
  try {
    // Try to get data from Cascade Failure Detector node
    fullContextData = $node["Cascade Failure Detector"].json;
    console.log("Got context from Cascade Failure Detector node");
  } catch (e) {
    console.log("Could not get context from Cascade Failure Detector");
  }
}

// Build final output
const finalData = {
  // Use full context as base
  ...(fullContextData || {}),
  
  // Override with stage results
  stage1: fullContextData?.stage1_health_check || fullContextData?.stage1 || null,
  stage2: fullContextData?.stage2_pattern_analysis || fullContextData?.stage2 || null,
  stage3: stage3Result,
  
  // Ensure context is preserved
  timeRange: fullContextData?.timeRange || {},
  analysisId: fullContextData?.analysisId || "unknown",
  priority: fullContextData?.priority || "normal",
  forceDeepAnalysis: fullContextData?.forceDeepAnalysis || false,
  
  // Add cascade analysis if available
  cascadeAnalysis: fullContextData?.cascadeAnalysis || null,
  
  // Debug info
  _debug: {
    hadStage3Result: !!stage3Result,
    hadFullContext: !!fullContextData,
    inputCount: inputs.length
  }
};

return [{ json: finalData }];