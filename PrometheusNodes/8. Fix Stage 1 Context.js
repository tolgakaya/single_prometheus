// ================ KB-ENHANCED FIX STAGE 1 CONTEXT ================
// This file preserves ALL original 138 lines and ADDS KB enhancements
// Version: KB-Enhanced-Full-v1.0
// Enhancement Date: 2025-01-28
// Original functionality: 100% preserved
// KB Enhancement: ADDED (not replaced)

// ============= KB NODE CONNECTIONS (NEW) =============
// Get KB data from workflow nodes (safely with error handling)
let alertCategoriesMapper = {};
let loadAlertKB = {};
let categoryMetricsBuilder = {};

try {
  alertCategoriesMapper = $node["Alert Categories Mapper"]?.json || {};
} catch(e) {
  console.log("Alert Categories Mapper node not available yet");
}

try {
  loadAlertKB = $node["Load Alert Knowledge Base"]?.json || {};
} catch(e) {
  console.log("Load Alert Knowledge Base node not available yet");
}

try {
  categoryMetricsBuilder = $node["Category Based Metrics Builder"]?.json || {};
} catch(e) {
  console.log("Category Based Metrics Builder node not available yet");
}

// Helper function to derive urgency level from severity score
function deriveUrgencyLevel(severityScore) {
  if (severityScore >= 100) return 'BLOCKER';
  if (severityScore >= 90) return 'CRITICAL';
  if (severityScore >= 70) return 'HIGH';
  if (severityScore >= 50) return 'MEDIUM';
  return 'LOW';
}

// Extract KB information safely (FIXED FIELD PATHS)
const kbAlertCategory = alertCategoriesMapper.alertCategory || 'UNKNOWN';
const kbUrgencyLevel = deriveUrgencyLevel(alertCategoriesMapper.calculatedSeverityScore || 0);
const kbCascadeRisk = alertCategoriesMapper.categoryHandlingHints?.cascadeRisk || 'UNKNOWN';
const kbAlertKnowledgeBase = loadAlertKB.knowledgeBase?.alert || {};
const kbEnhancedStats = {
  totalCategories: alertCategoriesMapper._categoryStats?.totalAlerts || 0,
  totalMappings: Object.keys(alertCategoriesMapper._categoryStats?.categoryBreakdown || {}).length || 0,
  kbEntriesLoaded: Object.keys(kbAlertKnowledgeBase).length || 0
};

console.log("===== STAGE 1 KB ENHANCEMENT LOADED =====");
console.log("Alert Category:", kbAlertCategory);
console.log("Urgency Level:", kbUrgencyLevel);
console.log("Cascade Risk:", kbCascadeRisk);
console.log("KB Entries Available:", kbEnhancedStats.kbEntriesLoaded);
console.log("==========================================");

// Fix Stage 1 Context - Correct the context after AI Agent output
const stage1Output = $input.first().json;
const unifiedData = $node["Unified Entry Point"].json;
const preparedData = $node["Prepare Stage 1 Input"].json;

console.log("=== FIXING STAGE 1 CONTEXT ===");
console.log("Stage 1 output structure:", stage1Output.output ? "Has output wrapper" : "Direct output");
console.log("Expected context ID:", unifiedData._context.contextId);

// Deep copy to avoid mutations
let fixedOutput = JSON.parse(JSON.stringify(stage1Output));

// Output wrapper kontrolü
const hasOutputWrapper = !!fixedOutput.output;
const actualOutput = hasOutputWrapper ? fixedOutput.output : fixedOutput;

// Context'i kontrol et ve düzelt
if (actualOutput._context) {
  const contextString = JSON.stringify(actualOutput._context);
  const hasTemplates = contextString.includes("{{") || contextString.includes("}}");
  const hasJsonReference = contextString.includes("$json");
  
  console.log("Context has templates:", hasTemplates);
  console.log("Context has $json references:", hasJsonReference);
  
  if (hasTemplates || hasJsonReference || 
      !actualOutput._context.contextId || 
      actualOutput._context.contextId === "{{ $json.contextId }}" ||
      actualOutput._context.contextId === "12345" ||
      actualOutput._context.contextId === "abc-123") {
    
    console.log("❌ Invalid context detected, fixing...");
    
    // Doğru context'i koy - deep copy ile
    actualOutput._context = JSON.parse(JSON.stringify(unifiedData._context));
    
    console.log("✅ Context replaced with correct one");
  }
} else {
  console.log("❌ No context found, adding...");
  actualOutput._context = JSON.parse(JSON.stringify(unifiedData._context));
}

