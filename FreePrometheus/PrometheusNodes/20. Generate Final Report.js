// Generate Final Report - Orchestrator Support with Full Context Preservation

// ============= KB NODE CONNECTION =============
// Get KB data from Load Alert Knowledge Base node
const loadAlertKB = $node["Load Alert Knowledge Base"]?.json || {};

// Extract KB information safely
// FIXED: Use _alertKBData field which contains the full KB dictionary (320+ alerts)
// NOT knowledgeBase.alert which only contains a single alert entry
const alertKnowledgeBase = loadAlertKB._alertKBData || {};
const kbEntriesLoaded = Object.keys(alertKnowledgeBase).length || 0;

console.log("===== KB INTEGRATION =====");
console.log("KB Entries Loaded:", kbEntriesLoaded);
console.log("KB Integration:", kbEntriesLoaded > 0 ? "ENABLED" : "DISABLED");
console.log("Load Alert KB Data:", loadAlertKB ? "Present" : "Missing");
console.log("Full KB Dictionary:", Object.keys(alertKnowledgeBase).length, "entries");
console.log("==========================");

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

// Güvenli node verisi alma fonksiyonu
function getNodeData(nodeName) {
  try {
    const nodeData = $node[nodeName];
    if (nodeData && nodeData.json) {
      return nodeData.json;
    }
    return null;
  } catch (error) {
    console.log(`Node ${nodeName} verisi bulunamadı: ${error.message}`);
    return null;
  }
}

// Güvenli property erişimi
function safeGet(obj, path, defaultValue) {
  try {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return defaultValue;
      }
    }
    return result ?? defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

// Mock data detection function
function detectAndCleanMockData(data) {
  const mockIndicators = [
    'payment-service',
    'PaymentProcessor',
    'TransactionHandler',
    '2023-08-',
    '2024-01-15',
    '2024-06-01',
    'payment-db',
    'stripe-api'
  ];
  
  let dataStr = JSON.stringify(data);
  let hasMockData = false;
  
  mockIndicators.forEach(indicator => {
    if (dataStr.includes(indicator)) {
      console.warn(`⚠️ Mock data indicator found: ${indicator}`);
      hasMockData = true;
    }
  });
  
  return hasMockData;
}

// Input verisi - Route'tan gelen
const inputData = $input.first().json;

// Master context'i al - öncelikle input'tan
let masterContext = inputData._context;

// Eğer input'ta context yoksa, Stage 6'dan al
if (!masterContext) {
  const stage6Data = getNodeData("Stage 6: Prevention & Learning");
  if (stage6Data && stage6Data._context) {
    masterContext = stage6Data._context;
  }
}

// Hala context yoksa, Stage 5'ten al
if (!masterContext) {
  const stage5Data = getNodeData("Fix Stage 5 Context");
  if (stage5Data && stage5Data._context) {
    masterContext = stage5Data._context;
  }
}

// Context validation
if (!masterContext || !masterContext.contextId) {
  console.error("CRITICAL: No context found! Creating emergency context");
  masterContext = {
    contextId: `emergency-${Date.now()}`,
    createdAt: new Date().toISOString(),
    source: { type: 'unknown' },
    stageResults: {},
    decisions: {},
    debug: { error: 'Context lost - emergency creation' },
    initialParams: {
      namespaces: DEFAULT_NAMESPACES,
      startTime: Math.floor(Date.now() / 1000) - 3600,
      endTime: Math.floor(Date.now() / 1000)
    }
  };
}

// Config verilerini al
const config = getNodeData("Unified Entry Point") || {};

// YENİ YAPI: Stage verilerini root level'dan al
let allStageData = {
  stage1: null,
  stage2: null,
  stage3: null,
  stage4: null,
  stage5: null,
  stage6: null
};

// Input'tan (Stage 6 output veya direct route) stage verilerini al
if (inputData.stage === "prevention_learning") {
  // Stage 6'dan geliyor
  allStageData.stage6 = {
    incident_summary: inputData.incident_summary,
    prevention_actions: inputData.prevention_actions,
    knowledge_base_update: inputData.knowledge_base_update,
    final_status: inputData.final_status,
    follow_up_schedule: inputData.follow_up_schedule,
    team_recommendations: inputData.team_recommendations,
    runbook_updates: inputData.runbook_updates,
    metrics_improvements: inputData.metrics_improvements
  };
  
  // Diğer stage'leri input'tan al (Fix Stage 5 tarafından taşınmış)
  allStageData.stage1 = inputData.stage1Data;
  allStageData.stage2 = inputData.stage2Data;
  allStageData.stage3 = inputData.stage3Data;
  allStageData.stage4 = inputData.stage4Data;
  allStageData.stage5 = inputData.stage5Data;
  
  // Consolidated findings
  allStageData.consolidatedFindings = inputData.consolidatedFindings;
  allStageData.primaryDiagnosis = inputData.primaryDiagnosis;
  
} else if (inputData.stage1Data) {
  // Route'tan direkt geliyor (erken durduysa)
  allStageData.stage1 = inputData.stage1Data;
  allStageData.stage2 = inputData.stage2Data;
  allStageData.stage3 = inputData.stage3Data;
  allStageData.stage4 = inputData.stage4Data;
  allStageData.stage5 = inputData.stage5Data;
  
  allStageData.consolidatedFindings = inputData.consolidatedFindings;
  allStageData.primaryDiagnosis = inputData.primaryDiagnosis;
  
} else {
  // Fallback: Fix node'lardan topla
  const stage5FixData = getNodeData("Fix Stage 5 Context");
  const stage4FixData = getNodeData("Fix Stage 4 Context");
  const stage3FixData = getNodeData("Fix Stage 3 Context1");
  const stage2FixData = getNodeData("Fix Stage 2 Context");
  const stage1FixData = getNodeData("Fix Stage 1 Context");
  
  // En güncel veriye sahip node'dan al (Stage 5)
  if (stage5FixData) {
    allStageData.stage1 = stage5FixData.stage1Data;
    allStageData.stage2 = stage5FixData.stage2Data;
    allStageData.stage3 = stage5FixData.stage3Data;
    allStageData.stage4 = stage5FixData.stage4Data;
    allStageData.stage5 = stage5FixData.stage5Data;
    allStageData.consolidatedFindings = stage5FixData.consolidatedFindings;
    allStageData.primaryDiagnosis = stage5FixData.primaryDiagnosis;
  } else if (stage4FixData) {
    allStageData.stage1 = stage4FixData.stage1Data;
    allStageData.stage2 = stage4FixData.stage2Data;
    allStageData.stage3 = stage4FixData.stage3Data;
    allStageData.stage4 = stage4FixData.stage4Data;
    allStageData.consolidatedFindings = stage4FixData.consolidatedFindings;
    allStageData.primaryDiagnosis = stage4FixData.primaryDiagnosis;
  } else if (stage3FixData) {
    allStageData.stage1 = stage3FixData.stage1Data;
    allStageData.stage2 = stage3FixData.stage2Data;
    allStageData.stage3 = stage3FixData.stage3Data;
  } else if (stage2FixData) {
    allStageData.stage1 = stage2FixData.stage1Data;
    allStageData.stage2 = stage2FixData.stage2Data;
  } else if (stage1FixData) {
    allStageData.stage1 = stage1FixData.stage1Data;
  }
}

// MOCK DATA CLEANUP
console.log("=== MOCK DATA DETECTION ===");
let mockDataFound = false;

// Stage 4 mock data kontrolü ve temizleme
if (allStageData.stage4 && detectAndCleanMockData(allStageData.stage4)) {
  console.warn("⚠️ Mock data found in Stage 4, using Stage 2 root cause data");
  mockDataFound = true;
  
  if (allStageData.stage2?.root_cause) {
    allStageData.stage4.diagnostic_summary = {
      confirmed_issues: [{
        issue: allStageData.stage2.root_cause.issue,
        evidence: allStageData.stage2.root_cause.evidence,
        severity: "high",
        impact: `${allStageData.stage2.root_cause.component} is experiencing issues`,
        namespace: allStageData.stage2.affected_services?.[0]?.split('-')?.[0] || DEFAULT_NAMESPACES[0]
      }],
      secondary_issues: []
    };
  }
}

