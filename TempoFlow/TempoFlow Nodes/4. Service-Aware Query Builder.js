// Service-Aware Query Builder Node - KOMPLE KOD (UPDATED)
// Bu node'u "Orchestrator Input Handler" node'undan sonra ekleyin

const input = $input.first().json;
const dependencyStore = $node["Service Dependency Store"].json;
const dependencies = dependencyStore.serviceDependencies;

console.log('=== SERVICE-AWARE QUERY BUILDER ===');
console.log('Input source:', input.source);

// Helper function to extract service names from message
function extractServicesFromMessage(message) {
  if (!message) return [];
  
  const services = new Set();
  const msgLower = message.toLowerCase();
  
  // Pattern-based service detection
  const patterns = [
    { 
      pattern: /customer|müşteri|crm/, 
      services: ['crm-customer-information', 'customer-search-mc-backend', 'crm-mash-up', 'bss-mc-crm-customer-information-t4'] 
    },
    { 
      pattern: /order|sipariş|cpq/, 
      services: ['cpq-ordercapture', 'bstp-cpq-batch', 'bss-mc-cpq-t4'] 
    },
    { 
      pattern: /product|ürün|catalog/, 
      services: ['bstp-pcm-product-catalog', 'bstp-pcm-product-offer-detail', 'bss-mc-pcm-product-catalog-t4'] 
    },
    { 
      pattern: /auth|login|giriş|kimlik/, 
      services: ['ui-authz-mc-backend', 'crm-customer-information', 'bstp-id-service'] 
    },
    { 
      pattern: /notification|bildirim|ntf/, 
      services: ['ntf-engine-service', 'ntf-history-service', 'ntf-batch-service', 'cpq-ntf-integrator-service', 'crm-ntf-integrator-service', 'bss-mc-ntf-engine-t4'] 
    },
    { 
      pattern: /search|ara/, 
      services: ['customer-search-mc-backend', 'search-integrator-mc-backend'] 
    },
    { 
      pattern: /asset|varlık/, 
      services: ['crm-asset', 'bss-mc-asset-management-t4'] 
    },
    { 
      pattern: /config|yapılandırma|domain-config/, 
      services: ['domain-config-service', 'bss-mc-domain-config-t4'] 
    },
    {
      pattern: /gateway|api/,
      services: ['APIGateway']
    },
    {
      pattern: /ui|arayüz|web/,
      services: ['em-b2c-wsc-new-ui']
    },
    { 
      pattern: /ödeme|payment/i, 
      services: ['cpq-ordercapture', 'bstp-cpq-batch', 'bss-mc-cpq-t4', 'bss-services-service.etiyamobile-production-eom'] 
    },
    { 
      pattern: /kimlik doğrulama|giriş|oturum|authentication|login/i, 
      services: ['ui-authz-mc-backend', 'crm-customer-information', 'bstp-id-service'] 
    },
    { 
      pattern: /müşteri|customer|crm/i, 
      services: ['crm-customer-information', 'customer-search-mc-backend', 'crm-mash-up', 'bss-mc-crm-customer-information-t4'] 
    },
    { 
      pattern: /ürün|katalog|product|catalog/i, 
      services: ['bstp-pcm-product-catalog', 'bstp-pcm-product-offer-detail', 'bss-mc-pcm-product-catalog-t4'] 
    },
    { 
      pattern: /bildirim|notification|sms|email/i, 
      services: ['ntf-engine-service', 'ntf-history-service', 'ntf-batch-service', 'cpq-ntf-integrator-service', 'crm-ntf-integrator-service', 'bss-mc-ntf-engine-t4'] 
    },
    { 
      pattern: /arama|ara|search/i, 
      services: ['customer-search-mc-backend', 'search-integrator-mc-backend'] 
    },
    { 
      pattern: /hata|error|sorun|problem|çalışmıyor|bozuk/i,
      services: [] // Bu durumda kritik servislere bakacağız
    }
  ];
  
  // Pattern matching
  patterns.forEach(({ pattern, services: matchedServices }) => {
    if (pattern.test(msgLower)) {
      matchedServices.forEach(s => services.add(s));
    }
  });
  
  // Direct service name check
  const serviceNames = [
    // Core services
    'APIGateway',
    'cpq-ordercapture',
    'crm-customer-information',
    'crm-mash-up',
    'crm-asset',
    
    // Product catalog
    'bstp-pcm-product-catalog',
    'bstp-pcm-product-offer-detail',
    
    // Notification services
    'ntf-engine-service',
    'ntf-history-service',
    'ntf-batch-service',
    'cpq-ntf-integrator-service',
    'crm-ntf-integrator-service',
    
    // Search services
    'customer-search-mc-backend',
    'search-integrator-mc-backend',
    
    // Supporting services
    'domain-config-service',
    'activity',
    'ui-authz-mc-backend',
    'bstp-cpq-batch',
    'bstp-id-service',
    
    // UI services
    'em-b2c-wsc-new-ui',
    
    // External services
    'bss-services-service.etiyamobile-production-eom',
    
    // T4 layer services
    'eca-t4',
    'bss-mc-domain-config-t4',
    'bss-mc-cpq-t4',
    'bss-mc-crm-customer-information-t4',
    'bss-mc-ntf-engine-t4',
    'bss-mc-pcm-product-catalog-t4',
    'bss-mc-asset-management-t4'
  ];
  
  // DÜZELTME: Daha iyi servis ismi eşleştirme
  serviceNames.forEach(serviceName => {
    // Tam eşleşme kontrolü
    if (msgLower.includes(serviceName.toLowerCase())) {
      console.log(`Direct match found: ${serviceName}`);
      services.add(serviceName);
    } else {
      // Parça parça kontrol - minimum 2 karakterli parçalar için
      const parts = serviceName.split('-').filter(part => part.length >= 2);
      let matchCount = 0;
      
      parts.forEach(part => {
        if (msgLower.includes(part.toLowerCase())) {
          matchCount++;
        }
      });
      
      // Eğer parçaların %75'i veya daha fazlası eşleşiyorsa servisi ekle
      if (matchCount > 0 && matchCount >= Math.ceil(parts.length * 0.75)) {
        console.log(`Partial match found: ${serviceName} (${matchCount}/${parts.length} parts matched)`);
        services.add(serviceName);
      }
    }
  });
  
  return Array.from(services);
}

