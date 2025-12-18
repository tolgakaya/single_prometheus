
// DEBUG: Check what we're receiving
console.log("=== CASCADE DETECTOR INPUT DEBUG ===");
// Cascade Failure Detector başına ekle:
const allInputs = $input.all();

// Debug bilgisini ilk item'a ekle
const debugInfo = {
  totalInputs: allInputs.length,
  inputs: allInputs.map((input, idx) => ({
    index: idx,
    topLevelKeys: Object.keys(input.json).slice(0, 10),
    hasOutput: !!input.json.output,
    outputStage: input.json.output?.stage,
    hasStage1Result: !!input.json.stage1_result,
    stage1ResultStage: input.json.stage1_result?.stage,
    hasAnomalyAnalysis: !!input.json.anomaly_analysis,
    hasTimeRange: !!input.json.timeRange,
    priority: input.json.priority,
    forceDeepAnalysis: input.json.forceDeepAnalysis
  }))
};
console.log("Total inputs:", allInputs.length);

allInputs.forEach((input, idx) => {
  console.log(`\n--- Input ${idx} ---`);
  console.log("Top level keys:", Object.keys(input.json).slice(0, 15));
  console.log("Has output?", !!input.json.output);
  console.log("Output stage:", input.json.output?.stage);
  console.log("Has stage1_result?", !!input.json.stage1_result);
  console.log("Stage1_result stage:", input.json.stage1_result?.stage);
  console.log("Has anomaly_analysis?", !!input.json.anomaly_analysis);
  console.log("Has timeRange?", !!input.json.timeRange);
  console.log("Priority:", input.json.priority);
  console.log("ForceDeepAnalysis:", input.json.forceDeepAnalysis);
});
console.log("=== END DEBUG ===\n");

// Rest of the cascade detection code...

// Enhanced Cascade Failure Detection with Dependency Awareness AND Stage Data Preservation
const logs = $input.all().map(item => item.json);
const timelineData = logs.find(l => l.toolName === 'Cascade Timeline Reconstructor')?.data?.result || [];
const threadData = logs.find(l => l.toolName === 'Thread Correlation Analyzer')?.data?.result || [];

// Get service dependencies from Service Dependency Loader node
let dependencies = {};
let serviceDeps = {};
let reverseDeps = {};
let criticality = {};

try {
  // Try to get from the Service Dependency Loader node
  const depData = $node["Service Dependency Loader"].json;
  if (depData && depData.serviceDependencies) {
    dependencies = depData.serviceDependencies;
    serviceDeps = dependencies.raw || {};
    reverseDeps = dependencies.reverse || {};
    criticality = dependencies.criticality || {};
    console.log("✅ Service dependencies loaded successfully");
  }
} catch (e) {
  console.log("⚠️ Service dependencies not available, using defaults");
}

// Helper functions for dependency analysis
function isInDependencyChain(serviceA, serviceB, deps) {
  const visited = new Set();
  const queue = [serviceA];
  
  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    
    const currentDeps = deps[current]?.dependencies || [];
    if (currentDeps.includes(serviceB)) return true;
    
    queue.push(...currentDeps);
  }
  
  return false;
}

function getDependencyPath(fromService, toService, deps) {
  const queue = [[fromService]];
  const visited = new Set();
  
  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    
    if (current === toService) return path;
    if (visited.has(current)) continue;
    visited.add(current);
    
    const currentDeps = deps[current]?.dependencies || [];
    currentDeps.forEach(dep => {
      queue.push([...path, dep]);
    });
  }
  
  return [];
}

function generateRestartOrder(services, deps) {
  const visited = new Set();
  const result = [];
  
  function visit(service) {
    if (visited.has(service)) return;
    visited.add(service);
    
    const serviceDeps = deps[service]?.dependencies || [];
    serviceDeps.forEach(dep => {
      if (services.includes(dep)) {
        visit(dep);
      }
    });
    
    result.push(service);
  }
  
  services.forEach(service => visit(service));
  return result;
}

function identifyCircuitBreakerPoints(cascade, deps) {
  const points = [];
  cascade.propagations.forEach(prop => {
    if (prop.isDependency && prop.dependencyPath?.length > 1) {
      const from = prop.dependencyPath[prop.dependencyPath.length - 2];
      const to = prop.dependencyPath[prop.dependencyPath.length - 1];
      points.push(`${from} → ${to}`);
    }
  });
  return [...new Set(points)];
}

// Parse timeline data
const events = timelineData.flatMap(stream => 
  stream.values.map(([timestamp, logLine]) => {
    const [ts, service, thread, errorType, message] = logLine.split('|');
    return {
      timestamp: new Date(parseInt(timestamp) / 1000000),
      timestampMs: parseInt(timestamp) / 1000000,
      service,
      thread,
      errorType,
      message
    };
  })
).sort((a, b) => a.timestampMs - b.timestampMs);

