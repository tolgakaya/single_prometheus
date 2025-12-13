// ================ KB-ENHANCED FIX STAGE 2 CONTEXT ================
// This file preserves ALL original 814 lines and ADDS KB enhancements
// Version: KB-Enhanced-Full-v1.0
// Enhancement Date: 2025-01-28
// Original functionality: 100% preserved
// KB Enhancement: ADDED (not replaced)

// ============= KB NODE CONNECTIONS (NEW) =============
// Get KB data from workflow nodes (safely with error handling)
let alertCategoriesMapper = {};
let loadAlertKB = {};
let categoryMetricsBuilder = {};

try {
  alertCategoriesMapper = $node["Alert Categories Mapper"]?.json || {};
} catch(e) {
  console.log("Alert Categories Mapper node not available yet");
}

try {
  loadAlertKB = $node["Load Alert Knowledge Base"]?.json || {};
} catch(e) {
  console.log("Load Alert Knowledge Base node not available yet");
}

try {
  categoryMetricsBuilder = $node["Category Based Metrics Builder"]?.json || {};
} catch(e) {
  console.log("Category Based Metrics Builder node not available yet");
}

// Helper function to derive urgency level from severity score
function deriveUrgencyLevel(severityScore) {
  if (severityScore >= 100) return 'BLOCKER';
  if (severityScore >= 90) return 'CRITICAL';
  if (severityScore >= 70) return 'HIGH';
  if (severityScore >= 50) return 'MEDIUM';
  return 'LOW';
}

// Extract KB information safely (FIXED FIELD PATHS)
const kbAlertCategory = alertCategoriesMapper.alertCategory || 'UNKNOWN';
const kbUrgencyLevel = deriveUrgencyLevel(alertCategoriesMapper.calculatedSeverityScore || 0);
const kbCascadeRisk = alertCategoriesMapper.categoryHandlingHints?.cascadeRisk || 'UNKNOWN';
const kbAlertKnowledgeBase = loadAlertKB.knowledgeBase?.alert || {};
const kbEnhancedStats = {
  totalCategories: alertCategoriesMapper._categoryStats?.totalAlerts || 0,
  totalMappings: Object.keys(alertCategoriesMapper._categoryStats?.categoryBreakdown || {}).length || 0,
  kbEntriesLoaded: Object.keys(kbAlertKnowledgeBase).length || 0
};

console.log("===== STAGE 2 KB ENHANCEMENT LOADED =====");
console.log("Alert Category:", kbAlertCategory);
console.log("Urgency Level:", kbUrgencyLevel);
console.log("Cascade Risk:", kbCascadeRisk);
console.log("KB Entries Available:", kbEnhancedStats.kbEntriesLoaded);
console.log("==========================================");

// Fix Stage 2 Context - EXTENDED Root Cause Analysis for 150+ Alert Types
// PRESERVES all existing logic, ADDS category-based root cause patterns

const items = $input.all();
const inputData = items[0]?.json || {};

// TÜm veriyi koru - deep copy ile circular reference önleme
let output = JSON.parse(JSON.stringify(inputData));

// Stage 2 output'u al (Fix Stage2 Json'dan gelen)
const stage2Output = output.output || {};

// Force Deep Analysis Override'dan gelen orijinal data'yı al
let previousData = null;
try {
  previousData = $node["Force Deep Analysis Override"].json;
} catch(e) {
  console.log("Previous data not found, using input context");
}

// Previous context'i güvenli şekilde al
const previousContext = previousData?._context || output._context || {};

// Alert category ve knowledge base bilgilerini al
const alertCategory = previousData?.alertCategory || output.alertCategory || 'UNKNOWN';
const alertName = previousContext.alertContext?.alertName || 'unknown';
const knowledgeBase = previousData?.knowledgeBase || output.knowledgeBase || {};
const categoryRootCausePatterns = previousData?.categoryRootCausePatterns || [];

console.log("=== FIX STAGE 2 CONTEXT - EXTENDED ===");
console.log("Alert:", alertName);
console.log("Category:", alertCategory);
console.log("KB Enhanced:", !!knowledgeBase.alert);

// Stage 1 verilerini koru
const stage1Data = previousData?.stage1Data || {};
const stage1Results = previousData?.stage1Results || {};

// ============= EXTENDED ROOT CAUSE EXTRACTION =============
let rootCause = {
  identified: false,
  component: "",
  issue: "",
  evidence: [],
  confidence: 0,
  category: alertCategory,
  pattern_matched: null
};

// Stage 2 verilerinden temel analiz
const criticalPods = stage2Output.execution_phases?.instant?.findings?.critical_pods || [];
const resourcePressure = stage2Output.execution_phases?.instant?.findings?.resource_pressure || [];
const trendFindings = stage2Output.execution_phases?.trend?.findings || {};
const anomalies = stage2Output.execution_phases?.anomaly?.findings?.anomalies || [];