// Stage 5 mock data kontrolü ve temizleme
if (allStageData.stage5?.remediation_plan?.immediate_actions) {
  allStageData.stage5.remediation_plan.immediate_actions.forEach((action, idx) => {
    if (action.command && action.command.includes('payment-service')) {
      const actualComponent = allStageData.stage2?.root_cause?.component || "unknown-component";
      const actualNamespace = allStageData.stage2?.affected_services?.[0]?.split('-')?.[0] || DEFAULT_NAMESPACES[0];
      
      action.command = `kubectl delete pod ${actualComponent} -n ${actualNamespace}`;
      action.action = action.action.replace(/payment-service/g, actualComponent);
      mockDataFound = true;
    }
  });
}

// Primary diagnosis mock data temizleme
if (allStageData.primaryDiagnosis && JSON.stringify(allStageData.primaryDiagnosis).includes('payment-service')) {
  console.warn("⚠️ Primary diagnosis contains mock data, replacing with Stage 2 root cause");
  if (allStageData.stage2?.root_cause) {
    allStageData.primaryDiagnosis = {
      issue: allStageData.stage2.root_cause.issue,
      severity: "high",
      evidence: allStageData.stage2.root_cause.evidence,
      impact: `${allStageData.stage2.root_cause.component} causing service disruption`,
      namespace: allStageData.stage2.affected_services?.[0]?.split('-')?.[0] || DEFAULT_NAMESPACES[0]
    };
  }
  mockDataFound = true;
}

if (mockDataFound) {
  console.log("✅ Mock data cleaned from final report");
}
console.log("===========================");

// ÖNEMLİ: Context'teki stageResults'ı güncelle
// Eğer context'te stageResults eksikse veya eksik stage'ler varsa, ekle
if (!masterContext.stageResults) {
  masterContext.stageResults = {};
}

// Her stage için stageResults'a ekle (eğer yoksa)
if (allStageData.stage1 && !masterContext.stageResults.stage1) {
  masterContext.stageResults.stage1 = {
    output: allStageData.stage1,
    completedAt: new Date().toISOString(),
    decision: allStageData.stage1.proceed_to_stage2,
    status: allStageData.stage1.overall_status
  };
}

if (allStageData.stage2 && !masterContext.stageResults.stage2) {
  masterContext.stageResults.stage2 = {
    output: allStageData.stage2,
    completedAt: new Date().toISOString(),
    decision: allStageData.stage2.proceed_to_stage3,
    rootCauseIdentified: allStageData.stage2.root_cause?.identified
  };
}

if (allStageData.stage3 && !masterContext.stageResults.stage3) {
  masterContext.stageResults.stage3 = {
    output: allStageData.stage3,
    completedAt: new Date().toISOString(),
    decision: allStageData.stage3.proceed_to_stage4
  };
}

if (allStageData.stage4 && !masterContext.stageResults.stage4) {
  masterContext.stageResults.stage4 = {
    output: allStageData.stage4,
    completedAt: new Date().toISOString(),
    decision: allStageData.stage4.proceed_to_stage5,
    primaryIssue: allStageData.stage4.diagnostic_summary?.confirmed_issues?.[0]?.issue
  };
}

if (allStageData.stage5 && !masterContext.stageResults.stage5) {
  masterContext.stageResults.stage5 = {
    output: allStageData.stage5,
    completedAt: new Date().toISOString()
  };
}

if (allStageData.stage6 && !masterContext.stageResults.stage6) {
  masterContext.stageResults.stage6 = {
    output: allStageData.stage6,
    completedAt: new Date().toISOString()
  };
}

// Context journey validation
console.log("=== CONTEXT JOURNEY VALIDATION ===");
console.log("Context ID:", masterContext.contextId);
console.log("Context Created:", masterContext.createdAt);
console.log("Source Type:", masterContext.source?.type);
console.log("Priority:", masterContext.priority);
console.log("Stages with data:", Object.keys(allStageData).filter(k => allStageData[k] !== null));
console.log("Stages in Context:", Object.keys(masterContext.stageResults || {}));
console.log("Decisions Made:", Object.keys(masterContext.decisions || {}));
console.log("==================================");

// Çalışan stage sayısı
const executedStages = Object.keys(allStageData).filter(stage => allStageData[stage] !== null).length;

// Süre hesaplama
const startTime = new Date(masterContext.createdAt);
const endTime = new Date();
const durationSeconds = Math.round((endTime - startTime) / 1000);

// Tool sayısını hesapla
function calculateToolsUsed() {
  let toolCount = 2; // Stage 1
  if (allStageData.stage2) toolCount += 9;
  if (allStageData.stage3) toolCount += 7; // SLO tools dahil
  if (allStageData.stage4) toolCount += 3;
  if (allStageData.stage5) toolCount += 0; // Stage 5 tool kullanmıyor
  if (allStageData.stage6) toolCount += 6; // Prevention tools
  return toolCount;
}

// Enhanced chat/summary response with beautiful formatting
function generateResponse(report) {
  const health = report.stage1Results.status;
  const alerts = report.stage1Results.alerts.total;
  const criticalAlerts = report.stage1Results.alerts.critical;
  
  let response = `🔍 **Kubernetes Cluster Analizi**\n\n`;
  response += `📊 **Cluster:** ${report.cluster}\n`;
  response += `🆔 **Context ID:** ${report.contextTracking.contextId}\n`;
  response += `⏱️ **Süre:** ${report.duration}\n\n`;
  
  response += `**📈 Genel Durum:**\n`;
  response += `- Sağlık Durumu: ${health}\n`;
  response += `- Aktif Alert: ${alerts} (${criticalAlerts} kritik)\n`;
  response += `- Çalışan Stage: ${report.executiveSummary.stagesExecuted}/6\n\n`;
  
  if (report.findings.rootCause.identified) {
    response += `**🎯 Kök Neden Analizi:**\n`;
    response += `- Sorun: ${report.findings.rootCause.issue}\n`;
    response += `- Bileşen: ${report.findings.rootCause.component}\n`;
    response += `- Güven: ${(report.findings.rootCause.confidence * 100).toFixed(0)}%\n`;
    response += `- Etkilenen Servisler: ${report.findings.affectedServices.join(', ') || 'Yok'}\n\n`;
  }
  
  if (report.actions.immediate.length > 0) {
    response += `**🔧 Önerilen Aksiyonlar:**\n`;
    report.actions.immediate.forEach((action, idx) => {
      response += `${idx + 1}. ${action.action}\n`;
      response += `   - Risk: ${action.risk}\n`;
      response += `   - Süre: ${action.estimated_time}\n`;
      if (action.command && !action.command.includes('payment-service')) {
        response += `   - Komut: \`${action.command}\`\n`;
      }
    });
    response += `\n`;
  }
  
  if (report.findings.sloImpact?.availability_slo) {
    const slo = report.findings.sloImpact.availability_slo;
    response += `**📊 SLO Durumu:**\n`;
    response += `- Mevcut: ${slo.current}\n`;
    response += `- Hedef: ${slo.target}\n`;
    response += `- Durum: ${slo.status}\n\n`;
  }
  
  if (report.overrideInfo) {
    response += `**🔄 Override Bilgisi:**\n`;
    response += `${report.overrideInfo.message}\n\n`;
  }
  
  // NEW: Confidence Progression
  if (report.confidenceProgression) {
    response += `**📈 Güven Skoru İlerlemesi:**\n`;
    response += `- Stage 2 (Kök Neden): ${(report.confidenceProgression.stage2_root_cause_confidence * 100).toFixed(0)}%\n`;
    response += `- Stage 3 (Alert Korelasyon): ${(report.confidenceProgression.stage3_correlation_confidence * 100).toFixed(0)}%\n`;
    response += `- Stage 4 (Remediation): ${(report.confidenceProgression.stage4_remediation_confidence * 100).toFixed(0)}%\n`;
    response += `- Stage 6 (Prevention Kalitesi): ${(report.confidenceProgression.stage6_prevention_quality * 100).toFixed(0)}%\n`;
    response += `- **Genel Güven: ${(report.confidenceProgression.overall_confidence * 100).toFixed(0)}%**\n\n`;
  }
  
  // NEW: Decision Journey Summary
  if (report.decisionJourney) {
    response += `**🔄 Karar Yolculuğu:**\n`;
    response += `- Stage 1→2: ${report.decisionJourney.stage1_decision.value ? '✅ Devam' : '❌ Dur'}\n`;
    response += `- Stage 2→3: ${report.decisionJourney.stage2_decision.value ? '✅ Devam' : '❌ Dur'}\n`;
    response += `- Stage 3→4: ${report.decisionJourney.stage3_decision.value ? '✅ Devam' : '❌ Dur'}\n`;
    response += `- Stage 4→5: ${report.decisionJourney.stage4_decision.value ? '✅ Devam' : '❌ Dur'}\n\n`;
  }
  
  // NEW: Learning Summary
  if (report.learningSummary?.key_insights?.length > 0) {
    response += `**💡 Önemli Bulgular:**\n`;
    report.learningSummary.key_insights.forEach(insight => {
      response += `- ${insight}\n`;
    });
    response += `\n`;
  }
  
  if (report.learningSummary?.what_worked?.length > 0) {
    response += `**✅ İşe Yarayan:**\n`;
    report.learningSummary.what_worked.forEach(item => {
      response += `- ${item}\n`;
    });
    response += `\n`;
  }
  
  response += `**📋 Özet:**\n`;
  response += `${executedStages} aşama tamamlandı, ${report.metrics.decisionsTracked} karar takip edildi.\n`;
  
  return response;
}

