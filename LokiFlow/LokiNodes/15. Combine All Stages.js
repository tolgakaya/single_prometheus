// Combine All Stages - Final combination after Stage 3 preservation
const inputs = $input.all();

console.log("=== COMBINE ALL STAGES ===");
console.log("Total inputs:", inputs.length);

for (const input of inputs) {
  const data = input.json;

  console.log("Input structure:", {
    hasMetadata: !!data.metadata,
    hasContext: !!data.context,
    hasStageResults: !!data.stageResults,
    stageResultsKeys: data.stageResults ? Object.keys(data.stageResults) : []
  });

  // By this point, Node 14.1 should have already restored metadata/context
  // So we just need to pass through the data

  if (!data.metadata || !data.stageResults) {
    console.log("WARNING: Missing metadata or stageResults in input");
    return {
      json: {
        _error: "Missing required data in Combine All Stages",
        _input: data
      }
    };
  }

  console.log("✅ All data present, combining stages");

  // Build final output - everything should already be in standardized structure
  const finalData = {
    // Pass through standardized structure from Node 14.1
    metadata: data.metadata,
    context: data.context,
    timeRange: data.timeRange,
    stageResults: data.stageResults,
    enrichments: data.enrichments,

    // Legacy fields for compatibility
    stage1: data.stageResults?.stage1 || null,
    stage2: data.stageResults?.stage2 || null,
    stage3: data.stageResults?.stage3 || null,
    output: data.output || data.stageResults?.stage3,

    // Debug info
    _debug: {
      hasAllStages: !!(data.stageResults?.stage1 && data.stageResults?.stage2 && data.stageResults?.stage3),
      stageCount: data.stageResults ? Object.keys(data.stageResults).length : 0,
      analysisId: data.metadata?.analysisId
    }
  };

  console.log("=== Final data structure ===", {
    hasMetadata: !!finalData.metadata,
    hasContext: !!finalData.context,
    hasStageResults: !!finalData.stageResults,
    stageResultsKeys: Object.keys(finalData.stageResults),
    analysisId: finalData.metadata?.analysisId
  });

  return { json: finalData };
}

// Fallback if no inputs (should never happen)
console.log("ERROR: No inputs found");
return {
  json: {
    _error: "No inputs found in Combine All Stages"
  }
};
