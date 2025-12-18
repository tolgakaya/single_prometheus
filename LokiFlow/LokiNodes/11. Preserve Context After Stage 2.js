// Preserve Context After Stage 2 - Fixed for both branches
const inputs = $input.all();
const results = [];

for (const input of inputs) {
  const stage2Output = input.json;
  
  // Get original context - it might come from different sources
  let originalContext = {};
  
  // Option 1: Context is already embedded in the input (from either branch)
  if (stage2Output.timeRange && stage2Output.stage1_result) {
    console.log("Using embedded context from input");
    originalContext = stage2Output;
  }
  // Option 2: Try to get from the anomaly branch node
  else {
    try {
      const passContextItems = $items("Pass Time Context to Stage 2");
      if (passContextItems && passContextItems.length > 0) {
        originalContext = passContextItems[0].json;
        console.log("Got context from Pass Time Context to Stage 2");
      }
    } catch (e) {
      // This node didn't run (FALSE branch)
      try {
        const passWithoutAnomalyItems = $items("Pass Context Without Anomaly");
        if (passWithoutAnomalyItems && passWithoutAnomalyItems.length > 0) {
          originalContext = passWithoutAnomalyItems[0].json;
          console.log("Got context from Pass Context Without Anomaly");
        }
      } catch (e2) {
        console.log("No context nodes found, using input data");
        originalContext = stage2Output;
      }
    }
  }
  
  // Merge Stage 2 output with original context
  results.push({
    json: {
      // First, preserve all original context
      ...originalContext,
      
      // Then add/override with Stage 2 output
      output: stage2Output.output || stage2Output,
      
      // Ensure critical fields are preserved
      timeRange: originalContext.timeRange || stage2Output.timeRange,
      priority: originalContext.priority || stage2Output.priority,
      forceDeepAnalysis: originalContext.forceDeepAnalysis || stage2Output.forceDeepAnalysis,
      stage1_result: originalContext.stage1_result || originalContext.output,
      anomaly_analysis: originalContext.anomaly_analysis || null,
      anomaly_check_performed: originalContext.anomaly_check_performed !== undefined ? 
        originalContext.anomaly_check_performed : false,
      analysisId: originalContext.analysisId || stage2Output.analysisId,
      context: originalContext.context || stage2Output.context,
      affectedServices: originalContext.affectedServices || stage2Output.affectedServices,
      serviceDependencies: originalContext.serviceDependencies || stage2Output.serviceDependencies,
      
      // Add Stage 2 reference
      stage2_output: stage2Output,
      
      // Debug info
      _contextSource: originalContext.timeRange ? "preserved" : "reconstructed",
      _branch: originalContext._branch || "unknown"
    }
  });
}

console.log(`Preserved context for ${results.length} items`);
return results;