// EXISTING ROOT CAUSE LOGIC (PRESERVED)
if (criticalPods.length > 0) {
  const pod = criticalPods[0];
  
  // Memory exhaustion pattern kontrolü (EXISTING)
  if (pod.resource_usage) {
    let memoryBytes = 0;
    let memoryDisplay = "Unknown";
    
    if (pod.resource_usage.memory_bytes && typeof pod.resource_usage.memory_bytes === 'number') {
      memoryBytes = pod.resource_usage.memory_bytes;
      memoryDisplay = `${(memoryBytes / 1073741824).toFixed(1)}GB`;
    } else if (pod.resource_usage.memory && typeof pod.resource_usage.memory === 'string') {
      const memoryStr = pod.resource_usage.memory;
      if (memoryStr.includes("Gi")) {
        const memoryGB = parseFloat(memoryStr.replace("Gi", ""));
        memoryBytes = memoryGB * 1073741824;
        memoryDisplay = `${memoryGB}GB`;
      } else if (memoryStr.includes("Mi")) {
        const memoryMB = parseFloat(memoryStr.replace("Mi", ""));
        memoryBytes = memoryMB * 1048576;
        memoryDisplay = `${(memoryMB / 1024).toFixed(1)}GB`;
      }
    }
    
    // EXISTING: Memory exhaustion pattern (5GB üzeri)
    if (memoryBytes > 5000000000) {
      rootCause = {
        identified: true,
        component: pod.pod_name,
        issue: `Memory exhaustion causing OOMKilled - pod using ${memoryDisplay} memory`,
        evidence: [
          `Pod restart count: ${pod.restarts}`,
          `Memory usage: ${memoryDisplay}`,
          `Pod status: ${pod.status}`,
          `Memory trend: ${trendFindings.memory_growth || 'increasing'}`,
          `Restart pattern: ${trendFindings.restart_pattern || 'frequent restarts'}`
        ],
        confidence: 0.85,
        category: alertCategory,
        pattern_matched: 'memory_exhaustion',
        kb_enhanced: false // Will be updated by KB validation
      };
    }
    // EXISTING: CrashLoopBackOff pattern
    else if (pod.status === "CrashLoopBackOff" && pod.restarts > 5) {
      rootCause = {
        identified: true,
        component: pod.pod_name,
        issue: `Pod in CrashLoopBackOff with ${pod.restarts} restarts - likely configuration or dependency issue`,
        evidence: [
          `Restart count: ${pod.restarts}`,
          `Pod status: ${pod.status}`,
          `Memory usage: ${memoryDisplay}`,
          `CPU usage: ${pod.resource_usage?.cpu || 'Unknown'}`,
          `Namespace: ${pod.namespace}`
        ],
        confidence: 0.75,
        category: alertCategory,
        pattern_matched: 'crashloop_backoff'
      };
    }
  }
}

// ============= NEW: CATEGORY-SPECIFIC ROOT CAUSE PATTERNS =============
if (!rootCause.identified && alertCategory !== 'UNKNOWN') {
  console.log("Applying category-specific root cause patterns for:", alertCategory);
  
  // Category-specific pattern matching
  switch(alertCategory) {
    case 'INFRASTRUCTURE':
      rootCause = analyzeInfrastructureIssues(stage2Output, resourcePressure, anomalies);
      break;
      
    case 'POD':
      rootCause = analyzePodIssues(criticalPods, trendFindings, alertName);
      break;
      
    case 'WORKLOAD':
      rootCause = analyzeWorkloadIssues(stage2Output, trendFindings);
      break;
      
    case 'RESOURCE':
      rootCause = analyzeResourceIssues(stage2Output, resourcePressure, anomalies);
      break;
      
    case 'NETWORK':
      rootCause = analyzeNetworkIssues(stage2Output, anomalies);
      break;
      
    case 'ETCD':
      rootCause = analyzeEtcdIssues(stage2Output, trendFindings);
      break;
      
    case 'CERTIFICATE':
      rootCause = analyzeCertificateIssues(stage2Output);
      break;
      
    case 'CLUSTER':
      rootCause = analyzeClusterIssues(stage2Output, anomalies);
      break;
      
    case 'MONITORING':
      rootCause = analyzeMonitoringIssues(stage2Output);
      break;
      
    case 'APPLICATION':
      rootCause = analyzeApplicationIssues(stage2Output, trendFindings, anomalies);
      break;
  }
}

// ============= KB VALIDATION AND ENHANCEMENT (NEW) =============
// Validate root cause against Knowledge Base and enhance confidence
const currentAlert = alertName || previousContext.alertContext?.alertName || 'unknown';
const kbEntry = kbAlertKnowledgeBase[currentAlert];

