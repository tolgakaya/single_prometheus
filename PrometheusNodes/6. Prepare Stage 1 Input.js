// Prepare Stage 1 Input - Alert odaklı analiz için hazırlık (Fixed)
const items = $input.all();
const inputData = items[0]?.json || {};

// Hata kontrolü - eğer önceki node'dan hata geldiyse dur
if (inputData.hasError) {
  return [{
    hasError: true,
    errorMessage: inputData.errorMessage || 'Previous node reported an error',
    errorType: inputData.errorType || 'UPSTREAM_ERROR'
  }];
}

// Tüm gelen veriyi koru
let output = { ...inputData };

// Alert context'i al - ZORUNLU
const alertContext = inputData.analysisParams?.context || {};
const kubernetesFilters = inputData.kubernetesFilters || {};
const knowledgeBase = inputData.knowledgeBase || {};
const priority = inputData.priority || 'normal';

// Alert yoksa hata
if (!alertContext.alertName) {
  return [{
    hasError: true,
    errorMessage: 'No alert found for Stage 1 analysis',
    errorType: 'MISSING_ALERT'
  }];
}

// System prompt - Alert odaklı, cascading kontrolü dahil
const systemPrompt = 'You are a Kubernetes SRE expert analyzing a SPECIFIC ALERT and its cascading effects.\n\n' +
  'ALERT INFORMATION:\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  'Alert: ' + alertContext.alertName + '\n' +
  'Priority: ' + (alertContext.alertPriority || priority) + '\n' +
  'Alert ID: ' + alertContext.alertId + '\n\n' +
  'AFFECTED COMPONENTS:\n' +
  '- Pod: ' + (kubernetesFilters.pod || 'N/A') + '\n' +
  '- Container: ' + (kubernetesFilters.container || 'N/A') + '\n' +
  '- Namespace: ' + (kubernetesFilters.namespace || 'N/A') + '\n' +
  '- Service: ' + (kubernetesFilters.service || 'N/A') + '\n' +
  '- Node: ' + (kubernetesFilters.node || 'N/A') + '\n\n' +
  (knowledgeBase.alert ? 
    'KNOWLEDGE BASE INFO:\n' +
    '- Common Causes: ' + knowledgeBase.alert.commonCauses.join(', ') + '\n' +
    '- Check These Metrics: ' + knowledgeBase.alert.requiredMetrics.join(', ') + '\n' +
    '- Cascade Points: ' + knowledgeBase.alert.cascadeCheckPoints.join(', ') + '\n\n' 
    : '') +
  'YOUR ANALYSIS TASKS:\n' +
  '═══════════════════════════════════════\n\n' +
  '1. VERIFY ALERT STATUS:\n' +
  '   - Confirm alert is still active\n' +
  '   - Check current severity\n' +
  '   - Determine duration\n\n' +
  '2. ANALYZE AFFECTED COMPONENT:\n' +
  '   - Current status of ' + (kubernetesFilters.pod || kubernetesFilters.node || 'the component') + '\n' +
  '   - Resource usage (CPU, Memory)\n' +
  '   - Recent errors or restarts\n' +
  '   - Health check status\n\n' +
  '3. DETECT CASCADING EFFECTS:\n' +
  '   - Check other pods in same namespace\n' +
  '   - Check other pods on same node (if applicable)\n' +
  '   - Check dependent services\n' +
  '   - Identify spread pattern\n\n' +
  '4. ASSESS OVERALL IMPACT:\n' +
  '   - Service availability\n' +
  '   - User impact\n' +
  '   - Data integrity risk\n' +
  '   - Performance degradation\n\n' +
  'AVAILABLE TOOLS:\n' +
  '- List Kubernetes Services: Use to see all services in cluster\n' +
  '- Quick Cluster Health: Use to get overall health context\n' +
  '- Active Alerts Count: Will show alerts in affected namespace\n' +
  '- Pod Status Check: Will focus on the alert pod\n' +
  '- Plus other dynamic tools that adapt to the alert context\n\n' +
  'IMPORTANT: Check both the specific alert AND potential cascading failures.\n\n' +
  'Output a structured JSON with your findings.';

// User message - Context korunması için güncellendi
const contextString = JSON.stringify(inputData._context || {});
const userMessage = 'Analyze the ' + alertContext.alertName + ' alert affecting ' + 
  (kubernetesFilters.pod || kubernetesFilters.node || 'the system') + 
  ' in namespace ' + kubernetesFilters.namespace + '. ' +
  'Use all available tools to verify the alert, check the affected component\'s health, ' +
  'detect any cascading effects, and determine if deeper analysis is needed.\n\n' +
  'CRITICAL OUTPUT REQUIREMENTS:\n' +
  '1. Your response MUST be valid JSON\n' +
  '2. Include real timestamp using new Date().toISOString()\n' +
  '3. Use cluster name: ' + kubernetesFilters.namespace + '\n' +
  '4. Include pod: ' + (kubernetesFilters.pod || 'unknown') + '\n' +
  '5. MUST include this exact _context field in your JSON response:\n' +
  '"_context": ' + contextString + '\n\n' +
  'Never use placeholder dates like 2024-04-27 or default-cluster.';

// Enhanced system prompt - Context preservation için
const enhancedSystemPrompt = systemPrompt + '\n\n' +
  'OUTPUT FORMAT RULES:\n' +
  '- You MUST return valid JSON only\n' +
  '- You MUST include the _context object exactly as provided\n' +
  '- Use current timestamp: new Date().toISOString()\n' +
  '- Actual namespace: ' + kubernetesFilters.namespace + '\n' +
  '- Never use mock data or placeholder values';

// Output'a ekle kısmını güncelle (var olan output.systemPrompt yerine):
output.systemPrompt = enhancedSystemPrompt;

// Output'a ekle
output.systemPrompt = enhancedSystemPrompt;
output.userMessage = userMessage;

// Stage context - tüm bilgileri ekle
output.stageContext = {
  stage: 'Stage 1: Alert and Cascading Analysis',
  stageNumber: 1,
  timestamp: new Date().toISOString(),
  alertContext: alertContext,
  kubernetesFilters: kubernetesFilters,
  prometheusQueries: inputData.prometheusQueries || [],
  knowledgeBase: knowledgeBase,
  priority: priority,
  analysisType: 'alert-driven-with-cascading',
  namespaces: inputData.analysisParams?.namespaces || [kubernetesFilters.namespace],
  services: inputData.analysisParams?.services || [],
  focusAreas: ['alert-verification', 'cascading-detection', 'impact-assessment'],
  requiredMetrics: inputData._context?.requiredMetrics || [],
  cascadeCheckPoints: inputData._context?.cascadeCheckPoints || []
};

console.log('Stage 1 Prepared:', {
  alertName: alertContext.alertName,
  priority: priority,
  pod: kubernetesFilters.pod,
  namespace: kubernetesFilters.namespace,
  hasKnowledgeBase: !!knowledgeBase.alert
});

return [output];