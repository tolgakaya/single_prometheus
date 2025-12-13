// Category Based Metrics Builder - COMPLETE 320+ Alert Support
// Enhanced version supporting all 12 categories from Alert Categories Mapper
// PRESERVES all existing Stage 1 functionality, ADDS comprehensive category-specific enhancements

const items = $input.all();
const inputData = items[0]?.json || {};

// PRESERVE ALL EXISTING DATA
let output = { ...inputData };

// Get alert category and knowledge base info
const alertCategory = inputData.alertCategory || 'UNKNOWN';
const alertName = inputData.stageContext?.alertContext?.alertName || 'unknown';
const kubernetesFilters = inputData.kubernetesFilters || {};
const knowledgeBase = inputData.knowledgeBase || {};

console.log('========================================================');
console.log('🚀 ENHANCED Category Based Metrics Builder (12 Categories)');
console.log('========================================================');
console.log('🎯 Alert:', alertName);
console.log('📂 Category:', alertCategory);
console.log('🌐 Namespace:', kubernetesFilters.namespace);
console.log('========================================================');

// COMPLETE Category-specific tool recommendations (12 categories)
const CATEGORY_TOOL_MAPPINGS = {
  // ========== INFRASTRUCTURE CATEGORY ==========
  'INFRASTRUCTURE': {
    primaryTools: [
      'Node Resource Status',
      'Node Conditions', 
      'Node Network Health'
    ],
    additionalPrompt: '\\n\\nFOCUS: Infrastructure issue detected. Prioritize node-level metrics and conditions.',
    criticalMetrics: [
      'node_memory_MemAvailable_bytes',
      'node_cpu_seconds_total',
      'node_filesystem_avail_bytes',
      'kube_node_status_condition'
    ],
    urgency: 'CRITICAL'
  },

  // ========== APPLICATION CATEGORY ==========
  'APPLICATION': {
    primaryTools: [
      'Pod Status Check',
      'Container Restarts',
      'Pod Resource Usage'
    ],
    additionalPrompt: '\\n\\nFOCUS: Application/Pod issue detected. Check pod lifecycle, restarts, and resource consumption.',
    criticalMetrics: [
      'kube_pod_status_phase',
      'kube_pod_container_status_restarts_total',
      'container_memory_working_set_bytes',
      'container_cpu_usage_seconds_total'
    ],
    urgency: 'HIGH'
  },

  // ========== RESOURCE CATEGORY ==========
  'RESOURCE': {
    primaryTools: [
      'Pod Resource Usage',
      'Node Resource Status'
    ],
    additionalPrompt: '\\n\\nFOCUS: Resource issue detected. Check quotas, PVC usage, and resource consumption.',
    criticalMetrics: [
      'kubelet_volume_stats_used_bytes',
      'kubelet_volume_stats_capacity_bytes',
      'kube_resourcequota',
      'namespace_memory_usage_bytes'
    ],
    urgency: 'HIGH'
  },

  // ========== NETWORK CATEGORY ==========
  'NETWORK': {
    primaryTools: [
      'Active Alerts Count',
      'Node Network Health'
    ],
    additionalPrompt: '\\n\\nFOCUS: Network issue detected. Check endpoints, services, and network connectivity.',
    criticalMetrics: [
      'up',
      'probe_success',
      'apiserver_request_duration_seconds',
      'etcd_network_peer_round_trip_time_seconds'
    ],
    urgency: 'HIGH'
  },

  // ========== ETCD CATEGORY (MOST CRITICAL) ==========
  'ETCD': {
    primaryTools: [
      'Quick Cluster Health',
      'Active Alerts Count'
    ],
    additionalPrompt: '\\n\\n🚨 CRITICAL: ETCD issue detected. This is INFRASTRUCTURE-BREAKING. Check etcd health and consensus IMMEDIATELY.',
    criticalMetrics: [
      'etcd_server_has_leader',
      'etcd_server_leader_changes_seen_total',
      'etcd_disk_wal_fsync_duration_seconds',
      'etcd_network_peer_round_trip_time_seconds'
    ],
    urgency: 'BLOCKER'
  },

  // ========== MONITORING CATEGORY ==========
  'MONITORING': {
    primaryTools: [
      'Active Alerts Count'
    ],
    additionalPrompt: '\\n\\nFOCUS: Monitoring system issue. Check Prometheus and AlertManager health.',
    criticalMetrics: [
      'prometheus_tsdb_head_samples_appended_total',
      'prometheus_rule_evaluation_failures_total',
      'alertmanager_alerts',
      'up{job="prometheus"}'
    ],
    urgency: 'MEDIUM'
  },

  // ========== STORAGE CATEGORY ==========
  'STORAGE': {
    primaryTools: [
      'Pod Resource Usage',
      'Kubernetes PVC Status'
    ],
    additionalPrompt: '\\n\\nFOCUS: Storage issue detected. Check PVC status, volume usage, and storage classes.',
    criticalMetrics: [
      'kubelet_volume_stats_available_bytes',
      'kubelet_volume_stats_capacity_bytes',
      'kube_persistentvolume_status_phase',
      'kube_persistentvolumeclaim_status_phase'
    ],
    urgency: 'HIGH'
  },

  // ========== API CATEGORY ==========
  'API': {
    primaryTools: [
      'Quick Cluster Health',
      'Active Alerts Count'
    ],
    additionalPrompt: '\\n\\n🚨 CRITICAL: API Server issue detected. Check Kubernetes API health, request rates, and latency.',
    criticalMetrics: [
      'apiserver_request_total',
      'apiserver_request_duration_seconds',
      'apiserver_current_inflight_requests',
      'kube_apiserver_up'
    ],
    urgency: 'CRITICAL'
  },

  // ========== CERTIFICATE CATEGORY ==========
  'CERTIFICATE': {
    primaryTools: [
      'Quick Cluster Health'
    ],
    additionalPrompt: '\\n\\n🚨 URGENT: Certificate issue detected. Check certificate expiration dates and rotation status.',
    criticalMetrics: [
      'apiserver_client_certificate_expiration_seconds',
      'kubelet_certificate_manager_client_ttl_seconds',
      'kubelet_certificate_manager_server_ttl_seconds'
    ],
    urgency: 'CRITICAL'
  },

  // ========== CLUSTER CATEGORY ==========
  'CLUSTER': {
    primaryTools: [
      'Quick Cluster Health',
      'Active Alerts Count',
      'Node Conditions'
    ],
    additionalPrompt: '\\n\\nFOCUS: Cluster-wide issue detected. Perform comprehensive health check.',
    criticalMetrics: [
      'kube_node_status_condition',
      'apiserver_request_total',
      'scheduler_binding_duration_seconds',
      'controller_runtime_reconcile_total'
    ],
    urgency: 'CRITICAL'
  },

  // ========== PROXY CATEGORY ==========
  'PROXY': {
    primaryTools: [
      'Node Network Health',
      'Active Alerts Count'
    ],
    additionalPrompt: '\\n\\nFOCUS: Kube-proxy issue detected. Check network proxy status and service connectivity.',
    criticalMetrics: [
      'up{job="kube-proxy"}',
      'kubeproxy_network_programming_duration_seconds',
      'rest_client_requests_total{job="kube-proxy"}'
    ],
    urgency: 'HIGH'
  },

  // ========== INFO CATEGORY (LOW PRIORITY) ==========
  'INFO': {
    primaryTools: [
      'Active Alerts Count'
    ],
    additionalPrompt: '\\n\\nINFO: Informational alert detected. This is expected behavior (Watchdog, InfoInhibitor).',
    criticalMetrics: [
      'ALERTS{severity="info"}',
      'alertmanager_alerts',
      'up{job="alertmanager"}'
    ],
    urgency: 'LOW'
  },

  // ========== UNKNOWN CATEGORY ==========
  'UNKNOWN': {
    primaryTools: [
      'Quick Cluster Health',
      'Active Alerts Count'
    ],
    additionalPrompt: '\\n\\nFOCUS: Unknown alert type. Perform general health assessment.',
    criticalMetrics: [
      'up',
      'kube_pod_status_phase',
      'kube_node_status_condition'
    ],
    urgency: 'MEDIUM'
  }
};

