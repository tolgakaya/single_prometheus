// Category Based Deep Analysis Enhancer - COMPLETE 320+ Alert Support for Stage 2
// Enhanced version supporting all 12 categories from Alert Categories Mapper
// PRESERVES all existing Stage 2 logic, ADDS comprehensive category-specific deep analysis

const items = $input.all();
const inputData = items[0]?.json || {};

// PRESERVE ALL EXISTING DATA
let output = { ...inputData };

// Get alert category and context
// FIX: Priority 2 - Category detection from Knowledge Base
const alertCategory = output.knowledgeBase?.alertCategory ||
                      output.alertCategory ||
                      output._context?.alertEnrichment?.category ||
                      'UNKNOWN';
const alertName = output._context?.alertContext?.alertName || 'unknown';
const stage1Results = output.stage1Results || output.stage1Data || {};
const kubernetesFilters = output._context?.kubernetesFilters || {};

console.log('========================================================');
console.log('🚀 ENHANCED Category Based Deep Analysis Enhancer (12 Categories)');
console.log('========================================================');
console.log('🎯 Alert:', alertName);
console.log('📂 Category:', alertCategory);
console.log('📊 Stage 1 Status:', stage1Results.overall_status);
console.log('🔍 Will proceed to deep analysis');
console.log('========================================================');

