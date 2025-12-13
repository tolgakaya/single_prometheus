// Force Deep Analysis Override - Prometheus Agent - CONTEXT ENHANCED
const stage1Result = $input.first().json;

// Unified Entry Point'ten gelen orijinal veriyi al
const unifiedData = $node["Unified Entry Point"].json;

// Context'i al - Stage 2 Decision'dan veya Stage 1'den
let masterContext = stage1Result._context || {
  contextId: `ctx-override-${Date.now()}`,
  createdAt: new Date().toISOString(),
  stageResults: {},
  decisions: {},
  debug: { warnings: ['Context recreated in Force Deep Analysis Override'] }
};

// forceDeepAnalysis kontrolü
const forceDeepAnalysis = 
  unifiedData.forceDeepAnalysis || 
  unifiedData.priority === 'critical' ||
  unifiedData.stageConfig?.forceDeepAnalysis ||
  false;

// Stage 1 sonucunu kopyala
let output = { ...stage1Result };

// Override decision'ı context'e kaydet
const overrideDecision = {
  timestamp: new Date().toISOString(),
  originalDecision: stage1Result.proceed_to_stage2,
  forceDeepAnalysis: forceDeepAnalysis,
  overrideApplied: false,
  reason: null
};

// Eğer forceDeepAnalysis aktif ve Stage 1 proceed_to_stage2=false yapmışsa override et
if (forceDeepAnalysis && !stage1Result.proceed_to_stage2) {
  console.log('🔥 PROMETHEUS - Force Deep Analysis Override Applied');
  console.log('Original priority:', unifiedData.priority);
  console.log('Original decision:', stage1Result.proceed_to_stage2);
  console.log('Context ID:', masterContext.contextId);
  
  output.proceed_to_stage2 = true;
  output.overridden = true;
  output.forceDeepAnalysisApplied = true;
  output.overrideReason = `Deep analysis forced due to ${unifiedData.priority} priority from ${unifiedData.source.type}`;
  
  // Override decision'ı güncelle
  overrideDecision.overrideApplied = true;
  overrideDecision.reason = output.overrideReason;
}

// Context'e override decision'ı ekle
masterContext.decisions.forceDeepAnalysisOverride = overrideDecision;

// Override node'unun çıktısını context'e kaydet
masterContext.stageResults.forceDeepAnalysisOverride = {
  output: {
    overrideApplied: overrideDecision.overrideApplied,
    reason: overrideDecision.reason,
    originalPriority: unifiedData.priority,
    originalSource: unifiedData.source
  },
  completedAt: new Date().toISOString()
};

// Orijinal context'i de taşı ve zenginleştir
output.originalContext = {
  source: unifiedData.source,
  priority: unifiedData.priority,
  stageConfig: unifiedData.stageConfig,
  analysisParams: unifiedData.analysisParams
};

// YENİ: Context'i güncelle ve taşı
output._context = masterContext;

// YENİ: Stage 2'ye gidecek veriyi hazırla
output.stage2Input = {
  proceed: output.proceed_to_stage2,
  priority: unifiedData.priority,
  analysisParams: unifiedData.analysisParams,
  timeRange: {
    start: unifiedData.analysisParams.startTime,
    end: unifiedData.analysisParams.endTime
  },
  namespaces: unifiedData.analysisParams.namespaces,
  focusAreas: unifiedData.analysisParams.focusAreas || []
};

// YENİ: Debug bilgisi
output._debug = {
  nodeType: 'Force Deep Analysis Override',
  processedAt: new Date().toISOString(),
  contextId: masterContext.contextId,
  contextPreserved: true,
  overrideApplied: overrideDecision.overrideApplied,
  stageSequence: ['Unified Entry Point', 'Stage 1', 'Stage 2 Decision', 'Force Deep Analysis Override']
};

// Critical durumlar için stage config'i güncelle
if (output.overall_status === 'critical' || output.urgency === 'critical') {
  console.log('🔥 CRITICAL STATUS DETECTED - Updating stage config');
  
  if (output._context && output._context.stageConfig) {
    // Önceki değerleri logla
    console.log('Previous maxStages:', output._context.stageConfig.maxStages);
    
    // Stage config'i güncelle
    output._context.stageConfig.maxStages = 6;
    output._context.stageConfig.enablePatternAnalysis = true;
    output._context.stageConfig.enableAnomalyDetection = true;
    output._context.stageConfig.enablePredictiveAnalysis = true;
    
    console.log('Updated maxStages to:', output._context.stageConfig.maxStages);
    console.log('✅ Stage config updated for critical situation');
  }
  
  // Priority'yi de critical yap
  if (output._context) {
    output._context.priority = 'critical';
    output._context.updatedDueToCriticalStatus = true;
  }
}

// Stage 2 input'a da critical bilgisini ekle
if (output.stage2Input && (output.overall_status === 'critical' || output.urgency === 'critical')) {
  output.stage2Input.priority = 'critical';
  output.stage2Input.criticalStatusDetected = true;
}

// YENI: Stage 1 verilerini koru
output.stage1Data = {
  overall_status: stage1Result.overall_status || stage1Result.stage1Results?.overall_status,
  alerts: stage1Result.alerts || stage1Result.stage1Results?.alerts,
  scores: stage1Result.scores || stage1Result.stage1Results?.scores,
  quick_findings: stage1Result.quick_findings || stage1Result.stage1Results?.quick_findings
};

// Stage 2 için service parametresini hazırla
const requestedService = unifiedData.analysisParams?.services?.[0] || 
                        stage1Result.requested_services?.[0] || 
                        '';

// Stage 2'ye gidecek parametreleri root'a ekle
// Default to all production namespaces if not specified
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
  'em-prod'
];
output.namespace = unifiedData.analysisParams.namespaces[0] || DEFAULT_NAMESPACES[0];
output.service = requestedService;
output.startTime = unifiedData.analysisParams.startTime;
output.endTime = unifiedData.analysisParams.endTime;

// Stage 2 için açık talimatlar
output.stage2Instructions = {
  service: requestedService,
  namespace: output.namespace,
  message: requestedService ? `Focus on service: ${requestedService}` : 'General cluster analysis'
};

console.log('=== Stage 2 Parameters ===');
console.log('Service:', output.service);
console.log('Namespace:', output.namespace);
console.log('=========================');

console.log('=== Force Deep Analysis Override Complete ===');
console.log('Context preserved:', !!output._context);
console.log('Override applied:', overrideDecision.overrideApplied);
console.log('Next stage will receive full context');

return [{ json: output }];