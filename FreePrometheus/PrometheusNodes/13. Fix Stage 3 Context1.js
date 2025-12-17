// Fix Stage 3 Context - Optimized without circular references

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

const stage3Output = $input.first().json;

// Stage 2'den gelen context ve data'yı al
const stage2Data = $node["Fix Stage 2 Context"].json;
const previousContext = stage2Data._context;

console.log("=== FIXING STAGE 3 CONTEXT ===");
console.log("Previous context ID:", previousContext?.contextId);

// Deep copy
let fixedOutput = JSON.parse(JSON.stringify(stage3Output));

// Output wrapper kontrolü
const hasOutputWrapper = !!fixedOutput.output;
const actualOutput = hasOutputWrapper ? fixedOutput.output : fixedOutput;

console.log("Has output wrapper:", hasOutputWrapper);

// ============= SLO DEĞERLERINI DÜZELT =============
if (actualOutput.slo_impact) {
  if (actualOutput.slo_impact.availability_slo) {
    const slo = actualOutput.slo_impact.availability_slo;
    
    if (!slo.current || slo.current === "NaN%" || slo.current === "null%" || slo.current === "undefined%") {
      slo.current = "100%";
    }
    
    if (!slo.error_budget_used || slo.error_budget_used === "NaN%" || slo.error_budget_used === "null%") {
      slo.error_budget_used = "0%";
    }
    
    if (!slo.time_remaining || slo.time_remaining === "null" || slo.time_remaining === "undefined") {
      slo.time_remaining = "30d";
    }
    
    if (!slo.status || !["green", "yellow", "red"].includes(slo.status)) {
      const currentValue = parseFloat(slo.current);
      if (currentValue >= 99.9) {
        slo.status = "green";
      } else if (currentValue >= 99.0) {
        slo.status = "yellow";
      } else {
        slo.status = "red";
      }
    }
    
    if (!slo.components) {
      slo.components = { deployment_health: "100%" };
    }
  }
  
  if (!Array.isArray(actualOutput.slo_impact.affected_slis)) {
    actualOutput.slo_impact.affected_slis = [];
  }
}

// ============= ALERT KB ENRICHMENT =============
let alertKB = [];
let severityScores = {
  "Blocker": 100,
  "Critical": 80,
  "High": 60,
  "Medium": 40,
  "Low": 20
};

// Load Alert Knowledge Base if available
try {
  const alertKBNode = $node["Load Alert Knowledge Base"];
  if (alertKBNode?.json?._alertKBData) {
    alertKB = alertKBNode.json._alertKBData;
    // CRITICAL FIX: Ensure alertKB is always an array
    if (!Array.isArray(alertKB)) {
      console.log("⚠️ alertKB is not an array, converting to array:", typeof alertKB);
      alertKB = [];
    }
    if (alertKBNode.json._severityScores) {
      severityScores = alertKBNode.json._severityScores;
    }
    console.log("Alert KB loaded:", alertKB.length, "entries");
  }
} catch (e) {
  console.log("Alert KB not available, using empty KB:", e.message);
  alertKB = []; // CRITICAL FIX: Ensure alertKB is always an array even on error
}

// Helper functions
function enrichAlertWithKB(alert, alertKB) {
  const kbEntry = alertKB.find(kb => {
    if (kb.alertName === alert.name) return true;
    if (alert.name && kb.alertName && alert.name.includes(kb.alertName)) return true;
    if (alert.name && kb.alertName && kb.alertName.includes(alert.name)) return true;
    return false;
  });
  
  if (kbEntry) {
    return {
      ...alert,
      kb_enriched: true,
      kb_severity: kbEntry.severity,
      kb_description: kbEntry.description,
      kb_root_causes: kbEntry.rootCauses,
      kb_diagnostic_commands: kbEntry.diagnosticCommands,
      kb_immediate_actions: kbEntry.immediateActions,
      severity_score: severityScores[kbEntry.severity] || 50,
      severity: alert.severity || kbEntry.severity
    };
  }
  
  return {
    ...alert,
    kb_enriched: false,
    severity_score: severityScores[alert.severity] || 30
  };
}