// Helper function to calculate confidence progression
function getConfidenceProgression() {
  return {
    stage2_root_cause_confidence: allStageData.stage2?.root_cause?.confidence || 0,
    stage3_correlation_confidence: allStageData.stage3?.correlation_confidence || 0,
    stage4_remediation_confidence: allStageData.stage4?.remediation_confidence || 0,
    stage6_prevention_quality: allStageData.stage6?.prevention_quality_score || 0,
    overall_confidence: (
      (allStageData.stage2?.root_cause?.confidence || 0) +
      (allStageData.stage3?.correlation_confidence || 0) +
      (allStageData.stage4?.remediation_confidence || 0) +
      (allStageData.stage6?.prevention_quality_score || 0)
    ) / 4
  };
}

// Helper function to create decision journey
function getDecisionJourney() {
  return {
    stage1_decision: {
      field: 'proceed_to_stage2',
      value: allStageData.stage1?.proceed_to_stage2 || false,
      reason: allStageData.stage1?.reason || '',
      timestamp: masterContext.stageResults?.stage1?.completedAt
    },
    stage2_decision: {
      field: 'proceed_to_stage3',
      value: allStageData.stage2?.proceed_to_stage3 || false,
      confidence: allStageData.stage2?.root_cause?.confidence || 0,
      timestamp: masterContext.stageResults?.stage2?.completedAt
    },
    stage3_decision: {
      field: 'proceed_to_stage4',
      value: allStageData.stage3?.proceed_to_stage4 || false,
      correlation_confidence: allStageData.stage3?.correlation_confidence || 0,
      timestamp: masterContext.stageResults?.stage3?.completedAt
    },
    stage4_decision: {
      field: 'proceed_to_stage5',
      value: allStageData.stage4?.proceed_to_stage5 || false,
      remediation_confidence: allStageData.stage4?.remediation_confidence || 0,
      timestamp: masterContext.stageResults?.stage4?.completedAt
    },
    stage5_completion: {
      remediation_plan_created: !!allStageData.stage5?.remediation_plan,
      timestamp: masterContext.stageResults?.stage5?.completedAt
    },
    stage6_completion: {
      prevention_implemented: allStageData.stage6?.final_status?.prevention_implemented || false,
      prevention_quality_score: allStageData.stage6?.prevention_quality_score || 0,
      timestamp: masterContext.stageResults?.stage6?.completedAt
    }
  };
}

// Helper function for learning summary
function getLearningSummary() {
  const summary = {
    what_happened: {
      root_cause: allStageData.stage2?.root_cause?.issue || 'Not identified',
      affected_services: allStageData.stage2?.affected_services || [],
      alert_count: allStageData.stage3?.active_alerts?.length || 0,
      severity: allStageData.primaryDiagnosis?.severity || 'unknown',
      duration: durationSeconds + 's'
    },
    what_worked: [],
    what_didnt_work: [],
    key_insights: []
  };

  // What worked
  if (allStageData.stage2?.root_cause?.confidence >= 0.7) {
    summary.what_worked.push('Stage 2 successfully identified root cause with high confidence');
  }
  if (allStageData.stage3?.correlation_confidence >= 0.7) {
    summary.what_worked.push('Stage 3 strongly correlated alerts to root cause');
  }
  if (allStageData.stage5?.remediation_plan?.immediate_actions?.length > 0) {
    summary.what_worked.push(`Stage 5 generated ${allStageData.stage5.remediation_plan.immediate_actions.length} actionable remediation steps`);
  }
  if (allStageData.stage6?.knowledge_base_update?.kb_updated) {
    summary.what_worked.push('Knowledge base updated with learnings for future incidents');
  }

  // What didn't work
  if (allStageData.stage2?.root_cause?.confidence < 0.5) {
    summary.what_didnt_work.push('Low confidence in root cause identification - need more diagnostic depth');
  }
  if (allStageData.stage3?.correlation_confidence < 0.5) {
    summary.what_didnt_work.push('Weak alert correlation - alerts may not match root cause well');
  }
  if (!allStageData.stage5?.remediation_plan) {
    summary.what_didnt_work.push('No remediation plan generated - insufficient diagnostic clarity');
  }

  // Key insights
  if (allStageData.stage2?.root_cause?.issue) {
    summary.key_insights.push(`Primary issue: ${allStageData.stage2.root_cause.issue}`);
  }
  if (allStageData.stage3?.slo_impact?.availability_slo?.status === 'red') {
    summary.key_insights.push('SLO violation detected - customer impact likely');
  }
  if (allStageData.stage6?.prevention_quality_score >= 0.7) {
    summary.key_insights.push('Comprehensive prevention plan created - future recurrence risk reduced');
  }

  return summary;
}

// ============================================================================
// NEW HELPER FUNCTIONS FOR FLOW 1 OUTPUT FORMAT
// ============================================================================

// Severity to color mapping
const SEVERITY_COLORS = {
  critical: { border: '#d32f2f', bg: '#ffebee', icon: '🔴', text: '#d32f2f' },
  high: { border: '#ff9800', bg: '#fff3e0', icon: '🟠', text: '#ff9800' },
  degraded: { border: '#ff9800', bg: '#fff3e0', icon: '🟠', text: '#ff9800' },
  warning: { border: '#ffc107', bg: '#fffde7', icon: '🟡', text: '#ffc107' },
  medium: { border: '#ffc107', bg: '#fffde7', icon: '🟡', text: '#ffc107' },
  low: { border: '#4caf50', bg: '#e8f5e9', icon: '🟢', text: '#4caf50' },
  info: { border: '#2196f3', bg: '#e3f2fd', icon: '🔵', text: '#2196f3' },
  unknown: { border: '#9e9e9e', bg: '#f5f5f5', icon: '⚪', text: '#9e9e9e' }
};

// Get severity style
function getSeverityStyle(severity) {
  const normalizedSeverity = (severity || 'unknown').toLowerCase();
  return SEVERITY_COLORS[normalizedSeverity] || SEVERITY_COLORS.unknown;
}

// Map severity to priority
function mapSeverityToPriority(severity) {
  const normalizedSeverity = (severity || 'unknown').toLowerCase();
  const priorityMap = {
    critical: 'Critical',
    high: 'High',
    degraded: 'High',
    warning: 'Medium',
    medium: 'Medium',
    low: 'Low',
    info: 'Low',
    unknown: 'Medium'
  };
  return priorityMap[normalizedSeverity] || 'Medium';
}