// Enhanced cascade detection with dependency analysis
const cascades = [];
let currentCascade = null;

events.forEach((event, index) => {
  // Start new cascade on auth failure or critical errors
  if (event.message?.includes('Invalid client secret') || 
      event.message?.includes('unauthorized_client') ||
      event.message?.includes('401 Unauthorized')) {
    
    if (currentCascade) cascades.push(currentCascade);
    
    currentCascade = {
      id: `cascade-${Date.now()}-${index}`,
      rootCause: event,
      propagations: [],
      duration: 0,
      affectedServices: new Set([event.service]),
      dependencyChain: [event.service],
      cascadeType: 'authentication',
      criticalityScore: criticality[event.service]?.criticalityScore || 0
    };
  } 
  // Check if error is in dependent service within time window
  else if (currentCascade) {
    const timeDiff = event.timestampMs - currentCascade.rootCause.timestampMs;
    
    // Check if this service depends on the root cause service
    const isDependentService = serviceDeps && Object.keys(serviceDeps).length > 0 ? 
      isInDependencyChain(event.service, currentCascade.rootCause.service, serviceDeps) : false;
    
    // Extended time window for dependent services
    const timeWindow = isDependentService ? 2000 : 500; // 2s for deps, 500ms for others
    
    if (timeDiff < timeWindow) {
      currentCascade.propagations.push({
        ...event,
        propagationDelay: timeDiff,
        isDependency: isDependentService,
        dependencyPath: isDependentService ? getDependencyPath(currentCascade.rootCause.service, event.service, serviceDeps) : []
      });
      currentCascade.affectedServices.add(event.service);
      currentCascade.duration = timeDiff;
      
      // Update criticality score
      if (criticality[event.service]) {
        currentCascade.criticalityScore += criticality[event.service].criticalityScore || 0;
      }
    }
  }
});

if (currentCascade) cascades.push(currentCascade);

// Analyze cascade patterns with dependency context
const cascadeAnalysis = {
  totalCascades: cascades.length,
  averageDuration: cascades.reduce((sum, c) => sum + c.duration, 0) / cascades.length || 0,
  maxDuration: Math.max(...cascades.map(c => c.duration)) || 0,
  affectedServicesPerCascade: cascades.map(c => c.affectedServices.size),
  cascadePatterns: cascades.map(c => {
    const rootService = c.rootCause.service;
    const rootCriticality = criticality[rootService] || {};
    
    return {
      rootService: rootService,
      rootError: c.rootCause.errorType,
      rootCriticality: rootCriticality.tier || 'unknown',
      rootImpact: rootCriticality.totalImpact || 0,
      propagationCount: c.propagations.length,
      duration: c.duration + 'ms',
      services: Array.from(c.affectedServices),
      dependencyPropagations: c.propagations.filter(p => p.isDependency).length,
      cascadeCriticality: c.criticalityScore,
      longestDependencyChain: Math.max(...c.propagations.map(p => p.dependencyPath?.length || 0), 0)
    };
  }),
  criticalCascades: cascades.filter(c => c.criticalityScore > 50).length,
  dependencyBasedCascades: cascades.filter(c => 
    c.propagations.some(p => p.isDependency)
  ).length
};

// Service impact analysis with dependency context
const serviceImpact = {};
events.forEach(event => {
  if (!serviceImpact[event.service]) {
    serviceImpact[event.service] = {
      totalErrors: 0,
      errorTypes: {},
      firstError: event.timestampMs,
      lastError: event.timestampMs,
      criticality: criticality[event.service] || {},
      dependencies: serviceDeps[event.service]?.dependencies || [],
      dependents: reverseDeps[event.service] || []
    };
  }
  serviceImpact[event.service].totalErrors++;
  serviceImpact[event.service].errorTypes[event.errorType] = 
    (serviceImpact[event.service].errorTypes[event.errorType] || 0) + 1;
  serviceImpact[event.service].lastError = event.timestampMs;
});

// Calculate service downtime and blast radius
Object.keys(serviceImpact).forEach(service => {
  const impact = serviceImpact[service];
  impact.downtimeMs = impact.lastError - impact.firstError;
  impact.downtimeHuman = impact.downtimeMs < 1000 ? 
    impact.downtimeMs + 'ms' : 
    (impact.downtimeMs / 1000).toFixed(2) + 's';
  
  // Calculate potential blast radius
  impact.blastRadius = {
    direct: impact.dependents.length,
    total: impact.criticality.totalImpact || 0,
    affectedServices: impact.dependents
  };
});

