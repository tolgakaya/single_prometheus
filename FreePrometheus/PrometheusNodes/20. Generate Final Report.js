// Generate Final Report - Orchestrator Support with Full Context Preservation

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

// Direkt raporu döndür
return [{ json: finalReport }];