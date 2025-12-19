// Merge Anomaly Results - Clean Version
const inputs = $input.all();

console.log("=== MERGE ANOMALY RESULTS ===");
console.log("Total inputs:", inputs.length);

// Debug inputs
inputs.forEach((input, i) => {
  console.log(`Input ${i}:`, {
    hasOutput: !!input.json.output,
    outputStage: input.json.output?.stage,
    hasTimeRange: !!input.json.timeRange,
    requireAnomalyCheck: input.json.requireAnomalyCheck,
    branch: input.json._branch
  });
});

// Single input - probably from FALSE branch (no anomaly check performed)
if (inputs.length === 1) {
  const data = inputs[0].json;

  // Check for Stage 1 data in standardized structure or legacy location
  const hasStage1 = data.stageResults?.stage1 ||
                    data.stage1_result?.stage === "health_snapshot" ||
                    data.output?.stage === "health_snapshot";

  if (hasStage1) {
    return {
      json: {
        ...data,  // Preserve standardized structure

        // Update stageResults with stage1_5_anomaly showing it wasn't performed
        stageResults: {
          ...data.stageResults,
          stage1_5_anomaly: {
            performed: false,
            reason_skipped: "Conditions not met for anomaly check"
          }
        },

        // Legacy fields for compatibility
        anomaly_check_performed: false,
        anomaly_reason_skipped: "Conditions not met for anomaly check",
        _branch: "no_anomaly"
      }
    };
  }
}

// Multiple inputs - need to merge
const passContextItem = inputs.find(i => 
  i.json.requireAnomalyCheck === true && 
  i.json.timeRange && 
  (i.json.stage1_result?.stage === "health_snapshot" || i.json.output?.stage === "health_snapshot")
);

const anomalyResultItem = inputs.find(i => 
  i.json.output?.stage === "anomaly_detection" || 
  i.json.stage === "anomaly_detection"
);

if (passContextItem && anomalyResultItem) {
  const contextData = passContextItem.json;
  const anomalyData = anomalyResultItem.json.output || anomalyResultItem.json;

  // Check from standardized metadata or legacy fields
  const forceDeepAnalysis = contextData.metadata?.forceDeepAnalysis || contextData.forceDeepAnalysis;
  const priority = contextData.metadata?.priority || contextData.priority;

  const shouldProceed = forceDeepAnalysis ||
                       priority === 'critical' ||
                       anomalyData.proceed_to_stage2;

  return {
    json: {
      ...contextData,  // Preserve standardized structure

      // Update stageResults with stage1_5_anomaly data
      stageResults: {
        ...contextData.stageResults,
        stage1_5_anomaly: {
          performed: true,
          execution_time: anomalyData.execution_time,
          anomaly_scores: anomalyData.anomaly_scores,
          anomaly_findings: anomalyData.anomaly_findings,
          service_anomalies: anomalyData.service_anomalies,
          raw_metrics: anomalyData.raw_metrics,
          anomaly_summary: anomalyData.anomaly_summary,
          tools_executed: anomalyData.tools_executed
        }
      },

      // Legacy fields for compatibility
      anomaly_analysis: anomalyData,
      anomaly_scores: anomalyData.anomaly_scores,
      anomaly_check_performed: true,
      proceed_to_stage2: shouldProceed,
      output: contextData.output || contextData.stage1_result, // Keep Stage 1 for legacy!
      _branch: "with_anomaly"
    }
  };
}

// Fallback
console.log("WARNING: Could not properly merge, returning first input");
return inputs[0];