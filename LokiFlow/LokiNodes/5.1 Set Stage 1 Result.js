// Set Stage 1 Result - Write AI output to stageResults.stage1
// This node combines:
//   - Context from Node 4 (Service Dependency Loader): metadata, context, stageResults
//   - AI output from current input: Stage 1 AI Agent results

const currentInput = $input.first().json;

console.log("=== SET STAGE 1 RESULT ===");

// Get context data from Node 4 (Service Dependency Loader)
const contextData = $('Service Dependency Loader').first().json;

// AI output is in current input's 'output' field
const aiOutput = currentInput.output || currentInput;

console.log("Stage 1 AI output exists?", aiOutput.stage ? "YES" : "NO");
console.log("Context from Node 4 exists?", contextData.metadata ? "YES" : "NO");

// Validate we have both
if (!contextData || !contextData.metadata) {
  throw new Error("CRITICAL: No context data found from 'Service Dependency Loader' node");
}

if (!aiOutput || !aiOutput.stage) {
  throw new Error("CRITICAL: No AI output found. Expected 'output' field with Stage 1 results");
}

// CRITICAL: Merge context data with AI output
return {
  json: {
    // Preserve entire standardized structure from Node 4
    ...contextData,

    // Write Stage 1 result to stageResults.stage1
    stageResults: {
      ...(contextData.stageResults || {}),
      stage1: {
        stage: aiOutput.stage || "health_snapshot",
        execution_time: aiOutput.execution_time || new Date().toISOString(),
        status: aiOutput.status || "unknown",
        metrics: aiOutput.metrics || {},
        critical_errors: aiOutput.critical_errors || [],
        affected_services: aiOutput.affected_services || [],
        tools_executed: aiOutput.tools_executed || [],
        quick_summary: aiOutput.quick_summary || "",
        proceed_to_anomaly: aiOutput.proceed_to_anomaly !== undefined ? aiOutput.proceed_to_anomaly : false
      }
    },

    // Legacy compatibility - keep output field
    output: aiOutput
  }
};
