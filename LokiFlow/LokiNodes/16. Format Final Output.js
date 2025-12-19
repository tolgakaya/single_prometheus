// Enhanced Format Final Output - Standardized Structure Version
const inputData = $input.first().json;

console.log("=== FORMAT FINAL OUTPUT (Standardized Structure) ===");

// Read from standardized structure (with legacy fallbacks)
const metadata = inputData.metadata || {};
const context = inputData.context || inputData;
const timeRange = context.timeRange || inputData.timeRange || {};
const stageResults = inputData.stageResults || {};
const enrichments = inputData.enrichments || {};

// Get stage results from standardized location
const stage1Result = stageResults.stage1 || inputData.stage1 || inputData;
const stage2Result = stageResults.stage2 || inputData.stage2 || null;
const stage3Result = stageResults.stage3 || inputData.stage3 || null;
const cascadeData = enrichments.cascadeAnalysis || inputData.cascadeAnalysis || null;

console.log("Stage results:", {
  hasStage1: !!stage1Result,
  hasStage2: !!stage2Result,
  hasStage3: !!stage3Result,
  hasCascade: !!cascadeData
});

// Calculate execution time properly
const startTime = $execution.startedAt ? new Date($execution.startedAt).getTime() : Date.now();
const executionTimeSeconds = Math.round((Date.now() - startTime) / 1000);

