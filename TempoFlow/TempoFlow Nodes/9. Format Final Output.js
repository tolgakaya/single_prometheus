// Format Final Output - COMPLETE VERSION with All Improvements
const allInputs = $input.all();
console.log('=== FORMAT FINAL OUTPUT WITH COMPLETE ERROR HANDLING ===');
console.log('Total inputs:', allInputs.length);

let stage1Result = null;
let stage2Result = null;
let serviceContext = null;
let analysisMetadata = null;
let inputConfig = null;  // YENİ EKLE

// Process all inputs - now including service context and metadata
allInputs.forEach((input, index) => {
  const data = input.json;
  
  // Extract stage results and service context
  if (data.stage1) {
    stage1Result = data.stage1;
    serviceContext = data.serviceContext;
    analysisMetadata = data.analysisMetadata;

    if (data.chatContext || data.analysisConfig) {
      inputConfig = {
        source: data.source || data.stage1?.analysis_context?.source || 'unknown',
        analysisConfig: data.analysisConfig || {},
        chatContext: data.chatContext || {}
      };
  }
  }
  if (data.stage2) {
    stage2Result = data.stage2;
  }
  
  // Direct stage results
  if (data.stage === 'health_check') {
    stage1Result = data;
  }
  if (data.stage === 'deep_investigation') {
    stage2Result = data;
  }
});

// YENİ EKLE: inputConfig yoksa Unified Entry Point'ten al
if (!inputConfig) {
  inputConfig = $node["Unified Entry Point"]?.json || {};
}

console.log('Stage 1 found:', !!stage1Result);
console.log('Stage 2 found:', !!stage2Result);
console.log('Service context found:', !!serviceContext);
 

// Build enhanced final output with complete error handling
const finalOutput = {
  analysisComplete: true,
  timestamp: new Date().toISOString(),
  workflowExecutionId: $execution.id,
  
  // Basic health check results - UPDATED with reconciliation
  healthCheck: {
    status: stage1Result?.status || 'unknown',
    errorCount: serviceContext?.reconciliatedErrors?.totalErrors || stage1Result?.metrics?.error_count || 0,
    errorTypes: stage1Result?.metrics?.error_types || {},
    summary: '', // Will be set below after we know total errors
    servicesChecked: stage1Result?.metrics?.services_checked || [],
    // NEW: Add reconciliation info
    errorReconciliation: {
      stage1Errors: serviceContext?.reconciliatedErrors?.stage1Errors || 0,
      stage2AdditionalErrors: serviceContext?.reconciliatedErrors?.stage2AdditionalErrors || 0,
      totalAfterDeepAnalysis: serviceContext?.reconciliatedErrors?.totalErrors || 0
    }
  },
  
  // Analysis context from orchestrator
  analysisContext: {
    source: stage1Result?.analysis_context?.source || 'unknown',
    priority: stage1Result?.analysis_context?.priority || 'normal',
    orchestratorId: stage1Result?.analysis_context?.orchestrator_id,
    requestId: stage1Result?.analysis_context?.request_id
  },
  
  // UPDATED: Service-specific analysis with Stage 2 findings
  serviceAnalysis: {
    servicesAnalyzed: serviceContext?.detectedServices || [],
    criticalPathAffected: serviceContext?.criticalPathAffected || false,
    affectedPath: serviceContext?.affectedPath || null,
    
    // Service-level error breakdown - MERGE Stage 1 and Stage 2 findings
    errorsByService: {},
    errorsByCriticality: {
      critical: { services: [], totalErrors: 0 },
      high: { services: [], totalErrors: 0 },
      medium: { services: [], totalErrors: 0 },
      low: { services: [], totalErrors: 0 }
    },
    errorsByCategory: {},
    
    // Impact assessment
    impactScore: serviceContext?.serviceErrorAnalysis?.impactScore || 0,
    serviceRecommendations: serviceContext?.serviceErrorAnalysis?.recommendations || [],
    
    // Service metadata
    serviceDetails: {}
  }
};

// CRITICAL: Merge Stage 1 and Stage 2 error findings
// Start with Stage 1 errors
if (serviceContext?.serviceErrorAnalysis?.byService) {
  finalOutput.serviceAnalysis.errorsByService = { ...serviceContext.serviceErrorAnalysis.byService };
}

