// Combine All Stages - Fixed to restore metadata/context from Node 13
const inputs = $input.all();

console.log("=== COMBINE ALL STAGES (Fixed) ===");
console.log("Total inputs:", inputs.length);

for (const input of inputs) {
  const data = input.json;

  console.log("Input structure from Stage 3 AI:", {
    hasMetadata: !!data.metadata,
    hasContext: !!data.context,
    hasStageResults: !!data.stageResults,
    hasOutput: !!data.output,
    outputStage: data.output?.stage
  });

  // CRITICAL FIX: AI Agent only returns 'output', but we need metadata/context from Node 13
  // Solution: Access Node 13 output directly via $('Pass Time Context to Stage 3')
  const contextData = $('Pass Time Context to Stage 3').first().json;

  console.log("Context from Node 13:", {
    hasMetadata: !!contextData.metadata,
    hasContext: !!contextData.context,
    hasStageResults: !!contextData.stageResults,
    analysisId: contextData.metadata?.analysisId
  });

  // Get Stage 3 result from output (AI agent response)
  const stage3Result = data.output && data.output.stage === "root_cause_analysis"
    ? data.output
    : null;

  if (!stage3Result) {
    console.log("WARNING: No Stage 3 result found, using context from Node 13");
    return {
      json: {
        metadata: contextData.metadata,
        context: contextData.context,
        timeRange: contextData.timeRange,
        stageResults: contextData.stageResults,
        _warning: "Stage 3 result not found"
      }
    };
  }

  console.log("✅ Stage 3 result found, combining with context from Node 13");

  // Build final output with standardized structure
  const finalData = {
    // Restore metadata and context from Node 13 (lost in AI Agent output)
    metadata: contextData.metadata,
    context: contextData.context,
    timeRange: contextData.timeRange,

    // Preserve ALL stageResults from Node 13 and add Stage 3
    stageResults: {
      ...contextData.stageResults,  // stage1, stage1_5_anomaly, stage2 from Node 13
      stage3: {
        stage: "root_cause_analysis",
        execution_time: stage3Result.execution_time,
        root_cause: stage3Result.root_cause,
        technical_details: stage3Result.technical_details,
        contributing_factors: stage3Result.contributing_factors,
        business_impact: stage3Result.business_impact,
        recommended_actions: stage3Result.recommended_actions,
        tools_executed: stage3Result.tools_executed,
        confidence_score: stage3Result.confidence_score,
        severity: stage3Result.severity
      }
    },

    // Preserve enrichments if they exist
    enrichments: data.enrichments || contextData.enrichments,

    // Legacy fields for compatibility
    stage1: contextData.stageResults?.stage1 || null,
    stage2: contextData.stageResults?.stage2 || null,
    stage3: stage3Result,
    output: stage3Result,  // Legacy field for final stage output

    // Debug info
    _debug: {
      hadStage3Result: !!stage3Result,
      hadContextData: !!contextData,
      hasStandardizedStructure: !!(contextData?.metadata && contextData?.context),
      inputCount: inputs.length,
      restoredFromNode13: true
    }
  };

  console.log("=== Final data structure ===", {
    hasMetadata: !!finalData.metadata,
    hasContext: !!finalData.context,
    hasStageResults: !!finalData.stageResults,
    stageResultsKeys: Object.keys(finalData.stageResults),
    analysisId: finalData.metadata?.analysisId
  });

  console.log("✅ metadata and context restored from Node 13");
  return { json: finalData };
}

// Fallback if no inputs (should never happen)
console.log("ERROR: No inputs found");
return {
  json: {
    _error: "No inputs found in Combine All Stages"
  }
};
