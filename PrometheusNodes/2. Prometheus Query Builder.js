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
  'em-prod'
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

// Query'leri DOĞRU bilgilerle oluştur (MULTI-NAMESPACE aware)
const queries = [
  {
    type: "container_cpu",
    query: 'rate(container_cpu_usage_seconds_total{' + namespaceFilter + ', pod="' + filters.pod + '", container="' + filters.container + '"}[5m]) * 100',
    description: 'CPU usage for ' + filters.container + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "container_memory",
    query: 'container_memory_working_set_bytes{' + namespaceFilter + ', pod="' + filters.pod + '", container="' + filters.container + '"}',
    description: 'Memory usage for ' + filters.container + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "container_memory_limit",
    query: 'container_spec_memory_limit_bytes{' + namespaceFilter + ', pod="' + filters.pod + '", container="' + filters.container + '"}',
    description: 'Memory limit for ' + filters.container + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "container_restarts",
    query: 'kube_pod_container_status_restarts_total{' + namespaceFilter + ', pod="' + filters.pod + '", container="' + filters.container + '"}',
    description: 'Restart count for ' + filters.container + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "pod_status",
    query: 'kube_pod_status_phase{' + namespaceFilter + ', pod="' + filters.pod + '"}',
    description: 'Pod phase for ' + filters.pod + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "pod_ready",
    query: 'kube_pod_status_ready{' + namespaceFilter + ', pod="' + filters.pod + '"}',
    description: 'Pod ready status for ' + filters.pod + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "service_cpu",
    query: 'sum(rate(container_cpu_usage_seconds_total{' + namespaceFilter + ', pod=~"' + (filters.service || 'unknown') + '.*"}[5m])) by (pod) * 100',
    description: 'CPU usage for service ' + filters.service + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "service_memory",
    query: 'sum(container_memory_working_set_bytes{' + namespaceFilter + ', pod=~"' + (filters.service || 'unknown') + '.*"}) by (pod)',
    description: 'Memory usage for service ' + filters.service + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "service_replicas",
    query: 'kube_deployment_status_replicas{' + namespaceFilter + ', deployment="' + (filters.deployment || filters.service || 'unknown') + '"}',
    description: 'Replica count for ' + (filters.deployment || filters.service) + ' (namespaces: ' + namespaces.join(', ') + ')'
  },
  {
    type: "crashloop_restarts",
    query: 'rate(kube_pod_container_status_restarts_total{' + namespaceFilter + '}[15m]) > 0',
    description: 'Pods with recent restarts (namespaces: ' + namespaces.join(', ') + ')'
  }
];

// Output'a DOĞRU bilgileri ekle (MULTI-NAMESPACE aware)
output.namespaces = namespaces; // Array of namespaces
output.namespace = namespaces[0]; // Backward compatibility
output.alertName = alertName;
output.useSpecificFilters = true;
output.filters = filters;
output.queries = queries;
output.queryCount = queries.length;
output.mode = 'TARGETED';
output.timestamp = new Date().toISOString();
output.multiNamespaceEnabled = namespaces.length > 1;

// Debug log (MULTI-NAMESPACE aware)
console.log('Prometheus Query Builder (Multi-Namespace):', {
  alertName: alertName,
  namespaces: namespaces,
  namespaceCount: namespaces.length,
  namespaceFilter: namespaceFilter,
  pod: filters.pod,
  container: filters.container,
  queryCount: queries.length,
  multiNamespace: namespaces.length > 1
});

return [output];