// Helper function to get dependent services
function getDependentServices(serviceName, visited = new Set()) {
  if (visited.has(serviceName)) return [];
  visited.add(serviceName);
  
  const deps = [serviceName];
  const service = dependencies[serviceName];
  
  if (service && service.dependencies) {
    service.dependencies.forEach(dep => {
      deps.push(...getDependentServices(dep, visited));
    });
  }
  
  return [...new Set(deps)];
}

// Build enhanced parameters - PRESERVE ALL INPUT DATA
const enhancedParams = JSON.parse(JSON.stringify(input));

// Ensure critical fields are preserved
enhancedParams.source = input.source;
enhancedParams.priority = input.priority;
enhancedParams.orchestratorId = input.orchestratorId;
enhancedParams.requestId = input.requestId;
enhancedParams.forceDeepAnalysis = input.forceDeepAnalysis;

// Initialize service analysis
enhancedParams.serviceAnalysis = {
  detectedServices: [],
  dependencyChains: {},
  criticalPathAffected: false,
  enhancedQueries: {},
  serviceMetadata: {}
};

// Extract services from context
let mentionedServices = [];

// Check if this is from chat and needs service detection
if (input.analysisConfig?.requiresServiceDetection && input.analysisConfig?.chatMessage) {
  console.log('=== CHAT SERVICE DETECTION ===');
  console.log('Chat message:', input.analysisConfig.chatMessage);
  
  // Extract services from chat message
  mentionedServices = extractServicesFromMessage(input.analysisConfig.chatMessage);
  
  console.log('=== EXTRACTED SERVICES ===');
  console.log('Services found:', mentionedServices);
  console.log('Number of services:', mentionedServices.length);
  
  if (mentionedServices.length > 0) {
    console.log('Found services in chat:', mentionedServices);
  } else {
    console.log('No specific services in chat message');
    // Genel hata kelimelerini kontrol et
    const errorKeywords = ['hata', 'error', 'sorun', 'problem', 'çalışmıyor', 'not working'];
    const hasErrorKeyword = errorKeywords.some(keyword => 
      input.analysisConfig.chatMessage.toLowerCase().includes(keyword)
    );
    
    if (hasErrorKeyword) {
      console.log('Error keywords detected - will analyze critical services');
    }
  }
}