const finalOutput = {
  analysisComplete: true,
  timestamp: new Date().toISOString(),
  workflowExecutionId: $execution.id,
  analysisId: metadata.analysisId || inputData.analysisId || 'unknown',
  analysisDepth: stage3Result ? "deep" : stage2Result ? "pattern" : "quick",

  timeContext: {
    requestedRange: {
      start: timeRange.startISO || 'N/A',
      end: timeRange.endISO || 'N/A',
      duration: timeRange.durationHuman || 'N/A',
      source: metadata.source || context.source || 'unknown'
    }
  },
  
  // DETAYLI STAGE SONUÇLARI
  stageResults: {
    // Stage 1 - Health Check
    stage1_healthSnapshot: stage1Result ? {
      execution_time: stage1Result.execution_time,
      status: stage1Result.status,
      metrics: stage1Result.metrics,
      anomalies: stage1Result.anomalies,
      tools_executed: stage1Result.tools_executed,
      quick_summary: stage1Result.quick_summary,
      proceed_decision: stage1Result.proceed_to_stage2,
      reason: stage1Result.reason
    } : null,
    
    // Stage 1.5 - Anomaly Detection (if performed)
    stage1_5_anomalyDetection: stageResults.stage1_5_anomaly?.performed ? {
      execution_time: stageResults.stage1_5_anomaly.execution_time,
      anomaly_scores: stageResults.stage1_5_anomaly.anomaly_scores,
      anomaly_findings: stageResults.stage1_5_anomaly.anomaly_findings,
      service_anomalies: stageResults.stage1_5_anomaly.service_anomalies,
      raw_metrics: stageResults.stage1_5_anomaly.raw_metrics,
      tools_executed: stageResults.stage1_5_anomaly.tools_executed,
      anomaly_summary: stageResults.stage1_5_anomaly.anomaly_summary
    } : null,
    
    // Stage 2 - Pattern Analysis
    stage2_patternAnalysis: stage2Result ? {
      execution_time: stage2Result.execution_time || stage2Result.analysis_timeframe,
      trigger_reason: stage2Result.trigger_reason,
      patterns_identified: stage2Result.patterns_identified,
      correlations: stage2Result.correlations,
      user_impact: stage2Result.user_impact,
      tools_executed: stage2Result.tools_executed,
      confidence_score: stage2Result.confidence_score,
      proceed_decision: stage2Result.proceed_to_stage3,
      stage3_focus: stage2Result.stage3_focus
    } : null,
    
    // Stage 3 - Root Cause Analysis
    stage3_rootCauseAnalysis: stage3Result ? {
      execution_time: stage3Result.execution_time || stage3Result.analysis_metadata?.timestamp,
      investigation_type: stage3Result.investigation_type,
      findings: stage3Result.findings,
      affected_systems: stage3Result.affected_systems,
      remediation: stage3Result.remediation,
      prevention: stage3Result.prevention,
      tools_executed: stage3Result.tools_executed,
      executive_summary: stage3Result.executive_summary
    } : null
  },
  
  // EVIDENCE VE FINDINGS
  evidenceCollection: {
    // Stage 1 Evidence
    healthMetrics: stage1Result ? {
      errorRate: stage1Result.metrics?.error_rate,
      errorCount: stage1Result.metrics?.error_count,
      totalLogs: stage1Result.metrics?.total_logs,
      logLevels: stage1Result.metrics?.log_levels,
      topErrorServices: stage1Result.metrics?.top_error_services
    } : {},
    
    // Anomaly Evidence
    anomalyEvidence: stageResults.stage1_5_anomaly?.performed ? {
      scores: stageResults.stage1_5_anomaly.anomaly_scores,
      trend_direction: stageResults.stage1_5_anomaly.anomaly_findings?.trend_direction,
      baseline_deviation: stageResults.stage1_5_anomaly.anomaly_findings?.baseline_deviation,
      spike_pattern: stageResults.stage1_5_anomaly.anomaly_findings?.spike_pattern,
      anomalous_services: stageResults.stage1_5_anomaly.service_anomalies?.most_anomalous_services
    } : null,
    
    // Pattern Evidence
    patternEvidence: stage2Result ? {
      dominantErrors: stage2Result.patterns_identified?.error_patterns?.dominant_errors,
      affectedServices: stage2Result.patterns_identified?.service_patterns?.most_affected,
      cascadeDetected: stage2Result.patterns_identified?.service_patterns?.cascade_detected,
      cascadePath: stage2Result.patterns_identified?.service_patterns?.cascade_path,
      temporalClustering: stage2Result.patterns_identified?.temporal_patterns?.error_clustering
    } : null,
    
    // Root Cause Evidence
    rootCauseEvidence: stage3Result ? {
      primaryCause: stage3Result.findings?.primary_root_cause,
      contributingFactors: stage3Result.findings?.contributing_factors,
      impactTimeline: stage3Result.findings?.impact_timeline,
      evidenceList: stage3Result.findings?.primary_root_cause?.evidence
    } : null,
    
    // Cascade Analysis Evidence
    cascadeEvidence: cascadeData ? {
      cascadeDetected: cascadeData.cascadeDetected,
      cascadePatterns: cascadeData.cascadePatterns,
      serviceImpact: cascadeData.serviceImpact,
      dependencyContext: cascadeData.dependencyContext
    } : null
  },
  
  // CONSOLIDATED FINDINGS
  consolidatedFindings: {
    overallStatus: stage1Result.status || 'unknown',
    primaryIssue: stage3Result?.findings?.primary_root_cause?.type || 
                  stage2Result?.patterns_identified?.error_patterns?.dominant_errors?.[0]?.type || 
                  'No specific issue identified',
    affectedServices: [
      ...(stage1Result.metrics?.top_error_services || []),
      ...(stage2Result?.patterns_identified?.service_patterns?.most_affected || []),
      ...(stage3Result?.affected_systems?.services?.map(s => s.name) || [])
    ].filter((v, i, a) => a.indexOf(v) === i), // Remove duplicates
    
    severity: stage3Result?.analysis_metadata?.severity || 
              stage2Result?.anomaly_context?.highest_anomaly || 
              (stage1Result.status === 'critical' ? 'HIGH' : 'MEDIUM'),
    
    confidence: stage3Result?.findings?.primary_root_cause?.confidence || 
                stage2Result?.confidence_score || 
                0.5
  },
  
  // ACTIONABLE INSIGHTS
  actionableInsights: {
    immediateActions: [
      ...(stage3Result?.remediation?.immediate_actions || []),
      ...(cascadeData?.recommendations?.filter(r => r.includes('CRITICAL')) || [])
    ],
    diagnosticCommands: [
      ...(stage3Result?.findings?.primary_root_cause?.evidence?.map(e => 
        e.includes('kubectl') ? e : null
      ).filter(Boolean) || [])
    ],
    monitoringGaps: stage3Result?.prevention?.monitoring_gaps || [],
    processImprovements: stage3Result?.prevention?.process_improvements || []
  },
  
  // DIFFERENT OUTPUT FORMATS
  outputFormats: {
    // Executive Summary Format
    "executiveSummary": stage3Result?.executive_summary || generateExecutiveSummary(stage1Result, stage2Result, stage3Result, cascadeData),
    
    // Technical Details Format
    technicalDetails: {
      logAnalysis: {
        totalLogsAnalyzed: stage1Result.metrics?.total_logs || 0,
        errorDistribution: stage1Result.metrics?.log_levels || {},
        serviceErrorMatrix: generateServiceErrorMatrix(stage1Result, stage2Result)
      },
      performanceMetrics: {
        analysisTime: executionTimeSeconds + 's',
        toolsUsed: getAllToolsUsed(stage1Result, stage2Result, stage3Result),
        dataPointsAnalyzed: calculateDataPoints(stage1Result, stage2Result)
      }
    },
    
    // Timeline Format
    incidentTimeline: generateIncidentTimeline(stage1Result, stage2Result, stage3Result, timeRange),
    
    // Service Impact Matrix
    serviceImpactMatrix: generateServiceImpactMatrix(stage1Result, stage2Result, stage3Result, cascadeData)
  },
  
  // METADATA ENHANCED
  metadata: {
    stagesExecuted: stage3Result ? 3 : stage2Result ? 2 : 1,
    includesAnomalyAnalysis: stageResults.stage1_5_anomaly?.performed || false,
    totalExecutionTime: `${executionTimeSeconds}s`,
    inputSource: context.source || 'unknown',
    affectedServices: context.affectedServices || [],
    severity: context.severity || stage3Result?.analysis_metadata?.severity || 'unknown',
    priority: metadata.priority || 'normal',
    forceDeepAnalysis: metadata.forceDeepAnalysis || false,
    toolsUsed: [
      ...(stage1Result.tools_executed || []),
      ...(stageResults.stage1_5_anomaly?.tools_executed || []),
      ...(stage2Result?.tools_executed || []),
      ...(stage3Result?.tools_executed || [])
    ].filter((v, i, a) => a.indexOf(v) === i),
    enhancedAnalysis: {
      cascadeDetection: cascadeData ? "enabled" : "disabled",
      stackTraceAnalysis: stage3Result ? "completed" : "not_required",
      serviceMapping: "enabled",
      anomalyDetection: stageResults.stage1_5_anomaly?.performed ? "performed" : "skipped",
      serviceDependencyAnalysis: context.serviceDependencies ? "enabled" : "disabled"
    }
  }
};