// Generate dependency-aware recommendations
const recommendations = [];
if (cascades.length > 0) {
  // Find the most critical cascade
  const mostCriticalCascade = cascades.sort((a, b) => b.criticalityScore - a.criticalityScore)[0];
  const rootService = mostCriticalCascade.rootCause.service;
  
  recommendations.push(
    `1. CRITICAL: Focus on ${rootService} (criticality: ${criticality[rootService]?.tier || 'unknown'}) - Root cause of cascade affecting ${mostCriticalCascade.affectedServices.size} services`,
    `2. Check ${rootService}'s dependencies: ${serviceDeps[rootService]?.dependencies.join(', ') || 'none'}`,
    `3. Restart order based on dependencies: ${generateRestartOrder(Array.from(mostCriticalCascade.affectedServices), serviceDeps).join(' → ')}`,
    `4. Implement circuit breaker between: ${identifyCircuitBreakerPoints(mostCriticalCascade, serviceDeps).join(', ') || 'No critical paths identified'}`,
    `5. Monitor critical services: ${dependencies.metadata?.mostCritical?.map(s => s.service).slice(0, 3).join(', ') || 'N/A'}`
  );
} else {
  recommendations.push(
    "1. No cascade detected in the analyzed time range",
    "2. Continue monitoring critical services: " + (dependencies.metadata?.mostCritical?.map(s => s.service).slice(0, 3).join(', ') || 'N/A'),
    "3. Review service dependencies for potential improvements"
  );
}

// Process all inputs to preserve stage data (Standardized Structure Version)
const results = [];

console.log("=== CASCADE DETECTOR - BUILDING OUTPUT (Standardized) ===");

for (const input of $input.all()) {
  const inputData = input.json;

  // Read from standardized structure (with legacy fallbacks)
  const metadata = inputData.metadata || {};
  const stageResults = inputData.stageResults || {};

  // Get Stage 2 data from standardized location
  const stage2Data = stageResults.stage2 || inputData.output || inputData;

  // Determine if we should proceed to Stage 3
  const shouldProceed = metadata.forceDeepAnalysis ||
                       inputData.forceDeepAnalysis ||  // Legacy fallback
                       metadata.priority === 'critical' ||
                       inputData.priority === 'critical' ||  // Legacy fallback
                       stage2Data.proceed_to_stage3 ||
                       cascades.length > 0;

  console.log("Cascade decision:", {
    forceDeepAnalysis: metadata.forceDeepAnalysis,
    priority: metadata.priority,
    stage2Proceed: stage2Data.proceed_to_stage3,
    cascadesDetected: cascades.length,
    finalDecision: shouldProceed
  });
  
  // Build comprehensive output with standardized structure
  const comprehensiveOutput = {
    // Preserve ENTIRE standardized structure
    ...inputData,

    // Add cascade analysis to enrichments section
    enrichments: {
      ...(inputData.enrichments || {}),
      cascadeAnalysis: {
        totalCascades: cascadeAnalysis.totalCascades,
        averageDuration: cascadeAnalysis.averageDuration,
        maxDuration: cascadeAnalysis.maxDuration,
        cascadePatterns: cascadeAnalysis.cascadePatterns,
        criticalCascades: cascadeAnalysis.criticalCascades,
        dependencyBasedCascades: cascadeAnalysis.dependencyBasedCascades,
        affectedServicesPerCascade: cascadeAnalysis.affectedServicesPerCascade
      },
      serviceImpact: serviceImpact,
      timeline: events.slice(0, 50),
      recommendation: cascades.length > 0
        ? "CRITICAL: Dependency-aware cascade detected. See detailed recommendations."
        : "No cascade pattern detected in the time range.",
      suggestedActions: recommendations,
      dependencyContext: {
        criticalServices: dependencies.metadata?.mostCritical || [],
        serviceGroups: dependencies.serviceGroups || {},
        totalServices: dependencies.metadata?.totalServices || 0,
        averageDependencyDepth: dependencies.metadata?.avgDependencies || 0
      }
    },

    // Update metadata with Stage 3 decision
    metadata: {
      ...metadata,
      proceed_to_stage3: shouldProceed
    },

    // Legacy fields for compatibility
    cascadeDetected: cascades.length > 0,
    cascadeAnalysis: cascadeAnalysis,  // Legacy location
    serviceImpact: serviceImpact,  // Legacy location
    proceed_to_stage3: shouldProceed,
    output: stage2Data,

    // Legacy context preservation
    stage1_health_check: stageResults.stage1 || null,
    stage1_5_anomaly_detection: stageResults.stage1_5_anomaly || null,
    stage2_pattern_analysis: stageResults.stage2 || null
  };

  results.push({ json: comprehensiveOutput });
}
results[0].json._debugInfo = debugInfo;
// Return all processed items
return results;