// Check various sources for service information - sadece chat'ten gelmediyse
if (mentionedServices.length === 0 && input.context?.originalMessage) {
  mentionedServices = extractServicesFromMessage(input.context.originalMessage);
} else if (mentionedServices.length === 0 && input.context?.keywords && Array.isArray(input.context.keywords)) {
  input.context.keywords.forEach(keyword => {
    const extracted = extractServicesFromMessage(keyword);
    mentionedServices.push(...extracted);
  });
}

// Default to critical services for high priority
if (mentionedServices.length === 0 && 
    (input.analysisConfig?.priority === 'critical' || 
     input.analysisConfig?.priority === 'high' ||
     input.priority === 'critical')) {
  console.log('High priority detected - analyzing critical services');
  mentionedServices = ['ui-authz-mc-backend', 'crm-customer-information', 'cpq-ordercapture', 'domain-config-service', 'APIGateway'];
}

// Chat'ten gelen genel hata mesajları için kritik servisleri kontrol et
if (mentionedServices.length === 0 && input.analysisConfig?.requiresServiceDetection) {
  console.log('=== CHAT: NO SPECIFIC SERVICES - CHECKING CRITICAL SERVICES ===');
  
  // Chat mesajında hata belirtisi var mı kontrol et
  const errorIndicators = ['hata', 'error', 'sorun', 'problem', 'çalışmıyor', 'not working', 'yavaş', 'slow'];
  const chatMessage = (input.analysisConfig?.chatMessage || '').toLowerCase();
  const hasErrorIndication = errorIndicators.some(indicator => chatMessage.includes(indicator));
  
  if (hasErrorIndication) {
    console.log('Error indication found in chat - analyzing all critical services');
    mentionedServices = [
      'APIGateway',
      'ui-authz-mc-backend',
      'crm-customer-information', 
      'cpq-ordercapture',
      'domain-config-service',
      'bss-services-service.etiyamobile-production-eom',
      'bstp-pcm-product-catalog',
      'ntf-engine-service'
    ];
    
    // Analiz modunu işaretle
    enhancedParams.analysisConfig = enhancedParams.analysisConfig || {};
    enhancedParams.analysisConfig.analysisMode = 'critical-services-scan';
    enhancedParams.analysisConfig.reason = 'General error reported via chat';
  }
}

// If still no services, check all critical services
if (mentionedServices.length === 0) {
  console.log('No specific services detected - checking critical services');
  mentionedServices = Object.entries(dependencies)
    .filter(([_, info]) => info.criticality === 'critical')
    .map(([name, _]) => name);
}

console.log('=== FINAL MENTIONED SERVICES ===');
console.log('Services to analyze:', mentionedServices);

// Build dependency chains
const allDetectedServices = new Set();

mentionedServices.forEach(service => {
  const chain = getDependentServices(service);
  enhancedParams.serviceAnalysis.dependencyChains[service] = chain;
  chain.forEach(s => allDetectedServices.add(s));
});

enhancedParams.serviceAnalysis.detectedServices = Array.from(allDetectedServices);

// Check critical paths
const criticalPaths = dependencyStore.criticalPaths || {};
for (const [pathName, pathServices] of Object.entries(criticalPaths)) {
  const affected = pathServices.some(s => allDetectedServices.has(s));
  if (affected) {
    enhancedParams.serviceAnalysis.criticalPathAffected = true;
    enhancedParams.serviceAnalysis.affectedPath = pathName;
    break;
  }
}