function calculateServiceImpact(alertName, severity) {
  let impactMultiplier = 1;
  
  if (alertName.includes('etcd')) {
    impactMultiplier = 2;
  } else if (alertName.includes('KubeAPI') || alertName.includes('APIServer')) {
    impactMultiplier = 1.5;
  } else if (alertName.includes('KubeController') || alertName.includes('KubeScheduler')) {
    impactMultiplier = 1.4;
  } else if (alertName.includes('Node')) {
    impactMultiplier = 1.3;
  } else if (alertName.includes('Pod') || alertName.includes('Container')) {
    impactMultiplier = 0.8;
  }
  
  const baseScore = severityScores[severity] || 50;
  return Math.round(baseScore * impactMultiplier);
}

// Process alerts
if (!Array.isArray(actualOutput.active_alerts)) {
  actualOutput.active_alerts = [];
} else {
  actualOutput.active_alerts = actualOutput.active_alerts.map(alert => {
    const validatedAlert = {
      name: alert.name || "Unknown Alert",
      severity: alert.severity || "unknown",
      count: typeof alert.count === 'number' ? alert.count : 0,
      duration: alert.duration || "unknown",
      labels: alert.labels || {},
      annotations: alert.annotations || {}
    };
    
    const enrichedAlert = enrichAlertWithKB(validatedAlert, alertKB);
    enrichedAlert.impact_score = calculateServiceImpact(
      enrichedAlert.name, 
      enrichedAlert.kb_severity || enrichedAlert.severity
    );
    
    return enrichedAlert;
  });
  
  actualOutput.active_alerts.sort((a, b) => b.impact_score - a.impact_score);
}

console.log("=== ALERT ENRICHMENT COMPLETE ===");
console.log("Enriched alerts:", actualOutput.active_alerts.filter(a => a.kb_enriched).length);

// Process alert groups
if (!Array.isArray(actualOutput.alert_groups)) {
  actualOutput.alert_groups = [];
}

// Knowledge base matches
actualOutput.knowledge_base_matches = actualOutput.active_alerts
  .filter(alert => alert.kb_enriched)
  .map(alert => ({
    alert: alert.name,
    kb_entry: {
      severity: alert.kb_severity,
      description: alert.kb_description,
      root_causes: alert.kb_root_causes || [],
      diagnostic_commands: alert.kb_diagnostic_commands || [],
      immediate_actions: alert.kb_immediate_actions || [],
      long_term_solutions: alert.kb_long_term_solutions || []
    },
    applicability_score: 0.9,
    impact_score: alert.impact_score
  }));

// Alert patterns
if (!actualOutput.alert_patterns) {
  actualOutput.alert_patterns = {
    recurring: [],
    storm_detection: {
      detected: false,
      alert_count: 0,
      time_window: "5m",
      likely_root: null
    }
  };
}

// Recommended actions
if (!Array.isArray(actualOutput.recommended_alert_actions)) {
  actualOutput.recommended_alert_actions = [];
}

// ============= CORRELATION CONFIDENCE VALIDATION =============
// Validate correlation_confidence field (added in Stage 3 prompt improvements)
if (typeof actualOutput.correlation_confidence !== 'number' || 
    actualOutput.correlation_confidence < 0 || 
    actualOutput.correlation_confidence > 1) {
  
  // Calculate fallback correlation_confidence if AI didn't provide it
  let confidence = 0;
  
  // Factor 1: Alert-to-Stage2 Correlation (+0.3)
  if (stage2Data?.stage2Data?.root_cause?.component) {
    const stage2Component = stage2Data.stage2Data.root_cause.component;
    const alertsMatchStage2 = actualOutput.active_alerts?.some(alert => 
      alert.labels?.pod?.includes(stage2Component) || 
      alert.labels?.namespace === stage2Data._context?.initialParams?.namespaces?.[0]
    );
    confidence += alertsMatchStage2 ? 0.3 : 0.1;
  }
  
  // Factor 2: Knowledge Base Coverage (+0.3)
  const kbCoverage = actualOutput.active_alerts?.length > 0 
    ? actualOutput.active_alerts.filter(a => a.kb_enriched).length / actualOutput.active_alerts.length 
    : 0;
  if (kbCoverage === 1.0) confidence += 0.3;
  else if (kbCoverage >= 0.75) confidence += 0.2;
  else if (kbCoverage >= 0.5) confidence += 0.1;
  else if (kbCoverage > 0) confidence += 0.05;
  
  // Factor 3: Alert Group Quality (+0.2)
  const hasRootAlert = actualOutput.alert_groups?.some(g => g.root_alert && g.related_alerts?.length >= 3);
  if (hasRootAlert) confidence += 0.2;
  else if (actualOutput.alert_groups?.some(g => g.related_alerts?.length >= 1)) confidence += 0.1;
  
  // Factor 4: SLO Impact Clarity (+0.2)
  const sloComponents = actualOutput.slo_impact?.availability_slo?.components;
  if (sloComponents && Object.keys(sloComponents).length >= 4) confidence += 0.2;
  else if (sloComponents && Object.keys(sloComponents).length >= 2) confidence += 0.1;
  else if (sloComponents && Object.keys(sloComponents).length === 1) confidence += 0.05;
  
  actualOutput.correlation_confidence = Math.min(1.0, Math.max(0.0, confidence));
  console.log("⚠️ correlation_confidence calculated as fallback:", actualOutput.correlation_confidence);
}