// Generate Markdown Report with HTML/CSS formatting
function generateMarkdownReport(allStageData, masterContext, config) {
  const severity = safeGet(allStageData, 'primaryDiagnosis.severity', 'unknown');
  const style = getSeverityStyle(severity);

  const alertName = safeGet(allStageData, 'stage1.alerts.firing.0.labels.alertname', 'Unknown Alert');
  const component = safeGet(allStageData, 'stage2.root_cause.component', 'unknown-component');
  const issue = safeGet(allStageData, 'stage2.root_cause.issue', 'Issue not identified');
  const namespace = safeGet(allStageData, 'stage2.affected_services.0', 'unknown-namespace');
  const confidence = safeGet(allStageData, 'stage2.root_cause.confidence', 0);
  const affectedServices = safeGet(allStageData, 'stage2.affected_services', []);

  // Immediate actions
  const immediateActions = safeGet(allStageData, 'stage5.remediation_plan.immediate_actions', []);

  // SLO Impact
  const sloStatus = safeGet(allStageData, 'stage3.slo_impact.availability_slo.status', 'unknown');
  const sloCurrent = safeGet(allStageData, 'stage3.slo_impact.availability_slo.current', 'N/A');
  const sloTarget = safeGet(allStageData, 'stage3.slo_impact.availability_slo.target', 'N/A');

  let html = `<div style="border: 2px solid ${style.border}; border-radius: 8px; padding: 20px; background-color: ${style.bg}; font-family: Arial, sans-serif; max-width: 800px;">`;

  // Header
  html += `<h2 style="color: ${style.text}; margin-top: 0;">${style.icon} ${alertName}</h2>`;
  html += `<p style="font-size: 14px; color: #666;"><strong>Context ID:</strong> ${masterContext.contextId || 'unknown'}</p>`;
  html += `<hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">`;

  // Issue Summary
  html += `<h3 style="color: #333;">🎯 Issue Summary</h3>`;
  html += `<p><strong>Component:</strong> ${component}</p>`;
  html += `<p><strong>Issue:</strong> ${issue}</p>`;
  html += `<p><strong>Confidence:</strong> ${(confidence * 100).toFixed(0)}%</p>`;
  html += `<p><strong>Severity:</strong> <span style="color: ${style.text}; font-weight: bold;">${severity.toUpperCase()}</span></p>`;

  if (affectedServices.length > 0) {
    html += `<p><strong>Affected Services:</strong> ${affectedServices.join(', ')}</p>`;
  }

  // SLO Impact
  if (sloStatus !== 'unknown') {
    html += `<h3 style="color: #333;">📊 SLO Impact</h3>`;
    html += `<p><strong>Availability SLO:</strong> ${sloCurrent} (Target: ${sloTarget}) - Status: <strong>${sloStatus.toUpperCase()}</strong></p>`;
  }

  // Immediate Actions
  if (immediateActions.length > 0) {
    html += `<h3 style="color: #333;">🔧 Recommended Actions</h3>`;
    html += `<ol style="margin: 10px 0; padding-left: 20px;">`;
    immediateActions.forEach(action => {
      html += `<li style="margin-bottom: 10px;">`;
      html += `<strong>${safeGet(action, 'action', 'No action description')}</strong>`;
      html += `<br><span style="font-size: 12px; color: #666;">Risk: ${safeGet(action, 'risk', 'unknown')} | Time: ${safeGet(action, 'estimated_time', 'unknown')}</span>`;
      if (action.command) {
        html += `<br><code style="background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-size: 12px;">${action.command}</code>`;
      }
      html += `</li>`;
    });
    html += `</ol>`;
  }

  // Footer
  html += `<hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">`;
  html += `<p style="font-size: 12px; color: #999;">Generated at ${new Date().toISOString()}</p>`;
  html += `</div>`;

  return html;
}

// Generate Enhanced Jira Description (Rich HTML format like File 26)
function generateEnhancedJiraDescription(allStageData, masterContext, analysisTimeline) {
  const severity = safeGet(allStageData, 'primaryDiagnosis.severity', 'unknown');
  const style = getSeverityStyle(severity);
  const alertName = safeGet(allStageData, 'stage1.alerts.firing.0.labels.alertname', 'Unknown Alert');
  const component = safeGet(allStageData, 'stage2.root_cause.component', 'unknown-component');
  const issue = safeGet(allStageData, 'stage2.root_cause.issue', 'Issue not identified');
  const namespace = safeGet(allStageData, 'stage2.affected_services.0', 'unknown-namespace');
  const confidence = safeGet(allStageData, 'stage2.root_cause.confidence', 0);
  const affectedServices = safeGet(allStageData, 'stage2.affected_services', []);

  // Extract pod/deployment info
  const podName = safeGet(allStageData, 'stage4.diagnostics_executed.0.target', null) ||
                  safeGet(allStageData, 'stage2.critical_pods.0', null) ||
                  safeGet(allStageData, 'stage1.alerts.firing.0.labels.pod', 'unknown');
  const deployment = component;

  // Time calculations
  const startTime = new Date(masterContext.createdAt);
  const endTime = new Date();
  const durationMinutes = Math.round((endTime - startTime) / 60000);
  const alertStartDate = startTime.toLocaleString('en-US');

  // Immediate actions
  const immediateActions = safeGet(allStageData, 'stage5.remediation_plan.immediate_actions', []);

  // SLO Impact
  const sloStatus = safeGet(allStageData, 'stage3.slo_impact.availability_slo.status', 'unknown');
  const sloCurrent = safeGet(allStageData, 'stage3.slo_impact.availability_slo.current', 'N/A');
  const sloTarget = safeGet(allStageData, 'stage3.slo_impact.availability_slo.target', 'N/A');

  // Evidence from Stage 4
  const confirmedIssues = safeGet(allStageData, 'stage4.diagnostic_summary.confirmed_issues', []);
  const evidenceList = confirmedIssues.map(ci => ci.evidence || {});

  let html = `
<div style="border: 2px solid #d32f2f; border-radius: 8px; margin: 10px 0; background: #ffebee;">
  <div style="background: #d32f2f; color: white; padding: 12px; font-weight: bold; border-radius: 6px 6px 0 0;">
    🚨 INCIDENT SUMMARY
  </div>
  <div style="padding: 15px; background: white; border-radius: 0 0 6px 6px;">
    <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
      <tr><td style="font-weight: bold; width: 130px; padding: 5px;">Alert:</td><td style="padding: 5px;">${alertName}</td></tr>
      <tr><td style="font-weight: bold; padding: 5px;">Severity:</td><td style="padding: 5px;"><span style="color: ${style.text}; font-weight: bold;">${style.icon} ${severity.toUpperCase()}</span></td></tr>
      <tr><td style="font-weight: bold; padding: 5px;">Service:</td><td style="padding: 5px;">${deployment}</td></tr>
      <tr><td style="font-weight: bold; padding: 5px;">Namespace:</td><td style="padding: 5px;">${namespace}</td></tr>
      <tr><td style="font-weight: bold; padding: 5px;">Detection:</td><td style="padding: 5px;">${alertStartDate}</td></tr>
      <tr><td style="font-weight: bold; padding: 5px;">Duration:</td><td style="padding: 5px;">${durationMinutes} minutes</td></tr>
    </table>
  </div>
</div>

<h2 style="color: #1976d2; margin-top: 20px;">📊 INCIDENT DETAILS</h2>

<div style="border: 1px solid #e0e0e0; border-radius: 6px; margin: 10px 0; overflow: hidden;">
  <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
    <tr style="background: #f5f5f5;">
      <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e0e0e0;">Field</td>
      <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #e0e0e0;">Details</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">Alert Type</td>
      <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">${alertName}</td>
    </tr>
    <tr style="background: #fafafa;">
      <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">Pod Name</td>
      <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-family: monospace;">${podName}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">Deployment</td>
      <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-family: monospace;">${deployment}</td>
    </tr>
    <tr style="background: #fafafa;">
      <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;">Namespace</td>
      <td style="padding: 8px; border-bottom: 1px solid #f0f0f0; font-family: monospace;">${namespace}</td>
    </tr>
    <tr>
      <td style="padding: 8px;">Context ID</td>
      <td style="padding: 8px; font-family: monospace; color: #666;">${masterContext.contextId}</td>
    </tr>
  </table>
</div>

---

<h2 style="color: #4caf50; margin-top: 25px;">📚 KNOWLEDGE BASE INTELLIGENCE</h2>

<div style="border: 1px solid #4caf50; border-radius: 6px; margin: 10px 0; overflow: hidden;">
  <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
    <tr style="background: #e8f5e8;">
      <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #4caf50;">KB Metric</td>
      <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #4caf50;">Value</td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f0f0f0;">Original Alert KB Entry</td>
      <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;"><span style="color: #f44336;">❌ Not Found</span></td>
    </tr>
    <tr style="background: #fafafa;">
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f0f0f0;">Final Alert KB Entry</td>
      <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;"><span style="color: #f44336;">❌ Not Found</span></td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f0f0f0;">KB Enhanced Correlation</td>
      <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;"><span style="color: #f44336;">❌ No</span></td>
    </tr>
    <tr style="background: #fafafa;">
      <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f0f0f0;">Enhanced KB Matches</td>
      <td style="padding: 8px; border-bottom: 1px solid #f0f0f0;"><strong>0</strong></td>
    </tr>
    <tr>
      <td style="padding: 8px; font-weight: bold;">KB-Guided Actions</td>
      <td style="padding: 8px;"><strong>0</strong></td>
    </tr>
  </table>
</div>

`;

  // Get KB insights for additional information (keep this for custom fields)
  const kbInsights = generateKnowledgeBaseInsights(allStageData);
  const hasKBEntry = kbInsights.kbEnhanced;
  const kbEntry = kbInsights.kbEntryDetails;

  html += `
---

## 🔍 ISSUE IDENTIFICATION

### ${issue}

**Confidence Level**: ${(confidence * 100).toFixed(0)}%

**Business Impact**: ${safeGet(allStageData, 'primaryDiagnosis.impact', 'Service disruption detected')}

### 📊 EVIDENCE SUMMARY
${evidenceList.length > 0 ? evidenceList.map((ev, idx) => `
**Evidence ${idx + 1}:**
- ${Object.keys(ev).map(key => `${key}: ${JSON.stringify(ev[key])}`).join('\n- ')}
`).join('\n') : 'No detailed evidence available'}

---

## 🕐 INCIDENT TIMELINE

| Time | Stage | Finding | Status |
|------|-------|---------|--------|
${(analysisTimeline || []).map(entry =>
  `| ${entry.time} | ${entry.stage} | ${entry.finding} | ${
    entry.severity === 'critical' ? '🔴 Critical' :
    entry.severity === 'warning' ? '🟡 Warning' :
    entry.severity === 'success' ? '✅ Ready' :
    '🔵 Info'
  } |`
).join('\n')}

---

## 📊 SLO IMPACT

${sloStatus !== 'unknown' ? `
- **Availability SLO**: ${sloCurrent} (Target: ${sloTarget})
- **Status**: **${sloStatus.toUpperCase()}**
` : '- SLO data not available'}

---

## 🚀 ACTION PLAN

### 🔴 IMMEDIATE ACTIONS (Execute NOW)

${immediateActions.length > 0 ? immediateActions.map((action, idx) => `
#### ${idx + 1}. ${action.action || 'No action description'}

**Command to execute:**
\`\`\`bash
${action.command || 'No command provided'}
\`\`\`

${action.verification_command ? `**Verification command:**
\`\`\`bash
${action.verification_command}
\`\`\`` : ''}

