// Preserve Context After Stage 2 - Fixed to restore metadata/context from Node 9
const inputs = $input.all();
const results = [];

console.log("=== PRESERVE CONTEXT AFTER STAGE 2 (Fixed) ===");
console.log("Total inputs:", inputs.length);

for (const input of inputs) {
  const data = input.json;

  console.log("Input structure from Stage 2 AI:", {
    hasMetadata: !!data.metadata,
    hasContext: !!data.context,
    hasStageResults: !!data.stageResults,
    hasOutput: !!data.output,
    outputStage: data.output?.stage
  });

  // CRITICAL FIX: AI Agent only returns 'output', but we need metadata/context from Node 9
  // Solution: Access Node 9 output directly via $('Pass Time Context to Stage 2')
  const contextData = $('Pass Time Context to Stage 2').first().json;

  console.log("Context from Node 9:", {
    hasMetadata: !!contextData.metadata,
    hasContext: !!contextData.context,
    hasStageResults: !!contextData.stageResults,
    analysisId: contextData.metadata?.analysisId
  });

  // Get Stage 2 result from output (AI agent response)
  const stage2Result = data.output && data.output.stage === "pattern_analysis"
    ? data.output
    : null;

  if (stage2Result) {
    // Stage 2 was executed - merge with context from Node 9
    results.push({
      json: {
        // Restore metadata and context from Node 9 (lost in AI Agent output)
        metadata: contextData.metadata,
        context: contextData.context,
        timeRange: contextData.timeRange,

        // Preserve stageResults from Node 9 and add Stage 2
        stageResults: {
          ...contextData.stageResults,  // stage1, stage1_5_anomaly from Node 9
          stage2: {
            stage: "pattern_analysis",
            execution_time: stage2Result.execution_time,
            patterns_identified: stage2Result.patterns_identified,
            correlations: stage2Result.correlations,
            user_impact: stage2Result.user_impact,
            confidence_score: stage2Result.confidence_score,
            tools_executed: stage2Result.tools_executed,
            anomaly_context: stage2Result.anomaly_context,
            proceed_to_stage3: stage2Result.proceed_to_stage3
          }
        },

        // Preserve enrichments if they exist
        enrichments: data.enrichments || contextData.enrichments,

        // Legacy fields for compatibility
        output: stage2Result,
        stage2_output: stage2Result,
        proceed_to_stage3: stage2Result.proceed_to_stage3,

        // Pass through any other fields from AI output
        ...(data.cascadeDetected !== undefined && { cascadeDetected: data.cascadeDetected }),
        ...(data.cascadeAnalysis && { cascadeAnalysis: data.cascadeAnalysis }),
        ...(data.serviceImpact && { serviceImpact: data.serviceImpact })
      }
    });
  } else {
    // No Stage 2 result - restore context anyway
    console.log("WARNING: No Stage 2 result found, restoring context from Node 9");
    results.push({
      json: {
        metadata: contextData.metadata,
        context: contextData.context,
        timeRange: contextData.timeRange,
        stageResults: contextData.stageResults,
        _warning: "Stage 2 result not found"
      }
    });
  }
}

console.log(`=== Preserved context for ${results.length} items ===`);
console.log("✅ metadata and context restored from Node 9");
return results;