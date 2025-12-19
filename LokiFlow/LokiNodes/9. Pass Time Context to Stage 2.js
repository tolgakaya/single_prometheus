// Pass Time Context to Stage 2 - HANDLE MULTIPLE ITEMS
const inputs = $input.all();

console.log("=== PASS TO STAGE 2 ===");
console.log("Total inputs:", inputs.length);

const results = [];

// Process each item separately
for (const input of inputs) {
  const data = input.json;
  
  // Extract info based on item type
  const stage1Result = data.output || data.stage1_result || data;
  const anomalyScores = data.anomaly_analysis?.anomaly_scores || 
                        data.anomaly_scores || {
    moving_average: 0,
    std_deviation: 0,
    rate_change: 0,
    spike_ratio: 0
  };
  
  // CRITICAL: Send ONLY summary data to Stage 2, not raw logs
  // This prevents token overflow (Stage 1 + Anomaly raw data can be 200K+ tokens)
  results.push({
    json: {
      // Preserve metadata and context (small)
      metadata: data.metadata,
      context: data.context,
      timeRange: data.timeRange || data.context?.timeRange,

      // Stage results SUMMARY ONLY (no raw logs)
      stageResults: {
        stage1: {
          stage: data.stageResults?.stage1?.stage || "health_snapshot",
          status: data.stageResults?.stage1?.status || stage1Result.status,
          metrics: data.stageResults?.stage1?.metrics || stage1Result.metrics || {},
          critical_errors: data.stageResults?.stage1?.critical_errors?.slice(0, 5) || [], // Top 5 only
          affected_services: data.stageResults?.stage1?.affected_services?.slice(0, 10) || [], // Top 10 only
          quick_summary: data.stageResults?.stage1?.quick_summary || "",
          proceed_to_anomaly: data.stageResults?.stage1?.proceed_to_anomaly || false
        },
        stage1_5_anomaly: data.stageResults?.stage1_5_anomaly || {
          performed: data.anomaly_check_performed || false,
          anomaly_scores: anomalyScores,
          anomaly_summary: data.anomaly_analysis?.anomaly_summary || "",
          proceed_to_stage2: data.proceed_to_stage2 !== false
        }
      },

      // Legacy fields for prompt compatibility (SUMMARY ONLY)
      stage1_status: stage1Result.status,
      anomaly_scores: anomalyScores,
      anomaly_check_performed: data.anomaly_check_performed || false,
      proceed_to_stage2: data.proceed_to_stage2 !== false,
      _item_branch: data._branch || "unknown"
    }
  });
}

return results;