if (kbEntry && rootCause.identified) {
  // Check if the identified root cause matches KB common causes
  const kbCauses = kbEntry.commonCauses || [];
  const rootCauseText = rootCause.issue.toLowerCase();
  
  // Look for KB pattern matches
  const hasKBMatch = kbCauses.some(cause => 
    rootCauseText.includes(cause.toLowerCase()) || 
    cause.toLowerCase().includes(rootCause.pattern_matched || '')
  );
  
  if (hasKBMatch) {
    // Boost confidence when KB validates the root cause
    rootCause.confidence = Math.min(rootCause.confidence + 0.1, 0.95);
    rootCause.kb_enhanced = true;
    rootCause.kb_validation = "KB confirmed root cause pattern";
    
    console.log("✅ KB validated root cause:", rootCause.issue);
    console.log("KB causes matched:", kbCauses.filter(c => 
      rootCauseText.includes(c.toLowerCase()) || 
      c.toLowerCase().includes(rootCause.pattern_matched || '')
    ));
  }
  
  // Add KB troubleshooting steps as additional evidence
  if (kbEntry.troubleshootingSteps && kbEntry.troubleshootingSteps.length > 0) {
    rootCause.evidence.push(`KB recommends: ${kbEntry.troubleshootingSteps[0]}`);
  }
}

// ============= CATEGORY-SPECIFIC ANALYSIS FUNCTIONS =============

function analyzeInfrastructureIssues(stage2Data, resourcePressure, anomalies) {
  // Check for node pressure conditions
  if (resourcePressure.length > 0) {
    const node = resourcePressure[0];
    if (node.memory_usage && parseFloat(node.memory_usage) > 90) {
      return {
        identified: true,
        component: node.node,
        issue: `Node memory pressure - ${node.memory_usage} usage`,
        evidence: [
          `Node: ${node.node}`,
          `Memory usage: ${node.memory_usage}`,
          `CPU usage: ${node.cpu_usage || 'Unknown'}`,
          `Pod count: ${node.pod_count || 'Unknown'}`,
          `Anomalies: ${anomalies.join(', ') || 'None'}`
        ],
        confidence: 0.9,
        category: 'INFRASTRUCTURE',
        pattern_matched: 'node_memory_pressure'
      };
    }
    if (node.disk_usage && parseFloat(node.disk_usage) > 85) {
      return {
        identified: true,
        component: node.node,
        issue: `Node disk pressure - ${node.disk_usage} usage`,
        evidence: [
          `Node: ${node.node}`,
          `Disk usage: ${node.disk_usage}`,
          `Available space: ${node.disk_available || 'Unknown'}`,
          `Filesystem: ${node.filesystem || '/'}`
        ],
        confidence: 0.9,
        category: 'INFRASTRUCTURE',
        pattern_matched: 'node_disk_pressure'
      };
    }
  }
  
  // Check for network issues
  const networkIssues = stage2Data.execution_phases?.instant?.findings?.network_issues || [];
  if (networkIssues.length > 0) {
    return {
      identified: true,
      component: networkIssues[0].node || 'cluster',
      issue: 'Node network connectivity issues detected',
      evidence: networkIssues.map(n => `${n.node}: ${n.issue}`),
      confidence: 0.8,
      category: 'INFRASTRUCTURE',
      pattern_matched: 'network_connectivity'
    };
  }
  
  return { identified: false, category: 'INFRASTRUCTURE' };
}

function analyzePodIssues(criticalPods, trendFindings, alertName) {
  if (criticalPods.length === 0) {
    return { identified: false, category: 'POD' };
  }
  
  const pod = criticalPods[0];
  
  // Image pull issues
  if (pod.status === 'ImagePullBackOff' || pod.status === 'ErrImagePull') {
    return {
      identified: true,
      component: pod.pod_name,
      issue: `Image pull failure - ${pod.status}`,
      evidence: [
        `Pod: ${pod.pod_name}`,
        `Status: ${pod.status}`,
        `Image: ${pod.image || 'Unknown'}`,
        `Error: ${pod.error_message || 'Check pod events'}`
      ],
      confidence: 0.95,
      category: 'POD',
      pattern_matched: 'image_pull_error'
    };
  }
  
  // Init container failures
  if (pod.init_container_status === 'Failed' || alertName.includes('InitContainer')) {
    return {
      identified: true,
      component: pod.pod_name,
      issue: 'Init container failure preventing pod startup',
      evidence: [
        `Pod: ${pod.pod_name}`,
        `Init container status: ${pod.init_container_status || 'Failed'}`,
        `Exit code: ${pod.init_exit_code || 'Unknown'}`
      ],
      confidence: 0.9,
      category: 'POD',
      pattern_matched: 'init_container_failure'
    };
  }
  
  // Liveness probe failures
  if (pod.liveness_probe_failures > 3 || pod.status === 'Unhealthy') {
    return {
      identified: true,
      component: pod.pod_name,
      issue: 'Liveness probe failures causing restarts',
      evidence: [
        `Pod: ${pod.pod_name}`,
        `Liveness probe failures: ${pod.liveness_probe_failures || 'Multiple'}`,
        `Restart count: ${pod.restarts || 0}`,
        `Last probe result: ${pod.last_probe_result || 'Failed'}`
      ],
      confidence: 0.85,
      category: 'POD',
      pattern_matched: 'liveness_probe_failure'
    };
  }
  
  return { identified: false, category: 'POD' };
}