// Build service metadata
enhancedParams.serviceAnalysis.detectedServices.forEach(service => {
  const serviceInfo = dependencies[service];
  if (serviceInfo) {
    enhancedParams.serviceAnalysis.serviceMetadata[service] = {
      criticality: serviceInfo.criticality,
      category: serviceInfo.category,
      slaThresholds: serviceInfo.slaThresholds
    };
  }
});

// Build enhanced Tempo queries - MULTI-NAMESPACE SUPPORT
const namespaces = input.searchParams?.namespaces || [
  "bstp-cms-global-production",
  "bstp-cms-prod-v3",
  "em-global-prod-3pp",
  "em-global-prod-eom",
  "em-global-prod-flowe",
  "em-global-prod",
  "em-prod-3pp",
  "em-prod-eom",
  "em-prod-flowe",
  "em-prod",
  "etiyamobile-production",
  "etiyamobile-prod"
];
const namespacePattern = namespaces.join('|');

// Query 1: Service-specific errors across ALL namespaces
if (enhancedParams.serviceAnalysis.detectedServices.length > 0) {
  const serviceFilter = enhancedParams.serviceAnalysis.detectedServices
    .map(s => `service.name="${s}"`)
    .join(' || ');

  enhancedParams.serviceAnalysis.enhancedQueries.serviceErrors =
    `{ resource.deployment.environment=~"${namespacePattern}" && (${serviceFilter}) && status=error }`;
}

// Query 2: High latency for critical services across ALL namespaces
const criticalServices = enhancedParams.serviceAnalysis.detectedServices
  .filter(s => enhancedParams.serviceAnalysis.serviceMetadata[s]?.criticality === 'critical');

if (criticalServices.length > 0) {
  const criticalFilter = criticalServices.map(s => `service.name="${s}"`).join(' || ');
  enhancedParams.serviceAnalysis.enhancedQueries.criticalLatency =
    `{ resource.deployment.environment=~"${namespacePattern}" && (${criticalFilter}) && duration > 500ms }`;
}

// Update search parameters
enhancedParams.searchParams = {
  ...input.searchParams,
  services: enhancedParams.serviceAnalysis.detectedServices,
  customQuery: enhancedParams.serviceAnalysis.enhancedQueries.serviceErrors || input.searchParams?.customQuery,
  limits: {
    stage1: enhancedParams.serviceAnalysis.criticalPathAffected ? 200 : 100,
    stage2: enhancedParams.serviceAnalysis.criticalPathAffected ? 100 : 50
  }
};

// Enhanced analysis config - PRESERVE ORIGINAL VALUES
enhancedParams.analysisConfig = {
  ...input.analysisConfig,  // Preserve all original analysisConfig
  priority: input.analysisConfig?.priority || input.priority || 'normal',
  forceDeepAnalysis: input.analysisConfig?.forceDeepAnalysis || input.forceDeepAnalysis || false,
  serviceContext: {
    primaryServices: mentionedServices,
    allServices: enhancedParams.serviceAnalysis.detectedServices,
    criticalPathAffected: enhancedParams.serviceAnalysis.criticalPathAffected,
    affectedPath: enhancedParams.serviceAnalysis.affectedPath,
    serviceCount: enhancedParams.serviceAnalysis.detectedServices.length,
    criticalServiceCount: criticalServices.length,
    expectedLatencies: {}
  }
};

// Add expected latencies for detected services
enhancedParams.serviceAnalysis.detectedServices.forEach(service => {
  const serviceInfo = dependencies[service];
  if (serviceInfo && serviceInfo.slaThresholds) {
    enhancedParams.analysisConfig.serviceContext.expectedLatencies[service] = {
      p95: serviceInfo.slaThresholds.latencyP95,
      p99: serviceInfo.slaThresholds.latencyP99
    };
  }
});

console.log('=== ENHANCED OUTPUT ===');
console.log('Total services to analyze:', enhancedParams.serviceAnalysis.detectedServices.length);
console.log('Services:', enhancedParams.serviceAnalysis.detectedServices);
console.log('Custom Query:', enhancedParams.searchParams.customQuery);

return [{ json: enhancedParams }];