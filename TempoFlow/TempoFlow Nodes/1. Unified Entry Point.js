// Unified Entry Point - Tempo
// Execute Workflow'dan gelen veriyi doğru parse eder

const input = $input.first().json;
console.log('=== TEMPO UNIFIED ENTRY POINT ===');
console.log('Full input structure:', JSON.stringify(input, null, 2));

let config = {
  timestamp: new Date().toISOString(),
  executionId: $execution.id,
  source: 'unknown',
  mode: 'standard',
  priority: 'normal',
  context: {},
  forceDeepAnalysis: false
};

// Execute Workflow'dan gelen orchestrator verisi
if (input.agentExecutionParams && input.agentExecutionParams.parameters) {
  const params = input.agentExecutionParams.parameters;
  console.log('ORCHESTRATOR PARAMS DETECTED!');
  console.log('Source:', params.source);
  console.log('Priority:', params.priority);
  console.log('OrchestratorId:', params.orchestratorId);
  
  if (params.source === 'orchestrator') {
    config = {
      timestamp: new Date().toISOString(),
      executionId: $execution.id,
      source: 'orchestrator',
      orchestratorId: params.orchestratorId,
      requestId: params.requestId || `tempo-${Date.now()}`,
      mode: 'orchestrator_analysis',
      priority: params.priority || 'normal',
      forceDeepAnalysis: params.priority === 'critical' || params.forceDeepAnalysis === true,
      
      // Time range
      timeRange: {
        start: params.startTime,
        end: params.endTime,
        humanReadable: {
          start: new Date(params.startTime * 1000).toISOString(),
          end: new Date(params.endTime * 1000).toISOString(),
          duration: `${Math.round((params.endTime - params.startTime) / 60)} minutes`
        }
      },
      
      // Analysis configuration
      analysisConfig: {
        priority: params.priority || 'normal',
        depth: params.priority === 'critical' ? 'deep' : 'standard',
        forceDeepAnalysis: params.priority === 'critical' || params.forceDeepAnalysis === true,
        skipHealthGate: params.priority === 'critical',
        analysisType: params.analysisType || 'standard'
      },
      
      // Search parameters - MULTI-NAMESPACE SUPPORT
      searchParams: {
        namespaces: [
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
        ],
        services: [],
        errorTypes: [],
        statusCodes: [],
        operations: [],
        customQuery: null,
        limits: {
          stage1: params.priority === 'critical' ? 200 : 100,
          stage2: params.priority === 'critical' ? 100 : 50
        }
      },
      
      // Context
      context: {
        ...(params.context || {}),
        orchestratorContext: true,
        focusAreas: params.focusAreas || [],
        message: params.message || params.chatInput || ''
      }
    };
    
    // Process focus areas
    if (params.focusAreas && Array.isArray(params.focusAreas)) {
      console.log('Processing focus areas:', params.focusAreas);
      
      // Parse the focusAreas as strings
      const focusAreasStr = params.focusAreas;
      if (typeof focusAreasStr === 'string') {
        // If it's a JSON string, parse it
        try {
          params.focusAreas = JSON.parse(focusAreasStr);
        } catch (e) {
          // If not JSON, use as is
        }
      }
      
      params.focusAreas.forEach(area => {
        if (area.includes('error')) {
          config.searchParams.errorTypes.push('all_errors');
        }
        if (area.includes('latency')) {
          config.searchParams.operations.push('duration > 1000ms');
          config.analysisConfig.analyzeLatency = true;
        }
        if (area.includes('service')) {
          config.analysisConfig.analyzeServices = true;
        }
      });
    }
    
    // Process message if exists
    if (params.message) {
      const message = params.message.toLowerCase();
      
      // Extract specific services
      const servicePattern = /(payment|order|user|notification|auth)/gi;
      const services = params.message.match(servicePattern);
      if (services) {
        config.searchParams.services = [...new Set(services.map(s => s.toLowerCase()))];
      }
      
      // Extract status codes
      const statusCodes = ['500', '401', '403', '404', '502', '503'];
      statusCodes.forEach(code => {
        if (message.includes(code)) {
          config.searchParams.statusCodes.push(code);
        }
      });
    }
    
    // Build Tempo query - MULTI-NAMESPACE SUPPORT
    // Create namespace regex pattern: env-code=~"ns1|ns2|ns3"
    const namespacePattern = config.searchParams.namespaces.join('|');
    let tempoQuery = `{resource.env-code=~"${namespacePattern}"`;

    // For critical priority, search for all errors
    if (config.analysisConfig.priority === 'critical' &&
        config.searchParams.errorTypes.includes('all_errors')) {
      tempoQuery += ` && status=error`;
    } else if (config.searchParams.statusCodes.length > 0) {
      const codes = config.searchParams.statusCodes.join('|');
      tempoQuery += ` && span.status=~"${codes}"`;
    }

    // Add service filter if specified
    if (config.searchParams.services.length > 0) {
      const serviceFilter = config.searchParams.services
        .map(s => `resource.service.name=~".*${s}.*"`)
        .join(' || ');
      tempoQuery += ` && (${serviceFilter})`;
    }

    // Close the query
    tempoQuery += '}';
    
    config.searchParams.customQuery = tempoQuery;
    
    console.log('=== ORCHESTRATOR CONFIG CREATED ===');
    console.log('Priority:', config.analysisConfig.priority);
    console.log('Force Deep Analysis:', config.analysisConfig.forceDeepAnalysis);
    console.log('Custom Query:', config.searchParams.customQuery);
  }
}
// Direct orchestrator call (not via Execute Workflow)
else if (input.source === 'orchestrator' && input.orchestratorId) {
  console.log('DIRECT ORCHESTRATOR INPUT');
  // Handle direct orchestrator input (your existing code)
}
// CHAT TRIGGER
// CHAT TRIGGER
else if (input.chatInput || input.query) {
  console.log('CHAT INPUT DETECTED');
  const message = input.chatInput || input.query;
  config.source = 'chat';
  config.context.userQuery = message;
  
  // YENİ EKLENEN BÖLÜM BAŞLANGIÇ
  // Chat mesajını analiz için hazırla
  config.analysisConfig = {
    priority: 'normal',
    depth: 'standard',
    forceDeepAnalysis: false,
    // Chat mesajını koru
    chatMessage: message,
    requiresServiceDetection: true
  };
  
  // Search parameters'ı hazırla - MULTI-NAMESPACE SUPPORT
  config.searchParams = {
    namespaces: [
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
    ],
    services: [], // Service-Aware Query Builder dolduracak
    errorTypes: [],
    statusCodes: [],
    operations: [],
    customQuery: null,
    limits: {
      stage1: 100,
      stage2: 50
    }
  };
  // YENİ EKLENEN BÖLÜM BİTİŞ
  
  // Default time range
  config.timeRange = {
    start: Math.floor((Date.now() - 3600000) / 1000),
    end: Math.floor(Date.now() / 1000)
  };
}
// MANUAL TRIGGER
else {
  console.log('MANUAL/DEFAULT TRIGGER');
  config.source = 'manual';
  config.timeRange = {
    start: Math.floor((Date.now() - 3600000) / 1000),
    end: Math.floor(Date.now() / 1000)
  };
}

console.log('=== FINAL CONFIG OUTPUT ===');
console.log(JSON.stringify(config, null, 2));

return [{ json: config }];