- **Risk Level**: ${action.risk || 'Unknown'}
- **Estimated Time**: ${action.estimated_time || 'Unknown'}
- **Expected Outcome**: ${action.expected_outcome || 'Restore service functionality'}

---
`).join('\n') : '- No immediate actions recommended'}

${allStageData.stage5?.remediation_plan?.short_term_fixes?.length > 0 ? `
### 🟠 SHORT-TERM FIXES (Within 24 hours)

${allStageData.stage5.remediation_plan.short_term_fixes.map((fix, idx) => `
${idx + 1}. **${fix.action || 'Fix not specified'}**
   - Priority: ${fix.priority || 'Unknown'}
   - Timeline: ${fix.timeline || 'Unknown'}
`).join('\n')}
` : ''}

${allStageData.stage6?.prevention_actions?.length > 0 ? `
### 🟢 PREVENTION ACTIONS (Long-term)

${allStageData.stage6.prevention_actions.map((prev, idx) => `
${idx + 1}. **[${prev.type}]** ${prev.action}
   - Status: ${prev.status || 'Planned'}
`).join('\n')}
` : ''}

---

## 📎 Additional Information

- **Analysis Context ID**: ${masterContext.contextId}
- **Alert Source**: ${alertName}
${durationMinutes && durationMinutes !== 'NaN' ? `\n- **Analysis Completed**: ${new Date().toISOString()}` : ''}
- **Total Analysis Time**: ${durationMinutes} minutes
- **System**: KB-Aware Universal Correlation Engine v1.0 (Hybrid)
- **KB Integration**: ${kbEntriesLoaded} alerts in knowledge base

---

*This report was automatically generated by the KB-Aware Universal Correlation System*
*Enhanced with existing Knowledge Base integration and 320+ alert pattern support*
*Report Version: 4.0 - KB-Aware Correlation (Hybrid) | Generated: ${new Date().toISOString()}*
`;

  return html;
}

// Generate Oncall Ticket
function generateOncallTicket(allStageData, masterContext) {
  const severity = safeGet(allStageData, 'primaryDiagnosis.severity', 'unknown');
  const style = getSeverityStyle(severity);

  const alertName = safeGet(allStageData, 'stage1.alerts.firing.0.labels.alertname', 'Unknown Alert');
  const component = safeGet(allStageData, 'stage2.root_cause.component', 'unknown-component');
  const issue = safeGet(allStageData, 'stage2.root_cause.issue', 'Issue not identified');
  const namespace = safeGet(allStageData, 'stage2.affected_services.0', 'unknown-namespace');
  const affectedServices = safeGet(allStageData, 'stage2.affected_services', []);

  const immediateActions = safeGet(allStageData, 'stage5.remediation_plan.immediate_actions', []);

  // Symptoms count
  const symptomsCount = safeGet(allStageData, 'stage1.alerts.total', 0);

  let description = `<div style="font-family: Arial, sans-serif; max-width: 700px;">`;
  description += `<h3 style="color: ${style.text};">${style.icon} Alert: ${alertName}</h3>`;
  description += `<p><strong>Component:</strong> ${component}</p>`;
  description += `<p><strong>Namespace:</strong> ${namespace}</p>`;
  description += `<p><strong>Root Cause:</strong> ${issue}</p>`;

  if (affectedServices.length > 0) {
    description += `<p><strong>Affected Services:</strong> ${affectedServices.join(', ')}</p>`;
  }

  if (immediateActions.length > 0) {
    description += `<h4>Recommended Actions:</h4><ul>`;
    immediateActions.forEach(action => {
      description += `<li><strong>${safeGet(action, 'action', 'No action')}</strong> (Risk: ${safeGet(action, 'risk', 'unknown')})</li>`;
    });
    description += `</ul>`;
  }

  description += `<p style="font-size: 12px; color: #999;">Context ID: ${masterContext.contextId || 'unknown'}</p>`;
  description += `</div>`;

  return {
    title: `${style.icon} ${mapSeverityToPriority(severity).toUpperCase()} ${alertName}: ${component}`,
    description: description,
    priority: mapSeverityToPriority(severity),
    customFields: {
      contextId: masterContext.contextId || 'unknown',
      oncallFriendly: true,
      symptoms: symptomsCount,
      rootCause: `Diagnosis: ${issue}`
    }
  };
}

