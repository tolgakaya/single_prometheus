// Unified Entry Point - Orchestrator Request Handler with Enhanced Context

// Default production namespaces to monitor (matches Alert-Driven flow)
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

const input = $input.first().json;

// Detect source and extract parameters
let source = {};
let analysisParams = {};

if (input.orchestratorId && input.startTime && input.endTime) {
  // From orchestrator - DEĞİŞİKLİK YOK
  source = {
    type: 'orchestrator',
    orchestratorId: input.orchestratorId,
    requestId: input.requestId || `req-${Date.now()}`,
    priority: input.priority || 'normal'
  };
  
  analysisParams = {
    startTime: input.startTime,
    endTime: input.endTime,
    namespaces: (input.namespaces && input.namespaces.length > 0) ? input.namespaces : DEFAULT_NAMESPACES,
    focusAreas: input.focusAreas || [],
    analysisType: input.analysisType || 'general',
    context: input.context || {}
  };
  
} else if (input.chatInput || input.sessionId) {
  // From chat - SERVICE EXTRACTION EKLENDİ
  source = {
    type: 'chat',
    sessionId: input.sessionId,
    priority: 'normal'
  };
  
  const message = input.chatInput || '';
  const timeRange = parseTimeFromMessage(message);
  
  analysisParams = {
    startTime: Math.floor(new Date(timeRange.start).getTime() / 1000),
    endTime: Math.floor(new Date(timeRange.end).getTime() / 1000),
    namespaces: DEFAULT_NAMESPACES,
    userMessage: message,
    keywords: extractKeywords(message)
  };
  
  // YENİ: Service extraction for chat messages
  const services = extractServicesFromMessage(message);
  if (services.length > 0) {
    analysisParams.services = services;
  }
  
} else if (input.webhookUrl && input.body) {
  // From webhook - DEĞİŞİKLİK YOK
  source = {
    type: 'webhook',
    url: input.webhookUrl,
    priority: input.body.severity === 'critical' ? 'high' : 'normal'
  };
  
  analysisParams = {
    startTime: Math.floor(Date.now() / 1000) - 3600,
    endTime: Math.floor(Date.now() / 1000),
    alerts: input.body.alerts || [],
    incidentId: input.body.incident_id
  };
  
} else {
  // Manual or unknown trigger - GÜNCELLEME: searchParams kontrolü eklendi
  source = {
    type: 'manual',
    priority: input.priority || 'normal'
  };
  
  analysisParams = {
    startTime: input.startTime || Math.floor(Date.now() / 1000) - 3600,
    endTime: input.endTime || Math.floor(Date.now() / 1000),
    namespaces: (input.namespaces && input.namespaces.length > 0) ? input.namespaces : DEFAULT_NAMESPACES,
    services: input.searchParams?.services || [], // YENİ EKLENDİ
    focusAreas: input.focusAreas || [],
    analysisType: input.analysisType || 'general',
    context: input.context || {}
  };

  // GÜNCELLEME: Orchestrator'dan gelen servis bilgisini al
  if (source.type === 'manual' && input.searchParams?.services) {
    analysisParams.services = input.searchParams.services;
    console.log("Services from orchestrator:", analysisParams.services);
  }
}

// GÜNCELLEME: forceDeepAnalysis mantığını ekle
const forceDeepAnalysis = source.priority === 'critical' || 
                         input.forceDeepAnalysis || 
                         input.analysisConfig?.forceDeepAnalysis ||
                         false;

// Stage configuration based on priority - GÜNCELLENDİ
let stageConfig = {
  maxStages: 1,
  enablePatternAnalysis: false,
  enableAnomalyDetection: false,
  enablePredictiveAnalysis: false,
  forceDeepAnalysis: forceDeepAnalysis  // YENİ
};

if (source.priority === 'critical' || forceDeepAnalysis) {
  stageConfig = {
    maxStages: 3,
    enablePatternAnalysis: true,
    enableAnomalyDetection: true,
    enablePredictiveAnalysis: true,
    forceDeepAnalysis: true  // YENİ
  };
} else if (source.priority === 'high') {
  stageConfig = {
    maxStages: 2,
    enablePatternAnalysis: true,
    enableAnomalyDetection: true,
    enablePredictiveAnalysis: false,
    forceDeepAnalysis: false
  };
}