// Get category-specific configuration
const categoryConfig = CATEGORY_TOOL_MAPPINGS[alertCategory] || CATEGORY_TOOL_MAPPINGS['UNKNOWN'];

// ENHANCE the prompts (don't replace)
if (output.systemPrompt) {
  // Add category guidance to existing system prompt
  output.systemPrompt = output.systemPrompt + '\\n\\n' +
    '=== ENHANCED CATEGORY-SPECIFIC GUIDANCE ===\\n' +
    `Alert Category: ${alertCategory}\\n` +
    `Urgency Level: ${categoryConfig.urgency}\\n` +
    `Recommended Tools: ${categoryConfig.primaryTools.join(', ')}\\n` +
    `Critical Metrics to Check: ${categoryConfig.criticalMetrics.slice(0, 3).join(', ')}\\n` +
    categoryConfig.additionalPrompt;
}

if (output.userMessage) {
  // Add enhanced category context to user message
  const urgencyEmoji = {
    'BLOCKER': '🔥',
    'CRITICAL': '🚨', 
    'HIGH': '⚠️',
    'MEDIUM': '📋',
    'LOW': 'ℹ️'
  };
  
  output.userMessage = output.userMessage + '\\n\\n' +
    `${urgencyEmoji[categoryConfig.urgency]} IMPORTANT: This is a ${alertCategory} category alert (${categoryConfig.urgency} priority). ` +
    `Focus your analysis on ${categoryConfig.primaryTools[0]} as the primary diagnostic tool. ` +
    `The alert "${alertName}" typically requires checking these metrics: ${categoryConfig.criticalMetrics.slice(0, 2).join(', ')}.`;
}

