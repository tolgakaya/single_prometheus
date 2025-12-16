// Prometheus Workflow - Orchestrator Input Handler
// Bu node Orchestrator'dan gelen veriyi işler ve Prometheus'a uygun formata çevirir

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

// Default production services to monitor (from kubectl get service -A)
const DEFAULT_SERVICES = [
  'bss-mc-crm-search-integrator', 'bss-mc-crm-customer-information', 'bss-mc-crm-customer-search',
  'bss-mc-crm-mash-up', 'bss-mc-crm-ntf-integrator', 'bss-mc-activity', 'bss-mc-asset-management',
  'bss-mc-cpq', 'bss-mc-cpq-batch', 'bss-mc-cpq-ntf-integrator', 'bss-mc-csr', 'bss-mc-domain-config',
  'bss-mc-id-service', 'bss-mc-message-relay', 'bss-mc-ntf-engine', 'bss-mc-ntf-history', 'bss-mc-rim',
  'bss-mc-ui-authz', 'bss-mc-user-management', 'bss-mc-wsc-new', 'bss-crm-batch', 'bss-ntf-batch',
  'bss-mc-pcm-cfm', 'bss-mc-pcm-cms-integrator', 'bss-mc-pcm-product-catalog', 'bss-mc-pcm-product-offer-detail',
  'bss-mc-pcm-next-gen-admintoolbox-config-manager', 'bss-mc-pcm-next-gen-admintoolbox-ui',
  'eom-micro-flows', 'eom-operate', 'eom-scheduler', 'eom-ui', 'eom-activemqqueueoperations',
  'eom-postgresqldboperations', 'eom-zeebe', 'eom-castlemock', 'bss-services-service',
  'external-services-service', 'loyalty-services-service', 'om-services-service', 'fstp-bpmn-ms',
  'fstp-configuration-ms', 'fstp-dashboard-ms', 'fstp-frontend', 'fstp-orchestra-ms', 'fstp-scheduler-ms',
  'fstp-eca', 'eca', 'wso2am-gw-service', 'wso2am-cp-service', 'bss-saas-control-plane',
  'bss-saas-control-plane-ui', 'bss-tenant-control-plane-batch'
];

const input = $input.first().json;

// Debug için - console.log yerine değişkenlere yazalım
let debugInfo = {
  rawInput: JSON.stringify(input, null, 2),
  processedAt: new Date().toISOString()
};

// Default değerler
const defaults = {
  timeRange: {
    duration: 3600, // 1 saat
    lookback: 3600
  },
  environment: 'k8s-prod', // Multi-namespace cluster
  cluster: 'k8s-prod',
  limits: {
    maxStages: 6,
    alertThreshold: 10
  }
};

// Processed input oluştur
let processedInput = {
  // Metadata
  source: input.source || 'direct',
  orchestratorId: input.orchestratorId || null,
  requestId: input.requestId || `prom-${Date.now()}`,
  timestamp: new Date().toISOString(),
  
  // Time handling
  timeRange: {
    start: null,
    end: null,
    duration: null,
    humanReadable: {}
  },
  
  // Analysis configuration
  analysisConfig: {
    type: input.analysisType || 'metrics',
    priority: input.priority || 'normal',
    depth: 'standard', // light, standard, deep
    forceDeepAnalysis: false,
    skipHealthGate: false
  },
  
  // Kubernetes-focused search parameters
  searchParams: {
    cluster: input.cluster || defaults.cluster,
    namespaces: [],
    services: [],
    nodes: [],
    pods: [],
    workloadTypes: [], // deployment, statefulset, daemonset, job
    metrics: [], // specific metrics to focus on
    alertTypes: [],
    resourceTypes: [] // pods, nodes, pvs, etc.
  },
  
  // Feature flags
  features: {
    includeAlerts: true,
    includeKnowledgeBase: true,
    enableAutoRemediation: false,
    compareWithHistory: false,
    predictiveAnalysis: false,
    sloChecking: false,
    kubernetesHealth: true,
    applicationMetrics: true
  },
  
  // Context from orchestrator
  context: {
    correlationId: input.correlationId,
    otherAgents: input.otherAgents || [],
    userIntent: input.userIntent || '',
    expectedOutputFormat: input.expectedOutputFormat || 'detailed'
  }
};