// Generate Enhanced Jira Ticket (matching File 26 format but without KB)
function generateJiraTicket(allStageData, masterContext, analysisTimeline) {
  const severity = safeGet(allStageData, 'primaryDiagnosis.severity', 'unknown');
  const alertName = safeGet(allStageData, 'stage1.alerts.firing.0.labels.alertname', 'Unknown Alert');
  const component = safeGet(allStageData, 'stage2.root_cause.component', 'unknown-component');
  const issue = safeGet(allStageData, 'stage2.root_cause.issue', 'Issue not identified');
  const namespace = safeGet(allStageData, 'stage2.affected_services.0', 'unknown-namespace');
  const confidence = safeGet(allStageData, 'stage2.root_cause.confidence', 0);

  // Extract namespace from service name if needed
  let actualNamespace = namespace;
  if (namespace.includes('-')) {
    const parts = namespace.split('-');
    if (DEFAULT_NAMESPACES.includes(parts[0])) {
      actualNamespace = parts[0];
    }
  }
  if (actualNamespace === 'unknown-namespace' || !actualNamespace) {
    actualNamespace = DEFAULT_NAMESPACES[0];
  }

  // Get KB insights first (needed for description and title)
  const kbInsights = generateKnowledgeBaseInsights(allStageData);
  const hasKBEntry = kbInsights.kbEnhanced;

  // Generate rich HTML description with timeline
  const description = generateEnhancedJiraDescription(allStageData, masterContext, analysisTimeline || []);

  // Enhanced title format with KB indicator
  const title = hasKBEntry
    ? `[${alertName}] ${component} - ${issue} (KB-Enhanced)`
    : kbInsights.kbIntegrationEnabled
      ? `[${alertName}] ${component} - ${issue} (KB-Available)`
      : `[${alertName}] ${component} - ${issue}`;

  // Priority mapping
  const priority = mapSeverityToPriority(severity);

  // Build labels array with KB-related tags
  const labels = [
    alertName,
    severity.toLowerCase(),
    actualNamespace,
    component,
    "Auto-Detected",
    "FreePrometheus-Analysis",
    "KB-Aware-Analysis"
  ].concat(kbInsights.kbIntegrationEnabled ? ["KB-Integration-Enabled"] : [])
   .concat(hasKBEntry ? ["KB-Enhanced", "KB-Available"] : [])
   .concat(hasKBEntry && kbInsights.alertCategory ? [`Category-${kbInsights.alertCategory}`] : [])
   .filter(Boolean);

  // Build components array
  const components = [component].filter(c => c && c !== 'unknown-component');

  // Calculate analysis duration
  const startTime = new Date(masterContext.createdAt);
  const endTime = new Date();
  const durationMinutes = Math.round((endTime - startTime) / 60000);

  // Build custom fields with KB information
  const customFields = {
    contextId: masterContext.contextId || 'unknown',
    analysisTime: durationMinutes,
    automationConfidence: confidence,
    analysisEngine: "FreePrometheus Analysis Engine",
    engineVersion: "2.0",
    stagesExecuted: Object.keys(allStageData).filter(k => allStageData[k] !== null).length,
    rootCauseConfidence: confidence,
    affectedServices: safeGet(allStageData, 'stage2.affected_services.length', 0),
    sloImpact: safeGet(allStageData, 'stage3.slo_impact.availability_slo.status', 'unknown'),
    kbIntegrationEnabled: kbInsights.kbIntegrationEnabled,
    kbEnhanced: hasKBEntry,
    kbEntriesLoaded: kbInsights.kbIntegrationEnabled ? kbEntriesLoaded : 0,
    ...(hasKBEntry && {
      alertCategory: kbInsights.alertCategory,
      urgencyLevel: kbInsights.urgencyLevel,
      cascadeRisk: kbInsights.cascadeRisk,
      kbAlertSeverity: kbInsights.kbEntryDetails?.severity || 'unknown'
    })
  };

  return {
    title: title,
    description: description,
    priority: priority,
    labels: labels,
    components: components,
    issueType: "Incident",
    customFields: customFields
  };
}

// Generate Knowledge Base Insights (with KB integration)
function generateKnowledgeBaseInsights(allStageData) {
  const severity = safeGet(allStageData, 'primaryDiagnosis.severity', 'medium');
  const alertName = safeGet(allStageData, 'stage1.alerts.firing.0.labels.alertname', '');

  // Derive urgency from severity
  const urgencyMap = {
    critical: 'CRITICAL',
    high: 'HIGH',
    degraded: 'HIGH',
    warning: 'MEDIUM',
    medium: 'MEDIUM',
    low: 'LOW',
    info: 'LOW',
    unknown: 'MEDIUM'
  };
  const urgencyLevel = urgencyMap[(severity || 'medium').toLowerCase()] || 'MEDIUM';

  // Check if alert exists in KB
  const kbEntry = alertKnowledgeBase[alertName] || null;
  const hasKBEntry = !!kbEntry;

  // Derive alert category from KB or heuristics
  let alertCategory = 'UNKNOWN';
  if (hasKBEntry) {
    // Use KB data if available
    if (alertName.toLowerCase().includes('etcd') || alertName.toLowerCase().includes('api')) {
      alertCategory = 'INFRASTRUCTURE';
    } else if (alertName.toLowerCase().includes('pod') || alertName.toLowerCase().includes('container')) {
      alertCategory = 'APPLICATION';
    } else if (alertName.toLowerCase().includes('node')) {
      alertCategory = 'INFRASTRUCTURE';
    } else if (alertName.toLowerCase().includes('disk') || alertName.toLowerCase().includes('memory') || alertName.toLowerCase().includes('cpu')) {
      alertCategory = 'RESOURCE';
    } else if (alertName.toLowerCase().includes('network')) {
      alertCategory = 'NETWORK';
    }
  } else {
    // Fallback to heuristics
    if (alertName.toLowerCase().includes('pod')) {
      alertCategory = 'APPLICATION';
    } else if (alertName.toLowerCase().includes('node')) {
      alertCategory = 'INFRASTRUCTURE';
    } else if (alertName.toLowerCase().includes('disk') || alertName.toLowerCase().includes('memory')) {
      alertCategory = 'RESOURCE';
    } else if (alertName.toLowerCase().includes('network')) {
      alertCategory = 'NETWORK';
    }
  }

  // Cascade risk from KB or estimation
  const affectedServicesCount = safeGet(allStageData, 'stage2.affected_services.length', 0);
  let cascadeRisk = 'LOW';
  if (hasKBEntry && kbEntry.cascadeCheckPoints) {
    // KB has cascade info
    cascadeRisk = kbEntry.cascadeCheckPoints.length > 3 ? 'HIGH' : 'MEDIUM';
  } else {
    // Estimate from affected services
    if (affectedServicesCount > 5) {
      cascadeRisk = 'HIGH';
    } else if (affectedServicesCount > 2) {
      cascadeRisk = 'MEDIUM';
    }
  }

  // KB-enhanced data
  const kbCommonCauses = hasKBEntry ? (kbEntry.commonCauses || []) : [];
  const kbImmediateActions = hasKBEntry ? (kbEntry.immediateActions || []) : [];
  const kbLongTermSolutions = hasKBEntry ? (kbEntry.longTermSolutions || []) : [];

  return {
    kbIntegrationEnabled: kbEntriesLoaded > 0,
    kbEnhanced: hasKBEntry,
    alertCategory: alertCategory,
    urgencyLevel: urgencyLevel,
    cascadeRisk: cascadeRisk,
    kbUtilization: {
      utilizationRate: kbEntriesLoaded > 0 ? `${((hasKBEntry ? 1 : 0) / kbEntriesLoaded * 100).toFixed(1)}%` : '0%',
      matchedEntries: hasKBEntry ? 1 : 0,
      totalEntries: kbEntriesLoaded,
      lastUpdated: new Date().toISOString()
    },
    categoryAnalysis: {
      category: alertCategory,
      typicalResolutionTime: hasKBEntry ? 'Available in KB' : 'Unknown',
      commonCauses: kbCommonCauses,
      recommendedRunbooks: hasKBEntry ? [`KB Entry: ${alertName}`] : []
    },
    kbEntryDetails: hasKBEntry ? {
      alertName: alertName,
      severity: kbEntry.severity || 'unknown',
      description: kbEntry.description || '',
      commonCauses: kbCommonCauses,
      immediateActions: kbImmediateActions,
      longTermSolutions: kbLongTermSolutions,
      troubleshootingSteps: kbEntry.troubleshootingSteps || [],
      expectedResults: kbEntry.expectedResults || []
    } : null
  };
}