function analyzeWorkloadIssues(stage2Data, trendFindings) {
  const workloadFindings = stage2Data.execution_phases?.instant?.findings?.workload_issues || [];
  
  // HPA maxed out
  const hpaStatus = workloadFindings.find(w => w.type === 'hpa_maxed');
  if (hpaStatus) {
    return {
      identified: true,
      component: hpaStatus.deployment || 'unknown-deployment',
      issue: 'HPA at maximum replicas - cannot scale further',
      evidence: [
        `Deployment: ${hpaStatus.deployment}`,
        `Current replicas: ${hpaStatus.current_replicas}`,
        `Max replicas: ${hpaStatus.max_replicas}`,
        `CPU utilization: ${hpaStatus.cpu_utilization || 'Unknown'}`,
        `Scaling trend: ${trendFindings.scaling_pattern || 'Unknown'}`
      ],
      confidence: 0.9,
      category: 'WORKLOAD',
      pattern_matched: 'hpa_maxed_out'
    };
  }
  
  // Replica mismatch
  const replicaIssue = workloadFindings.find(w => w.type === 'replica_mismatch');
  if (replicaIssue) {
    return {
      identified: true,
      component: replicaIssue.deployment || 'unknown-deployment',
      issue: `Deployment replica mismatch - ${replicaIssue.available}/${replicaIssue.desired} available`,
      evidence: [
        `Deployment: ${replicaIssue.deployment}`,
        `Desired replicas: ${replicaIssue.desired}`,
        `Available replicas: ${replicaIssue.available}`,
        `Reason: ${replicaIssue.reason || 'Unknown'}`
      ],
      confidence: 0.85,
      category: 'WORKLOAD',
      pattern_matched: 'replica_mismatch'
    };
  }
  
  return { identified: false, category: 'WORKLOAD' };
}

function analyzeResourceIssues(stage2Data, resourcePressure, anomalies) {
  const resourceFindings = stage2Data.execution_phases?.instant?.findings?.resource_issues || [];
  
  // PVC filling up
  const pvcIssue = resourceFindings.find(r => r.type === 'pvc_filling');
  if (pvcIssue) {
    return {
      identified: true,
      component: pvcIssue.pvc_name || 'unknown-pvc',
      issue: `Persistent volume filling up - ${pvcIssue.usage_percent}% used`,
      evidence: [
        `PVC: ${pvcIssue.pvc_name}`,
        `Usage: ${pvcIssue.usage_percent}%`,
        `Available: ${pvcIssue.available_space || 'Unknown'}`,
        `Growth rate: ${pvcIssue.growth_rate || 'Unknown'}`
      ],
      confidence: 0.9,
      category: 'RESOURCE',
      pattern_matched: 'pvc_filling_up'
    };
  }
  
  // Quota exceeded
  const quotaIssue = resourceFindings.find(r => r.type === 'quota_exceeded');
  if (quotaIssue) {
    return {
      identified: true,
      component: quotaIssue.namespace || 'unknown-namespace',
      issue: `Resource quota exceeded in namespace`,
      evidence: [
        `Namespace: ${quotaIssue.namespace}`,
        `Resource: ${quotaIssue.resource_type}`,
        `Used: ${quotaIssue.used}`,
        `Limit: ${quotaIssue.limit}`
      ],
      confidence: 0.95,
      category: 'RESOURCE',
      pattern_matched: 'quota_exceeded'
    };
  }
  
  return { identified: false, category: 'RESOURCE' };
}

