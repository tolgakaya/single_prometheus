// Stage 2 Decision - Code Node ile karar verme - CONTEXT ENHANCED & ERROR HANDLING ADDED
const stage1Output = $input.first().json;
const unifiedConfig = $node["Unified Entry Point"].json;

// Stage 1 output'u düzgün parse et
let stage1ProceedDecision = false;
let stage1ActualData = null;

// Nested output kontrolü - Stage 1'in yapısı karmaşık olabilir
if (stage1Output.output && typeof stage1Output.output === 'object') {
  // Output içinde output var mı?
  if (stage1Output.output.output && typeof stage1Output.output.output === 'object') {
    stage1ActualData = stage1Output.output.output;
    stage1ProceedDecision = stage1ActualData.proceed_to_stage2;
  } else {
    stage1ActualData = stage1Output.output;
    stage1ProceedDecision = stage1ActualData.proceed_to_stage2;
  }
} else if (stage1Output.proceed_to_stage2 !== undefined) {
  stage1ActualData = stage1Output;
  stage1ProceedDecision = stage1Output.proceed_to_stage2;
} else {
  console.error("Cannot find proceed_to_stage2 in Stage 1 output!");
  stage1ActualData = stage1Output;
}

console.log("=== STAGE 2 DECISION DEBUG ===");
console.log("Stage 1 output structure:", JSON.stringify(stage1Output, null, 2).substring(0, 500) + "...");
console.log("Stage 1 actual data extracted:", stage1ActualData ? "Yes" : "No");
console.log("Stage 1 proceed_to_stage2 value:", stage1ProceedDecision);
console.log("Stage 1 overall_status:", stage1ActualData?.overall_status);
console.log("Stage 1 alerts total:", stage1ActualData?.alerts?.total);

// Context'i al veya oluştur - nested structure'ı kontrol et
let masterContext = null;

// Önce Stage 1'in actual data'sından context'i almayı dene
if (stage1ActualData && stage1ActualData._context) {
  masterContext = stage1ActualData._context;
  console.log("Context found in Stage 1 actual data");
} else if (stage1Output._context) {
  masterContext = stage1Output._context;
  console.log("Context found in Stage 1 output root");
} else if (unifiedConfig._context) {
  masterContext = unifiedConfig._context;
  console.log("Context found in Unified Config");
} else {
  console.error("No context found! Creating fallback");
  masterContext = {
    contextId: `ctx-fallback-${Date.now()}`,
    createdAt: new Date().toISOString(),
    stageResults: {},
    decisions: {},
    debug: { warnings: ['Context not found, created fallback'] }
  };
}

// Context ID kontrolü
console.log("Master Context ID:", masterContext.contextId);
console.log("Expected Context ID:", unifiedConfig._context?.contextId);

// Context ID uyumsuzluğunu düzelt
if (masterContext.contextId !== unifiedConfig._context?.contextId && unifiedConfig._context) {
  console.warn("Context ID mismatch! Using Unified Entry Point context");
  masterContext = unifiedConfig._context;
}

// Unified Entry Point'ten gelen config'i kontrol et
console.log("Config source type:", unifiedConfig.source?.type);
console.log("Config priority:", unifiedConfig.priority);
console.log("Config forceDeepAnalysis:", unifiedConfig.forceDeepAnalysis);
console.log("Config stageConfig.forceDeepAnalysis:", unifiedConfig.stageConfig?.forceDeepAnalysis);

// Karar mantığı - ÖNEMLİ: forceDeepAnalysis kontrolü ekle
const shouldProceedStage1 = stage1ProceedDecision === true;
const forceDeepAnalysisFromConfig = 
  unifiedConfig.forceDeepAnalysis === true || 
  unifiedConfig.priority === 'critical' ||
  unifiedConfig.stageConfig?.forceDeepAnalysis === true;

// Override logic: Eğer config'den force geliyorsa, Stage 1'in kararını override et
const shouldProceed = shouldProceedStage1 || forceDeepAnalysisFromConfig;

console.log("=== DECISION SUMMARY ===");
console.log("Stage 1 said proceed:", shouldProceedStage1);
console.log("Force deep analysis from config:", forceDeepAnalysisFromConfig);
console.log("Final decision - proceed to Stage 2?", shouldProceed);
console.log("=======================");

// Stage 1 sonuçlarını context'e kaydet - actual data'yı kullan
masterContext.stageResults.stage1 = {
  output: stage1ActualData || stage1Output,
  completedAt: new Date().toISOString(),
  decision: stage1ProceedDecision,
  rawOutput: stage1Output // Debug için raw output'u da sakla
};

// Decision bilgisini context'e kaydet
masterContext.decisions.stage2Decision = {
  timestamp: new Date().toISOString(),
  shouldProceed: shouldProceed,
  stage1Said: shouldProceedStage1,
  forcedDeep: forceDeepAnalysisFromConfig,
  forceSource: forceDeepAnalysisFromConfig ? 
    (unifiedConfig.priority === 'critical' ? 'critical priority' : 'explicit force flag') : 
    'none',
  reason: shouldProceed && !shouldProceedStage1 ? 
    "Forced deep analysis by user request" : 
    (stage1ActualData?.reason || "Based on Stage 1 analysis")
};

// Output data hazırla - Stage 1'in actual data'sını kullan
const outputData = {
  // Stage 1'in tüm verilerini koru
  ...(stage1ActualData || stage1Output),
  
  // Stage 1 results'ı ayrıca sakla
  stage1Results: stage1ActualData || stage1Output,
  
  // Decision bilgisi
  _decision: {
    shouldProceed: shouldProceed,
    stage1Said: shouldProceedStage1,
    forcedDeep: forceDeepAnalysisFromConfig,
    forceSource: forceDeepAnalysisFromConfig ? 
      (unifiedConfig.priority === 'critical' ? 'critical priority' : 'explicit force flag') : 
      'none',
    reason: shouldProceed && !shouldProceedStage1 ? 
      "Forced deep analysis by user request" : 
      (stage1ActualData?.reason || "Based on Stage 1 analysis")
  },
  
  // Context'i taşı ve güncelle
  _context: masterContext,
  
  // Debug bilgisi
  _debug: {
    nodeType: 'Stage 2 Decision',
    processedAt: new Date().toISOString(),
    contextPreserved: true,
    contextId: masterContext.contextId,
    stage1Structure: stage1Output.output ? 'nested' : 'flat',
    stage1ProceedValue: stage1ProceedDecision,
    stage1Status: stage1ActualData?.overall_status,
    stage1Alerts: stage1ActualData?.alerts?.total
  }
};

// Final validation
if (shouldProceed && stage1ActualData?.overall_status === 'degraded' && stage1ActualData?.alerts?.total > 0) {
  console.log("✅ Decision validated: Degraded cluster with alerts, proceeding to Stage 2");
} else if (!shouldProceed && stage1ActualData?.overall_status === 'healthy') {
  console.log("✅ Decision validated: Healthy cluster, stopping here");
} else if (shouldProceed && forceDeepAnalysisFromConfig) {
  console.log("✅ Decision validated: Deep analysis forced by configuration");
} else {
  console.warn("⚠️ Unexpected decision state - please verify");
}

return [outputData];