// COMPLETE Category-specific deep analysis configurations (12 categories)
const CATEGORY_DEEP_ANALYSIS = {
  // ========== INFRASTRUCTURE CATEGORY ==========
  'INFRASTRUCTURE': {
    phases: {
      instant: {
        tools: ['Node Resource Status', 'Node Conditions', 'Node Network Health'],
        focus: 'Check all node-level metrics, conditions, and network status',
        queries: [
          'kube_node_status_condition{node="' + (kubernetesFilters.node || '.*') + '"}',
          'node_memory_MemAvailable_bytes{node="' + (kubernetesFilters.node || '.*') + '"}',
          'node_filesystem_avail_bytes{node="' + (kubernetesFilters.node || '.*') + '"}'
        ]
      },
      trend: {
        tools: ['Historical Comparison 24h'],
        focus: 'Compare node metrics over 24h period',
        queries: [
          'rate(node_cpu_seconds_total[24h])',
          'node_memory_MemAvailable_bytes[24h]'
        ]
      },
      anomaly: {
        tools: ['Resource Exhaustion Prediction', 'Anomaly Patterns'],
        focus: 'Predict node resource exhaustion',
        queries: [
          'predict_linear(node_filesystem_avail_bytes[1h], 4*3600)',
          'predict_linear(node_memory_MemAvailable_bytes[1h], 4*3600)'
        ]
      }
    },
    correlationFocus: 'all_pods_on_node',
    expectedFindings: ['node_pressure', 'pod_evictions', 'scheduling_failures'],
    urgency: 'CRITICAL'
  },

  // ========== APPLICATION CATEGORY ==========
  'APPLICATION': {
    phases: {
      instant: {
        tools: ['Pod Status Check', 'Container Restarts', 'Pod Resource Usage'],
        focus: 'Deep dive into pod lifecycle and resource consumption',
        queries: [
          'kube_pod_status_phase{pod="' + (kubernetesFilters.pod || '.*') + '"}',
          'kube_pod_container_status_restarts_total{pod="' + (kubernetesFilters.pod || '.*') + '"}',
          'container_memory_working_set_bytes{pod="' + (kubernetesFilters.pod || '.*') + '"}'
        ]
      },
      trend: {
        tools: ['Historical Comparison 24h'],
        focus: 'Analyze pod restart patterns and resource trends',
        queries: [
          'rate(kube_pod_container_status_restarts_total[24h])',
          'container_memory_working_set_bytes[24h]'
        ]
      },
      anomaly: {
        tools: ['Resource Exhaustion Prediction'],
        focus: 'Predict OOM kills and resource exhaustion',
        queries: [
          'predict_linear(container_memory_working_set_bytes[1h], 3600)',
          'stddev_over_time(rate(container_cpu_usage_seconds_total[5m])[2h:])'
        ]
      }
    },
    correlationFocus: 'deployment_and_service',
    expectedFindings: ['oom_kills', 'crashloop_backoff', 'image_pull_errors'],
    urgency: 'HIGH'
  },

  // ========== RESOURCE CATEGORY ==========
  'RESOURCE': {
    phases: {
      instant: {
        tools: ['Pod Resource Usage', 'Kubernetes PVC Status'],
        focus: 'Check resource consumption and limits',
        queries: [
          'kubelet_volume_stats_used_bytes',
          'kubelet_volume_stats_capacity_bytes',
          'kube_resourcequota'
        ]
      },
      trend: {
        tools: ['Historical Comparison 24h'],
        focus: 'Analyze resource growth patterns',
        queries: [
          'delta(kubelet_volume_stats_used_bytes[24h])',
          'rate(container_memory_working_set_bytes[24h])'
        ]
      },
      anomaly: {
        tools: ['Resource Exhaustion Prediction'],
        focus: 'Predict quota and volume exhaustion',
        queries: [
          'predict_linear(kubelet_volume_stats_used_bytes[1h], 24*3600)',
          '(kube_resourcequota_usage / kube_resourcequota_limit) > 0.8'
        ]
      }
    },
    correlationFocus: 'namespace_resources',
    expectedFindings: ['quota_exceeded', 'volume_full', 'resource_pressure'],
    urgency: 'HIGH'
  },

  // ========== NETWORK CATEGORY ==========
  'NETWORK': {
    phases: {
      instant: {
        tools: ['Active Alerts Details', 'Node Network Health'],
        focus: 'Check network connectivity and endpoints',
        queries: [
          'up{job=~".*' + (kubernetesFilters.service || '') + '.*"}',
          'probe_success',
          'rate(container_network_receive_errors_total[5m])'
        ]
      },
      trend: {
        tools: ['Historical Comparison 24h'],
        focus: 'Analyze network error patterns',
        queries: [
          'rate(container_network_receive_errors_total[24h])',
          'probe_success[24h]'
        ]
      },
      anomaly: {
        tools: ['Anomaly Patterns'],
        focus: 'Detect network anomalies',
        queries: [
          'stddev_over_time(probe_duration_seconds[2h:])',
          'changes(up[1h])'
        ]
      }
    },
    correlationFocus: 'service_mesh',
    expectedFindings: ['endpoint_down', 'network_errors', 'connectivity_loss'],
    urgency: 'HIGH'
  },

  // ========== ETCD CATEGORY (MOST CRITICAL) ==========
  'ETCD': {
    phases: {
      instant: {
        tools: ['Quick Cluster Health', 'Active Alerts Details'],
        focus: '🚨 BLOCKER: Check etcd cluster health immediately - cluster-breaking issue',
        queries: [
          'etcd_server_has_leader',
          'etcd_server_leader_changes_seen_total',
          'etcd_disk_wal_fsync_duration_seconds_histogram'
        ]
      },
      trend: {
        tools: ['Historical Comparison 24h'],
        focus: 'Analyze etcd performance trends',
        queries: [
          'rate(etcd_server_leader_changes_seen_total[24h])',
          'etcd_disk_wal_fsync_duration_seconds[24h]'
        ]
      },
      anomaly: {
        tools: ['Anomaly Patterns'],
        focus: 'Detect etcd consensus issues',
        queries: [
          'stddev_over_time(etcd_network_peer_round_trip_time_seconds[2h:])',
          'rate(etcd_server_proposals_failed_total[1h])'
        ]
      }
    },
    correlationFocus: 'cluster_control_plane',
    expectedFindings: ['leader_election', 'disk_latency', 'network_partition'],
    urgency: 'BLOCKER'
  },

  // ========== MONITORING CATEGORY ==========
  'MONITORING': {
    phases: {
      instant: {
        tools: ['Active Alerts Details'],
        focus: 'Check Prometheus and AlertManager health',
        queries: [
          'up{job="prometheus"}',
          'prometheus_tsdb_head_samples_appended_total',
          'prometheus_rule_evaluation_failures_total'
        ]
      },
      trend: {
        tools: ['Historical Comparison 24h'],
        focus: 'Monitoring system performance',
        queries: [
          'rate(prometheus_tsdb_head_samples_appended_total[24h])',
          'prometheus_tsdb_symbol_table_size_bytes[24h]'
        ]
      },
      anomaly: {
        tools: [],
        focus: 'Focus on monitoring reliability',
        queries: []
      }
    },
    correlationFocus: 'observability_stack',
    expectedFindings: ['scrape_failures', 'storage_issues', 'rule_failures'],
    urgency: 'MEDIUM'
  },

  // ========== STORAGE CATEGORY (NEW) ==========
  'STORAGE': {
    phases: {
      instant: {
        tools: ['Kubernetes PVC Status', 'Pod Resource Usage'],
        focus: 'Deep dive into storage and volume issues',
        queries: [
          'kube_persistentvolume_status_phase',
          'kube_persistentvolumeclaim_status_phase',
          'kubelet_volume_stats_available_bytes',
          'kubelet_volume_stats_capacity_bytes'
        ]
      },
      trend: {
        tools: ['Historical Comparison 24h'],
        focus: 'Analyze storage usage trends and growth',
        queries: [
          'delta(kubelet_volume_stats_used_bytes[24h])',
          'kubelet_volume_stats_used_bytes[24h]',
          'rate(kubelet_volume_stats_used_bytes[24h])'
        ]
      },
      anomaly: {
        tools: ['Resource Exhaustion Prediction'],
        focus: 'Predict volume exhaustion and attachment issues',
        queries: [
          'predict_linear(kubelet_volume_stats_used_bytes[1h], 24*3600)',
          'predict_linear(kubelet_volume_stats_available_bytes[1h], 24*3600)'
        ]
      }
    },
    correlationFocus: 'persistent_volumes_and_claims',
    expectedFindings: ['volume_mounting', 'pvc_binding', 'storage_class_issues', 'disk_space_exhaustion'],
    urgency: 'HIGH'
  },

  // ========== API CATEGORY (NEW) ==========
  'API': {
    phases: {
      instant: {
        tools: ['Quick Cluster Health', 'Active Alerts Details'],
        focus: '🚨 CRITICAL: Check Kubernetes API server health and performance',
        queries: [
          'apiserver_request_total',
          'apiserver_request_duration_seconds',
          'apiserver_current_inflight_requests',
          'up{job="apiserver"}'
        ]
      },
      trend: {
        tools: ['Historical Comparison 24h'],
        focus: 'Analyze API server performance trends and request patterns',
        queries: [
          'rate(apiserver_request_total[24h])',
          'apiserver_request_duration_seconds[24h]',
          'rate(apiserver_request_total{code=~"5.."}[24h])'
        ]
      },
      anomaly: {
        tools: ['Anomaly Patterns'],
        focus: 'Detect API server anomalies and performance degradation',
        queries: [
          'stddev_over_time(apiserver_request_duration_seconds[2h:])',
          'changes(apiserver_current_inflight_requests[1h])',
          'rate(apiserver_request_total{code=~"5.."}[1h])'
        ]
      }
    },
    correlationFocus: 'kubernetes_api_and_control_plane',
    expectedFindings: ['request_failures', 'authentication_issues', 'rate_limiting', 'api_unavailability'],
    urgency: 'CRITICAL'
  },

  // ========== CERTIFICATE CATEGORY ==========
  'CERTIFICATE': {
    phases: {
      instant: {
        tools: ['Quick Cluster Health'],
        focus: '🚨 URGENT: Check certificate expiration urgently - authentication critical',
        queries: [
          'apiserver_client_certificate_expiration_seconds',
          'kubelet_certificate_manager_client_ttl_seconds',
          'kubelet_certificate_manager_server_ttl_seconds'
        ]
      },
      trend: {
        tools: ['Historical Comparison 24h'],
        focus: 'Track certificate rotation',
        queries: [
          'kubelet_certificate_manager_client_ttl_seconds[24h]',
          'kubelet_certificate_manager_server_ttl_seconds[24h]'
        ]
      },
      anomaly: {
        tools: [],
        focus: 'Certificate issues are deterministic, not anomalous',
        queries: []
      }
    },
    correlationFocus: 'authentication_chain',
    expectedFindings: ['cert_expiry', 'rotation_failure'],
    urgency: 'CRITICAL'
  },

  // ========== CLUSTER CATEGORY ==========
  'CLUSTER': {
    phases: {
      instant: {
        tools: ['Quick Cluster Health', 'Node Conditions', 'Active Alerts Details'],
        focus: 'Comprehensive cluster health check',
        queries: [
          'up{job="kube-state-metrics"}',
          'up{job="node-exporter"}',
          'apiserver_request_duration_seconds_histogram'
        ]
      },
      trend: {
        tools: ['Historical Comparison 24h'],
        focus: 'Cluster performance trends',
        queries: [
          'apiserver_request_duration_seconds[24h]',
          'scheduler_binding_duration_seconds[24h]'
        ]
      },
      anomaly: {
        tools: ['Anomaly Patterns'],
        focus: 'Detect cluster-wide anomalies',
        queries: [
          'stddev_over_time(apiserver_request_duration_seconds[2h:])',
          'changes(kube_node_status_condition[1h])'
        ]
      }
    },
    correlationFocus: 'all_components',
    expectedFindings: ['api_latency', 'scheduler_issues', 'controller_problems'],
    urgency: 'CRITICAL'
  },

  // ========== PROXY CATEGORY (NEW) ==========
  'PROXY': {
    phases: {
      instant: {
        tools: ['Node Network Health', 'Active Alerts Details'],
        focus: 'Check kube-proxy health and network programming',
        queries: [
          'up{job="kube-proxy"}',
          'kubeproxy_network_programming_duration_seconds',
          'rest_client_requests_total{job="kube-proxy"}',
          'kubeproxy_sync_proxy_rules_duration_seconds'
        ]
      },
      trend: {
        tools: ['Historical Comparison 24h'],
        focus: 'Analyze kube-proxy performance trends',
        queries: [
          'rate(kubeproxy_network_programming_duration_seconds_count[24h])',
          'kubeproxy_sync_proxy_rules_duration_seconds[24h]'
        ]
      },
      anomaly: {
        tools: ['Anomaly Patterns'],
        focus: 'Detect proxy performance anomalies',
        queries: [
          'stddev_over_time(kubeproxy_network_programming_duration_seconds[2h:])',
          'changes(up{job="kube-proxy"}[1h])'
        ]
      }
    },
    correlationFocus: 'service_networking_and_routing',
    expectedFindings: ['kube_proxy_down', 'service_routing_issues', 'iptables_problems', 'network_programming_delays'],
    urgency: 'HIGH'
  },

  // ========== INFO CATEGORY (NEW) ==========
  'INFO': {
    phases: {
      instant: {
        tools: ['Active Alerts Details'],
        focus: 'ℹ️ INFO: Check informational alerts (expected behavior)',
        queries: [
          'ALERTS{severity="info"}',
          'alertmanager_alerts',
          'up{job="alertmanager"}'
        ]
      },
      trend: {
        tools: [],
        focus: 'Informational alerts do not require trend analysis',
        queries: []
      },
      anomaly: {
        tools: [],
        focus: 'Informational alerts are expected, no anomaly detection needed',
        queries: []
      }
    },
    correlationFocus: 'system_health_notifications',
    expectedFindings: ['expected_notifications', 'system_status_updates', 'health_check_confirmations'],
    urgency: 'LOW'
  },

  // ========== UNKNOWN CATEGORY ==========
  'UNKNOWN': {
    phases: {
      instant: {
        tools: ['Quick Cluster Health', 'Pod Status Check', 'Active Alerts Details'],
        focus: 'General health assessment',
        queries: ['up', 'kube_pod_status_phase', 'kube_node_status_condition']
      },
      trend: {
        tools: ['Historical Comparison 24h'],
        focus: 'General trend analysis',
        queries: ['up[24h]']
      },
      anomaly: {
        tools: ['Anomaly Patterns'],
        focus: 'Detect any anomalies',
        queries: []
      }
    },
    correlationFocus: 'general',
    expectedFindings: ['various_issues'],
    urgency: 'MEDIUM'
  }
};