function analyzeNetworkIssues(stage2Data, anomalies) {
  const networkFindings = stage2Data.execution_phases?.instant?.findings?.network_issues || [];
  
  // Service endpoint down
  const endpointIssue = networkFindings.find(n => n.type === 'endpoint_down');
  if (endpointIssue) {
    return {
      identified: true,
      component: endpointIssue.service || 'unknown-service',
      issue: 'Service endpoints unavailable',
      evidence: [
        `Service: ${endpointIssue.service}`,
        `Available endpoints: ${endpointIssue.available_endpoints || 0}`,
        `Expected endpoints: ${endpointIssue.expected_endpoints || 'Unknown'}`,
        `Last seen: ${endpointIssue.last_seen || 'Never'}`
      ],
      confidence: 0.9,
      category: 'NETWORK',
      pattern_matched: 'endpoint_down'
    };
  }
  
  // DNS issues
  const dnsIssue = networkFindings.find(n => n.type === 'dns_failure');
  if (dnsIssue) {
    return {
      identified: true,
      component: 'coredns',
      issue: 'DNS resolution failures detected',
      evidence: [
        `Failed queries: ${dnsIssue.failed_queries || 'Multiple'}`,
        `Error rate: ${dnsIssue.error_rate || 'Unknown'}`,
        `Affected services: ${dnsIssue.affected_services?.join(', ') || 'Unknown'}`
      ],
      confidence: 0.85,
      category: 'NETWORK',
      pattern_matched: 'dns_failure'
    };
  }
  
  return { identified: false, category: 'NETWORK' };
}

function analyzeEtcdIssues(stage2Data, trendFindings) {
  const etcdFindings = stage2Data.execution_phases?.instant?.findings?.etcd_status || {};
  
  // No leader
  if (etcdFindings.has_leader === false || etcdFindings.leader_changes > 5) {
    return {
      identified: true,
      component: 'etcd-cluster',
      issue: 'ETCD cluster leadership issues',
      evidence: [
        `Has leader: ${etcdFindings.has_leader || 'false'}`,
        `Leader changes: ${etcdFindings.leader_changes || 'Multiple'}`,
        `Member count: ${etcdFindings.member_count || 'Unknown'}`,
        `Cluster ID: ${etcdFindings.cluster_id || 'Unknown'}`
      ],
      confidence: 0.95,
      category: 'ETCD',
      pattern_matched: 'etcd_no_leader'
    };
  }
  
  // High fsync duration
  if (etcdFindings.fsync_duration_ms > 100) {
    return {
      identified: true,
      component: 'etcd-cluster',
      issue: `ETCD disk latency issues - fsync ${etcdFindings.fsync_duration_ms}ms`,
      evidence: [
        `Fsync duration: ${etcdFindings.fsync_duration_ms}ms`,
        `Backend commit duration: ${etcdFindings.backend_commit_ms || 'Unknown'}ms`,
        `WAL fsync duration: ${etcdFindings.wal_fsync_ms || 'Unknown'}ms`
      ],
      confidence: 0.9,
      category: 'ETCD',
      pattern_matched: 'etcd_disk_latency'
    };
  }
  
  return { identified: false, category: 'ETCD' };
}

function analyzeCertificateIssues(stage2Data) {
  const certFindings = stage2Data.execution_phases?.instant?.findings?.certificate_status || {};
  
  if (certFindings.expiring_soon || certFindings.days_until_expiry < 30) {
    return {
      identified: true,
      component: certFindings.certificate_name || 'cluster-certificate',
      issue: `Certificate expiring in ${certFindings.days_until_expiry || 'Unknown'} days`,
      evidence: [
        `Certificate: ${certFindings.certificate_name || 'Unknown'}`,
        `Days until expiry: ${certFindings.days_until_expiry || 'Unknown'}`,
        `Issuer: ${certFindings.issuer || 'Unknown'}`,
        `Auto-rotation: ${certFindings.auto_rotation_enabled || 'Unknown'}`
      ],
      confidence: 0.99,
      category: 'CERTIFICATE',
      pattern_matched: 'cert_expiring'
    };
  }
  
  return { identified: false, category: 'CERTIFICATE' };
}

function analyzeClusterIssues(stage2Data, anomalies) {
  const clusterFindings = stage2Data.execution_phases?.instant?.findings?.cluster_status || {};
  
  // API server issues
  if (clusterFindings.api_latency_ms > 1000 || clusterFindings.api_errors > 100) {
    return {
      identified: true,
      component: 'kube-apiserver',
      issue: 'API server performance degradation',
      evidence: [
        `API latency: ${clusterFindings.api_latency_ms || 'Unknown'}ms`,
        `Error count: ${clusterFindings.api_errors || 'Unknown'}`,
        `Request rate: ${clusterFindings.request_rate || 'Unknown'}/s`,
        `Throttled requests: ${clusterFindings.throttled_requests || 'Unknown'}`
      ],
      confidence: 0.85,
      category: 'CLUSTER',
      pattern_matched: 'api_server_degradation'
    };
  }
  
  // Scheduler issues
  if (clusterFindings.unschedulable_pods > 0) {
    return {
      identified: true,
      component: 'kube-scheduler',
      issue: `Scheduler unable to place ${clusterFindings.unschedulable_pods} pods`,
      evidence: [
        `Unschedulable pods: ${clusterFindings.unschedulable_pods}`,
        `Scheduling attempts: ${clusterFindings.scheduling_attempts || 'Unknown'}`,
        `Binding failures: ${clusterFindings.binding_failures || 'Unknown'}`
      ],
      confidence: 0.9,
      category: 'CLUSTER',
      pattern_matched: 'scheduler_failure'
    };
  }
  
  return { identified: false, category: 'CLUSTER' };
}

