// Enhanced Prepare Prometheus Input - Direct Flow Execution
const normalizedAlert = $node["Normalize Alerts"].json;
const aiAnalysis = $node["Process AI Output"].json;

console.log('=== PREPARE PROMETHEUS INPUT - DIRECT EXECUTION ===');
console.log('Alert Type:', normalizedAlert.alertname || 'UNKNOWN');
console.log('Container:', normalizedAlert.container);
console.log('Pod:', normalizedAlert.pod);
console.log('Service:', normalizedAlert.service);
console.log('Namespace:', normalizedAlert.namespace);

// Extract data from AI analysis
const alertAnalysisData = aiAnalysis.alertAnalysis || aiAnalysis;
const kubernetesFilters = aiAnalysis.kubernetesFilters || {};
const focusAreas = aiAnalysis.focusAreas || [];

// Calculate time range (Unix timestamps in seconds)
const now = Math.floor(Date.now() / 1000);
const startTime = now - 3600; // 1 hour ago
const endTime = now;

// Build Prometheus-specific input
const prometheusInput = {
  // Request identification
  workflowId: `alert-${Date.now()}`,
  source: 'alert-listener',
  orchestratorId: `direct-${Date.now()}`,
  requestId: `alert-${aiAnalysis.alertId}-${Date.now()}`,
  
  // Time range in Unix timestamps (seconds)
  startTime: startTime,
  endTime: endTime,
  
  // Priority from alert
  priority: normalizedAlert.priority || 'medium',
  analysisType: 'alert-driven',
  
  // Alert context for Prometheus
  alertContext: {
    alertName: normalizedAlert.alertname || normalizedAlert.title,
    alertId: aiAnalysis.alertId,
    priority: normalizedAlert.priority,
    source: normalizedAlert.source,
    
    // Affected services from AI analysis
    affectedServices: alertAnalysisData.affectedComponents?.map(c => c?.name).filter(name => name) || [],
    errorPatterns: alertAnalysisData.technicalIndicators?.errorMessages || [],
    focusAreas: focusAreas,
    
    // Normalized alert for reference
    normalizedAlert: {
      alertname: normalizedAlert.alertname,
      priority: normalizedAlert.priority,
      container: normalizedAlert.container,
      pod: normalizedAlert.pod,
      namespace: normalizedAlert.namespace,
      service: normalizedAlert.service,
      node: normalizedAlert.node,
      status: normalizedAlert.status
    }
  },
  
  // Kubernetes filters for Prometheus queries (from Node 5 Process AI Output)
  // Multi-namespace support: infrastructure alerts → query ALL production namespaces
  kubernetesFilters: kubernetesFilters,
  
  // Prometheus context
  prometheusContext: {
    nodeFilter: normalizedAlert.node,
    containerFilter: normalizedAlert.container,
    podFilter: normalizedAlert.pod,
    useSpecificFilters: !!(normalizedAlert.container || normalizedAlert.pod || normalizedAlert.service)
  },
  
  // Focus areas for analysis
  focusAreas: focusAreas,

  // Namespaces for analysis (multi-namespace support from Node 5)
  namespaces: kubernetesFilters.namespaces || [normalizedAlert.namespace || 'em-prod'],
  
  // Metadata
  metadata: {
    alertSource: normalizedAlert.source,
    alertDetails: {
      id: aiAnalysis.alertId,
      title: normalizedAlert.title,
      alertname: normalizedAlert.alertname,
      detectedAt: normalizedAlert.timestamp,
      isOngoing: true
    },
    analysisMode: kubernetesFilters.useSpecificFilters ? 'TARGETED' : 'GENERAL'
  },
  
  // Context for Prometheus Query Builder compatibility
  context: {
    alertName: normalizedAlert.alertname,
    alertId: aiAnalysis.alertId,
    alertPriority: normalizedAlert.priority,
    source: normalizedAlert.source,
    
    kubernetes: {
      container: normalizedAlert.container,
      pod: normalizedAlert.pod,
      namespace: kubernetesFilters.namespace,  // null for infrastructure alerts
      namespaces: kubernetesFilters.namespaces,  // array of namespaces to query
      service: normalizedAlert.service,
      deployment: normalizedAlert.deployment,
      node: normalizedAlert.node,
      persistentvolumeclaim: normalizedAlert.persistentvolumeclaim,
      volumename: normalizedAlert.volumename,
      useSpecificFilters: kubernetesFilters.useSpecificFilters,
      useMultiNamespace: kubernetesFilters.useMultiNamespace
    },
    
    affectedServices: alertAnalysisData.affectedComponents?.map(c => c?.name).filter(name => name) || [],
    errorPatterns: alertAnalysisData.technicalIndicators?.errorMessages || [],
    
    alerts: [{
      alertname: normalizedAlert.alertname,
      severity: normalizedAlert.priority
    }]
  }
};

console.log('=== PROMETHEUS INPUT SUMMARY ===');
console.log('Request ID:', prometheusInput.requestId);
console.log('Alert Name:', prometheusInput.alertContext.alertName);
console.log('Namespace (single):', prometheusInput.kubernetesFilters.namespace || 'null');
console.log('Namespaces (multi):', prometheusInput.kubernetesFilters.namespaces?.join(', ') || 'none');
console.log('Use Multi-Namespace:', prometheusInput.kubernetesFilters.useMultiNamespace);
console.log('Use Specific Filters:', prometheusInput.kubernetesFilters.useSpecificFilters);
console.log('Analysis Mode:', prometheusInput.metadata.analysisMode);
console.log('Time Range:', `${startTime} to ${endTime}`);
console.log('Focus Areas:', focusAreas.join(', '));

return { json: prometheusInput };