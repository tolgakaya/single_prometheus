// Set Stage 1 Result - Write AI output to stageResults.stage1
const input = $input.first().json;

console.log("=== SET STAGE 1 RESULT ===");

// Stage 1 AI Agent returns output in 'output' field
const stage1Output = input.output || input;

console.log("Stage 1 output exists?", stage1Output.stage ? "YES" : "NO");
console.log("Stage 1 stage value:", stage1Output.stage);

// CRITICAL: Write Stage 1 result to standardized structure
return [{
  json: {
    // Preserve entire standardized structure from previous nodes
    ...input,

    // Write Stage 1 result to stageResults.stage1
    stageResults: {
      ...(input.stageResults || {}),
      stage1: {
        stage: stage1Output.stage || "health_snapshot",
        execution_time: stage1Output.execution_time || new Date().toISOString(),
        status: stage1Output.status || "unknown",
        metrics: stage1Output.metrics || {},
        critical_errors: stage1Output.critical_errors || [],
        affected_services: stage1Output.affected_services || [],
        tools_executed: stage1Output.tools_executed || [],
        quick_summary: stage1Output.quick_summary || "",
        proceed_to_anomaly: stage1Output.proceed_to_anomaly !== undefined ? stage1Output.proceed_to_anomaly : false
      }
    },

    // Legacy compatibility - keep output field
    output: stage1Output
  }
}];
