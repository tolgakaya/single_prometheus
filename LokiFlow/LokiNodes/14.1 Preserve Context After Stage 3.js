// Preserve Context After Stage 3 - Fixed to restore metadata/context from Node 13
const inputs = $input.all();
const results = [];

console.log("=== PRESERVE CONTEXT AFTER STAGE 3 (Fixed) ===");
console.log("Total inputs:", inputs.length);

for (const input of inputs) {
  const data = input.json;

  console.log("Input structure from Stage 3 AI:", {
    hasMetadata: !!data.metadata,
    hasContext: !!data.context,
    hasStageResults: !!data.stageResults,
    hasOutput: !!data.output,
    outputStage: data.output?.stage
  });

  // CRITICAL FIX: AI Agent only returns 'output', but we need metadata/context from Node 13
  // Solution: Access Node 13 output directly via $('Pass Time Context to Stage 3')
  const contextData = $('Pass Time Context to Stage 3').first().json;

  console.log("Context from Node 13:", {
    hasMetadata: !!contextData.metadata,
    hasContext: !!contextData.context,
    hasStageResults: !!contextData.stageResults,
    analysisId: contextData.metadata?.analysisId
  });

  // Get Stage 3 result from output (AI agent response)
  const stage3Result = data.output && data.output.stage === "root_cause_analysis"
    ? data.output
    : null;

  if (stage3Result) {
    // Stage 3 was executed - merge with context from Node 13
    results.push({
      json: {
        // Restore metadata and context from Node 13 (lost in AI Agent output)
        metadata: contextData.metadata,
        context: contextData.context,
        timeRange: contextData.timeRange,

        // Preserve stageResults from Node 13 and add Stage 3
        stageResults: {
          ...contextData.stageResults,  // stage1, stage1_5_anomaly, stage2 from Node 13
          stage3: {
            stage: stage3Result.stage || "root_cause_analysis",
            // Map findings to expected validation structure
            root_cause: stage3Result.findings?.primary_root_cause ? {
              component: stage3Result.affected_systems?.services?.[0]?.name || "unknown",
              issue_type: stage3Result.findings.primary_root_cause.type || stage3Result.investigation_type,
              evidence: stage3Result.findings.primary_root_cause.evidence || [],
              confidence: stage3Result.findings.primary_root_cause.confidence
            } : (stage3Result.root_cause || null),
            technical_details: stage3Result.findings || stage3Result.technical_details,
            contributing_factors: stage3Result.findings?.contributing_factors || stage3Result.contributing_factors,
            affected_systems: stage3Result.affected_systems,  // FIXED: Don't create business_impact field
            recommended_actions: stage3Result.remediation?.immediate_actions || stage3Result.recommended_actions,
            tools_executed: stage3Result.tools_executed || [],
            confidence_score: stage3Result.findings?.primary_root_cause?.confidence || stage3Result.confidence_score,
            severity: stage3Result.analysis_metadata?.severity || stage3Result.severity,
            // Keep original fields as well
            executive_summary: stage3Result.executive_summary,
            remediation: stage3Result.remediation,
            prevention: stage3Result.prevention
          }
        },

        // Preserve enrichments if they exist
        enrichments: data.enrichments || contextData.enrichments,

        // Legacy fields for compatibility
        output: stage3Result,
        stage3_output: stage3Result,

        // Pass through any other fields from AI output
        ...(data.cascadeDetected !== undefined && { cascadeDetected: data.cascadeDetected }),
        ...(data.cascadeAnalysis && { cascadeAnalysis: data.cascadeAnalysis }),
        ...(data.serviceImpact && { serviceImpact: data.serviceImpact })
      }
    });
  } else {
    // No Stage 3 result - restore context anyway
    console.log("WARNING: No Stage 3 result found, restoring context from Node 13");
    results.push({
      json: {
        metadata: contextData.metadata,
        context: contextData.context,
        timeRange: contextData.timeRange,
        stageResults: contextData.stageResults,
        _warning: "Stage 3 result not found"
      }
    });
  }
}

console.log(`=== Preserved context for ${results.length} items ===`);
console.log("✅ metadata and context restored from Node 13");
return results;
