// Fix Stage 2 Context - Circular Reference Safe Version

// Default production namespaces
const DEFAULT_NAMESPACES = [
  'bstp-cms-global-production',
  'bstp-cms-prod-v3',
  'em-global-prod-3pp',
  'em-global-prod-eom',
  'em-global-prod-flowe',
  'em-global-prod',
  'em-prod-3pp',
  'em-prod-eom',
  'em-prod-flowe',
  'em-prod',
  'etiyamobile-production',
  'etiyamobile-prod'
];

const stage2Output = $input.first().json;
const previousData = $node["Force Deep Analysis Override"].json;
const stage1FixData = $node["Fix Stage 1 Context"].json;

console.log("=== FIXING STAGE 2 CONTEXT ===");
console.log("Stage 2 output received");

// Helper function - Safe JSON stringify to handle circular references
function safeStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }
    return value;
  });
}

// Helper function - Safe parse
function safeParse(str) {
  return JSON.parse(str, (key, value) => {
    if (value === "[Circular]") {
      return null;
    }
    return value;
  });
}

// Deep copy with circular reference handling
let fixedOutput = safeParse(safeStringify(stage2Output));

// Output wrapper kontrolü
const hasOutputWrapper = !!fixedOutput.output;
const actualOutput = hasOutputWrapper ? fixedOutput.output : fixedOutput;

// Get expected context ID safely
const expectedContextId = previousData?._context?.contextId || `ctx-${Date.now()}`;
console.log("Expected context ID:", expectedContextId);

// Context kontrolü ve düzeltme
if (!actualOutput._context || 
    actualOutput._context.contextId !== expectedContextId ||
    actualOutput._context.contextId === "abc123" || 
    actualOutput._context.contextId === "12345") {
    
    console.log("❌ Invalid or missing context in Stage 2, fixing...");
    
    // Create a clean context copy
    actualOutput._context = {
      contextId: expectedContextId,
      createdAt: previousData._context?.createdAt || new Date().toISOString(),
      source: previousData._context?.source || {},
      initialParams: previousData._context?.initialParams || {},
      stageConfig: previousData._context?.stageConfig || {},
      priority: previousData._context?.priority || "normal",
      forceDeepAnalysis: previousData._context?.forceDeepAnalysis || false,
      workflowMetadata: previousData._context?.workflowMetadata || {},
      stageResults: {},
      decisions: previousData._context?.decisions || {},
      debug: previousData._context?.debug || {}
    };
    
    console.log("✅ Context replaced with clean copy");
}

// Initialize stageResults if needed
if (!actualOutput._context.stageResults) {
    actualOutput._context.stageResults = {};
}

// Add Stage 1 results if available (from previous context)
if (previousData._context?.stageResults?.stage1) {
    actualOutput._context.stageResults.stage1 = {
        output: {
            overall_status: previousData._context.stageResults.stage1.output?.overall_status,
            alerts: previousData._context.stageResults.stage1.output?.alerts,
            scores: previousData._context.stageResults.stage1.output?.scores,
            quick_findings: previousData._context.stageResults.stage1.output?.quick_findings,
            proceed_to_stage2: previousData._context.stageResults.stage1.output?.proceed_to_stage2
        },
        completedAt: previousData._context.stageResults.stage1.completedAt,
        decision: previousData._context.stageResults.stage1.decision
    };
}

// Add Stage 2 results - clean copy only
actualOutput._context.stageResults.stage2 = {
    output: {
        investigation_id: actualOutput.investigation_id,
        triggered_by: actualOutput.triggered_by,
        execution_phases: {
            instant: actualOutput.execution_phases?.instant || {},
            trend: actualOutput.execution_phases?.trend || {},
            anomaly: actualOutput.execution_phases?.anomaly || {}
        },
        correlation_matrix: {
            primary_chain: actualOutput.correlation_matrix?.primary_chain || "",
            affected_services: actualOutput.correlation_matrix?.affected_services || [],
            blast_radius: actualOutput.correlation_matrix?.blast_radius || "",
            kubernetes_impact: actualOutput.correlation_matrix?.kubernetes_impact || {}
        },
        root_cause: {
            identified: actualOutput.root_cause?.identified || false,
            component: actualOutput.root_cause?.component || "",
            issue: actualOutput.root_cause?.issue || "",
            evidence: actualOutput.root_cause?.evidence || [],
            confidence: actualOutput.root_cause?.confidence || 0
        },
        proceed_to_stage3: actualOutput.proceed_to_stage3,
        alert_correlation_needed: actualOutput.alert_correlation_needed
    },
    completedAt: new Date().toISOString(),
    decision: actualOutput.proceed_to_stage3,
    rootCauseIdentified: actualOutput.root_cause?.identified || false,
    confidence: actualOutput.root_cause?.confidence || 0
};

