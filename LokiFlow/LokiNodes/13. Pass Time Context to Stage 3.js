// Pass Time Context to Stage 3 - Token-Optimized Version
const stage2Result = $input.first().json;
const prevData = $input.all()[0].json;

console.log("=== PASS TIME CONTEXT TO STAGE 3 ===");

// CRITICAL: Send SUMMARY ONLY to prevent token overflow
// DO NOT spread ...stage2Result (contains all Stage 2 raw logs)
// Stage 3 prompt only needs: timeRange, analysisId, context.source, patterns_identified, anomaly_context

// Extract Stage 2 AI output
const stage2Output = stage2Result.output || stage2Result;

// Get metadata and context from standardized structure
const metadata = prevData.metadata || {};
const context = prevData.context || {};
const stageResults = prevData.stageResults || {};

return {
  json: {
    // Preserve metadata and context (small)
    metadata: metadata,
    context: context,
    timeRange: prevData.timeRange || context.timeRange,

    // Stage results SUMMARY ONLY (no raw logs)
    stageResults: {
      stage1: stageResults.stage1 || {},
      stage1_5_anomaly: stageResults.stage1_5_anomaly || {},
      stage2: {
        stage: stage2Output.stage || "pattern_analysis",
        status: stage2Output.status || "completed",
        patterns_identified: stage2Output.patterns_identified || [],
        stage3_focus: stage2Output.stage3_focus || {},
        proceed_to_stage3: stage2Output.proceed_to_stage3 !== false,
        // NO raw pattern_details, NO raw cascade_timeline, NO raw thread_data
        summary: stage2Output.summary || ""
      }
    },

    // Legacy fields for prompt compatibility (SUMMARY ONLY)
    analysisId: metadata.analysisId || prevData.analysisId || 'unknown',
    stage1_status: prevData.stage1_status,
    stage2_pattern: stage2Output.stage3_focus || {},
    anomaly_context: prevData.anomaly_context || prevData.anomaly_scores || {},
    proceed_to_stage3: stage2Output.proceed_to_stage3 !== false,
    output: stage2Output // Keep Stage 2 output for prompt access
  }
};