function analyzeMonitoringIssues(stage2Data) {
  const monitoringFindings = stage2Data.execution_phases?.instant?.findings?.monitoring_status || {};
  
  if (monitoringFindings.scrape_failures > 10 || monitoringFindings.targets_down > 0) {
    return {
      identified: true,
      component: 'prometheus',
      issue: 'Monitoring system degradation',
      evidence: [
        `Scrape failures: ${monitoringFindings.scrape_failures || 'Unknown'}`,
        `Targets down: ${monitoringFindings.targets_down || 'Unknown'}`,
        `TSDB errors: ${monitoringFindings.tsdb_errors || 'Unknown'}`,
        `Rule failures: ${monitoringFindings.rule_failures || 'Unknown'}`
      ],
      confidence: 0.8,
      category: 'MONITORING',
      pattern_matched: 'monitoring_degradation'
    };
  }
  
  return { identified: false, category: 'MONITORING' };
}

function analyzeApplicationIssues(stage2Data, trendFindings, anomalies) {
  const appFindings = stage2Data.execution_phases?.instant?.findings?.application_metrics || {};
  
  // High error rate
  if (appFindings.error_rate > 1 || appFindings.http_5xx_rate > 0.5) {
    return {
      identified: true,
      component: appFindings.service || 'application',
      issue: `High application error rate - ${appFindings.error_rate || appFindings.http_5xx_rate}%`,
      evidence: [
        `Service: ${appFindings.service || 'Unknown'}`,
        `Error rate: ${appFindings.error_rate || 'Unknown'}%`,
        `5xx rate: ${appFindings.http_5xx_rate || 'Unknown'}%`,
        `Request rate: ${appFindings.request_rate || 'Unknown'}/s`,
        `Trend: ${trendFindings.error_trend || 'Unknown'}`
      ],
      confidence: 0.85,
      category: 'APPLICATION',
      pattern_matched: 'high_error_rate'
    };
  }
  
  // Latency issues
  if (appFindings.p99_latency_ms > 1000) {
    return {
      identified: true,
      component: appFindings.service || 'application',
      issue: `High application latency - P99: ${appFindings.p99_latency_ms}ms`,
      evidence: [
        `Service: ${appFindings.service || 'Unknown'}`,
        `P99 latency: ${appFindings.p99_latency_ms}ms`,
        `P95 latency: ${appFindings.p95_latency_ms || 'Unknown'}ms`,
        `P50 latency: ${appFindings.p50_latency_ms || 'Unknown'}ms`
      ],
      confidence: 0.8,
      category: 'APPLICATION',
      pattern_matched: 'high_latency'
    };
  }
  
  return { identified: false, category: 'APPLICATION' };
}

// ============= KNOWLEDGE BASE ENHANCEMENT =============
if (!rootCause.identified && knowledgeBase.alert) {
  // Try to match with knowledge base patterns
  const kbCauses = knowledgeBase.alert.commonCauses || [];
  const metrics = knowledgeBase.alert.requiredMetrics || [];
  
  console.log("Attempting KB-based root cause identification");
  
  // Look for KB pattern matches in Stage 2 findings
  if (kbCauses.includes('Memory leak in application') && criticalPods.length > 0) {
    const pod = criticalPods[0];
    if (trendFindings.memory_growth === 'increasing' || pod.restarts > 3) {
      rootCause = {
        identified: true,
        component: pod.pod_name,
        issue: 'Suspected memory leak based on KB pattern',
        evidence: [
          `KB Pattern: Memory leak in application`,
          `Memory trend: ${trendFindings.memory_growth || 'increasing'}`,
          `Pod restarts: ${pod.restarts || 0}`,
          `Alert: ${alertName}`
        ],
        confidence: 0.7,
        category: alertCategory,
        pattern_matched: 'kb_memory_leak'
      };
    }
  }
}

// ============= AFFECTED SERVICES UPDATE =============
const stage1Services = previousContext.initialParams?.services || [];
const stage2Services = stage2Output.correlation_matrix?.affected_services || [];
const allAffectedServices = [...new Set([...stage1Services, ...stage2Services])];