// Update debug info
actualOutput._debug = {
    nodeType: "Stage 2: Deep Analysis",
    processedAt: new Date().toISOString(),
    contextId: expectedContextId,
    contextPreserved: true,
    receivedFromStage: "Force Deep Analysis Override",
    priority: previousData._context?.priority || "normal",
    stageSequence: [
        "Unified Entry Point",
        "Stage 1: Health Snapshot", 
        "Fix Stage 1 Context",
        "Stage 2 Decision",
        "Force Deep Analysis Override",
        "Wait 3s",
        "Stage 2: Deep Analysis",
        "Fix Stage 2 Context"
    ],
    timeRangeUsed: {
        start: previousData._context?.initialParams?.startTime || 0,
        end: previousData._context?.initialParams?.endTime || 0
    }
};

// Create clean root level context
fixedOutput._context = {
    contextId: expectedContextId,
    createdAt: actualOutput._context.createdAt,
    source: actualOutput._context.source,
    initialParams: actualOutput._context.initialParams,
    stageConfig: actualOutput._context.stageConfig,
    priority: actualOutput._context.priority,
    forceDeepAnalysis: actualOutput._context.forceDeepAnalysis,
    workflowMetadata: actualOutput._context.workflowMetadata,
    stageResults: actualOutput._context.stageResults,
    decisions: actualOutput._context.decisions,
    debug: actualOutput._context.debug
};

fixedOutput.contextId = expectedContextId;

// Get Stage 1 data from previous nodes
let stage1Data = null;

// Try to get from previousData first
if (previousData.stage1Data) {
    stage1Data = {
        overall_status: previousData.stage1Data.overall_status,
        alerts: previousData.stage1Data.alerts,
        scores: previousData.stage1Data.scores,
        quick_findings: previousData.stage1Data.quick_findings || [],
        services_analyzed: previousData.stage1Data.services_analyzed || [],
        services_count: previousData.stage1Data.services_count || 0,
        namespaces_analyzed: previousData.stage1Data.namespaces_analyzed || [],
        proceed_to_stage2: previousData.stage1Data.proceed_to_stage2,
        urgency: previousData.stage1Data.urgency,
        reason: previousData.stage1Data.reason
    };
    console.log("✓ Stage 1 data found in previousData.stage1Data");
} else if (stage1FixData?.stage1Data) {
    stage1Data = {
        overall_status: stage1FixData.stage1Data.overall_status,
        alerts: stage1FixData.stage1Data.alerts,
        scores: stage1FixData.stage1Data.scores,
        quick_findings: stage1FixData.stage1Data.quick_findings || [],
        services_analyzed: stage1FixData.stage1Data.services_analyzed || [],
        services_count: stage1FixData.stage1Data.services_count || 0,
        namespaces_analyzed: stage1FixData.stage1Data.namespaces_analyzed || [],
        proceed_to_stage2: stage1FixData.stage1Data.proceed_to_stage2,
        urgency: stage1FixData.stage1Data.urgency,
        reason: stage1FixData.stage1Data.reason
    };
    console.log("✓ Stage 1 data found in Fix Stage 1 Context");
} else if (actualOutput._context?.stageResults?.stage1?.output) {
    const s1Output = actualOutput._context.stageResults.stage1.output;
    stage1Data = {
        overall_status: s1Output.overall_status,
        alerts: s1Output.alerts,
        scores: s1Output.scores,
        quick_findings: s1Output.quick_findings || [],
        services_analyzed: s1Output.services_analyzed || [],
        services_count: s1Output.services_count || 0,
        namespaces_analyzed: s1Output.namespaces_analyzed || [],
        proceed_to_stage2: s1Output.proceed_to_stage2,
        urgency: s1Output.urgency,
        reason: s1Output.reason
    };
    console.log("✓ Stage 1 data extracted from context.stageResults");
}

