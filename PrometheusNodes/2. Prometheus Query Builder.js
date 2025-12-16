// Prometheus Query Builder - DÜZELTME
const items = $input.all();
const inputData = items[0]?.json || {};

// TÜM GİREN VERİYİ KORU
let output = { ...inputData };

// Alert bilgilerini DOĞRU yerden al
const alertName = inputData.context?.alertName || 
                  inputData.alertContext?.alertName || 
                  'unknown';

// MULTI-NAMESPACE SUPPORT: Get namespace array and build filter
// Default namespaces to monitor when none specified
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
  'bstp-cms-global-prod',  // FIX 4: Added missing namespace
  'bstp-cms-prod'           // FIX 4: Added missing namespace
];

const namespaces = inputData.namespaces ||
                   (inputData.kubernetesFilters?.namespace ? [inputData.kubernetesFilters.namespace] : DEFAULT_NAMESPACES);

// Build namespace filter for Prometheus queries
// Single namespace: namespace="ns1"
// Multiple namespaces: namespace=~"ns1|ns2|ns3"
const namespaceFilter = namespaces.length === 1
  ? 'namespace="' + namespaces[0] + '"'
  : 'namespace=~"' + namespaces.join('|') + '"';

// Kubernetes filters'ı DOĞRU yerden al
const filters = inputData.kubernetesFilters || {};

// FIX 3: Null safety - prevent null/undefined from becoming "null" string in queries
const safePod = filters.pod || '';
const safeContainer = filters.container || '';
const safeService = filters.service || '';
const safeDeployment = filters.deployment || '';

// Query'leri DOĞRU bilgilerle oluştur (MULTI-NAMESPACE aware)
const queries = [
  {
    type: "container_cpu",
    query: 'rate(container_cpu_usage_seconds_total{' + namespaceFilter + (safePod ? ', pod="' + safePod + '"' : '') + (safeContainer ? ', container="' + safeContainer + '"' : '') + '}[5m]) * 100',
    description: 'CPU usage for ' + (safeContainer || 'all containers') + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "container_memory",
    query: 'container_memory_working_set_bytes{' + namespaceFilter + (safePod ? ', pod="' + safePod + '"' : '') + (safeContainer ? ', container="' + safeContainer + '"' : '') + '}',
    description: 'Memory usage for ' + (safeContainer || 'all containers') + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "container_memory_limit",
    query: 'container_spec_memory_limit_bytes{' + namespaceFilter + (safePod ? ', pod="' + safePod + '"' : '') + (safeContainer ? ', container="' + safeContainer + '"' : '') + '}',
    description: 'Memory limit for ' + (safeContainer || 'all containers') + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "container_restarts",
    query: 'kube_pod_container_status_restarts_total{' + namespaceFilter + (safePod ? ', pod="' + safePod + '"' : '') + (safeContainer ? ', container="' + safeContainer + '"' : '') + '}',
    description: 'Restart count for ' + (safeContainer || 'all containers') + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "pod_status",
    query: 'kube_pod_status_phase{' + namespaceFilter + (safePod ? ', pod="' + safePod + '"' : '') + '}',
    description: 'Pod phase for ' + (safePod || 'all pods') + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "pod_ready",
    query: 'kube_pod_status_ready{' + namespaceFilter + (safePod ? ', pod="' + safePod + '"' : '') + '}',
    description: 'Pod ready status for ' + (safePod || 'all pods') + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "service_cpu",
    query: safeService ? 'sum(rate(container_cpu_usage_seconds_total{' + namespaceFilter + ', pod=~"' + safeService + '.*"}[5m])) by (pod) * 100' : 'sum(rate(container_cpu_usage_seconds_total{' + namespaceFilter + '}[5m])) by (pod) * 100',
    description: 'CPU usage for service ' + (safeService || 'all services') + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "service_memory",
    query: safeService ? 'sum(container_memory_working_set_bytes{' + namespaceFilter + ', pod=~"' + safeService + '.*"}) by (pod)' : 'sum(container_memory_working_set_bytes{' + namespaceFilter + '}) by (pod)',
    description: 'Memory usage for service ' + (safeService || 'all services') + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "service_replicas",
    query: (safeDeployment || safeService) ? 'kube_deployment_status_replicas{' + namespaceFilter + ', deployment="' + (safeDeployment || safeService) + '"}' : 'kube_deployment_status_replicas{' + namespaceFilter + '}',
    description: 'Replica count for ' + (safeDeployment || safeService || 'all deployments') + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "crashloop_restarts",
    query: 'rate(kube_pod_container_status_restarts_total{' + namespaceFilter + '}[15m]) > 0',
    description: 'Pods with recent restarts (namespaces: ' + namespaces.join(', ') + ')'
  }
];

// FIX 1: Determine if specific filters are available and should be used
const hasSpecificFilters = !!(safePod || safeContainer || safeService || safeDeployment);
const useSpecificFilters = inputData.kubernetesFilters?.useSpecificFilters ?? hasSpecificFilters;

// FIX 2: Determine query mode dynamically based on alert type and available filters
let queryMode = 'GENERIC'; // Default
if (alertName.includes('API') || alertName.includes('Endpoint')) {
  queryMode = 'API_FOCUSED';
} else if (alertName.includes('ETCD') || alertName.includes('Database')) {
  queryMode = 'ETCD_FOCUSED';
} else if (hasSpecificFilters) {
  queryMode = 'TARGETED';
} else if (alertName.includes('Node') || alertName.includes('Infrastructure')) {
  queryMode = 'INFRASTRUCTURE_FOCUSED';
}

// Output'a DOĞRU bilgileri ekle (MULTI-NAMESPACE aware)
output.namespaces = namespaces; // Array of namespaces
output.namespace = namespaces[0]; // Backward compatibility
output.alertName = alertName;
output.useSpecificFilters = useSpecificFilters; // FIX 1: Now dynamic!
output.filters = filters;
output.queries = queries;
output.queryCount = queries.length;
output.mode = queryMode; // FIX 2: Now dynamic based on alert type!
output.timestamp = new Date().toISOString();
output.multiNamespaceEnabled = namespaces.length > 1;

// Debug log (MULTI-NAMESPACE aware)
console.log('Prometheus Query Builder (Multi-Namespace):', {
  alertName: alertName,
  namespaces: namespaces,
  namespaceCount: namespaces.length,
  namespaceFilter: namespaceFilter,
  pod: safePod || 'none',
  container: safeContainer || 'none',
  service: safeService || 'none',
  deployment: safeDeployment || 'none',
  hasSpecificFilters: hasSpecificFilters,
  useSpecificFilters: useSpecificFilters,
  queryMode: queryMode,
  queryCount: queries.length,
  multiNamespace: namespaces.length > 1
});

return [output];