// ============= CASCADING EFFECT ANALYSIS (ENHANCED) =============
const cascadingEffects = {
  hasCascadingFailures: false,
  affectedComponents: [],
  spreadPattern: "isolated",
  cascadeCategory: alertCategory
};

// Category-based cascade risk assessment
const CASCADE_RISK_MATRIX = {
  'INFRASTRUCTURE': { risk: 'CRITICAL', spread: 'node-wide' },
  'ETCD': { risk: 'CRITICAL', spread: 'cluster-wide' },
  'CERTIFICATE': { risk: 'CRITICAL', spread: 'cluster-wide' },
  'NETWORK': { risk: 'HIGH', spread: 'service-mesh' },
  'CLUSTER': { risk: 'HIGH', spread: 'cluster-wide' },
  'RESOURCE': { risk: 'MEDIUM', spread: 'namespace' },
  'WORKLOAD': { risk: 'MEDIUM', spread: 'deployment' },
  'POD': { risk: 'LOW', spread: 'pod-local' },
  'APPLICATION': { risk: 'LOW', spread: 'service' },
  'MONITORING': { risk: 'LOW', spread: 'monitoring-only' },
  'UNKNOWN': { risk: 'MEDIUM', spread: 'unknown' }
};

const cascadeRisk = CASCADE_RISK_MATRIX[alertCategory] || CASCADE_RISK_MATRIX['UNKNOWN'];

if (cascadeRisk.risk === 'CRITICAL' || cascadeRisk.risk === 'HIGH') {
  cascadingEffects.hasCascadingFailures = true;
  cascadingEffects.spreadPattern = cascadeRisk.spread;
  cascadingEffects.affectedComponents = allAffectedServices;
}

// Check Stage 1 findings for cascade indicators
const quickFindings = stage1Data.quick_findings || stage1Results.quick_findings || [];
if (quickFindings.some(f => f.includes("cluster degraded") || f.includes("multiple"))) {
  cascadingEffects.hasCascadingFailures = true;
  if (cascadingEffects.spreadPattern === "isolated") {
    cascadingEffects.spreadPattern = "spreading";
  }
}

// ============= PROCEED DECISION (ENHANCED) =============
const priority = previousContext.priority || output._context?.priority || 'normal';
const shouldProceedToStage3 = 
  rootCause.identified || 
  priority === 'critical' ||
  priority === 'high' ||
  cascadingEffects.hasCascadingFailures ||
  (previousContext.stageConfig?.maxStages || 0) >= 3 ||
  stage1Results.alerts?.total > 10 ||
  alertCategory === 'ETCD' ||
  alertCategory === 'INFRASTRUCTURE' ||
  alertCategory === 'CERTIFICATE';

// ============= OUTPUT PREPARATION (ENHANCED) =============
const updatedStage2Output = {
  stage: stage2Output.stage || "deep_analysis",
  investigation_id: stage2Output.investigation_id,
  execution_phases: JSON.parse(JSON.stringify(stage2Output.execution_phases || {})),
  correlation_matrix: {
    primary_chain: stage2Output.correlation_matrix?.primary_chain || cascadeRisk.spread,
    affected_services: allAffectedServices,
    blast_radius: stage2Output.correlation_matrix?.blast_radius || cascadeRisk.spread,
    kubernetes_impact: {
      evicted_pods: stage2Output.correlation_matrix?.kubernetes_impact?.evicted_pods || 0,
      pending_pods: stage2Output.correlation_matrix?.kubernetes_impact?.pending_pods || 0,
      failed_schedules: stage2Output.correlation_matrix?.kubernetes_impact?.failed_schedules || 0
    }
  },
  root_cause: rootCause,
  cascading_effects: cascadingEffects,
  proceed_to_stage3: shouldProceedToStage3,
  alert_correlation_needed: shouldProceedToStage3,
  triggered_by: `Stage 1: ${stage1Results.alerts?.total || 0} alerts, Status: ${stage1Results.overall_status || 'unknown'}`,
  alert_category: alertCategory,
  knowledge_base_enhanced: !!knowledgeBase.alert
};

// Debug bilgisini güncelle
updatedStage2Output._debug = {
  nodeType: "Stage 2: Deep Analysis",
  processedAt: new Date().toISOString(),
  contextId: previousContext.contextId || output._context?.contextId,
  contextPreserved: true,
  receivedFromStage: "Fix Stage2 Json",
  stageSequence: [
    ...(previousData?._debug?.stageSequence || []),
    "Fix Stage 2 Context"
  ],
  rootCauseExtracted: rootCause.identified,
  cascadingDetected: cascadingEffects.hasCascadingFailures,
  alertCategory: alertCategory,
  patternMatched: rootCause.pattern_matched,
  timeRangeUsed: {
    start: previousContext.initialParams?.startTime || 0,
    end: previousContext.initialParams?.endTime || 0
  }
};

