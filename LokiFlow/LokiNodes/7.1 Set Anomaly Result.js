// Set Anomaly Result - Write AI output to stageResults.stage1_5_anomaly
// This node combines:
//   - Context from Node 6 (Pass Context to Anomaly Stage): metadata, context, stageResults (with stage1)
//   - AI output from current input: Anomaly Detection AI Agent results

const currentInput = $input.first().json;

console.log("=== SET ANOMALY RESULT ===");

// Get context data from Node 6 (Pass Context to Anomaly Stage)
const contextData = $('Pass Context to Anomaly Stage').first().json;

// AI output is in current input's 'output' field
const aiOutput = currentInput.output || currentInput;

console.log("Anomaly AI output exists?", aiOutput.stage === "anomaly_detection" ? "YES" : "NO");
console.log("Context from Node 6 exists?", contextData.metadata ? "YES" : "NO");

// Validate we have both
if (!contextData || !contextData.metadata) {
  throw new Error("CRITICAL: No context data found from 'Pass Context to Anomaly Stage' node");
}

if (!aiOutput || aiOutput.stage !== "anomaly_detection") {
  throw new Error("CRITICAL: No Anomaly AI output found. Expected 'output' field with stage='anomaly_detection'");
}

// Check from standardized metadata or legacy fields
const forceDeepAnalysis = contextData.metadata?.forceDeepAnalysis || contextData.forceDeepAnalysis;
const priority = contextData.metadata?.priority || contextData.priority;

const shouldProceed = forceDeepAnalysis ||
                     priority === 'critical' ||
                     aiOutput.proceed_to_stage2;

console.log("Force Deep Analysis:", forceDeepAnalysis);
console.log("Priority:", priority);
console.log("Should proceed to Stage 2:", shouldProceed);

// CRITICAL: Merge context data with AI output
return {
  json: {
    // Preserve entire standardized structure from Node 6
    ...contextData,

    // Update stageResults with stage1_5_anomaly data
    stageResults: {
      ...(contextData.stageResults || {}),
      stage1_5_anomaly: {
        performed: true,
        stage: aiOutput.stage || "anomaly_detection",
        execution_time: aiOutput.execution_time || new Date().toISOString(),
        anomaly_scores: aiOutput.anomaly_scores || {},
        anomaly_findings: aiOutput.anomaly_findings || [],
        service_anomalies: aiOutput.service_anomalies || [],
        raw_metrics: aiOutput.raw_metrics || {},
        anomaly_summary: aiOutput.anomaly_summary || "",
        tools_executed: aiOutput.tools_executed || [],
        proceed_to_stage2: shouldProceed
      }
    },

    // Legacy compatibility - keep output field and other legacy fields
    output: aiOutput,
    anomaly_analysis: aiOutput,
    anomaly_scores: aiOutput.anomaly_scores,
    anomaly_check_performed: true,
    proceed_to_stage2: shouldProceed,
    _branch: "with_anomaly"
  }
};
