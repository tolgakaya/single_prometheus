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

// Single input - probably from FALSE branch
if (inputs.length === 1) {
  const data = inputs[0].json;
  
  // Make sure we have Stage 1 data
  if (data.stage1_result?.stage === "health_snapshot" || data.output?.stage === "health_snapshot") {
    return [{
      json: {
        ...data,
        anomaly_check_performed: false,
        anomaly_reason_skipped: "Conditions not met for anomaly check",
        _branch: "no_anomaly"
      }
    }];
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
  
  const shouldProceed = contextData.forceDeepAnalysis || 
                       contextData.priority === 'critical' ||
                       anomalyData.proceed_to_stage2;
  
  return [{
    json: {
      ...contextData,
      anomaly_analysis: anomalyData,
      anomaly_scores: anomalyData.anomaly_scores,
      anomaly_check_performed: true,
      proceed_to_stage2: shouldProceed,
      output: contextData.output || contextData.stage1_result, // Keep Stage 1!
      _branch: "with_anomaly"
    }
  }];
}

// Fallback
console.log("WARNING: Could not properly merge, returning first input");
return [inputs[0]];