// Helper functions
function generateExecutiveSummary(stage1, stage2, stage3, cascade) {
  const parts = [];
  
  parts.push(`System Status: ${stage1?.status || 'Unknown'}`);
  
  if (stage1?.metrics?.error_rate) {
    parts.push(`Error Rate: ${stage1.metrics.error_rate}`);
  }
  
  if (stage3?.findings?.primary_root_cause) {
    parts.push(`Root Cause: ${stage3.findings.primary_root_cause.type}`);
  } else if (stage2?.patterns_identified?.error_patterns?.dominant_errors?.[0]) {
    parts.push(`Main Issue: ${stage2.patterns_identified.error_patterns.dominant_errors[0].type}`);
  }
  
  if (cascade?.cascadeDetected) {
    parts.push(`Cascade Failure Detected affecting ${cascade.totalCascades} services`);
  }
  
  return parts.join(' | ');
}

function generateServiceErrorMatrix(stage1, stage2) {
  const matrix = {};
  
  // From Stage 1
  if (stage1?.metrics?.top_error_services) {
    stage1.metrics.top_error_services.forEach(service => {
      matrix[service] = {
        errorRate: stage1.metrics.error_rate || 'N/A',
        source: 'stage1'
      };
    });
  }
  
  // From Stage 2 - BU KISIM ÖNEMLİ
  if (stage2?.patterns_identified?.error_patterns?.dominant_errors) {
    stage2.patterns_identified.error_patterns.dominant_errors.forEach(error => {
      error.services.forEach(service => {
        if (!matrix[service]) {
          matrix[service] = {
            errorRate: 'N/A',
            source: 'stage2'
          };
        }
        matrix[service].errorType = error.type;
        matrix[service].errorCount = error.count;
        matrix[service].source = matrix[service].source || 'stage2';
      });
    });
  }
  
  return matrix;
}

function getAllToolsUsed(stage1, stage2, stage3) {
  const tools = new Set();
  
  [stage1, stage2, stage3].forEach(stage => {
    if (stage?.tools_executed) {
      stage.tools_executed.forEach(tool => tools.add(tool));
    }
  });
  
  return Array.from(tools);
}