// Helper functions - MEVCUT FONKSİYONLAR AYNEN KALIYOR
// Helper functions
function parseTimeFromMessage(message) {
  const now = Date.now();
  const msgLower = message.toLowerCase();
  
  if (msgLower.includes('last hour') || msgLower.includes('son 1 saat')) {
    return {
      start: new Date(now - 3600000).toISOString(),
      end: new Date(now).toISOString()
    };
  } else if (msgLower.includes('last 2 hours') || msgLower.includes('son 2 saat')) {
    return {
      start: new Date(now - 7200000).toISOString(),
      end: new Date(now).toISOString()
    };
  } else if (msgLower.includes('today') || msgLower.includes('bugün')) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      start: today.toISOString(),
      end: new Date(now).toISOString()
    };
  }
  
  return {
    start: new Date(now - 3600000).toISOString(),
    end: new Date(now).toISOString()
  };
}

function extractKeywords(message) {
  const keywords = [];
  const msgLower = message.toLowerCase();
  
  if (msgLower.includes('cpu')) keywords.push('cpu_usage');
  if (msgLower.includes('memory')) keywords.push('memory_usage');
  if (msgLower.includes('disk')) keywords.push('disk_usage');
  if (msgLower.includes('network')) keywords.push('network_traffic');
  if (msgLower.includes('error')) keywords.push('error_rate');
  if (msgLower.includes('latency')) keywords.push('response_time');
  
  const services = message.match(/(payment|order|user|auth|inventory)/gi);
  if (services) keywords.push(...services.map(s => s.toLowerCase()));
  
  return [...new Set(keywords)];
}

// YENİ FONKSİYON: Service extraction helper
function extractServicesFromMessage(message) {
  const services = [];
  
  // Pattern 1: Kubernetes service name pattern
  const k8sServicePattern = /\b([a-z0-9]+(?:-[a-z0-9]+){2,})(?:-service|-api|-svc)?\b/gi;
  const k8sMatches = message.matchAll(k8sServicePattern);
  for (const match of k8sMatches) {
    const serviceName = match[0].toLowerCase();
    if (!serviceName.endsWith('-için') && 
        !serviceName.endsWith('-analiz') && 
        !serviceName.endsWith('-servisi') &&
        !serviceName.includes('saatlik')) {
      services.push(serviceName);
    }
  }
  
  // Pattern 2: "service: xxx" veya "servis: xxx" formatı
  const explicitPattern = /(?:service|servis):\s*([a-zA-Z0-9-]+)/gi;
  const explicitMatches = message.matchAll(explicitPattern);
  for (const match of explicitMatches) {
    services.push(match[1].toLowerCase());
  }
  
  // Pattern 3: " servisi" kelimesinden önceki kelime
  const turkishPattern = /([a-zA-Z0-9-]+)\s+servisi/gi;
  const turkishMatches = message.matchAll(turkishPattern);
  for (const match of turkishMatches) {
    if (!services.includes(match[1].toLowerCase())) {
      services.push(match[1].toLowerCase());
    }
  }
  
  return [...new Set(services)];
}

// YENİ: Enhanced context structure
const contextId = `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Output format - CONTEXT ENHANCED
return [{
  json: {
    timestamp: new Date().toISOString(),
    source: source,
    analysisParams: analysisParams,
    stageConfig: stageConfig,
    priority: source.priority,
    forceDeepAnalysis: forceDeepAnalysis,
    metadata: {
      workflowId: $workflow.id,
      executionId: $execution.id,
      orchestratorId: source.orchestratorId || null,
      requestId: source.requestId || `req-${Date.now()}`
    },
    // YENİ: Master context object
    _context: {
      contextId: contextId,
      createdAt: new Date().toISOString(),
      source: source,
      initialParams: analysisParams,
      stageConfig: stageConfig,
      priority: source.priority,
      forceDeepAnalysis: forceDeepAnalysis,
      workflowMetadata: {
        workflowId: $workflow.id,
        executionId: $execution.id,
        orchestratorId: source.orchestratorId || null,
        requestId: source.requestId || `req-${Date.now()}`
      },
      stageResults: {}, // Will be populated by each stage
      decisions: {},    // Will store decision points
      debug: {
        contextVersion: '1.0',
        createdBy: 'Unified Entry Point'
      }
    }
  }
}];