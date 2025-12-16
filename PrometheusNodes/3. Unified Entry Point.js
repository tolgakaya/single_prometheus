// Unified Entry Point - Alert Only Mode (Fixed)
// "error" key yerine "hasError" kullanıyoruz

const items = $input.all();
const inputData = items[0]?.json || {};

// Timestamp ve metadata
const timestamp = new Date().toISOString();
const executionId = $execution.id;
const workflowId = $workflow.id;
const contextId = 'ctx-' + Date.now() + '-' + Math.random().toString(36).substring(7);
const requestId = inputData.requestId || ('req-' + Date.now());

// Alert bilgilerini çıkar - ZORUNLU
let alertContext = {};
let kubernetesFilters = {};
let priority = 'normal';
let namespaces = [];

// Alert Listener'dan gelen veriyi kontrol et
if (inputData.source === 'alert-listener' && inputData.context) {
  alertContext = inputData.context;
  kubernetesFilters = inputData.kubernetesFilters || {};
  priority = inputData.priority || alertContext.alertPriority || 'normal';
  namespaces = inputData.namespaces || [];
  
  // Eğer namespace boşsa kubernetes filter'dan al
  if (namespaces.length === 0 && kubernetesFilters.namespace) {
    namespaces = [kubernetesFilters.namespace];
  }
  
  console.log('Alert received:', {
    alertName: alertContext.alertName,
    priority: priority,
    pod: kubernetesFilters.pod,
    namespace: kubernetesFilters.namespace
  });
} else {
  // Alert yoksa hata mesajı döndür (error yerine hasError kullan)
  console.error('No alert context found. This workflow requires an alert.');
  return [{
    hasError: true,
    errorMessage: 'This workflow requires an alert context from Alert Listener',
    errorType: 'MISSING_ALERT_CONTEXT',
    timestamp: timestamp,
    source: inputData.source || 'unknown'
  }];
}

// Stage configuration - alert priority'ye göre
const stageConfig = {
  maxStages: priority === 'critical' ? 6 : priority === 'high' ? 4 : 2,
  enablePatternAnalysis: true,
  enableAnomalyDetection: true,
  enablePredictiveAnalysis: priority === 'critical',
  forceDeepAnalysis: priority === 'critical' || priority === 'high'
};

// Ana output objesi
const output = {
  timestamp: timestamp,
  source: {
    type: 'alert-listener',
    priority: priority
  },
  analysisParams: {
    startTime: inputData.startTime || (Date.now() - 3600000),
    endTime: inputData.endTime || Date.now(),
    namespaces: namespaces,
    services: alertContext.affectedServices || [],
    focusAreas: alertContext.errorPatterns || [],
    analysisType: 'alert-driven',
    context: alertContext
  },
  kubernetesFilters: kubernetesFilters,
  stageConfig: stageConfig,
  priority: priority,
  forceDeepAnalysis: stageConfig.forceDeepAnalysis,
  metadata: {
    workflowId: workflowId,
    executionId: executionId,
    requestId: requestId,
    orchestratorId: inputData.orchestratorId || null,
    alertId: alertContext.alertId || null,
    alertName: alertContext.alertName || null
  },
  prometheusQueries: inputData.queries || [],
  _context: {
    contextId: contextId,
    createdAt: timestamp,
    source: {
      type: 'alert-listener',
      priority: priority
    },
    initialParams: {
      startTime: inputData.startTime || (Date.now() - 3600000),
      endTime: inputData.endTime || Date.now(),
      namespaces: namespaces,
      services: alertContext.affectedServices || [],
      focusAreas: alertContext.errorPatterns || [],
      analysisType: 'alert-driven',
      context: alertContext
    },
    kubernetesFilters: kubernetesFilters,
    alertContext: alertContext,
    stageConfig: stageConfig,
    priority: priority,
    forceDeepAnalysis: stageConfig.forceDeepAnalysis,
    workflowMetadata: {
      workflowId: workflowId,
      executionId: executionId,
      requestId: requestId,
      orchestratorId: inputData.orchestratorId || null
    },
    stageResults: {},
    decisions: {},
    debug: {
      contextVersion: '1.0',
      createdBy: 'Unified Entry Point',
      sourceType: 'alert-listener',
      alertName: alertContext.alertName || 'unknown',
      priority: priority
    }
  }
};

return [output];