function calculateDataPoints(stage1, stage2) {
  let dataPoints = 0;
  
  if (stage1?.metrics?.total_logs) {
    dataPoints += stage1.metrics.total_logs;
  }
  
  if (stage2?.patterns_identified?.error_patterns?.dominant_errors) {
    stage2.patterns_identified.error_patterns.dominant_errors.forEach(error => {
      dataPoints += error.count || 0;
    });
  }
  
  return dataPoints;
}

function generateIncidentTimeline(stage1, stage2, stage3, timeRange) {
  const timeline = [];
  
  if (timeRange.startISO) {
    timeline.push({
      time: timeRange.startISO,
      event: "Analysis Period Start",
      source: "input"
    });
  }
  
  if (stage3?.findings?.impact_timeline?.issue_start) {
    timeline.push({
      time: stage3.findings.impact_timeline.issue_start,
      event: "Issue First Detected",
      source: "stage3"
    });
  }
  
  if (stage3?.findings?.impact_timeline?.peak_impact) {
    timeline.push({
      time: stage3.findings.impact_timeline.peak_impact,
      event: "Peak Impact",
      source: "stage3"
    });
  }
  
  if (timeRange.endISO) {
    timeline.push({
      time: timeRange.endISO,
      event: "Analysis Period End",
      source: "input"
    });
  }
  
  return timeline.sort((a, b) => new Date(a.time) - new Date(b.time));
}

function generateServiceImpactMatrix(stage1, stage2, stage3, cascade) {
  const matrix = {};
  
  // Collect all services
  const allServices = new Set();
  
  stage1?.metrics?.top_error_services?.forEach(s => allServices.add(s));
  stage2?.patterns_identified?.service_patterns?.most_affected?.forEach(s => allServices.add(s));
  stage3?.affected_systems?.services?.forEach(s => allServices.add(s.name));
  cascade?.serviceImpact && Object.keys(cascade.serviceImpact).forEach(s => allServices.add(s));
  
  // Build impact matrix
  allServices.forEach(service => {
    matrix[service] = {
      service: service,
      errorRate: stage1?.metrics?.error_rate || 'N/A',
      impactLevel: 'UNKNOWN',
      cascadeRole: 'none',
      downtime: 'N/A'
    };
    
    // From Stage 2
    if (stage2?.patterns_identified?.service_patterns?.most_affected?.includes(service)) {
      matrix[service].impactLevel = 'HIGH';
    }
    
    // From Stage 3
    const stage3Service = stage3?.affected_systems?.services?.find(s => s.name === service);
    if (stage3Service) {
      matrix[service].impactLevel = stage3Service.impact;
      matrix[service].functionality = stage3Service.functionality;
    }
    
    // From Cascade
    if (cascade?.serviceImpact?.[service]) {
      matrix[service].downtime = cascade.serviceImpact[service].downtimeHuman;
      matrix[service].errorTypes = Object.keys(cascade.serviceImpact[service].errorTypes || {});
    }
    
    if (cascade?.cascadePatterns?.some(p => p.rootService === service)) {
      matrix[service].cascadeRole = 'root';
    } else if (cascade?.cascadePatterns?.some(p => p.services.includes(service))) {
      matrix[service].cascadeRole = 'affected';
    }
  });
  
  return matrix;
}


// Health Check verileri eksik - Stage 1'den veri çekimi düzeltmesi
const stage1Health = stage1Result.output || stage1Result;
if (stage1Health && !finalOutput.evidenceCollection.healthMetrics.errorRate) {
  finalOutput.evidenceCollection.healthMetrics = {
    errorRate: stage1Health.metrics?.error_rate || 'N/A',
    errorCount: stage1Health.metrics?.error_count || 0,
    totalLogs: stage1Health.metrics?.total_logs || 0,
    logLevels: stage1Health.metrics?.log_levels || {},
    topErrorServices: stage1Health.metrics?.top_error_services || [],
    // Stage 1 anomaly scores
    anomalyScores: stage1Health.anomalies?.anomaly_scores || {}
  };
}