// Debug'ı da düzelt
if (actualOutput._debug) {
  const debugString = JSON.stringify(actualOutput._debug);
  if (debugString.includes("{{") || debugString.includes("$json") || 
      actualOutput._debug.contextId !== unifiedData._context.contextId) {
    
    actualOutput._debug.contextId = unifiedData._context.contextId;
    actualOutput._debug.contextFixed = true;
    actualOutput._debug.fixedAt = new Date().toISOString();
    actualOutput._debug.receivedFromSource = unifiedData.source.type;
    actualOutput._debug.priority = unifiedData.priority;
  }
}

// Context'i başlat
if (!actualOutput._context.stageResults) {
  actualOutput._context.stageResults = {};
}

// Stage 1 sonuçlarını context'e kaydet - sadece bu stage'in verisi
actualOutput._context.stageResults.stage1 = {
  output: {
    overall_status: actualOutput.overall_status,
    alerts: actualOutput.alerts,
    scores: actualOutput.scores,
    quick_findings: actualOutput.quick_findings,
    active_services: actualOutput.active_services,
    requested_services: actualOutput.requested_services,
    proceed_to_stage2: actualOutput.proceed_to_stage2,
    urgency: actualOutput.urgency,
    reason: actualOutput.reason,
    forceDeepAnalysis: actualOutput.forceDeepAnalysis,
    overridden: actualOutput.overridden
  },
  completedAt: actualOutput._debug?.processedAt || new Date().toISOString(),
  decision: actualOutput.proceed_to_stage2,
  status: actualOutput.overall_status,
  alerts: actualOutput.alerts?.total || 0
};

// Root level'a context bilgilerini ekle
fixedOutput._context = JSON.parse(JSON.stringify(actualOutput._context));
fixedOutput.contextId = unifiedData._context.contextId;
fixedOutput._contextFixed = true;
fixedOutput._fixedAt = new Date().toISOString();

// ============= KB ENHANCEMENT INTEGRATION (NEW) =============
// FIX: Priority 9 - KB-based fallback when Prometheus queries fail
// For KubeAPIDown/KubeProxyDown: API down = queries fail = use KB instead
const prometheusQueriesFailed = (actualOutput.alerts?.total === 0 || !actualOutput.alerts) &&
                                (actualOutput.scores?.cluster_health === 0 || !actualOutput.scores) &&
                                actualOutput.overall_status === 'critical';

const hasKBData = loadAlertKB.knowledgeBase?.alert && Object.keys(loadAlertKB.knowledgeBase.alert).length > 0;

if (prometheusQueriesFailed && hasKBData) {
  console.log("🔍 PROMETHEUS QUERY FAILURE DETECTED - Using KB fallback");
  console.log("Alert:", loadAlertKB.knowledgeBase.alertName);
  console.log("KB Entry Available:", hasKBData);

  // Override quick_findings with KB-based information
  actualOutput.quick_findings = [
    `${loadAlertKB.knowledgeBase.alertName}: ${loadAlertKB.knowledgeBase.alert.description}`,
    `Prometheus queries unavailable (likely due to ${loadAlertKB.knowledgeBase.alertName})`,
    `KB Guidance: ${loadAlertKB.knowledgeBase.alert.commonCauses?.[0] || 'Check system logs'}`
  ];

  // Add KB-based reason
  actualOutput.reason = `${loadAlertKB.knowledgeBase.alertName} detected. Using Knowledge Base for analysis (Prometheus unavailable).`;

  // Ensure deep analysis continues with KB data
  actualOutput.proceed_to_stage2 = true;
  actualOutput.forceDeepAnalysis = true;

  // Mark that KB fallback was used
  actualOutput.kbFallbackUsed = true;

  console.log("✅ KB fallback applied - quick_findings updated with KB data");
}