// Add Stage 2 discovered errors
if (stage2Result?.findings?.exceptions?.by_service) {
  Object.entries(stage2Result.findings.exceptions.by_service).forEach(([service, data]) => {
    if (data.count > 0) {
      if (!finalOutput.serviceAnalysis.errorsByService[service]) {
        // Service not in Stage 1 results - add it
        const serviceInfo = serviceContext?.serviceMetadata?.[service] || {};
        finalOutput.serviceAnalysis.errorsByService[service] = {
          errorCount: data.count,
          errorTypes: data.types || [],
          errorPercentage: ((data.count / finalOutput.healthCheck.errorCount) * 100).toFixed(1),
          criticality: serviceInfo.criticality || 'unknown',
          category: serviceInfo.category || 'unknown',
          slaViolation: false,
          severity: 'medium',
          source: 'stage2_discovery'
        };
      } else {
        // Service exists - update with Stage 2 findings
        finalOutput.serviceAnalysis.errorsByService[service].errorCount += data.count;
        finalOutput.serviceAnalysis.errorsByService[service].errorTypes = [
          ...new Set([
            ...(finalOutput.serviceAnalysis.errorsByService[service].errorTypes || []),
            ...(data.types || [])
          ])
        ];
        finalOutput.serviceAnalysis.errorsByService[service].source = 'both_stages';
      }
    }
  });
  
  // Recalculate impact score with new errors
  let newImpactScore = 0;
  Object.entries(finalOutput.serviceAnalysis.errorsByService).forEach(([service, data]) => {
    const multiplier = {
      'critical': 10,
      'high': 5,
      'medium': 2,
      'low': 1,
      'unknown': 1
    };
    newImpactScore += data.errorCount * (multiplier[data.criticality] || 1);
  });
  finalOutput.serviceAnalysis.impactScore = newImpactScore;
}

// IMPROVEMENT 1: Update health check summary based on actual findings
const totalErrors = finalOutput.healthCheck.errorCount;
const affectedServicesCount = Object.keys(finalOutput.serviceAnalysis.errorsByService).length;

if (totalErrors > 0) {
  finalOutput.healthCheck.summary = `${totalErrors} errors found across ${affectedServicesCount} services`;
  
  // Add error type summary
  const errorTypes = new Set();
  Object.values(finalOutput.serviceAnalysis.errorsByService).forEach(service => {
    (service.errorTypes || []).forEach(type => errorTypes.add(type));
  });
  
  if (errorTypes.size > 0) {
    finalOutput.healthCheck.summary += ` (${Array.from(errorTypes).join(', ')})`;
  }
} else {
  finalOutput.healthCheck.summary = stage1Result?.quick_summary || 'No errors detected';
}

// IMPROVEMENT 2: Populate errorsByCriticality and errorsByCategory
Object.entries(finalOutput.serviceAnalysis.errorsByService).forEach(([service, data]) => {
  // Group by criticality
  const criticality = data.criticality || 'unknown';
  if (finalOutput.serviceAnalysis.errorsByCriticality[criticality]) {
    finalOutput.serviceAnalysis.errorsByCriticality[criticality].services.push(service);
    finalOutput.serviceAnalysis.errorsByCriticality[criticality].totalErrors += data.errorCount;
  }
  
  // Group by category
  const category = data.category || 'unknown';
  if (!finalOutput.serviceAnalysis.errorsByCategory[category]) {
    finalOutput.serviceAnalysis.errorsByCategory[category] = {
      services: [],
      totalErrors: 0
    };
  }
  finalOutput.serviceAnalysis.errorsByCategory[category].services.push(service);
  finalOutput.serviceAnalysis.errorsByCategory[category].totalErrors += data.errorCount;
});

// IMPROVEMENT 3: Add service details with SLA info (remove duplicates)
const processedServices = new Set();
if (serviceContext?.serviceMetadata) {
  Object.entries(serviceContext.serviceMetadata).forEach(([service, metadata]) => {
    if (!processedServices.has(service)) {
      processedServices.add(service);
      finalOutput.serviceAnalysis.serviceDetails[service] = {
        criticality: metadata.criticality,
        category: metadata.category,
        slaThresholds: metadata.slaThresholds,
        errorCount: finalOutput.serviceAnalysis.errorsByService[service]?.errorCount || 0,
        slaViolation: finalOutput.serviceAnalysis.errorsByService[service]?.slaViolation || false
      };
    }
  });
}

// Add dependency chains for affected services
if (serviceContext?.dependencyChains) {
  finalOutput.serviceAnalysis.dependencyChains = serviceContext.dependencyChains;
}

// Add deep analysis if Stage 2 ran
if (stage2Result) {
  finalOutput.deepAnalysis = {
    toolsExecuted: stage2Result.tools_executed || [],
    executionTimeline: stage2Result.execution_timeline || {},
    findings: stage2Result.findings || {},
    affectedComponents: stage2Result.affected_components || {},
    rootCause: stage2Result.root_cause_analysis || {},
    severityAssessment: stage2Result.severity_assessment || {},
    recommendations: stage2Result.recommendations || {},
    // NEW: Add error discovery info
    errorDiscovery: {
      additionalErrorsFound: serviceContext?.reconciliatedErrors?.stage2AdditionalErrors || 0,
      servicesWithNewErrors: Object.keys(serviceContext?.reconciliatedErrors?.serviceBreakdown || {})
    }
  };
  
  finalOutput.deepAnalysisPerformed = true;
} else {
  finalOutput.deepAnalysis = {
    required: stage1Result?.proceed_to_stage2 || false,
    performed: false,
    reason: stage1Result?.proceed_to_stage2 ? 
      "Deep analysis should have been performed but results not found" : 
      "System healthy - no deep analysis needed"
  };
  finalOutput.deepAnalysisPerformed = false;
}