// Context'i güncelle
const updatedContext = {
  contextId: previousContext.contextId,
  createdAt: previousContext.createdAt,
  source: previousContext.source,
  initialParams: JSON.parse(JSON.stringify(previousContext.initialParams || {})),
  kubernetesFilters: JSON.parse(JSON.stringify(previousContext.kubernetesFilters || {})),
  alertContext: JSON.parse(JSON.stringify(previousContext.alertContext || {})),
  stageConfig: JSON.parse(JSON.stringify(previousContext.stageConfig || {})),
  priority: priority,
  forceDeepAnalysis: previousContext.forceDeepAnalysis,
  workflowMetadata: JSON.parse(JSON.stringify(previousContext.workflowMetadata || {})),
  alertCategory: alertCategory,
  alertEnrichment: previousContext.alertEnrichment,
  stageResults: {
    ...JSON.parse(JSON.stringify(previousContext.stageResults || {})),
    stage2: {
      output: {
        root_cause: rootCause,
        affected_services: allAffectedServices,
        cascading_effects: cascadingEffects,
        critical_pods: criticalPods.length,
        kubernetes_impact: updatedStage2Output.correlation_matrix.kubernetes_impact,
        alert_category: alertCategory
      },
      completedAt: new Date().toISOString(),
      decision: shouldProceedToStage3,
      rootCauseIdentified: rootCause.identified
    }
  },
  decisions: {
    ...JSON.parse(JSON.stringify(previousContext.decisions || {})),
    stage3Proceed: {
      timestamp: new Date().toISOString(),
      shouldProceed: shouldProceedToStage3,
      reason: rootCause.identified ? "Root cause identified" : 
              cascadingEffects.hasCascadingFailures ? "Cascading failures detected" :
              "Priority or category requires full analysis"
    }
  }
};

// Final output
output = {
  output: updatedStage2Output,
  _context: updatedContext,
  
  // Stage verilerini koru (Stage 3 için)
  stage1Data: JSON.parse(JSON.stringify(stage1Data)),
  stage2Data: {
    root_cause: rootCause,
    affected_services: allAffectedServices,
    critical_pods: criticalPods,
    cascading_effects: cascadingEffects,
    correlation_matrix: updatedStage2Output.correlation_matrix,
    alert_category: alertCategory
  },
  
  // Alert bilgilerini aktar
  alertInfo: {
    alertName: previousContext.alertContext?.alertName,
    pod: previousContext.kubernetesFilters?.pod,
    namespace: previousContext.kubernetesFilters?.namespace,
    priority: priority,
    category: alertCategory
  },
  
  // ============= KB ENHANCEMENT DATA (NEW) =============
  knowledgeBase: {
    alertCategory: kbAlertCategory,
    urgencyLevel: kbUrgencyLevel,
    cascadeRisk: kbCascadeRisk,
    kbEntriesAvailable: kbEnhancedStats.kbEntriesLoaded,
    rootCauseKBValidated: rootCause.kb_enhanced || false,
    enhancementVersion: "KB-Enhanced-Full-v1.0"
  },
  
  // Category analysis metadata
  categoryAnalysis: {
    category: alertCategory,
    cascadeRisk: cascadeRisk,
    patternMatched: rootCause.pattern_matched,
    confidence: rootCause.confidence
  },
  
  // Proceed flag
  proceedToStage3: shouldProceedToStage3
};

// Logging
console.log("=== FIX STAGE 2 CONTEXT - EXTENDED COMPLETE ===");
console.log("Alert Category:", alertCategory);
console.log("Root Cause Identified:", rootCause.identified);
console.log("Pattern Matched:", rootCause.pattern_matched);
console.log("Issue:", rootCause.issue);
console.log("Cascade Risk:", cascadeRisk.risk);
console.log("Affected Services:", allAffectedServices.length);
console.log("Proceed to Stage 3:", shouldProceedToStage3);
console.log("Context Preserved:", !!updatedContext.contextId);

// ============= KB ENHANCEMENT SUMMARY (NEW) =============
console.log("\n===== STAGE 2 KB ENHANCEMENT SUMMARY =====");
console.log("KB Enhanced:", kbEnhancedStats.kbEntriesLoaded > 0 ? "YES" : "NO");
console.log("Alert Category (KB):", kbAlertCategory);
console.log("Urgency Level:", kbUrgencyLevel);
console.log("Cascade Risk:", kbCascadeRisk);
console.log("Root Cause KB Validated:", rootCause.kb_enhanced || false);
console.log("Root Cause Confidence:", `${Math.round((rootCause.confidence || 0) * 100)}%`);
console.log("KB Validation:", rootCause.kb_validation || "No KB match");
console.log("============================================\n");

return [output];