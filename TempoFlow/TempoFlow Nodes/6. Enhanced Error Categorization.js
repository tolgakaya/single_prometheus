// Enhanced Error Categorization Node - UPDATED WITH ERROR CONTEXT
// Bu node'u "Stage 1: Quick Health Check" ile "Check If Stage 2 Needed" arasına ekleyin

const stage1Output = $input.first().json;
const serviceContext = $node["Service-Aware Query Builder"].json.serviceAnalysis;
const dependencies = $node["Service Dependency Store"].json.serviceDependencies;

console.log('=== ENHANCED ERROR CATEGORIZATION ===');
console.log('Stage 1 status:', stage1Output.status);
console.log('Error count:', stage1Output.metrics?.error_count);

// Initialize categorized output
const categorizedOutput = {
  ...stage1Output,
    // YENİ: Chat context'i koru
  analysisConfig: stage1Output.analysisConfig || {},
  source: stage1Output.source || 'unknown',
  serviceErrorAnalysis: {
    byService: {},
    byCriticality: {
      critical: { services: [], totalErrors: 0 },
      high: { services: [], totalErrors: 0 },
      medium: { services: [], totalErrors: 0 },
      low: { services: [], totalErrors: 0 }
    },
    byCategory: {},
    impactScore: 0,
    recommendations: []
  },
  // NEW: Add detected errors context for Stage 2
  detectedErrors: {
    stage1Errors: stage1Output.metrics?.error_count || 0,
    expectedErrorTypes: ['401', '403', '404', '500', '502', '503', 'timeout'],
    servicesAnalyzed: serviceContext.detectedServices || [],
    requiresDeepAnalysis: false
  }
};

// Simulate service-level error distribution based on total errors
// In real implementation, this would come from actual trace data
function distributeErrorsByService(totalErrors, detectedServices) {
  const distribution = {};
  
  if (totalErrors === 0) return distribution;
  
  // Group services by criticality for better distribution
  const servicesByCriticality = {
    critical: [],
    high: [],
    medium: [],
    low: []
  };
  
  detectedServices.forEach(service => {
    const serviceInfo = dependencies[service];
    if (serviceInfo && serviceInfo.criticality) {
      servicesByCriticality[serviceInfo.criticality].push(service);
    }
  });
  
  // Distribute errors based on criticality
  // Critical: 40%, High: 30%, Medium: 20%, Low: 10%
  const errorDistribution = {
    critical: Math.ceil(totalErrors * 0.4),
    high: Math.ceil(totalErrors * 0.3),
    medium: Math.ceil(totalErrors * 0.2),
    low: Math.ceil(totalErrors * 0.1)
  };
  
  // Distribute within each criticality level
  Object.entries(servicesByCriticality).forEach(([criticality, services]) => {
    if (services.length > 0) {
      const errorsPerService = Math.ceil(errorDistribution[criticality] / services.length);
      
      services.forEach(service => {
        const serviceInfo = dependencies[service];
        distribution[service] = {
          count: errorsPerService,
          percentage: (errorsPerService / totalErrors * 100).toFixed(1),
          criticality: serviceInfo.criticality,
          category: serviceInfo.category
        };
      });
    }
  });
  
  return distribution;
}

// Get error distribution
const errorDistribution = distributeErrorsByService(
  stage1Output.metrics?.error_count || 0,
  serviceContext.detectedServices || []
);

// Categorize errors by service
Object.entries(errorDistribution).forEach(([service, data]) => {
  const serviceInfo = dependencies[service];
  
  categorizedOutput.serviceErrorAnalysis.byService[service] = {
    errorCount: data.count,
    errorPercentage: data.percentage,
    criticality: data.criticality,
    category: data.category,
    slaViolation: false,
    severity: 'low'
  };
  
  // Check SLA violations
  if (serviceInfo && serviceInfo.slaThresholds) {
    const errorRate = data.count / 100; // Assuming 100 requests
    if (errorRate > serviceInfo.slaThresholds.errorRate) {
      categorizedOutput.serviceErrorAnalysis.byService[service].slaViolation = true;
      categorizedOutput.serviceErrorAnalysis.byService[service].severity = 
        serviceInfo.criticality === 'critical' ? 'high' : 'medium';
    }
  }
  
  // Group by criticality
  categorizedOutput.serviceErrorAnalysis.byCriticality[data.criticality].services.push(service);
  categorizedOutput.serviceErrorAnalysis.byCriticality[data.criticality].totalErrors += data.count;
  
  // Group by category
  if (!categorizedOutput.serviceErrorAnalysis.byCategory[data.category]) {
    categorizedOutput.serviceErrorAnalysis.byCategory[data.category] = {
      services: [],
      totalErrors: 0
    };
  }
  categorizedOutput.serviceErrorAnalysis.byCategory[data.category].services.push(service);
  categorizedOutput.serviceErrorAnalysis.byCategory[data.category].totalErrors += data.count;
});