// Business Impact Score Hesaplama
finalOutput.businessImpact = {
  score: calculateBusinessImpactScore(stage3Result, stage2Result),
  severity: stage3Result?.affected_systems?.sla_breach ? "CRITICAL" : 
            finalOutput.consolidatedFindings.severity === "high" ? "HIGH" : "MEDIUM",
  affectedFeatures: stage2Result?.user_impact?.affected_features || [],
  userImpact: stage3Result?.affected_systems?.users_affected || 0,
  revenueImpact: stage3Result?.affected_systems?.revenue_impact || "minimal",
  slaBreached: stage3Result?.affected_systems?.sla_breach || false,
  estimatedRecovery: stage3Result?.findings?.impact_timeline?.estimated_recovery || "N/A"
};

// Alert Summary (eğer yoksa)
finalOutput.alertSummary = {
  totalErrors: calculateTotalErrors(stage1Result, stage2Result),
  errorTypes: getUniqueErrorTypes(stage2Result, stage3Result),
  timeWindow: {
    start: timeRange.startISO || stage3Result?.findings?.impact_timeline?.issue_start || 'N/A',
    end: timeRange.endISO || new Date().toISOString(),
    duration: timeRange.durationHuman || calculateDuration(
      stage3Result?.findings?.impact_timeline?.issue_start,
      new Date().toISOString()
    )
  },
  errorDistribution: generateErrorDistribution(stage2Result)
};

// Performance Benchmarks
finalOutput.performanceBenchmarks = {
  analysisSpeed: {
    totalTime: executionTimeSeconds + 's',
    stageBreakdown: {
      stage1: calculateStageDuration(stage1Result),
      stage2: calculateStageDuration(stage2Result),
      stage3: calculateStageDuration(stage3Result)
    }
  },
  dataVolume: {
    logsProcessed: stage1Result?.metrics?.total_logs || 0,
    errorsParsed: calculateTotalErrors(stage1Result, stage2Result),
    servicesAnalyzed: finalOutput.consolidatedFindings.affectedServices.length
  },
  accuracy: {
    confidenceScore: finalOutput.consolidatedFindings.confidence,
    evidenceQuality: assessEvidenceQuality(stage3Result),
    patternReliability: stage2Result?.confidence_score || 0
  }
};

// Visualization Data (for UI rendering)
finalOutput.visualizationData = {
  errorTrend: generateErrorTrendData(stage1Result, timeRange),
  serviceHealthMap: generateServiceHealthMap(finalOutput.outputFormats.serviceImpactMatrix),
  cascadeGraph: cascadeData ? generateCascadeGraph(cascadeData) : null,
  timelineChart: generateTimelineChart(finalOutput.outputFormats.incidentTimeline)
};

// ============ EKLENECEK BÖLÜM BİTİŞ ============

// ============ HELPER FUNCTIONS - MEVCUT return SATIRINDAN ÖNCE ============

// Helper functions
function generateExecutiveSummary(stage1, stage2, stage3, cascade) {
  // ... mevcut kod ...
}

function generateServiceErrorMatrix(stage1, stage2) {
  // ... mevcut kod ...
}

// ... diğer mevcut helper fonksiyonlar ...

// ============ YENİ HELPER FUNCTIONS EKLE ============

function calculateBusinessImpactScore(stage3, stage2) {
  let score = 0;
  
  // SLA breach = 50 points
  if (stage3?.affected_systems?.sla_breach) score += 50;
  
  // User impact
  const userImpact = stage3?.affected_systems?.users_affected || 0;
  if (userImpact > 1000) score += 30;
  else if (userImpact > 100) score += 20;
  else if (userImpact > 0) score += 10;
  
  // Service count
  const serviceCount = stage2?.patterns_identified?.service_patterns?.most_affected?.length || 0;
  score += serviceCount * 5;
  
  // Revenue impact
  if (stage3?.affected_systems?.revenue_impact === "high") score += 25;
  else if (stage3?.affected_systems?.revenue_impact === "medium") score += 15;
  else if (stage3?.affected_systems?.revenue_impact === "minimal") score += 5;
  
  return Math.min(100, score); // Cap at 100
}

function calculateTotalErrors(stage1, stage2) {
  let total = stage1?.metrics?.error_count || 0;
  
  if (stage2?.patterns_identified?.error_patterns?.dominant_errors) {
    const stage2Total = stage2.patterns_identified.error_patterns.dominant_errors.reduce(
      (sum, error) => sum + (error.count || 0), 0
    );
    total = Math.max(total, stage2Total);
  }
  
  return total;
}