// Get category-specific configuration
const categoryConfig = CATEGORY_DEEP_ANALYSIS[alertCategory] || CATEGORY_DEEP_ANALYSIS['UNKNOWN'];

// ENHANCE the prompts for Stage 2 (don't replace)
if (output.userMessage) {
  const urgencyEmoji = {
    'BLOCKER': '🔥',
    'CRITICAL': '🚨',
    'HIGH': '⚠️',
    'MEDIUM': '📋',
    'LOW': 'ℹ️'
  };

  output.userMessage = output.userMessage + '\\n\\n' +
    '=== ENHANCED CATEGORY-SPECIFIC DEEP ANALYSIS ===\\n' +
    `${urgencyEmoji[categoryConfig.urgency]} Alert Category: ${alertCategory} (${categoryConfig.urgency} Priority)\\n` +
    `Alert Name: ${alertName}\\n\\n` +
    'PHASE-SPECIFIC INSTRUCTIONS:\\n' +
    `Phase 1 INSTANT - ${categoryConfig.phases.instant.focus}\\n` +
    `  Tools: ${categoryConfig.phases.instant.tools.join(', ')}\\n\\n` +
    `Phase 2 TREND - ${categoryConfig.phases.trend.focus}\\n` +
    `  Tools: ${categoryConfig.phases.trend.tools.join(', ')}\\n\\n` +
    `Phase 3 ANOMALY - ${categoryConfig.phases.anomaly.focus}\\n` +
    `  Tools: ${categoryConfig.phases.anomaly.tools.join(', ')}\\n\\n` +
    `CORRELATION FOCUS: ${categoryConfig.correlationFocus}\\n` +
    `EXPECTED FINDINGS: ${categoryConfig.expectedFindings.join(', ')}`;
}

