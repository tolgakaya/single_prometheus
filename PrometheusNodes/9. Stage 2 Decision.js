// Stage 2 Decision - Alert ve cascading etkilerine göre karar
const items = $input.all();
const inputData = items[0]?.json || {};

// Tüm veriyi koru
let output = { ...inputData };

// Stage 1 sonuçlarını al
const stage1Results = inputData.output || inputData.stage1Results || {};

// ✅ DÜZELTİLMİŞ: Context ve priority'yi doğru yerden al
const alertContext = inputData._context?.alertContext || 
                     inputData.alertContext || 
                     inputData.stageContext?.alertContext || {};

const priority = inputData._context?.priority || 
                 inputData.priority || 
                 alertContext.alertPriority || 
                 'normal';

// Karar değişkenleri
let requiresDeepAnalysis = false;
let decisionReasons = [];
let suggestedStages = [];

// Alert priority'sine göre otomatik derinleştirme
if (priority === 'critical') {
  requiresDeepAnalysis = true;
  suggestedStages = [2, 3, 4, 5, 6];
  decisionReasons.push('Critical alert requires full analysis pipeline');
} else if (priority === 'high') {
  requiresDeepAnalysis = true;
  suggestedStages = [2, 3, 4];
  decisionReasons.push('High priority alert requires deep analysis');
} else if (priority === 'medium') {
  // Medium priority - Stage 1 sonuçlarına göre karar ver
  if (stage1Results.cascadingEffects?.hasCascadingFailures) {
    requiresDeepAnalysis = true;
    suggestedStages = [2, 3];
    decisionReasons.push('Cascading failures detected');
  }
}

// Stage 1'den gelen öneriler
if (stage1Results.proceed_to_stage2 === true) {
  if (!requiresDeepAnalysis) {
    requiresDeepAnalysis = true;
    if (suggestedStages.length === 0) {
      suggestedStages = [2, 3];
    }
    decisionReasons.push(stage1Results.reason || 'Stage 1 recommends deep analysis');
  }
}

// ✅ EKLENEN: forceDeepAnalysis kontrolü
if (inputData._context?.forceDeepAnalysis === true || 
    inputData.forceDeepAnalysis === true ||
    stage1Results.forceDeepAnalysis === true) {
  requiresDeepAnalysis = true;
  if (suggestedStages.length === 0) {
    suggestedStages = [2, 3, 4, 5, 6];
  }
  if (!decisionReasons.includes('Force deep analysis flag is set')) {
    decisionReasons.push('Force deep analysis flag is set');
  }
}

// Cascading etkileri kontrol et
if (stage1Results.cascadingEffects) {
  const cascading = stage1Results.cascadingEffects;
  
  if (cascading.affectedComponents && cascading.affectedComponents.length > 3) {
    requiresDeepAnalysis = true;
    if (!suggestedStages.includes(4)) suggestedStages.push(4);
    decisionReasons.push(`Multiple components affected: ${cascading.affectedComponents.length}`);
  }
  
  if (cascading.spreadPattern === 'escalating' || cascading.spreadPattern === 'spreading') {
    requiresDeepAnalysis = true;
    if (!suggestedStages.includes(5)) suggestedStages.push(5);
    if (!suggestedStages.includes(6)) suggestedStages.push(6);
    decisionReasons.push('Issue is spreading - prevention needed');
  }
}

// Restart sayısı kontrolü
if (stage1Results.metrics?.restarts > 5) {
  requiresDeepAnalysis = true;
  decisionReasons.push(`High restart count: ${stage1Results.metrics.restarts}`);
}

// ✅ EKLENEN: Critical status kontrolü
if (stage1Results.overall_status === 'critical' || stage1Results.urgency === 'critical') {
  if (!requiresDeepAnalysis) {
    requiresDeepAnalysis = true;
    suggestedStages = [2, 3, 4, 5, 6];
    decisionReasons.push('Critical status detected in Stage 1');
  }
}

// Stage'leri sırala ve unique yap
suggestedStages = [...new Set(suggestedStages)].sort((a, b) => a - b);

// Karar objesi
const decision = {
  requiresDeepAnalysis: requiresDeepAnalysis,
  timestamp: new Date().toISOString(),
  reasons: decisionReasons,
  suggestedStages: suggestedStages,
  alertInfo: {
    name: alertContext.alertName || 'Unknown',
    priority: priority,  // ✅ Artık doğru priority kullanılıyor
    hasCascading: stage1Results.cascadingEffects?.hasCascadingFailures || false
  },
  estimatedTime: `${suggestedStages.length * 5}-${suggestedStages.length * 10} seconds`
};

// Output'a ekle
output.stage1Results = stage1Results;
output.decision = decision;
output.proceedToDeepAnalysis = requiresDeepAnalysis;

// Context güncelle
output._context = {
  ...output._context,
  stage1Complete: true,
  stage2Decision: decision,
  stageResults: {
    ...output._context?.stageResults,
    stage1: stage1Results
  }
};

console.log('Stage 2 Decision:', {
  alertName: alertContext.alertName,
  priority: priority,
  willProceed: requiresDeepAnalysis,
  stages: suggestedStages,
  reasons: decisionReasons
});

return [output];