// Generate executive summary based on complete analysis
finalOutput.executiveSummary = {
  overallStatus: determineOverallStatus(finalOutput),
  criticalServices: Object.entries(finalOutput.serviceAnalysis.errorsByService || {})
    .filter(([_, data]) => data.criticality === 'critical')
    .map(([service, _]) => service),
  mainIssues: generateMainIssues(finalOutput),
  immediateActions: generateImmediateActions(finalOutput),
  // NEW: Analysis quality indicator
  analysisQuality: {
    errorDiscrepancy: analysisMetadata?.errorDiscrepancy || false,
    stage2RequiredForAccuracy: analysisMetadata?.reconciliationNeeded || false,
    confidenceLevel: calculateConfidenceLevel(finalOutput)
  }
};

console.log('=== FINAL OUTPUT WITH COMPLETE ERROR HANDLING ===');
console.log('Total errors (reconciled):', finalOutput.healthCheck.errorCount);
console.log('Services with errors:', Object.keys(finalOutput.serviceAnalysis.errorsByService).length);
console.log('Impact score:', finalOutput.serviceAnalysis.impactScore);
console.log('Critical path affected:', finalOutput.serviceAnalysis.criticalPathAffected);
console.log('Errors by criticality:', JSON.stringify(finalOutput.serviceAnalysis.errorsByCriticality, null, 2));
console.log('Errors by category:', JSON.stringify(finalOutput.serviceAnalysis.errorsByCategory, null, 2));

// NEW: Add chat-friendly response if from chat

// NEW: Add chat-friendly response if from chat
// inputConfig kontrolünü düzelt
const isFromChat = stage1Result?.source === 'chat' || 
                   stage1Result?.analysis_context?.source === 'chat' ||
                   stage1Result?.analysisConfig?.requiresServiceDetection ||
                   serviceContext?.chatContext?.isFromChat;

if (isFromChat) {
  console.log('=== GENERATING CHAT RESPONSE ===');
  
  // inputConfig yerine direkt stage1Result'tan al
  const userMessage = stage1Result?.analysisConfig?.chatMessage || 
                      serviceContext?.chatContext?.userMessage || 
                      '';
  
  const chatResponse = {
    type: 'chat-response',
    userMessage: userMessage,
    
    // Özet mesaj
    summary: generateChatSummary(finalOutput),
    
    // Ana bulgular
    findings: {
      errorCount: finalOutput.healthCheck.errorCount,
      affectedServices: Object.keys(finalOutput.serviceAnalysis.errorsByService || {}).length,
      criticalServices: finalOutput.executiveSummary.criticalServices,
      status: finalOutput.executiveSummary.overallStatus
    },
    
    // Öneriler
    recommendations: finalOutput.executiveSummary.immediateActions.slice(0, 3),
    
    // Detaylı bilgi linki
    detailsAvailable: true
  };
  
  finalOutput.chatResponse = chatResponse;
}
// Chat summary generator function
function generateChatSummary(output) {
  const errorCount = output.healthCheck.errorCount || 0;
  const affectedServices = Object.keys(output.serviceAnalysis.errorsByService || {});
  
  if (errorCount === 0) {
    return "Sistemde herhangi bir hata tespit edilmedi. Tüm servisler normal çalışıyor.";
  }
  
  let summary = `${errorCount} hata tespit edildi. `;
  
  if (affectedServices.length > 0) {
    summary += `Etkilenen servisler: ${affectedServices.slice(0, 3).join(', ')}`;
    if (affectedServices.length > 3) {
      summary += ` ve ${affectedServices.length - 3} servis daha`;
    }
    summary += '. ';
  }
  
  if (output.serviceAnalysis.criticalPathAffected) {
    summary += `⚠️ Kritik ${output.serviceAnalysis.affectedPath} yolu etkilenmiş durumda. `;
  }
  
  if (output.executiveSummary.overallStatus === 'critical') {
    summary += 'Acil müdahale gerekiyor!';
  } else if (output.executiveSummary.overallStatus === 'warning') {
    summary += 'Dikkat edilmesi gereken durumlar var.';
  }
  
  return summary;
}

console.log('=== FINAL OUTPUT WITH COMPLETE ERROR HANDLING ===');
// ... existing console.logs ...