// Add Stage 1 data to output
if (stage1Data) {
    fixedOutput.stage1Data = stage1Data;
    console.log("✅ Stage 1 data successfully attached");
} else {
    console.warn("⚠️ No Stage 1 data found - creating minimal structure");
    fixedOutput.stage1Data = {
        overall_status: "unknown",
        alerts: { total: 0, critical: 0, warning: 0 },
        scores: {},
        quick_findings: [],
        services_analyzed: [],
        services_count: 0,
        namespaces_analyzed: []
    };
}

// Add Stage 2 data to output - clean copy
fixedOutput.stage2Data = {
    investigation_id: actualOutput.investigation_id,
    root_cause: {
        identified: actualOutput.root_cause?.identified || false,
        component: actualOutput.root_cause?.component || "",
        issue: actualOutput.root_cause?.issue || "",
        evidence: actualOutput.root_cause?.evidence || [],
        confidence: actualOutput.root_cause?.confidence || 0
    },
    correlation_matrix: {
        primary_chain: actualOutput.correlation_matrix?.primary_chain || "",
        affected_services: actualOutput.correlation_matrix?.affected_services || [],
        blast_radius: actualOutput.correlation_matrix?.blast_radius || "",
        kubernetes_impact: actualOutput.correlation_matrix?.kubernetes_impact || {}
    },
    critical_pods: actualOutput.execution_phases?.instant?.findings?.critical_pods || [],
    affected_services: actualOutput.correlation_matrix?.affected_services || [],
    proceed_to_stage3: actualOutput.proceed_to_stage3,
    alert_correlation_needed: actualOutput.alert_correlation_needed,
    confidence: actualOutput.root_cause?.confidence || 0
};

// Update decisions
if (!actualOutput._context.decisions) {
    actualOutput._context.decisions = {};
}

actualOutput._context.decisions.stage3Proceed = {
    timestamp: new Date().toISOString(),
    shouldProceed: actualOutput.proceed_to_stage3,
    alertCorrelationNeeded: actualOutput.alert_correlation_needed,
    rootCauseIdentified: actualOutput.root_cause?.identified || false,
    confidence: actualOutput.root_cause?.confidence || 0
};

// Add namespace and time range info
fixedOutput.namespaces = previousData._context?.initialParams?.namespaces || DEFAULT_NAMESPACES;
fixedOutput.timeRange = {
    start: previousData._context?.initialParams?.startTime || 0,
    end: previousData._context?.initialParams?.endTime || 0
};

// Summary logging
console.log("==============================");
console.log("Stage 2 Fix Summary:");
console.log("- Context ID:", expectedContextId);
console.log("- Stage 1 data included:", !!fixedOutput.stage1Data);
console.log("- Stage 2 data prepared:", !!fixedOutput.stage2Data);
console.log("- Root cause identified:", actualOutput.root_cause?.identified);
console.log("- Proceed to Stage 3:", actualOutput.proceed_to_stage3);

// Validation
const validationPassed = 
    fixedOutput._context?.contextId === expectedContextId &&
    !!fixedOutput.stage1Data &&
    !!fixedOutput.stage2Data;

if (validationPassed) {
    console.log("✅ Stage 2 context successfully fixed and validated!");
} else {
    console.error("⚠️ Stage 2 validation warnings");
}

// Debug info for next stage
fixedOutput._debugInfo = {
    fromNode: "Fix Stage 2 Context",
    contextFixed: true,
    validationPassed: validationPassed,
    stage1DataSource: stage1Data ? "found" : "created",
    stage2RootCause: actualOutput.root_cause?.issue,
    stage2Decision: actualOutput.proceed_to_stage3,
    timestamp: new Date().toISOString()
};

// Clean output wrapper if needed
if (hasOutputWrapper) {
    // Don't include the nested output to avoid circular reference
    fixedOutput.outputProcessed = true;
}

return [{
    json: fixedOutput
}];