// Boolean fields
if (typeof actualOutput.proceed_to_stage4 !== 'boolean') {
  actualOutput.proceed_to_stage4 = actualOutput.active_alerts?.length > 0 ||
    actualOutput.active_alerts?.some(a => 
      a.kb_severity === "Critical" || a.kb_severity === "Blocker"
    );
}

if (typeof actualOutput.auto_remediation_approved !== 'boolean') {
  actualOutput.auto_remediation_approved = 
    actualOutput.active_alerts.every(alert => 
      !alert.kb_severity || 
      alert.kb_severity === "Low" || 
      alert.kb_severity === "Medium"
    );
}

// ============= CONTEXT FIX =============
const expectedContextId = previousContext?.contextId;

if (!actualOutput._context || 
    actualOutput._context.contextId !== expectedContextId ||
    actualOutput._context.contextId === "abc123") {
    
  console.log("❌ Invalid or missing context, fixing...");
  
  // Deep copy of previous context
  const contextCopy = JSON.parse(JSON.stringify(previousContext));
  
  // Preserve existing stage results if any
  if (contextCopy.stageResults) {
    // Keep stage 1 and 2 results
  } else {
    contextCopy.stageResults = {};
  }
  
  actualOutput._context = contextCopy;
  console.log("✅ Context replaced");
}

// Ensure stageResults exists
if (!actualOutput._context.stageResults) {
  actualOutput._context.stageResults = {};
}

// Add Stage 3 results - only this stage's data
actualOutput._context.stageResults.stage3 = {
  output: {
    active_alerts: JSON.parse(JSON.stringify(actualOutput.active_alerts)),
    alert_groups: JSON.parse(JSON.stringify(actualOutput.alert_groups)),
    knowledge_base_matches: JSON.parse(JSON.stringify(actualOutput.knowledge_base_matches)),
    alert_patterns: JSON.parse(JSON.stringify(actualOutput.alert_patterns)),
    slo_impact: JSON.parse(JSON.stringify(actualOutput.slo_impact)),
    recommended_alert_actions: JSON.parse(JSON.stringify(actualOutput.recommended_alert_actions)),
    correlation_confidence: actualOutput.correlation_confidence,
    proceed_to_stage4: actualOutput.proceed_to_stage4,
    auto_remediation_approved: actualOutput.auto_remediation_approved
  },
  completedAt: new Date().toISOString(),
  decision: actualOutput.proceed_to_stage4
};

// Update debug info
actualOutput._debug = {
  nodeType: "Stage 3: Alert Intelligence",
  processedAt: actualOutput._debug?.processedAt || new Date().toISOString(),
  contextId: expectedContextId,
  contextPreserved: true,
  receivedFromStage: "Fix Stage 2 Context",
  priority: previousContext?.priority || "normal",
  sloToolErrors: actualOutput._debug?.sloToolErrors || [],
  stageSequence: [
    "Unified Entry Point",
    "Stage 1: Health Snapshot", 
    "Fix Stage 1 Context",
    "Stage 2 Decision",
    "Force Deep Analysis Override",
    "Wait 3s",
    "Stage 2: Deep Analysis",
    "Fix Stage 2 Context",
    "Stage 3: Alert Intelligence",
    "Fix Stage 3 Context"
  ],
  timeRangeUsed: {
    start: previousContext?.initialParams?.startTime || 0,
    end: previousContext?.initialParams?.endTime || 0
  }
};

