// Combine Results Node - UPDATED with Error Reconciliation
const stage2Input = $input.first().json;

// Stage 1 verisini önceki node'dan al
const stage1Data = $node["Check If Stage 2 Needed"].json;

console.log('=== COMBINE RESULTS WITH ERROR RECONCILIATION ===');

// Extract actual results
const stage1Result = stage1Data?.output || stage1Data;
const stage2Result = stage2Input?.output || stage2Input;

// Get service context from Service-Aware Query Builder
const serviceAnalysis = $node["Service-Aware Query Builder"]?.json?.serviceAnalysis || {};

console.log('Stage 1 status:', stage1Result?.status);
console.log('Stage 1 errors:', stage1Result?.metrics?.error_count || 0);
console.log('Stage 2 stage:', stage2Result?.stage);

// NEW: Reconcile Stage 2 discovered errors
let totalErrorsFound = stage1Result?.metrics?.error_count || 0;
let stage2AdditionalErrors = 0;
let reconciliatedServiceErrors = {};

// Check if Stage 2 found additional errors
if (stage2Result?.findings?.exceptions?.by_service) {
  Object.entries(stage2Result.findings.exceptions.by_service).forEach(([service, data]) => {
    if (data.count > 0) {
      stage2AdditionalErrors += data.count;
      reconciliatedServiceErrors[service] = {
        errorCount: data.count,
        errorTypes: data.types || [],
        source: 'stage2_discovery'
      };
    }
  });
  
  console.log(`Stage 2 found ${stage2AdditionalErrors} additional errors`);
}

// Update total error count
totalErrorsFound += stage2AdditionalErrors;

// Build combined result
// Build combined result
const combinedResult = { 
  json: {
    stage1: stage1Result,
    stage2: stage2Result,
    // Include complete service context
    serviceContext: {
      detectedServices: serviceAnalysis.detectedServices || [],
      serviceMetadata: serviceAnalysis.serviceMetadata || {},
      criticalPathAffected: serviceAnalysis.criticalPathAffected || false,
      affectedPath: serviceAnalysis.affectedPath || null,
      serviceErrorAnalysis: stage1Result?.serviceErrorAnalysis || {},
      dependencyChains: serviceAnalysis.dependencyChains || {},
      // NEW: Add reconciliated errors
      reconciliatedErrors: {
        totalErrors: totalErrorsFound,
        stage1Errors: stage1Result?.metrics?.error_count || 0,
        stage2AdditionalErrors: stage2AdditionalErrors,
        serviceBreakdown: reconciliatedServiceErrors
      }
    },
    
    // YENİ: Chat context'i koru
    analysisConfig: stage1Result?.analysisConfig || {},
    source: stage1Result?.source || stage1Result?.analysis_context?.source || 'unknown',
    chatContext: {
      isFromChat: stage1Result?.analysisConfig?.requiresServiceDetection || false,
      userMessage: stage1Result?.analysisConfig?.chatMessage || null,
      analysisMode: stage1Result?.analysisConfig?.analysisMode || null
    },
    
    // Add metadata about the analysis
    analysisMetadata: {
      stage2Performed: !!stage2Result?.stage,
      errorDiscrepancy: stage2AdditionalErrors > 0,
      reconciliationNeeded: totalErrorsFound !== (stage1Result?.metrics?.error_count || 0)
    }
  }
};

console.log('=== COMBINED RESULTS ===');
console.log('Total errors after reconciliation:', totalErrorsFound);
console.log('Error discrepancy detected:', stage2AdditionalErrors > 0);

return [combinedResult];