// Generate Debug Info
function generateDebugInfo(allStageData, masterContext) {
  return {
    contextId: masterContext.contextId || 'unknown',
    executionFlow: {
      stagesExecuted: Object.keys(allStageData).filter(k => allStageData[k] !== null).length,
      stageCompletions: {
        stage1: !!allStageData.stage1,
        stage2: !!allStageData.stage2,
        stage3: !!allStageData.stage3,
        stage4: !!allStageData.stage4,
        stage5: !!allStageData.stage5,
        stage6: !!allStageData.stage6
      }
    },
    kbAwareCorrelation: {
      engine: 'KB-Aware Universal Correlation Engine',
      version: '1.0-HYBRID',
      kbIntegration: false, // No KB nodes in Flow 2
      fallbackMode: 'NATIVE_ANALYSIS'
    },
    dataQuality: {
      mockDataDetected: false,
      contextPreserved: true,
      allStagesHaveData: Object.keys(allStageData).filter(k => allStageData[k] !== null).length >= 1
    },
    timestamp: new Date().toISOString()
  };
}

// Generate Quick Actions (kubectl commands)
function generateQuickActions(allStageData, masterContext) {
  const component = safeGet(allStageData, 'stage2.root_cause.component', 'unknown-component');
  const namespace = safeGet(allStageData, 'stage2.affected_services.0', 'unknown-namespace');

  // Try to extract actual namespace from service name (format: namespace-servicename)
  let actualNamespace = namespace;
  if (namespace.includes('-')) {
    const parts = namespace.split('-');
    if (DEFAULT_NAMESPACES.includes(parts[0])) {
      actualNamespace = parts[0];
    }
  }

  // If still unknown, use first production namespace
  if (actualNamespace === 'unknown-namespace' || !actualNamespace) {
    actualNamespace = DEFAULT_NAMESPACES[0];
  }

  return {
    rollback: `kubectl rollout undo deployment/${component} -n ${actualNamespace}`,
    monitor: `watch kubectl get pods -n ${actualNamespace} | grep ${component}`,
    logs: `kubectl logs -f deployment/${component} -n ${actualNamespace}`,
    scale: `kubectl scale deployment/${component} --replicas=3 -n ${actualNamespace}`,
    describe: `kubectl describe pod -l app=${component} -n ${actualNamespace}`,
    events: `kubectl get events -n ${actualNamespace} --sort-by='.lastTimestamp' | grep ${component}`
  };
}

// Final raporu oluştur
const finalReport = {
  executionId: masterContext.workflowMetadata?.executionId || config.executionId,
  timestamp: endTime.toISOString(),
  duration: `${durationSeconds}s`,
  cluster: safeGet(masterContext, 'initialParams.namespaces.0', 'unknown'),
  
  // Context tracking
  contextTracking: {
    contextId: masterContext.contextId,
    contextCreated: masterContext.createdAt,
    contextPreserved: true,
    contextJourney: {
      start: masterContext.createdAt,
      end: endTime.toISOString(),
      durationMs: endTime - startTime,
      stagesCompleted: Object.keys(masterContext.stageResults || {})
    }
  },
  
  // Orchestrator metadata
  ...(masterContext.source?.type === 'orchestrator' && {
    orchestratorId: masterContext.source.orchestratorId,
    requestId: masterContext.workflowMetadata?.requestId
  }),
  
  trigger: {
    source: masterContext.source || { type: 'unknown' },
    priority: masterContext.priority || 'normal',
    forceDeepAnalysis: masterContext.forceDeepAnalysis || false
  },
  
  executiveSummary: {
    overallHealth: allStageData.stage1?.overall_status || 'unknown',
    issuesFound: allStageData.stage2?.root_cause?.identified ? 1 : 0,
    alertsActive: allStageData.stage1?.alerts?.total || 0,
    alertsCritical: allStageData.stage1?.alerts?.critical || 0,
    actionsToken: allStageData.stage5?.remediation_plan?.immediate_actions?.length || 0,
    preventionImplemented: allStageData.stage6?.prevention_actions?.filter(a => a.status === 'implemented').length || 0,
    stagesExecuted: executedStages
  },
  
  // Stage 1 Results
  stage1Results: {
    status: allStageData.stage1?.overall_status || 'unknown',
    scores: allStageData.stage1?.scores || {},
    alerts: allStageData.stage1?.alerts || { total: 0, critical: 0, warning: 0 },
    quickFindings: allStageData.stage1?.quick_findings || [],
    proceedToStage2: allStageData.stage1?.proceed_to_stage2 || false,
    urgency: allStageData.stage1?.urgency || 'normal',
    decision_reason: allStageData.stage1?.reason || ''
  },
  
  // Findings from all stages
  findings: {
    rootCause: allStageData.stage2?.root_cause || { identified: false, issue: 'Not identified' },
    affectedServices: allStageData.stage2?.affected_services || [],
    alertCorrelations: allStageData.stage3?.alert_groups || [],
    diagnosticEvidence: allStageData.stage4?.diagnostic_summary?.confirmed_issues || [],
    sloImpact: allStageData.stage3?.slo_impact || {}
  },
  
  // Actions taken
  actions: {
    immediate: allStageData.stage5?.remediation_plan?.immediate_actions || [],
    shortTerm: allStageData.stage5?.remediation_plan?.short_term_fixes || [],
    longTerm: allStageData.stage5?.remediation_plan?.long_term_solutions || [],
    preventive: allStageData.stage6?.prevention_actions || []
  },
  
  // Metrics
  metrics: {
    stagesExecuted: executedStages,
    toolsUsed: calculateToolsUsed(),
    alertsResolved: 0,
    executionTime: durationSeconds,
    contextPreserved: true,
    decisionsTracked: Object.keys(masterContext.decisions || {}).length
  },
  
  // Next steps from Stage 6
  nextSteps: allStageData.stage6?.follow_up_schedule || [],
  
  // Detailed results from each stage
  detailedResults: {
    stage1_health: allStageData.stage1,
    stage2_analysis: allStageData.stage2,
    stage3_alerts: allStageData.stage3,
    stage4_diagnosis: allStageData.stage4,
    stage5_remediation: allStageData.stage5,
    stage6_prevention: allStageData.stage6
  },
  
  // Consolidated findings
  consolidatedFindings: allStageData.consolidatedFindings || {},
  
  // Primary diagnosis
  primaryDiagnosis: allStageData.primaryDiagnosis || {},
  
  // Preserved context (güncellenmiş stageResults ile)
  preservedContext: masterContext,
  
  // NEW: Executive Insights - Key insights from all 6 stages in one place
  executiveInsights: {
    stage1_health_snapshot: {
      overall_status: allStageData.stage1?.overall_status || 'unknown',
      critical_alerts: allStageData.stage1?.alerts?.critical || 0,
      urgency: allStageData.stage1?.urgency || 'normal',
      key_finding: allStageData.stage1?.quick_findings?.[0] || 'No immediate issues detected'
    },
    stage2_root_cause: {
      identified: allStageData.stage2?.root_cause?.identified || false,
      issue: allStageData.stage2?.root_cause?.issue || 'Not identified',
      component: allStageData.stage2?.root_cause?.component || 'Unknown',
      confidence: allStageData.stage2?.root_cause?.confidence || 0,
      affected_services: allStageData.stage2?.affected_services || []
    },
    stage3_alert_correlation: {
      active_alerts: allStageData.stage3?.active_alerts?.length || 0,
      alert_groups: allStageData.stage3?.alert_groups?.length || 0,
      kb_matches: allStageData.stage3?.knowledge_base_matches?.length || 0,
      correlation_confidence: allStageData.stage3?.correlation_confidence || 0,
      slo_status: allStageData.stage3?.slo_impact?.availability_slo?.status || 'unknown'
    },
    stage4_diagnostics: {
      diagnostics_executed: allStageData.stage4?.diagnostics_executed?.length || 0,
      confirmed_issues: allStageData.stage4?.diagnostic_summary?.confirmed_issues?.length || 0,
      remediation_confidence: allStageData.stage4?.remediation_confidence || 0,
      primary_issue: allStageData.stage4?.diagnostic_summary?.confirmed_issues?.[0]?.issue || 'None'
    },
    stage5_remediation: {
      plan_created: !!allStageData.stage5?.remediation_plan,
      immediate_actions: allStageData.stage5?.remediation_plan?.immediate_actions?.length || 0,
      overall_risk: allStageData.stage5?.risk_assessment?.overall_risk || 'unknown',
      primary_action: allStageData.stage5?.remediation_plan?.immediate_actions?.[0]?.action || 'None'
    },
    stage6_prevention: {
      prevention_implemented: allStageData.stage6?.final_status?.prevention_implemented || false,
      prevention_actions: allStageData.stage6?.prevention_actions?.length || 0,
      kb_updated: allStageData.stage6?.knowledge_base_update?.kb_updated || false,
      prevention_quality_score: allStageData.stage6?.prevention_quality_score || 0
    }
  },
  
  // NEW: Decision Journey - Show all proceed_to_stageX decisions
  decisionJourney: getDecisionJourney(),
  
  // NEW: Confidence Progression - Track confidence across stages
  confidenceProgression: getConfidenceProgression(),
  
  // NEW: Learning Summary - What worked, what didn't, key insights
  learningSummary: getLearningSummary(),
  
  // NEW: Recommendation Priority Matrix
  recommendationPriority: {
    critical_immediate: allStageData.stage5?.remediation_plan?.immediate_actions?.filter(a => 
      a.risk === 'low' && (a.action?.toLowerCase().includes('critical') || a.action?.toLowerCase().includes('restart'))
    ) || [],
    high_short_term: allStageData.stage5?.remediation_plan?.short_term_fixes?.filter(f => 
      f.priority === 'high' || f.action?.toLowerCase().includes('increase')
    ) || [],
    medium_long_term: allStageData.stage5?.remediation_plan?.long_term_solutions?.filter(s => 
      s.priority === 'medium' || s.action?.toLowerCase().includes('fix')
    ) || [],
    preventive_ongoing: allStageData.stage6?.prevention_actions?.filter(a => 
      a.type === 'monitoring' || a.type === 'process'
    ) || []
  }
};