// FIX: Priority 10 - Add KB troubleshooting data to deep analysis hints
const kbAlert = output.knowledgeBase?.alert || {};
const hasKBTroubleshooting = kbAlert.troubleshootingSteps && kbAlert.troubleshootingSteps.length > 0;

// Enhanced category-specific analysis hints with KB integration
output.deepAnalysisHints = {
  category: alertCategory,
  urgency: categoryConfig.urgency,
  phases: categoryConfig.phases,
  correlationFocus: categoryConfig.correlationFocus,
  expectedFindings: categoryConfig.expectedFindings,
  criticalQueries: getAllQueries(categoryConfig),
  priority: getCategoryAnalysisPriority(alertCategory),
  totalSupportedCategories: Object.keys(CATEGORY_DEEP_ANALYSIS).length,
  // KB Troubleshooting Integration
  kbTroubleshooting: hasKBTroubleshooting ? {
    steps: kbAlert.troubleshootingSteps,
    expectedResults: kbAlert.expectedResults || [],
    immediateActions: kbAlert.immediateActions || [],
    commonCauses: kbAlert.commonCauses || []
  } : null,
  message: hasKBTroubleshooting ?
    `KB Guidance Available: ${kbAlert.description}. Follow KB troubleshooting steps for ${alertCategory} alerts.` :
    `Category-based analysis for ${alertCategory} alerts.`,
  focusAreas: hasKBTroubleshooting ?
    [...categoryConfig.expectedFindings, ...kbAlert.commonCauses] :
    categoryConfig.expectedFindings
};