function getUniqueErrorTypes(stage2, stage3) {
  const types = new Set();
  
  stage2?.patterns_identified?.error_patterns?.dominant_errors?.forEach(error => {
    types.add(error.type);
  });
  
  if (stage3?.findings?.primary_root_cause?.type) {
    types.add(stage3.findings.primary_root_cause.type);
  }
  
  return Array.from(types);
}

function calculateDuration(start, end) {
  if (!start || !end) return 'N/A';
  
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const durationMs = endTime - startTime;
  
  if (durationMs < 60000) return Math.round(durationMs / 1000) + 's';
  if (durationMs < 3600000) return Math.round(durationMs / 60000) + 'm';
  return Math.round(durationMs / 3600000) + 'h';
}

function generateErrorDistribution(stage2) {
  const distribution = {};
  
  stage2?.patterns_identified?.error_patterns?.dominant_errors?.forEach(error => {
    error.services.forEach(service => {
      if (!distribution[service]) {
        distribution[service] = {};
      }
      distribution[service][error.type] = error.count;
    });
  });
  
  return distribution;
}

function calculateStageDuration(stageResult) {
  if (!stageResult?.execution_time) return 'N/A';

  // Parse execution_time (could be "2.5s", "150ms", ISO timestamp, number, etc.)
  const execTime = stageResult.execution_time;

  if (typeof execTime === 'string') {
    // Already formatted string
    if (execTime.includes('ms') || execTime.includes('s') || execTime.includes('m')) {
      return execTime;
    }
  }

  if (typeof execTime === 'number') {
    // Assume milliseconds
    if (execTime < 1000) return execTime + 'ms';
    if (execTime < 60000) return (execTime / 1000).toFixed(1) + 's';
    return (execTime / 60000).toFixed(1) + 'm';
  }

  return 'N/A';
}

function assessEvidenceQuality(stage3) {
  if (!stage3?.findings?.primary_root_cause?.evidence) return 'low';
  
  const evidenceCount = stage3.findings.primary_root_cause.evidence.length;
  const hasStackTrace = stage3.findings.primary_root_cause.evidence.some(e => 
    e.includes('stack') || e.includes('trace')
  );
  
  if (evidenceCount > 3 && hasStackTrace) return 'high';
  if (evidenceCount > 1) return 'medium';
  return 'low';
}

function generateErrorTrendData(stage1, timeRange) {
  const labels = [];
  const errorData = [];

  // From Stage 1 metrics
  if (stage1?.metrics?.error_rate) {
    labels.push('Overall Period');
    const errorRate = parseFloat(stage1.metrics.error_rate) || 0;
    errorData.push(errorRate);
  }

  // If we have error count and total logs, calculate rate
  if (stage1?.metrics?.error_count && stage1?.metrics?.total_logs) {
    const rate = (stage1.metrics.error_count / stage1.metrics.total_logs * 100).toFixed(2);
    if (!labels.includes('Overall Period')) {
      labels.push('Overall Period');
      errorData.push(parseFloat(rate));
    }
  }

  // Fallback if no data
  if (labels.length === 0) {
    labels.push('No Data');
    errorData.push(0);
  }

  return {
    labels: labels,
    datasets: [{
      label: 'Error Rate (%)',
      data: errorData
    }]
  };
}

function generateServiceHealthMap(serviceMatrix) {
  const healthMap = {};
  
  Object.entries(serviceMatrix).forEach(([service, data]) => {
    healthMap[service] = {
      health: data.impactLevel === 'HIGH' ? 0 : data.impactLevel === 'MEDIUM' ? 50 : 100,
      status: data.impactLevel
    };
  });
  
  return healthMap;
}

function generateCascadeGraph(cascadeData) {
  return {
    nodes: cascadeData.cascadePatterns?.map(p => ({
      id: p.rootService,
      label: p.rootService,
      type: 'root'
    })) || [],
    edges: cascadeData.cascadePatterns?.flatMap(p => 
      p.services.map(s => ({
        from: p.rootService,
        to: s,
        label: 'impacts'
      }))
    ) || []
  };
}

function generateTimelineChart(timeline) {
  return {
    type: 'timeline',
    data: timeline.map((event, index) => ({
      x: event.time,
      y: index,
      label: event.event,
      source: event.source
    }))
  };
}
return { json: finalOutput };