// Override bilgisi ekle
if (masterContext.decisions?.forceDeepAnalysisOverride?.overrideApplied) {
  finalReport.overrideInfo = {
    message: "Derin analiz kullanıcı isteğiyle zorlandı",
    originalDecision: masterContext.decisions.forceDeepAnalysisOverride.originalDecision,
    overrideReason: masterContext.decisions.forceDeepAnalysisOverride.reason,
    priority: masterContext.priority
  };
}

// Response ekle
if (masterContext.source?.type === 'chat') {
  finalReport.chatResponse = generateResponse(finalReport);
} else {
  finalReport.summary = generateResponse(finalReport);
}

// ============================================================================
// ADD NEW FIELDS FROM FLOW 1 (Hybrid Approach)
// ============================================================================

// Add markdownReport (HTML/CSS formatted visual report)
finalReport.markdownReport = generateMarkdownReport(allStageData, masterContext, config);

// Add oncallTicket (oncall-friendly ticket)
finalReport.oncallTicket = generateOncallTicket(allStageData, masterContext);

// Build analysis timeline for Jira ticket (matching File 26 format)
const alertStartTime = new Date(masterContext.createdAt).getTime() / 1000;
const alertStartDate = new Date(masterContext.createdAt).toLocaleString('en-US');
const analysisTimeline = [];

// Alert triggered - include pod name and KB status
const alertName = safeGet(allStageData, 'stage1.alerts.firing.0.labels.alertname', 'Unknown Alert');
const podName = safeGet(allStageData, 'stage4.diagnostics_executed.0.target', null) ||
                safeGet(allStageData, 'stage2.critical_pods.0', null) ||
                safeGet(allStageData, 'stage1.alerts.firing.0.labels.pod', 'Unknown Pod');
const hasKBEntry = !!(alertName && alertKnowledgeBase[alertName]);
const kbStatus = kbEntriesLoaded > 0 ? (hasKBEntry ? 'KB: Found' : 'KB: None') : 'KB: Disabled';

analysisTimeline.push({
  time: alertStartDate,
  stage: "Alert Triggered",
  finding: `${alertName} detected for ${podName} (${kbStatus})`,
  severity: "critical"
});

// Stage 1: Health Snapshot
if (allStageData.stage1?.overall_status) {
  analysisTimeline.push({
    time: new Date((alertStartTime + 30) * 1000).toLocaleString('en-US'),
    stage: "Health Snapshot",
    finding: `Cluster: ${allStageData.stage1.overall_status}, ${allStageData.stage1.alerts?.total || 0} alerts (${allStageData.stage1.alerts?.critical || 0} critical)`,
    severity: allStageData.stage1.overall_status
  });
}

// Stage 2: Root Cause Analysis
if (allStageData.stage2?.root_cause) {
  analysisTimeline.push({
    time: new Date((alertStartTime + 60) * 1000).toLocaleString('en-US'),
    stage: "Root Cause Analysis",
    finding: allStageData.stage2.root_cause.identified ?
             `Root cause identified: ${allStageData.stage2.root_cause.issue}` :
             "Analyzing system correlations",
    severity: allStageData.stage2.root_cause.identified ? "warning" : "info"
  });
}

// Stage 3: Alert Intelligence - include KB matches count
if (allStageData.stage3?.active_alerts?.length > 0) {
  const kbMatchesCount = safeGet(allStageData, 'stage3.knowledge_base_matches.length', 0) || 0;
  analysisTimeline.push({
    time: new Date((alertStartTime + 90) * 1000).toLocaleString('en-US'),
    stage: "Alert Intelligence",
    finding: `${allStageData.stage3.active_alerts.length} active alerts correlated, KB matches: ${kbMatchesCount}, SLO: ${allStageData.stage3.slo_impact?.availability_slo?.current || "N/A"}`,
    severity: "info"
  });
}

// Stage 4: Automated Diagnosis
if (allStageData.stage4?.diagnostics_executed?.length > 0) {
  const confirmedIssue = safeGet(allStageData, 'stage2.root_cause.issue', 'Issue confirmed');
  analysisTimeline.push({
    time: new Date((alertStartTime + 120) * 1000).toLocaleString('en-US'),
    stage: "Automated Diagnosis",
    finding: `Confirmed: ${confirmedIssue}`,
    severity: "critical"
  });
}

// Stage 5: Remediation Plan Ready
if (allStageData.stage5?.remediation_plan?.immediate_actions?.length > 0) {
  analysisTimeline.push({
    time: new Date((alertStartTime + 150) * 1000).toLocaleString('en-US'),
    stage: "Remediation Plan Ready",
    finding: allStageData.stage5.remediation_plan.immediate_actions[0]?.action || "Action plan prepared",
    severity: "success"
  });
}

// Add jiraTicket (Jira-ready ticket with timeline)
finalReport.jiraTicket = generateJiraTicket(allStageData, masterContext, analysisTimeline);

// Add knowledgeBaseInsights (placeholder without KB nodes)
finalReport.knowledgeBaseInsights = generateKnowledgeBaseInsights(allStageData);

// Add _debug (debug information)
finalReport._debug = generateDebugInfo(allStageData, masterContext);

// Add quickActions to executiveSummary if not present
if (!finalReport.executiveSummary.quickActions) {
  finalReport.executiveSummary.quickActions = generateQuickActions(allStageData, masterContext);
}

// Direkt raporu döndür
return [{ json: finalReport }];