// Helper function - Collect all queries
function getAllQueries(config) {
  const queries = [];
  if (config.phases.instant.queries) queries.push(...config.phases.instant.queries);
  if (config.phases.trend.queries) queries.push(...config.phases.trend.queries);
  if (config.phases.anomaly.queries) queries.push(...config.phases.anomaly.queries);
  return queries;
}

// Enhanced helper function - Analysis priority (12 categories)
function getCategoryAnalysisPriority(category) {
  const priorities = {
    'ETCD': 'BLOCKER',           // Cluster-breaking
    'API': 'CRITICAL',           // Cluster operations
    'CERTIFICATE': 'CRITICAL',   // Authentication
    'INFRASTRUCTURE': 'CRITICAL', // Node failures
    'CLUSTER': 'CRITICAL',       // Control plane
    'STORAGE': 'HIGH',           // Data persistence
    'NETWORK': 'HIGH',           // Connectivity
    'RESOURCE': 'HIGH',          // Resource management
    'PROXY': 'HIGH',            // Service routing
    'APPLICATION': 'HIGH',       // Application health
    'MONITORING': 'MEDIUM',      // Observability
    'INFO': 'LOW',              // Informational
    'UNKNOWN': 'MEDIUM'
  };
  return priorities[category] || 'MEDIUM';
}