// Update root level context
fixedOutput._context = JSON.parse(JSON.stringify(actualOutput._context));
fixedOutput.contextId = expectedContextId;

// Stage 3 summary data
fixedOutput.stage3Data = {
  active_alerts: JSON.parse(JSON.stringify(actualOutput.active_alerts || [])),
  alert_groups: JSON.parse(JSON.stringify(actualOutput.alert_groups || [])),
  knowledge_base_matches: JSON.parse(JSON.stringify(actualOutput.knowledge_base_matches || [])),
  slo_impact: JSON.parse(JSON.stringify(actualOutput.slo_impact || {})),
  recommended_actions: JSON.parse(JSON.stringify(actualOutput.recommended_alert_actions || [])),
  correlation_confidence: actualOutput.correlation_confidence || 0.0,
  auto_remediation_approved: actualOutput.auto_remediation_approved || false,
  proceed_to_stage4: actualOutput.proceed_to_stage4 || false,
  kb_enriched_count: actualOutput.active_alerts?.filter(a => a.kb_enriched).length || 0
};

// Update decisions
if (!actualOutput._context.decisions) {
  actualOutput._context.decisions = previousContext?.decisions || {};
}

actualOutput._context.decisions.stage4Proceed = {
  timestamp: new Date().toISOString(),
  shouldProceed: actualOutput.proceed_to_stage4,
  autoRemediationApproved: actualOutput.auto_remediation_approved,
  alertCount: actualOutput.active_alerts?.length || 0,
  sloImpact: actualOutput.slo_impact?.availability_slo?.current || "100%"
};

// Preserve previous stage data
if (stage2Data?.stage1Data) {
  fixedOutput.stage1Data = JSON.parse(JSON.stringify(stage2Data.stage1Data));
  console.log("✅ Stage 1 data preserved");
}

if (stage2Data?.stage2Data) {
  fixedOutput.stage2Data = JSON.parse(JSON.stringify(stage2Data.stage2Data));
  console.log("✅ Stage 2 data preserved");
}

// Prepare data for Stage 4
fixedOutput.stage4PrepData = {
  rootCause: fixedOutput.stage2Data?.root_cause || {},
  affectedServices: fixedOutput.stage2Data?.affected_services || [],
  criticalPods: fixedOutput.stage2Data?.critical_pods || [],
  primaryAlert: actualOutput.active_alerts?.[0] || null,
  kbMatches: actualOutput.knowledge_base_matches || [],
  contextId: expectedContextId
};

// Namespaces and time range
fixedOutput.namespaces = previousContext?.initialParams?.namespaces || DEFAULT_NAMESPACES;
fixedOutput.timeRange = {
  start: previousContext?.initialParams?.startTime || 0,
  end: previousContext?.initialParams?.endTime || 0
};

// Summary logging
console.log("==============================");
console.log("Stage 3 Fix Summary:");
console.log("- Context ID:", actualOutput._context?.contextId);
console.log("- Active alerts:", actualOutput.active_alerts?.length);
console.log("- KB enriched:", fixedOutput.stage3Data?.kb_enriched_count);
console.log("- Proceed to Stage 4:", actualOutput.proceed_to_stage4);
console.log("- Previous stage data preserved:", !!(fixedOutput.stage1Data && fixedOutput.stage2Data));

// Validation
const validationPassed = 
  actualOutput._context?.contextId === expectedContextId &&
  !!fixedOutput.stage1Data &&
  !!fixedOutput.stage2Data &&
  !!fixedOutput.stage3Data;

if (validationPassed) {
  console.log("✅ Stage 3 context successfully fixed and validated!");
} else {
  console.error("⚠️ Stage 3 validation warnings");
}

// Debug info for next stage
fixedOutput._debugInfo = {
  fromNode: "Fix Stage 3 Context",
  contextFixed: true,
  validationPassed: validationPassed,
  stage3AlertCount: actualOutput.active_alerts?.length || 0,
  stage3Decision: actualOutput.proceed_to_stage4,
  allStagesDataPresent: !!(fixedOutput.stage1Data && fixedOutput.stage2Data && fixedOutput.stage3Data),
  timestamp: new Date().toISOString()
};

// Pass the output wrapper if needed
if (hasOutputWrapper) {
  fixedOutput.output = actualOutput;
}

return [{
  json: fixedOutput
}];