// 1. TIME RANGE PROCESSING
if (input.startTime && input.endTime) {
  processedInput.timeRange.start = parseInt(input.startTime);
  processedInput.timeRange.end = parseInt(input.endTime);
  processedInput.timeRange.duration = processedInput.timeRange.end - processedInput.timeRange.start;
  
  processedInput.timeRange.humanReadable = {
    start: new Date(processedInput.timeRange.start * 1000).toISOString(),
    end: new Date(processedInput.timeRange.end * 1000).toISOString(),
    duration: `${Math.floor(processedInput.timeRange.duration / 60)} minutes`
  };
} else {
  const now = Math.floor(Date.now() / 1000);
  processedInput.timeRange.end = now;
  processedInput.timeRange.start = now - defaults.timeRange.lookback;
  processedInput.timeRange.duration = defaults.timeRange.lookback;
  
  processedInput.timeRange.humanReadable = {
    start: new Date(processedInput.timeRange.start * 1000).toISOString(),
    end: new Date(processedInput.timeRange.end * 1000).toISOString(),
    duration: `${Math.floor(processedInput.timeRange.duration / 60)} minutes`
  };
}

// SERVICE EXTRACTION - YENİ EKLENDİ
// Servis isimlerini güvenli bir şekilde çıkar
 
// SERVICE EXTRACTION - DÜZELTME
function extractServices(message) {
  const services = [];
  
  // Pattern 1: Kubernetes service name pattern (namespace-component-component-...)
  // bss-mc-crm-search-integrator gibi isimleri yakalar
  const k8sServicePattern = /\b([a-z0-9]+(?:-[a-z0-9]+){2,})(?:-service|-api|-svc)?\b/gi;
  const k8sMatches = message.matchAll(k8sServicePattern);
  for (const match of k8sMatches) {
    const serviceName = match[0].toLowerCase();
    // Yaygın suffix'leri kontrol et ama servis ismi olabilir
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
  
  // Duplicate'leri kaldır
  const uniqueServices = [...new Set(services)];
  
  // Debug log
  console.log("Message:", message);
  console.log("Extracted services:", uniqueServices);
  
  return uniqueServices;
}

// 2. PARSE USER MESSAGE for Kubernetes context
if (input.message || input.chatInput) {
  const message = (input.message || input.chatInput || '').toLowerCase();
  
  // Kubernetes Resources
  if (message.includes('pod') || message.includes('container')) {
    processedInput.searchParams.resourceTypes.push('pods');
    processedInput.searchParams.metrics.push('pod_metrics');
  }
  if (message.includes('node')) {
    processedInput.searchParams.resourceTypes.push('nodes');
    processedInput.searchParams.metrics.push('node_metrics');
  }
  if (message.includes('deployment')) {
    processedInput.searchParams.workloadTypes.push('deployments');
  }
  
  // Kubernetes Issues
  if (message.includes('restart') || message.includes('crashloop')) {
    processedInput.searchParams.metrics.push('container_restarts');
    processedInput.searchParams.alertTypes.push('KubePodCrashLooping');
  }
  if (message.includes('oom') || message.includes('memory')) {
    processedInput.searchParams.metrics.push('memory_usage', 'memory_limits');
    processedInput.searchParams.alertTypes.push('KubeMemoryOvercommit');
  }

  // Memory leak detection
  if (message.includes('memory leak') || message.includes('bellek sızıntısı')) {
    processedInput.searchParams.metrics.push('memory_usage', 'memory_growth');
    processedInput.analysisConfig.forceDeepAnalysis = true;
    processedInput.analysisConfig.priority = 'high';
  }
 
// Service extraction - GÜNCELLENDİ
const extractedServices = extractServices(message);
if (extractedServices.length > 0) {
  processedInput.searchParams.services = extractedServices;
  console.log("Extracted services:", extractedServices);
} else {
  // No services extracted from message, use defaults
  processedInput.searchParams.services = DEFAULT_SERVICES;
  console.log(`No services in message, using DEFAULT_SERVICES: ${DEFAULT_SERVICES.length} services`);
}
  
  // Application Metrics
  if (message.includes('error rate') || message.includes('hata')) {
    processedInput.searchParams.metrics.push('http_error_rate');
  }
  if (message.includes('latency') || message.includes('slow')) {
    processedInput.searchParams.metrics.push('http_latency');
  }
  
  // Analysis depth
  if (message.includes('deep') || message.includes('detailed') || message.includes('derin')) {
    processedInput.analysisConfig.depth = 'deep';
    processedInput.analysisConfig.forceDeepAnalysis = true;
  }
}

// 3. PROCESS ORCHESTRATOR CONTEXT AND PRIORITY - ÖNEMLİ BÖLÜM
// Priority kontrolü - input'tan doğrudan gelen priority'yi kontrol et
if (input.priority === 'critical') {
  processedInput.analysisConfig.priority = 'critical';
  processedInput.analysisConfig.forceDeepAnalysis = true;
  processedInput.features.enableAutoRemediation = true;
} else if (input.priority === 'high') {
  processedInput.analysisConfig.priority = 'high';
  processedInput.analysisConfig.forceDeepAnalysis = true;
} else {
  processedInput.analysisConfig.priority = input.priority || 'normal';
}

// Context'ten gelen priority/severity kontrolü
if (input.context) {
  if (input.context.keywords && Array.isArray(input.context.keywords)) {
    input.context.keywords.forEach(keyword => {
      if (['payment', 'order', 'user', 'notification'].includes(keyword)) {
        if (!processedInput.searchParams.services.includes(keyword)) {
          processedInput.searchParams.services.push(keyword);
        }
      }
    });
  }
  
  // Context'ten gelen severity kontrolü
  if (input.context.severity === 'critical') {
    processedInput.analysisConfig.priority = 'critical';
    processedInput.analysisConfig.forceDeepAnalysis = true;
    processedInput.features.enableAutoRemediation = true;
  } else if (input.context.severity === 'high') {
    processedInput.analysisConfig.priority = 'high';
    processedInput.analysisConfig.forceDeepAnalysis = true;
  }
}

// 4. FOCUS AREAS - Kubernetes specific
if (input.focusAreas && Array.isArray(input.focusAreas)) {
  input.focusAreas.forEach(area => {
    switch(area) {
      case 'container_health':
        processedInput.searchParams.metrics.push(
          'kube_pod_container_status_restarts_total',
          'kube_pod_container_status_ready'
        );
        break;
        
      case 'resource_usage':
        processedInput.searchParams.metrics.push(
          'container_memory_usage_bytes',
          'container_cpu_usage_seconds_total'
        );
        break;
        
      case 'availability':
        processedInput.searchParams.metrics.push(
          'up',
          'kube_deployment_status_replicas_available'
        );
        processedInput.features.sloChecking = true;
        break;
        
      case 'alerts':
        processedInput.features.includeAlerts = true;
        processedInput.analysisConfig.priority = 'high';
        break;
    }
  });
}

// 5. NAMESPACE FILTERING
if (input.namespaces && Array.isArray(input.namespaces) && input.namespaces.length > 0) {
  processedInput.searchParams.namespaces = input.namespaces;
} else {
  // Default to all production namespaces
  processedInput.searchParams.namespaces = DEFAULT_NAMESPACES;
  console.log(`Using DEFAULT_NAMESPACES: ${DEFAULT_NAMESPACES.length} namespaces`);
}

// 6. BUILD ANALYSIS PARAMETERS for existing flow
processedInput.analysisParams = {
  cluster: processedInput.searchParams.cluster,
  environment: 'k8s-prod', // Always use k8s-prod for multi-namespace
  namespaceFilter: processedInput.searchParams.namespaces.join(',') || 'all',
  timeRange: processedInput.timeRange.duration,
  includeAlerts: processedInput.features.includeAlerts,
  includeKnowledgeBase: processedInput.features.includeKnowledgeBase,
  enableAutoRemediation: processedInput.features.enableAutoRemediation,
  maxStages: processedInput.analysisConfig.depth === 'deep' ? 6 : 3,
  forceDeepAnalysis: processedInput.analysisConfig.forceDeepAnalysis,
  skipHealthGate: processedInput.analysisConfig.skipHealthGate,
  analysisDepth: processedInput.analysisConfig.depth,
  priority: processedInput.analysisConfig.priority  // ÖNEMLİ: priority'yi de ekle
};

// Debug bilgilerini ekle
processedInput._debug = {
  originalInput: debugInfo.rawInput,
  processedAt: debugInfo.processedAt,
  timeRangeInfo: `From ${processedInput.timeRange.humanReadable.start} to ${processedInput.timeRange.humanReadable.end}`,
  servicesFound: processedInput.searchParams.services,
  namespacesFound: processedInput.searchParams.namespaces,
  metricsToCheck: processedInput.searchParams.metrics,
  analysisDepth: processedInput.analysisConfig.depth,
  forceDeepAnalysis: processedInput.analysisConfig.forceDeepAnalysis,
  priority: processedInput.analysisConfig.priority  // Debug için priority'yi de ekle
};

return [{ json: processedInput }];