// Enhanced category-specific context for Stage 1
output.categoryAnalysisHints = {
  category: alertCategory,
  urgency: categoryConfig.urgency,
  primaryTools: categoryConfig.primaryTools,
  criticalMetrics: categoryConfig.criticalMetrics,
  focusArea: categoryConfig.additionalPrompt,
  expectedIssues: getCategoryExpectedIssues(alertCategory),
  cascadeRisk: getCategoryCascadeRisk(alertCategory),
  totalSupportedCategories: Object.keys(CATEGORY_TOOL_MAPPINGS).length
};

// Enhanced helper function - Expected issues by category (12 categories)
function getCategoryExpectedIssues(category) {
  const expectations = {
    'INFRASTRUCTURE': ['node failures', 'resource exhaustion', 'network partitions', 'kubelet failures'],
    'APPLICATION': ['container crashes', 'OOM kills', 'image pull failures', 'deployment issues'],
    'RESOURCE': ['quota exceeded', 'volume full', 'resource starvation', 'memory pressure'],
    'NETWORK': ['connectivity loss', 'endpoint failures', 'DNS issues', 'proxy failures'],
    'ETCD': ['leader election', 'cluster consensus', 'data consistency', 'disk latency'],
    'MONITORING': ['metric collection', 'alert delivery', 'storage issues', 'scrape failures'],
    'STORAGE': ['volume mounting', 'PVC binding', 'storage class issues', 'disk space'],
    'API': ['request failures', 'authentication issues', 'rate limiting', 'API unavailability'],
    'CERTIFICATE': ['expiration', 'rotation failures', 'trust issues', 'CA problems'],
    'CLUSTER': ['control plane issues', 'API failures', 'scheduler problems', 'controller issues'],
    'PROXY': ['kube-proxy down', 'service routing', 'iptables issues', 'network programming'],
    'INFO': ['expected notifications', 'system status', 'health checks'],
    'UNKNOWN': ['various issues']
  };
  return expectations[category] || expectations['UNKNOWN'];
}

// Enhanced helper function - Cascade risk assessment (12 categories)
function getCategoryCascadeRisk(category) {
  const riskLevels = {
    'ETCD': 'BLOCKER',          // ETCD issues break entire cluster
    'API': 'CRITICAL',          // API issues break cluster operations  
    'CERTIFICATE': 'CRITICAL',   // Certificate issues break authentication
    'INFRASTRUCTURE': 'CRITICAL', // Node issues affect all pods
    'CLUSTER': 'CRITICAL',       // Cluster-wide components
    'NETWORK': 'HIGH',           // Network issues can cascade
    'STORAGE': 'HIGH',           // Storage issues affect multiple pods
    'RESOURCE': 'HIGH',          // Resource issues can cascade
    'PROXY': 'HIGH',            // Proxy issues affect service routing
    'APPLICATION': 'MEDIUM',     // App issues are usually contained
    'MONITORING': 'LOW',         // Monitoring issues don't affect apps
    'INFO': 'NONE',             // Info alerts have no cascade risk
    'UNKNOWN': 'MEDIUM'
  };
  return riskLevels[category] || 'MEDIUM';
}

// Enhanced tool priority hints for the AI agent
output.toolPriorityMatrix = {
  immediate: categoryConfig.primaryTools,
  secondary: getSecondaryTools(alertCategory),
  cascadeCheck: getCascadeCheckTools(alertCategory),
  urgencyLevel: categoryConfig.urgency
};

