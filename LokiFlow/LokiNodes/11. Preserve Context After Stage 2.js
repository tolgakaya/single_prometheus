// Preserve Context After Stage 2 - Standardized Structure Version
const inputs = $input.all();
const results = [];

console.log("=== PRESERVE CONTEXT AFTER STAGE 2 (Standardized) ===");
console.log("Total inputs:", inputs.length);

for (const input of inputs) {
  const data = input.json;

  console.log("Input structure:", {
    hasMetadata: !!data.metadata,
    hasContext: !!data.context,
    hasStageResults: !!data.stageResults,
    hasOutput: !!data.output,
    outputStage: data.output?.stage
  });

  // With standardized structure, context is ALWAYS preserved in the data object
  // No need for complex fallback logic - it's all in the structure!

  // Get Stage 2 result from output (AI agent response)
  const stage2Result = data.output && data.output.stage === "pattern_analysis"
    ? data.output
    : null;
  
  if (stage2Result) {
    // Stage 2 was executed - add results to standardized structure
    results.push({
      json: {
        ...data,  // Preserve ENTIRE standardized structure (metadata, context, stageResults, enrichments)

        // Update stageResults.stage2 with Stage 2 output
        stageResults: {
          ...data.stageResults,
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

        // Legacy fields for compatibility
        output: stage2Result,
        stage2_output: stage2Result,
        proceed_to_stage3: stage2Result.proceed_to_stage3
      }
    });
  } else {
    // No Stage 2 result - just pass through with structure intact
    console.log("WARNING: No Stage 2 result found, passing through");
    results.push({
      json: {
        ...data,
        _warning: "Stage 2 result not found"
      }
    });
  }
}

console.log(`=== Preserved context for ${results.length} items ===`);
console.log("Standardized structure preserved - no complex fallback needed!");
return results;