// Add KB information to the context
fixedOutput.knowledgeBase = {
  alertCategory: kbAlertCategory,
  urgencyLevel: kbUrgencyLevel,
  cascadeRisk: kbCascadeRisk,
  kbEntriesAvailable: kbEnhancedStats.kbEntriesLoaded,
  categoriesSupported: kbEnhancedStats.totalCategories,
  alertMappings: kbEnhancedStats.totalMappings,
  enhancementVersion: "KB-Enhanced-Full-v1.0",
  kbFallbackUsed: actualOutput.kbFallbackUsed || false,
  alert: loadAlertKB.knowledgeBase?.alert || null
};

// Add KB to stage results
if (!fixedOutput._context.stageResults) {
  fixedOutput._context.stageResults = {};
}

fixedOutput._context.stageResults.stage1 = {
  ...fixedOutput._context.stageResults.stage1,
  kbEnhanced: kbEnhancedStats.kbEntriesLoaded > 0,
  alertCategory: kbAlertCategory,
  urgencyLevel: kbUrgencyLevel
};

// Stage 1 verilerini root'a ekle (kolay erişim için)
fixedOutput.stage1Data = {
  overall_status: actualOutput.overall_status,
  alerts: JSON.parse(JSON.stringify(actualOutput.alerts)),
  scores: JSON.parse(JSON.stringify(actualOutput.scores)),
  quick_findings: JSON.parse(JSON.stringify(actualOutput.quick_findings)),
  active_services: JSON.parse(JSON.stringify(actualOutput.active_services || [])),
  requested_services: JSON.parse(JSON.stringify(actualOutput.requested_services || [])),
  proceed_to_stage2: actualOutput.proceed_to_stage2,
  urgency: actualOutput.urgency,
  reason: actualOutput.reason
};

// Validation
const contextFixed = actualOutput._context?.contextId === unifiedData._context.contextId;
const rootContextFixed = fixedOutput._context?.contextId === unifiedData._context.contextId;

console.log("==============================");
console.log("Stage 1 Fix Summary:");
console.log("- Context ID:", actualOutput._context?.contextId);
console.log("- Proceed to stage 2:", actualOutput.proceed_to_stage2);
console.log("- Overall status:", actualOutput.overall_status);
console.log("- Total alerts:", actualOutput.alerts?.total);
console.log("- Context fixed:", contextFixed && rootContextFixed);

if (contextFixed && rootContextFixed) {
  console.log("✅ Context successfully fixed in both locations!");
} else {
  console.error("⚠️ Context fix validation failed!");
}

// ============= KB ENHANCEMENT SUMMARY (NEW) =============
console.log("\n===== STAGE 1 KB ENHANCEMENT SUMMARY =====");
console.log("KB Enhanced:", kbEnhancedStats.kbEntriesLoaded > 0 ? "YES" : "NO");
console.log("Alert Category:", kbAlertCategory);
console.log("Urgency Level:", kbUrgencyLevel);
console.log("Cascade Risk:", kbCascadeRisk);
console.log("KB Entries Loaded:", kbEnhancedStats.kbEntriesLoaded);
console.log("Categories Supported:", kbEnhancedStats.totalCategories);
console.log("Alert Mappings:", kbEnhancedStats.totalMappings);
console.log("============================================\n");

// Debug info for next stage
fixedOutput._debugInfo = {
  fromNode: "Fix Stage 1 Context",
  contextFixed: true,
  originalHadTemplates: JSON.stringify(stage1Output).includes("{{"),
  stage1Decision: actualOutput.proceed_to_stage2,
  stage1Status: actualOutput.overall_status,
  stage1Alerts: actualOutput.alerts?.total,
  timestamp: new Date().toISOString()
};

// Pass the output wrapper if it existed
if (hasOutputWrapper) {
  fixedOutput.output = actualOutput;
}

return [{
  json: fixedOutput
}];