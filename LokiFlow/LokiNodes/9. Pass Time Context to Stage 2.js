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
  
  results.push({
    json: {
      ...data,
      stage1_status: stage1Result.status,
      stage1_result: stage1Result,
      anomaly_scores: anomalyScores,
      anomaly_analysis: data.anomaly_analysis || null,
      anomaly_check_performed: data.anomaly_check_performed || false,
      proceed_to_stage2: data.proceed_to_stage2 !== false, // Default true
      _item_branch: data._branch || "unknown"
    }
  });
}

return results;