return [{ json: finalOutput }];

// Updated helper functions
function determineOverallStatus(output) {
  const totalErrors = output.healthCheck.errorCount;
  const impactScore = output.serviceAnalysis.impactScore;
  const criticalErrors = Object.values(output.serviceAnalysis.errorsByService || {})
    .filter(s => s.criticality === 'critical')
    .reduce((sum, s) => sum + s.errorCount, 0);
  
  if (criticalErrors > 0 || impactScore > 100) return 'critical';
  if (output.serviceAnalysis.criticalPathAffected || totalErrors > 10) return 'warning';
  if (totalErrors > 5 || impactScore > 50) return 'concerning';
  if (totalErrors > 0) return 'degraded';
  return 'healthy';
}

function generateMainIssues(output) {
  const issues = [];
  
  // Report total errors with reconciliation info
  if (output.healthCheck.errorCount > 0) {
    let errorMsg = `${output.healthCheck.errorCount} total errors detected`;
    if (output.healthCheck.errorReconciliation.stage2AdditionalErrors > 0) {
      errorMsg += ` (${output.healthCheck.errorReconciliation.stage2AdditionalErrors} found in deep analysis)`;
    }
    issues.push(errorMsg);
  }
  
  // Critical service errors
  const criticalServices = Object.entries(output.serviceAnalysis.errorsByService || {})
    .filter(([_, data]) => data.criticality === 'critical' && data.errorCount > 0)
    .map(([service, data]) => `${service} (${data.errorCount} errors)`);
    
  if (criticalServices.length > 0) {
    issues.push(`Critical service errors: ${criticalServices.join(', ')}`);
  }
  
  // Error types found
  const allErrorTypes = new Set();
  Object.values(output.serviceAnalysis.errorsByService || {}).forEach(data => {
    (data.errorTypes || []).forEach(type => allErrorTypes.add(type));
  });
  
  if (allErrorTypes.size > 0) {
    issues.push(`Error types: ${Array.from(allErrorTypes).join(', ')}`);
  }
  
  // SLA violations
  const slaViolations = Object.entries(output.serviceAnalysis.errorsByService || {})
    .filter(([_, data]) => data.slaViolation)
    .map(([service, _]) => service);
  
  if (slaViolations.length > 0) {
    issues.push(`SLA violations in: ${slaViolations.join(', ')}`);
  }
  
  // Critical path impact
  if (output.serviceAnalysis.criticalPathAffected) {
    issues.push(`Critical path '${output.serviceAnalysis.affectedPath}' is impacted`);
  }
  
  return issues.length > 0 ? issues : ['No significant issues detected'];
}

function generateImmediateActions(output) {
  const actions = [];
  
  // If Stage 2 found additional errors
  if (output.deepAnalysis?.errorDiscovery?.additionalErrorsFound > 0) {
    actions.push(`Investigate ${output.deepAnalysis.errorDiscovery.additionalErrorsFound} errors discovered in deep analysis`);
  }
  
  // Add service-specific recommendations
  if (output.serviceAnalysis.serviceRecommendations) {
    output.serviceAnalysis.serviceRecommendations
      .filter(rec => rec.priority === 'immediate')
      .forEach(rec => actions.push(rec.action));
  }
  
  // Add deep analysis recommendations if available
  if (output.deepAnalysis?.recommendations?.immediate_actions) {
    actions.push(...output.deepAnalysis.recommendations.immediate_actions);
  }
  
  // Add specific actions for error types
  const errorTypes = new Set();
  Object.values(output.serviceAnalysis.errorsByService || {}).forEach(data => {
    (data.errorTypes || []).forEach(type => errorTypes.add(type));
  });
  
  if (errorTypes.has('401')) {
    actions.push('Check authentication service and token validation');
  }
  if (errorTypes.has('400')) {
    actions.push('Review request validation and API contract compliance');
  }
  if (errorTypes.has('500') || errorTypes.has('502') || errorTypes.has('503')) {
    actions.push('Check backend service health and dependencies');
  }
  
  return actions.length > 0 ? [...new Set(actions)] : ['Continue monitoring'];
}

function calculateConfidenceLevel(output) {
  let confidence = 0.5; // Base confidence
  
  // Higher confidence if both stages ran
  if (output.deepAnalysisPerformed) confidence += 0.3;
  
  // Lower confidence if error discrepancy found
  if (output.executiveSummary?.analysisQuality?.errorDiscrepancy) confidence -= 0.2;
  
  // Higher confidence with more services analyzed
  const servicesAnalyzed = output.serviceAnalysis.servicesAnalyzed.length;
  if (servicesAnalyzed > 10) confidence += 0.2;
  else if (servicesAnalyzed > 5) confidence += 0.1;
  
  return Math.max(0.1, Math.min(1.0, confidence));
}