// Direct Alert Context Handler for Prometheus
const input = $input.first().json;

console.log('=== PROMETHEUS DIRECT INPUT HANDLER ===');
console.log('Source:', input.source);
console.log('Request ID:', input.requestId);

// Direct input from Alert Listener
const alertContext = input.alertContext || {};
const kubernetesFilters = input.kubernetesFilters || {};
const prometheusContext = input.prometheusContext || {};

console.log('=== ALERT CONTEXT ===');
console.log('Alert Name:', alertContext.alertName || 'NONE');
console.log('Alert Priority:', alertContext.priority || input.priority);
console.log('Container:', kubernetesFilters.container || 'NONE');
console.log('Pod:', kubernetesFilters.pod || 'NONE');
console.log('Service:', kubernetesFilters.service || 'NONE');
console.log('Namespace:', kubernetesFilters.namespace || 'NONE');
console.log('Use Specific Filters:', kubernetesFilters.useSpecificFilters);

// Build Prometheus Query Builder input
const prometheusInput = {
  // Base parameters
  workflowId: input.workflowId,
  source: input.source,
  orchestratorId: input.orchestratorId,
  requestId: input.requestId,
  startTime: input.startTime,
  endTime: input.endTime,
  priority: input.priority,
  analysisType: input.analysisType,
  
  // Alert context for query building
  context: {
    alertName: alertContext.alertName,
    alertId: alertContext.alertId,
    alertPriority: alertContext.priority,
    source: alertContext.source,
    
    kubernetes: kubernetesFilters,
    
    affectedServices: alertContext.affectedServices || [],
    errorPatterns: alertContext.errorPatterns || [],
    
    alerts: alertContext.normalizedAlert ? [{
      alertname: alertContext.normalizedAlert.alertname,
      severity: alertContext.normalizedAlert.priority
    }] : []
  },
  
  // Metadata
  metadata: input.metadata || {
    focusAreas: input.focusAreas || [],
    analysisMode: kubernetesFilters.useSpecificFilters ? 'TARGETED' : 'GENERAL'
  },
  
  // Kubernetes filters
  kubernetesFilters: kubernetesFilters,
  
  // Namespaces
  namespaces: input.namespaces || [kubernetesFilters.namespace || 'etiyamobile-production'],
  
  // Prometheus context
  prometheusContext: prometheusContext
};

console.log('=== PROMETHEUS QUERY BUILDER INPUT ===');
console.log('Analysis Mode:', prometheusInput.metadata.analysisMode);
console.log('Namespace:', prometheusInput.kubernetesFilters.namespace);
console.log('Focus Areas:', input.focusAreas?.join(', ') || 'NONE');

if (prometheusInput.kubernetesFilters.useSpecificFilters) {
  console.log('=== TARGETED ANALYSIS ===');
  if (kubernetesFilters.container) console.log('Container:', kubernetesFilters.container);
  if (kubernetesFilters.pod) console.log('Pod:', kubernetesFilters.pod);
  if (kubernetesFilters.service) console.log('Service:', kubernetesFilters.service);
  if (kubernetesFilters.node) console.log('Node:', kubernetesFilters.node);
} else {
  console.log('Mode: GENERAL NAMESPACE ANALYSIS');
}

return { json: prometheusInput };