// Enhanced root cause patterns for all categories
output.categoryRootCausePatterns = getCategoryRootCausePatterns(alertCategory);

function getCategoryRootCausePatterns(category) {
  const patterns = {
    'INFRASTRUCTURE': [
      { pattern: 'memory_pressure', indicators: ['MemoryPressure=true', 'memory < 10%'], confidence: 0.9 },
      { pattern: 'disk_pressure', indicators: ['DiskPressure=true', 'filesystem > 85%'], confidence: 0.9 },
      { pattern: 'network_partition', indicators: ['NetworkUnavailable=true', 'unreachable'], confidence: 0.85 },
      { pattern: 'kubelet_failure', indicators: ['kubelet down', 'node not ready'], confidence: 0.9 }
    ],
    'APPLICATION': [
      { pattern: 'oom_killed', indicators: ['OOMKilled', 'Exit Code 137'], confidence: 0.95 },
      { pattern: 'crashloop_backoff', indicators: ['CrashLoopBackOff', 'restarts > 5'], confidence: 0.9 },
      { pattern: 'image_pull_error', indicators: ['ImagePullBackOff', 'ErrImagePull'], confidence: 0.95 },
      { pattern: 'deployment_failure', indicators: ['ProgressDeadlineExceeded', 'replica mismatch'], confidence: 0.9 }
    ],
    'RESOURCE': [
      { pattern: 'quota_exceeded', indicators: ['exceeded quota', 'forbidden'], confidence: 0.95 },
      { pattern: 'volume_full', indicators: ['volume > 90%', 'no space left'], confidence: 0.95 },
      { pattern: 'resource_exhausted', indicators: ['limits exceeded', 'cannot allocate'], confidence: 0.9 }
    ],
    'NETWORK': [
      { pattern: 'endpoint_down', indicators: ['connection refused', 'no endpoints'], confidence: 0.9 },
      { pattern: 'dns_failure', indicators: ['name resolution', 'NXDOMAIN'], confidence: 0.95 },
      { pattern: 'network_policy', indicators: ['blocked by policy', 'denied'], confidence: 0.9 }
    ],
    'ETCD': [
      { pattern: 'no_leader', indicators: ['has_leader=0', 'election'], confidence: 0.95 },
      { pattern: 'disk_latency', indicators: ['fsync > 100ms', 'slow disk'], confidence: 0.9 },
      { pattern: 'split_brain', indicators: ['multiple leaders', 'partition'], confidence: 0.85 },
      { pattern: 'insufficient_members', indicators: ['quorum lost', 'members < majority'], confidence: 0.98 }
    ],
    'MONITORING': [
      { pattern: 'scrape_failure', indicators: ['scrape error', 'target down'], confidence: 0.9 },
      { pattern: 'storage_full', indicators: ['TSDB full', 'no space'], confidence: 0.95 },
      { pattern: 'rule_failure', indicators: ['evaluation error', 'invalid rule'], confidence: 0.9 }
    ],
    'STORAGE': [
      { pattern: 'volume_mount_failure', indicators: ['mount failed', 'volume not available'], confidence: 0.9 },
      { pattern: 'pvc_binding_issue', indicators: ['pending PVC', 'no matching PV'], confidence: 0.95 },
      { pattern: 'storage_class_problem', indicators: ['provisioning failed', 'invalid storage class'], confidence: 0.85 },
      { pattern: 'disk_space_exhaustion', indicators: ['volume full', 'inodes exhausted'], confidence: 0.95 }
    ],
    'API': [
      { pattern: 'api_server_overload', indicators: ['high latency', 'throttled requests'], confidence: 0.85 },
      { pattern: 'authentication_failure', indicators: ['unauthorized', 'invalid token'], confidence: 0.9 },
      { pattern: 'api_server_down', indicators: ['connection refused', 'server unavailable'], confidence: 0.98 },
      { pattern: 'rate_limiting', indicators: ['too many requests', 'rate limited'], confidence: 0.9 }
    ],
    'CERTIFICATE': [
      { pattern: 'cert_expired', indicators: ['certificate expired', 'ttl < 0'], confidence: 0.99 },
      { pattern: 'rotation_failed', indicators: ['rotation failed', 'unable to rotate'], confidence: 0.95 },
      { pattern: 'ca_trust_issue', indicators: ['untrusted certificate', 'invalid CA'], confidence: 0.9 }
    ],
    'CLUSTER': [
      { pattern: 'scheduler_failure', indicators: ['scheduling failed', 'unschedulable'], confidence: 0.9 },
      { pattern: 'controller_error', indicators: ['controller error', 'reconcile failed'], confidence: 0.85 },
      { pattern: 'control_plane_degradation', indicators: ['multiple components failing'], confidence: 0.8 }
    ],
    'PROXY': [
      { pattern: 'kube_proxy_down', indicators: ['proxy unreachable', 'proxy pod failed'], confidence: 0.95 },
      { pattern: 'iptables_rules_failure', indicators: ['rules sync failed', 'iptables error'], confidence: 0.9 },
      { pattern: 'service_routing_issue', indicators: ['service unreachable', 'endpoint not found'], confidence: 0.85 },
      { pattern: 'network_programming_delay', indicators: ['programming duration high', 'sync slow'], confidence: 0.8 }
    ],
    'INFO': [
      { pattern: 'expected_notification', indicators: ['watchdog', 'health check', 'info severity'], confidence: 1.0 },
      { pattern: 'system_status_update', indicators: ['status change', 'configuration update'], confidence: 0.9 }
    ],
    'UNKNOWN': [
      { pattern: 'generic_issue', indicators: ['error', 'failed'], confidence: 0.5 }
    ]
  };
  return patterns[category] || patterns['UNKNOWN'];
}

