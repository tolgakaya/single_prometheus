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

// Generate analysisId with timestamp-based fallback
const analysisId = metadata.analysisId ||
                   inputData.analysisId ||
                   `lokiflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const finalOutput = {
  analysisComplete: true,
  timestamp: new Date().toISOString(),
  workflowExecutionId: $execution.id,
  analysisId: analysisId,
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
  
  // INCIDENT EVALUATION (threshold-based)
  incidentEvaluation: evaluateIncident(stage1Result, stage2Result, stage3Result, stageResults.stage1_5_anomaly),

  // CONSOLIDATED FINDINGS - FIXED: Multi-problem support
  consolidatedFindings: (() => {
    const incidentEval = evaluateIncident(stage1Result, stage2Result, stage3Result, stageResults.stage1_5_anomaly);
    const allIssues = collectAllIssues(stage1Result, stage2Result, stage3Result, incidentEval);

    return {
      overallStatus: stage1Result.status || 'unknown',
      // FIXED: identifiedIssues (array) instead of primaryIssue (single)
      identifiedIssues: allIssues,
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
                  0.5,

      // Legacy support - keep primaryIssue for backward compatibility
      primaryIssue: allIssues.length > 0 ? allIssues[0].type : 'No specific issue identified'
    };
  })(),
  
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
    // Executive Summary Format - FIXED: Pass incidentEval and allIssues
    "executiveSummary": (() => {
      const incidentEval = evaluateIncident(stage1Result, stage2Result, stage3Result, stageResults.stage1_5_anomaly);
      const allIssues = collectAllIssues(stage1Result, stage2Result, stage3Result, incidentEval);

      // If Stage 3 has executive_summary, use it but prefix with analysis/incident terminology
      if (stage3Result?.executive_summary) {
        const prefix = incidentEval.isIncident ? "Incident:" : "Analysis:";
        return `${prefix} ${stage3Result.executive_summary}`;
      }

      return generateExecutiveSummary(stage1Result, stage2Result, stage3Result, cascadeData, incidentEval, allIssues);
    })(),
    
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
    
    // Timeline Format (renamed from incidentTimeline - not every analysis is an incident)
    analysisTimeline: generateAnalysisTimeline(stage1Result, stage2Result, stage3Result, timeRange),
    
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

// NEW: Collect all issues from all stages with FULL evidence
function collectAllIssues(stage1, stage2, stage3, incidentEval) {
  const issues = [];

  // Stage 2 - Pattern Analysis Issues (with temporal and pattern evidence)
  if (stage2?.patterns_identified?.error_patterns?.dominant_errors) {
    stage2.patterns_identified.error_patterns.dominant_errors.forEach(error => {
      const evidence = [];

      // Basic info
      evidence.push(`Error type: ${error.type}`);
      evidence.push(`Occurrence count: ${error.count || 0}`);
      evidence.push(`Affected services: ${error.services?.join(', ') || 'unknown'}`);

      // Temporal patterns
      if (stage2.patterns_identified?.temporal_patterns) {
        const temporal = stage2.patterns_identified.temporal_patterns;
        if (temporal.error_clustering) {
          evidence.push(`Temporal clustering: ${temporal.error_clustering}`);
        }
        if (temporal.propagation_speed) {
          evidence.push(`Propagation speed: ${temporal.propagation_speed}`);
        }
      }

      // Service patterns
      if (stage2.patterns_identified?.service_patterns) {
        const servicePatterns = stage2.patterns_identified.service_patterns;
        if (servicePatterns.cascade_detected) {
          evidence.push(`Cascade detected: ${servicePatterns.cascade_path?.join(' → ') || 'yes'}`);
        }
      }

      issues.push({
        type: error.type,
        affectedServices: error.services || [],
        occurrenceCount: error.count || 0,
        evidence: evidence,
        stageDetected: 'stage2_pattern_analysis',
        severity: 'MEDIUM',
        remediation: [],
        patternCategory: stage2.patterns_identified?.error_patterns?.pattern_category
      });
    });
  }

  // Stage 3 - Root Cause Issues (with full root cause evidence)
  if (stage3?.findings?.primary_root_cause) {
    const affectedServices = stage3.affected_systems?.services?.map(s => s.name) || [];
    const evidence = [];

    // Primary root cause evidence
    const primaryEvidence = stage3.findings.primary_root_cause.evidence || [];
    evidence.push(...primaryEvidence);

    // Add trigger event if available
    if (stage3.findings.primary_root_cause.trigger_event) {
      evidence.push(`Trigger: ${stage3.findings.primary_root_cause.trigger_event}`);
    }

    // Add confidence score
    if (stage3.findings.primary_root_cause.confidence) {
      evidence.push(`Confidence: ${(stage3.findings.primary_root_cause.confidence * 100).toFixed(0)}%`);
    }

    // Contributing factors as evidence
    if (stage3.findings.contributing_factors && stage3.findings.contributing_factors.length > 0) {
      stage3.findings.contributing_factors.forEach(factor => {
        evidence.push(`Contributing factor: ${factor.factor} (Impact: ${factor.impact})`);
        if (factor.evidence) {
          evidence.push(`  └─ ${factor.evidence}`);
        }
      });
    }

    // Impact timeline
    if (stage3.findings.impact_timeline) {
      const timeline = stage3.findings.impact_timeline;
      if (timeline.issue_start) {
        evidence.push(`Issue started: ${timeline.issue_start}`);
      }
      if (timeline.peak_impact) {
        evidence.push(`Peak impact: ${timeline.peak_impact}`);
      }
      if (timeline.current_state) {
        evidence.push(`Current state: ${timeline.current_state}`);
      }
    }

    issues.push({
      type: stage3.findings.primary_root_cause.type,
      affectedServices: affectedServices,
      occurrenceCount: null, // Root cause doesn't have occurrence count
      evidence: evidence,
      stageDetected: 'stage3_root_cause_analysis',
      severity: stage3.analysis_metadata?.severity || 'HIGH',
      remediation: stage3.remediation?.immediate_actions || [],
      affectedSystemDetails: stage3.affected_systems?.services || [],
      shortTermFixes: stage3.remediation?.short_term_fixes || [],
      longTermSolutions: stage3.remediation?.long_term_solutions || []
    });
  }

  // Stage 1 - Top Error Services (if no Stage 2/3)
  if (issues.length === 0 && stage1?.metrics?.top_error_services?.length > 0) {
    const evidence = [
      `Error rate: ${stage1.metrics.error_rate}`,
      `Total errors: ${stage1.metrics.error_count}`,
      `Total logs analyzed: ${stage1.metrics.total_logs}`,
      `Top error services: ${stage1.metrics.top_error_services.join(', ')}`
    ];

    // Add log level distribution
    if (stage1.metrics.log_levels) {
      const logLevels = stage1.metrics.log_levels;
      Object.entries(logLevels).forEach(([level, count]) => {
        if (count > 0) {
          evidence.push(`${level.toUpperCase()} logs: ${count}`);
        }
      });
    }

    issues.push({
      type: 'Multiple errors detected',
      affectedServices: stage1.metrics.top_error_services,
      occurrenceCount: stage1.metrics.error_count,
      evidence: evidence,
      stageDetected: 'stage1_health_check',
      severity: incidentEval?.severity || 'MEDIUM',
      remediation: []
    });
  }

  return issues;
}

// Helper functions
function generateExecutiveSummary(stage1, stage2, stage3, cascade, incidentEval, allIssues) {
  const parts = [];

  // FIXED: Terminology based on incidentEvaluation.isIncident
  const isIncident = incidentEval?.isIncident || false;
  const prefix = isIncident ? "Incident Analysis" : "Log Analysis";

  parts.push(`${prefix} - System Status: ${stage1?.status || 'Unknown'}`);

  if (stage1?.metrics?.error_rate) {
    parts.push(`Error Rate: ${stage1.metrics.error_rate}`);
  }

  // FIXED: Show ALL issues, not just one
  if (allIssues && allIssues.length > 0) {
    if (allIssues.length === 1) {
      parts.push(`Issue Identified: ${allIssues[0].type}`);
    } else {
      parts.push(`${allIssues.length} Issues Identified:`);
      allIssues.forEach((issue, index) => {
        const servicesText = issue.affectedServices.length > 0
          ? ` (${issue.affectedServices.join(', ')})`
          : '';
        parts.push(`  ${index + 1}. ${issue.type}${servicesText}`);
      });
    }
  }

  if (cascade?.cascadeDetected) {
    parts.push(`Cascade Pattern Detected affecting ${cascade.totalCascades} services`);
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

function generateAnalysisTimeline(stage1, stage2, stage3, timeRange) {
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
      event: "Error Pattern First Detected",
      source: "stage3"
    });
  }

  if (stage3?.findings?.impact_timeline?.peak_impact) {
    timeline.push({
      time: stage3.findings.impact_timeline.peak_impact,
      event: "Peak Error Occurrence",
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

// Business Impact - REMOVED (log analysis cannot determine user/revenue impact)

// Error Summary (renamed from alertSummary - not every analysis is an incident)
finalOutput.errorSummary = {
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
  timelineChart: generateTimelineChart(finalOutput.outputFormats.analysisTimeline)
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

// calculateBusinessImpactScore - REMOVED (not calculable from log analysis)

function evaluateIncident(stage1, stage2, stage3, anomalyStage) {
  // Thresholds for incident classification
  const ERROR_RATE_WARNING = 2.0;      // %2
  const ERROR_RATE_INCIDENT = 5.0;     // %5
  const ERROR_RATE_CRITICAL = 10.0;    // %10
  const ERROR_COUNT_INCIDENT = 10000;

  const errorRate = parseFloat(stage1?.metrics?.error_rate) || 0;
  const errorCount = stage1?.metrics?.error_count || 0;
  const anomalyDetected = anomalyStage?.performed && anomalyStage?.anomaly_scores?.overall_score > 0.7;
  const cascadeDetected = stage2?.patterns_identified?.service_patterns?.cascade_detected || false;

  // Critical services check (from service dependencies)
  const affectedServices = [
    ...(stage1?.metrics?.top_error_services || []),
    ...(stage2?.patterns_identified?.service_patterns?.most_affected || []),
    ...(stage3?.affected_systems?.services?.map(s => s.name) || [])
  ];

  // Critical services list (you may want to externalize this)
  const criticalServices = ['api-gateway', 'auth-service', 'payment-service', 'order-service'];
  const criticalServicesAffected = affectedServices.filter(s =>
    criticalServices.some(cs => s.toLowerCase().includes(cs.toLowerCase()))
  );

  // Incident determination
  const isIncident = (
    errorRate > ERROR_RATE_INCIDENT ||
    errorCount > ERROR_COUNT_INCIDENT ||
    anomalyDetected ||
    cascadeDetected ||
    criticalServicesAffected.length > 0
  );

  // Severity calculation
  let severity = 'NORMAL';
  let justification = [];

  if (isIncident) {
    if (errorRate > ERROR_RATE_CRITICAL) {
      severity = 'CRITICAL';
      justification.push(`Error rate ${errorRate}% exceeds critical threshold (${ERROR_RATE_CRITICAL}%)`);
    } else if (errorCount > ERROR_COUNT_INCIDENT) {
      severity = 'CRITICAL';
      justification.push(`Error count ${errorCount} exceeds incident threshold (${ERROR_COUNT_INCIDENT})`);
    } else if (cascadeDetected) {
      severity = 'HIGH';
      justification.push('Cascade failure pattern detected');
    } else if (criticalServicesAffected.length > 0) {
      severity = 'HIGH';
      justification.push(`Critical services affected: ${criticalServicesAffected.join(', ')}`);
    } else if (anomalyDetected) {
      severity = 'HIGH';
      justification.push('Anomaly pattern detected above threshold');
    } else if (errorRate > ERROR_RATE_INCIDENT) {
      severity = 'HIGH';
      justification.push(`Error rate ${errorRate}% exceeds incident threshold (${ERROR_RATE_INCIDENT}%)`);
    }
  } else {
    if (errorRate > ERROR_RATE_WARNING) {
      severity = 'WARNING';
      justification.push(`Error rate ${errorRate}% above warning threshold (${ERROR_RATE_WARNING}%)`);
    } else {
      severity = 'NORMAL';
      justification.push(`Error rate ${errorRate}% within acceptable limits`);
    }
  }

  return {
    isIncident: isIncident,
    severity: severity,
    errorRate: errorRate + '%',
    errorCount: errorCount,
    justification: justification.join('; '),
    thresholds: {
      errorRateWarning: ERROR_RATE_WARNING + '%',
      errorRateIncident: ERROR_RATE_INCIDENT + '%',
      errorRateCritical: ERROR_RATE_CRITICAL + '%',
      errorCountIncident: ERROR_COUNT_INCIDENT
    },
    factors: {
      anomalyDetected: anomalyDetected,
      cascadeDetected: cascadeDetected,
      criticalServicesAffected: criticalServicesAffected
    }
  };
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