// Enhanced helper function - Secondary tools (12 categories)
function getSecondaryTools(category) {
  const secondaryMap = {
    'INFRASTRUCTURE': ['Application Metrics', 'HTTP Error Rates'],
    'APPLICATION': ['Node Resource Status', 'Application Metrics'], 
    'RESOURCE': ['Container Restarts', 'Application Metrics'],
    'NETWORK': ['Pod Status Check', 'Application Metrics'],
    'ETCD': ['Node Conditions', 'Node Network Health'],
    'MONITORING': ['Quick Cluster Health'],
    'STORAGE': ['Pod Status Check', 'Node Resource Status'],
    'API': ['Node Conditions', 'Active Alerts Count'],
    'CERTIFICATE': ['Node Conditions', 'Active Alerts Count'],
    'CLUSTER': ['Pod Status Check', 'Container Restarts'],
    'PROXY': ['Pod Status Check', 'Node Network Health'],
    'INFO': ['Quick Cluster Health'],
    'UNKNOWN': ['Node Conditions', 'Pod Status Check']
  };
  return secondaryMap[category] || ['Quick Cluster Health'];
}

// Enhanced helper function - Cascade check tools (12 categories)
function getCascadeCheckTools(category) {
  const cascadeTools = {
    'ETCD': ['Cascading Check Same Namespace', 'Active Alerts Count', 'Quick Cluster Health'],
    'API': ['Cascading Check Same Namespace', 'Active Alerts Count', 'Quick Cluster Health'],
    'CERTIFICATE': ['Cascading Check Same Namespace', 'Active Alerts Count'],
    'INFRASTRUCTURE': ['Cascading Check Same Namespace', 'Active Alerts Count'],
    'CLUSTER': ['Cascading Check Same Namespace', 'Active Alerts Count'],
    'NETWORK': ['Cascading Check Same Namespace', 'Active Alerts Count'],
    'STORAGE': ['Cascading Check Same Namespace', 'Active Alerts Count'],
    'RESOURCE': ['Active Alerts Count'],
    'PROXY': ['Active Alerts Count'],
    'APPLICATION': ['Active Alerts Count'],
    'MONITORING': ['Active Alerts Count'],
    'INFO': [],
    'UNKNOWN': ['Active Alerts Count']
  };
  return cascadeTools[category] || ['Active Alerts Count'];
}

// Preserve all existing stage context with enhancements
output.stageContext = {
  ...output.stageContext,
  categoryEnhanced: true,
  alertCategory: alertCategory,
  urgencyLevel: categoryConfig.urgency,
  cascadeRisk: getCategoryCascadeRisk(alertCategory),
  supportedCategories: Object.keys(CATEGORY_TOOL_MAPPINGS).length,
  csvIntegrated: true
};

// Enhanced debug logging with comprehensive stats
console.log('Category-based enhancements applied:');
console.log({
  category: alertCategory,
  urgency: categoryConfig.urgency,
  primaryTools: categoryConfig.primaryTools,
  cascadeRisk: getCategoryCascadeRisk(alertCategory),
  metricsToCheck: categoryConfig.criticalMetrics.length,
  expectedIssues: getCategoryExpectedIssues(alertCategory).length,
  systemPromptEnhanced: true,
  userMessageEnhanced: true,
  totalCategories: Object.keys(CATEGORY_TOOL_MAPPINGS).length
});

// Category statistics for monitoring
const categoryStats = {};
Object.keys(CATEGORY_TOOL_MAPPINGS).forEach(cat => {
  const config = CATEGORY_TOOL_MAPPINGS[cat];
  categoryStats[cat] = {
    urgency: config.urgency,
    toolCount: config.primaryTools.length,
    metricCount: config.criticalMetrics.length
  };
});

console.log('📊 Enhanced Category Statistics:');
Object.entries(categoryStats).forEach(([cat, stats]) => {
  console.log(`   ${cat}: ${stats.urgency} (${stats.toolCount} tools, ${stats.metricCount} metrics)`);
});

// Add enhanced category stats to output
output._enhancedCategoryStats = {
  totalCategories: Object.keys(CATEGORY_TOOL_MAPPINGS).length,
  categoryBreakdown: categoryStats,
  currentCategory: {
    name: alertCategory,
    urgency: categoryConfig.urgency,
    cascadeRisk: getCategoryCascadeRisk(alertCategory),
    toolsCount: categoryConfig.primaryTools.length
  },
  csvEnhanced: true,
  version: '2.0-Complete'
};

console.log('========================================================');
console.log('✅ Enhanced Category Based Metrics Builder Complete!');
console.log(`📊 Supporting ${Object.keys(CATEGORY_TOOL_MAPPINGS).length} categories`);
console.log(`🎯 Current: ${alertCategory} (${categoryConfig.urgency})`);
console.log(`🌊 Cascade Risk: ${getCategoryCascadeRisk(alertCategory)}`);
console.log('========================================================');

return [output];