// Preserve context with comprehensive enhancements
output._context = {
  ...output._context,
  deepAnalysisEnhanced: true,
  analysisCategory: alertCategory,
  analysisUrgency: categoryConfig.urgency,
  analysisPriority: getCategoryAnalysisPriority(alertCategory),
  rootCausePatterns: output.categoryRootCausePatterns,
  totalCategories: Object.keys(CATEGORY_DEEP_ANALYSIS).length,
  csvIntegrated: true
};

// Enhanced debug logging
console.log('Enhanced Deep Analysis Configuration:');
console.log({
  category: alertCategory,
  urgency: categoryConfig.urgency,
  priority: getCategoryAnalysisPriority(alertCategory),
  phasesConfigured: true,
  rootCausePatternsAdded: output.categoryRootCausePatterns.length,
  correlationFocus: categoryConfig.correlationFocus,
  expectedFindings: categoryConfig.expectedFindings.length,
  totalQueries: getAllQueries(categoryConfig).length,
  totalCategories: Object.keys(CATEGORY_DEEP_ANALYSIS).length
});

// Category statistics for monitoring
const categoryStats = {};
Object.entries(CATEGORY_DEEP_ANALYSIS).forEach(([cat, config]) => {
  categoryStats[cat] = {
    urgency: config.urgency,
    toolsCount: config.phases.instant.tools.length + config.phases.trend.tools.length + config.phases.anomaly.tools.length,
    queriesCount: getAllQueries(config).length,
    findingsCount: config.expectedFindings.length
  };
});

console.log('📊 Enhanced Category Statistics:');
Object.entries(categoryStats).forEach(([cat, stats]) => {
  console.log(`   ${cat}: ${stats.urgency} (${stats.toolsCount} tools, ${stats.queriesCount} queries, ${stats.findingsCount} findings)`);
});

// Add enhanced category stats to output
output._enhancedDeepAnalysisStats = {
  totalCategories: Object.keys(CATEGORY_DEEP_ANALYSIS).length,
  categoryBreakdown: categoryStats,
  currentCategory: {
    name: alertCategory,
    urgency: categoryConfig.urgency,
    priority: getCategoryAnalysisPriority(alertCategory),
    phasesCount: 3,
    expectedFindings: categoryConfig.expectedFindings.length
  },
  csvEnhanced: true,
  version: '2.0-Complete'
};

console.log('========================================================');
console.log('✅ Enhanced Deep Analysis Enhancer Complete!');
console.log(`📊 Supporting ${Object.keys(CATEGORY_DEEP_ANALYSIS).length} categories`);
console.log(`🎯 Current: ${alertCategory} (${categoryConfig.urgency})`);
console.log(`🔍 Expected Findings: ${categoryConfig.expectedFindings.length}`);
console.log('========================================================');

return [output];