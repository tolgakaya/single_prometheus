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

console.log("=== COMBINE ALL STAGES (Standardized Structure) ===");

// With standardized structure, we just need to find the data and Stage 3 result
let contextData = null;
let stage3Result = null;

for (const input of inputs) {
  const data = input.json;

  // Look for context data (will have metadata and context sections)
  if (data.metadata || data.context) {
    contextData = data;
    console.log("Found context data with standardized structure");
  }

  // Look for Stage 3 result (AI agent response)
  if (data.output?.stage === "root_cause_analysis" || data.stage === "root_cause_analysis") {
    stage3Result = data.output || data;
    console.log("Found Stage 3 result");
  }
}

// If no context found, try to get from Cascade Failure Detector node
if (!contextData) {
  try {
    contextData = $node["Cascade Failure Detector"].json;
    console.log("Got context from Cascade Failure Detector node");
  } catch (e) {
    console.log("WARNING: Could not find context data");
  }
}

// Build final output with standardized structure
const finalData = {
  // Preserve ENTIRE standardized structure
  ...(contextData || {}),

  // Add Stage 3 result to stageResults if present
  stageResults: {
    ...(contextData?.stageResults || {}),
    stage3: stage3Result ? {
      stage: "root_cause_analysis",
      execution_time: stage3Result.execution_time,
      root_cause: stage3Result.root_cause,
      technical_details: stage3Result.technical_details,
      contributing_factors: stage3Result.contributing_factors,
      business_impact: stage3Result.business_impact,
      recommended_actions: stage3Result.recommended_actions,
      tools_executed: stage3Result.tools_executed
    } : null
  },

  // Legacy fields for compatibility
  stage1: contextData?.stageResults?.stage1 || contextData?.stage1_health_check || null,
  stage2: contextData?.stageResults?.stage2 || contextData?.stage2_pattern_analysis || null,
  stage3: stage3Result,
  output: stage3Result,  // Legacy field for final stage output

  // Debug info
  _debug: {
    hadStage3Result: !!stage3Result,
    hadContextData: !!contextData,
    hasStandardizedStructure: !!(contextData?.metadata && contextData?.context),
    inputCount: inputs.length
  }
};

return { json: finalData };