// Calculate impact score
let impactScore = 0;
Object.entries(categorizedOutput.serviceErrorAnalysis.byService).forEach(([service, data]) => {
  const multiplier = {
    'critical': 10,
    'high': 5,
    'medium': 2,
    'low': 1
  };
  impactScore += data.errorCount * (multiplier[data.criticality] || 1);
});
categorizedOutput.serviceErrorAnalysis.impactScore = impactScore;

// Generate recommendations based on categorization
if (categorizedOutput.serviceErrorAnalysis.byCriticality.critical.totalErrors > 0) {
  categorizedOutput.serviceErrorAnalysis.recommendations.push({
    priority: 'immediate',
    action: 'Investigate critical service errors immediately',
    services: categorizedOutput.serviceErrorAnalysis.byCriticality.critical.services
  });
}

// Check for cascade patterns with new service structure
const gatewayErrors = categorizedOutput.serviceErrorAnalysis.byCategory.gateway?.totalErrors || 0;
const backendErrors = categorizedOutput.serviceErrorAnalysis.byCategory.backend?.totalErrors || 0;
const authErrors = categorizedOutput.serviceErrorAnalysis.byCategory.auth?.totalErrors || 0;
const crmErrors = categorizedOutput.serviceErrorAnalysis.byCategory.crm?.totalErrors || 0;
const t4Errors = categorizedOutput.serviceErrorAnalysis.byCategory['t4-layer']?.totalErrors || 0;

// Check for API Gateway cascades
if (gatewayErrors > 0 && (crmErrors > 0 || authErrors > 0)) {
  categorizedOutput.serviceErrorAnalysis.recommendations.push({
    priority: 'high',
    action: 'API Gateway cascade failure detected - check downstream services',
    services: ['APIGateway', ...categorizedOutput.serviceErrorAnalysis.byCategory.crm?.services || []]
  });
}

// Check for T4 layer issues
if (t4Errors > 0) {
  categorizedOutput.serviceErrorAnalysis.recommendations.push({
    priority: 'high',
    action: 'T4 layer services experiencing errors - check integration layer',
    services: categorizedOutput.serviceErrorAnalysis.byCategory['t4-layer'].services
  });
}

// Check for authentication cascade
if (authErrors > 0 && crmErrors > 0) {
  categorizedOutput.serviceErrorAnalysis.recommendations.push({
    priority: 'high',
    action: 'Authentication cascade detected - auth services affecting CRM',
    services: ['ui-authz-mc-backend', 'bstp-id-service', 'crm-customer-information']
  });
}

// Update proceed_to_stage2 decision based on service impact
if (impactScore > 50 || categorizedOutput.serviceErrorAnalysis.byCriticality.critical.totalErrors > 0) {
  categorizedOutput.proceed_to_stage2 = true;
  categorizedOutput.reason = `High impact score (${impactScore}) or critical service errors detected`;
}

// Special handling for critical services
const criticalServicesWithErrors = categorizedOutput.serviceErrorAnalysis.byCriticality.critical.services;
if (criticalServicesWithErrors.includes('APIGateway') || 
    criticalServicesWithErrors.includes('domain-config-service') ||
    criticalServicesWithErrors.includes('bss-services-service.etiyamobile-production-eom')) {
  categorizedOutput.proceed_to_stage2 = true;
  categorizedOutput.reason = 'Core infrastructure services affected';
}

// NEW: Mark if deep analysis is required for additional error discovery
if (stage1Output.metrics?.error_count === 0 && serviceContext.detectedServices.length > 0) {
  categorizedOutput.detectedErrors.requiresDeepAnalysis = true;
  categorizedOutput.detectedErrors.reason = 'No errors in Stage 1, but critical services detected - deep analysis may find hidden issues';
}

// Add service context to quick summary
const affectedServices = Object.keys(categorizedOutput.serviceErrorAnalysis.byService);
if (affectedServices.length > 0) {
  const criticalCount = categorizedOutput.serviceErrorAnalysis.byCriticality.critical.services.length;
  const summaryPrefix = criticalCount > 0 ? `CRITICAL: ${criticalCount} critical services affected. ` : '';
  
  categorizedOutput.quick_summary = `${summaryPrefix}${stage1Output.quick_summary}. Affected services: ${affectedServices.slice(0, 3).join(', ')}${affectedServices.length > 3 ? ` and ${affectedServices.length - 3} more` : ''}`;
}

// Pass error analysis to next stages
categorizedOutput.errorAnalysis = {
  errorsByCategory: categorizedOutput.serviceErrorAnalysis.byCategory,
  detectedErrors: categorizedOutput.detectedErrors
};

console.log('=== CATEGORIZATION COMPLETE ===');
console.log('Impact score:', impactScore);
console.log('Critical errors:', categorizedOutput.serviceErrorAnalysis.byCriticality.critical.totalErrors);
console.log('T4 layer errors:', categorizedOutput.serviceErrorAnalysis.byCategory['t4-layer']?.totalErrors || 0);
console.log('Proceed to Stage 2:', categorizedOutput.proceed_to_stage2);
console.log('Requires deep analysis:', categorizedOutput.detectedErrors.requiresDeepAnalysis);

return [{ json: categorizedOutput }];