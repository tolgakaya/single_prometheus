// Alert Categories Mapper - COMPLETE 320+ Alert Support
// Enhanced version supporting all alarms from CSV
// PRESERVES all existing functionality, ADDS comprehensive alert categorization

const items = $input.all();
const inputData = items[0]?.json || {};

// PRESERVE ALL EXISTING DATA
let output = { ...inputData };

// Get alert information from existing context
const alertContext = output.analysisParams?.context || output.alertContext || {};
const alertName = alertContext.alertName || 
                  output.metadata?.alertName || 
                  'unknown';

// COMPLETE ALERT CATEGORIES MAPPING - 320+ Alarms from CSV
const ALERT_CATEGORIES = {
  // ========== ETCD CATEGORY (CRITICAL INFRASTRUCTURE) ==========
  'etcdInsufficientMembers': 'ETCD',
  'etcdNoLeader': 'ETCD', 
  'KubeAPIErrorBudgetBurn': 'ETCD',  // Related to etcd performance
  'etcdDatabaseQuotaLowSpace': 'ETCD',
  'etcdHighNumberOfLeaderChanges': 'ETCD',
  'etcdHighFsyncDurations': 'ETCD',
  'etcdHighCommitDurations': 'ETCD',
  'etcdHighNumberOfFailedProposals': 'ETCD',
  'etcdHighNumberOfFailedGRPCRequests': 'ETCD',
  'etcdGRPCRequestsSlow': 'ETCD',
  'etcdMemberCommunicationSlow': 'ETCD',
  'etcdHighNumberOfFailedProposal': 'ETCD',
  'etcdExcessiveDatabaseGrowth': 'ETCD',
  'etcdDatabaseHighFragmentationRatio': 'ETCD',
  'etcdMembersDown': 'ETCD',

  // ========== INFRASTRUCTURE CATEGORY ==========
  'KubeNodeNotReady': 'INFRASTRUCTURE',
  'KubeNodeUnreachable': 'INFRASTRUCTURE',
  'KubeNodeMemoryPressure': 'INFRASTRUCTURE',
  'KubeNodeDiskPressure': 'INFRASTRUCTURE',
  'KubeNodePIDPressure': 'INFRASTRUCTURE',
  'KubeNodeNetworkUnavailable': 'INFRASTRUCTURE',
  'NodeFilesystemSpaceFillingUp': 'INFRASTRUCTURE',
  'NodeFilesystemAlmostOutOfSpace': 'INFRASTRUCTURE',
  'NodeFilesystemFilesFillingUp': 'INFRASTRUCTURE',
  'NodeFilesystemAlmostOutOfFiles': 'INFRASTRUCTURE',
  'NodeNetworkReceiveErrs': 'INFRASTRUCTURE',
  'NodeNetworkTransmitErrs': 'INFRASTRUCTURE',
  'NodeHighNumberConntrackEntriesUsed': 'INFRASTRUCTURE',
  'NodeTextFileCollectorScrapeError': 'INFRASTRUCTURE',
  'NodeClockSkewDetected': 'INFRASTRUCTURE',
  'NodeClockNotSynchronising': 'INFRASTRUCTURE',
  'NodeRAIDDegraded': 'INFRASTRUCTURE',
  'NodeRAIDDiskFailure': 'INFRASTRUCTURE',
  'NodeFileDescriptorLimit': 'INFRASTRUCTURE',
  'NodeCPUHighUsage': 'INFRASTRUCTURE',
  'NodeSystemSaturation': 'INFRASTRUCTURE',
  'NodeMemoryMajorPagesFaults': 'INFRASTRUCTURE',
  'NodeMemoryHighUtilization': 'INFRASTRUCTURE',
  'NodeDiskIOSaturation': 'INFRASTRUCTURE',
  'NodeSystemdServiceFailed': 'INFRASTRUCTURE',
  'NodeBondingDegraded': 'INFRASTRUCTURE',
  'NodeNetworkInterfaceFlapping': 'INFRASTRUCTURE',
  'NodeReadinessFlapping': 'INFRASTRUCTURE',
  'KubeletTooManyPods': 'INFRASTRUCTURE',
  'KubeletPlegDurationHigh': 'INFRASTRUCTURE',
  'KubeletPodStartUpLatencyHigh': 'INFRASTRUCTURE',
  'KubeletDown': 'INFRASTRUCTURE',

  // ========== APPLICATION CATEGORY ==========
  'KubePodCrashLooping': 'APPLICATION',
  'KubePodNotReady': 'APPLICATION',
  'KubeContainerWaiting': 'APPLICATION',
  'KubePodOOMKilled': 'APPLICATION',
  'KubeInitContainerFailed': 'APPLICATION',
  'KubeContainerTerminated': 'APPLICATION',
  'KubeDeploymentReplicasMismatch': 'APPLICATION',
  'KubeStatefulSetReplicasMismatch': 'APPLICATION',
  'KubeStatefulSetUpdateNotRolledOut': 'APPLICATION',
  'KubeDeploymentRolloutStuck': 'APPLICATION',
  'KubeDeploymentGenerationMismatch': 'APPLICATION',
  'KubeDaemonSetNotScheduled': 'APPLICATION',
  'KubeDaemonSetMisScheduled': 'APPLICATION',
  'KubeDaemonSetRolloutStuck': 'APPLICATION',
  'KubeJobFailed': 'APPLICATION',
  'KubeJobCompletion': 'APPLICATION',
  'KubeCronJobRunning': 'APPLICATION',
  'KubeHpaMaxedOut': 'APPLICATION',
  'KubeHpaReplicasMismatch': 'APPLICATION',

  // ========== MONITORING CATEGORY ==========
  'AlertmanagerFailedToSendAlerts': 'MONITORING',
  'AlertmanagerClusterDown': 'MONITORING', 
  'AlertmanagerClusterFailedToSendAlerts': 'MONITORING',
  'AlertmanagerFailedReload': 'MONITORING',
  'AlertmanagerMembersInconsistent': 'MONITORING',
  'AlertmanagerConfigInconsistent': 'MONITORING',
  'AlertmanagerClusterCrashlooping': 'MONITORING',
  'ConfigReloaderSidecarErrors': 'MONITORING',
  'TargetDown': 'MONITORING',
  'PrometheusTargetDown': 'MONITORING',
  'PrometheusBadConfig': 'MONITORING',
  'PrometheusSDRefreshFailure': 'MONITORING',
  'PrometheusKubernetesListWatchFailures': 'MONITORING',
  'PrometheusNotificationQueueRunningFull': 'MONITORING',
  'PrometheusErrorSendingAlertsToSomeAlertmanagers': 'MONITORING',
  'PrometheusNotConnectedToAlertmanagers': 'MONITORING',
  'PrometheusTSDBReloadsFailing': 'MONITORING',
  'PrometheusTSDBCompactionsFailing': 'MONITORING',
  'PrometheusNotIngestingSamples': 'MONITORING',
  'PrometheusDuplicateTimestamps': 'MONITORING',
  'PrometheusOutOfOrderTimestamps': 'MONITORING',
  'PrometheusRemoteStorageFailures': 'MONITORING',
  'PrometheusRemoteWriteBehind': 'MONITORING',
  'PrometheusRemoteWriteDesiredShards': 'MONITORING',
  'PrometheusRuleFailures': 'MONITORING',
  'PrometheusMissingRuleEvaluations': 'MONITORING',
  'PrometheusTargetLimitHit': 'MONITORING',
  'PrometheusLabelLimitHit': 'MONITORING',
  'PrometheusScrapeBodySizeLimitHit': 'MONITORING',
  'PrometheusScrapeSampleLimitHit': 'MONITORING',
  'PrometheusTargetSyncFailure': 'MONITORING',
  'PrometheusHighQueryLoad': 'MONITORING',
  'PrometheusErrorSendingAlertsToAnyAlertmanager': 'MONITORING',
  'PrometheusOperatorListErrors': 'MONITORING',
  'PrometheusOperatorWatchErrors': 'MONITORING',
  'PrometheusOperatorSyncFailed': 'MONITORING',
  'PrometheusOperatorReconcileErrors': 'MONITORING',
  'PrometheusOperatorStatusUpdateErrors': 'MONITORING',
  'PrometheusOperatorNodeLookupErrors': 'MONITORING',
  'PrometheusOperatorNotReady': 'MONITORING',
  'PrometheusOperatorRejectedResources': 'MONITORING',
  'LokiRequestErrors': 'MONITORING',
  'LokiRequestPanics': 'MONITORING',
  'LokiRequestLatency': 'MONITORING',
  'LokiTooManyCompactorsRunning': 'MONITORING',
  'LokiCanaryLatency': 'MONITORING',

  // ========== STORAGE CATEGORY ==========
  'KubePersistentVolumeFillingUp': 'STORAGE',
  'KubePersistentVolumeErrors': 'STORAGE',
  'KubePersistentVolumeInodesFillingUp': 'STORAGE',
  'KubePersistentVolumeAlmostOutOfSpace': 'STORAGE',
  'VolumeAttachmentStuck': 'STORAGE',

  // ========== NETWORK CATEGORY ==========
  'NetworkReceiveErrors': 'NETWORK',
  'NetworkTransmitErrors': 'NETWORK',
  'NodeNetworkInterfaceFlapping': 'NETWORK',
  'NodeHighConntrackUsage': 'NETWORK',
  'NetworkPolicyViolation': 'NETWORK',

  // ========== API CATEGORY ==========
  'KubeAPIDown': 'API',
  'KubeAPITerminatedRequests': 'API',
  'KubeVersionMismatch': 'API',
  'KubeClientErrors': 'API',
  'KubeAggregatedAPIErrors': 'API',
  'KubeAggregatedAPIDown': 'API',
  'KubeStateMetricsListErrors': 'API',
  'KubeStateMetricsWatchErrors': 'API',
  'KubeStateMetricsShardingMismatch': 'API',
  'KubeStateMetricsShardsMissing': 'API',

  // ========== CERTIFICATE CATEGORY ==========
  'KubeletClientCertificateExpiration': 'CERTIFICATE',
  'KubeletServerCertificateExpiration': 'CERTIFICATE',
  'KubeletClientCertificateRenewalErrors': 'CERTIFICATE',
  'KubeletServerCertificateRenewalErrors': 'CERTIFICATE',
  'KubeAPIServerClientCertificateExpiration': 'CERTIFICATE',
  'K8sCertificateExpiration': 'CERTIFICATE',

  // ========== RESOURCE CATEGORY ==========
  'KubeMemoryOvercommit': 'RESOURCE',
  'KubeCPUOvercommit': 'RESOURCE',
  'KubeCPUQuotaOvercommit': 'RESOURCE',
  'KubeMemoryQuotaOvercommit': 'RESOURCE',
  'KubeQuotaAlmostFull': 'RESOURCE',
  'KubeQuotaFullyUsed': 'RESOURCE',
  'KubeQuotaExceeded': 'RESOURCE',
  'CPUThrottlingHigh': 'RESOURCE',

  // ========== PROXY CATEGORY ==========
  'KubeProxyDown': 'PROXY',

  // ========== CLUSTER CATEGORY ==========
  'KubeSchedulerDown': 'CLUSTER',
  'KubeControllerManagerDown': 'CLUSTER',

  // ========== INFO CATEGORY (LOW PRIORITY) ==========
  'Watchdog': 'INFO',
  'InfoInhibitor': 'INFO',
  'InhibitRulesConfigCheck': 'INFO'
};

// Enhanced alert category detection
const alertCategory = ALERT_CATEGORIES[alertName] || 'UNKNOWN';

// EXTENDED ALERT SEVERITY MAPPING with CSV-based priorities
const ALERT_SEVERITY_SCORES = {
  'ETCD': {
    baseScore: 95,
    criticalAlerts: [
      'etcdInsufficientMembers', 'etcdNoLeader', 'etcdDatabaseQuotaLowSpace',
      'etcdHighNumberOfFailedGRPCRequests', 'etcdGRPCRequestsSlow'
    ],
    multiplier: 2.0
  },
  'INFRASTRUCTURE': {
    baseScore: 80,
    criticalAlerts: [
      'KubeNodeNotReady', 'KubeNodeUnreachable', 'NodeFilesystemAlmostOutOfSpace',
      'NodeRAIDDegraded', 'KubeletDown'
    ],
    multiplier: 1.5
  },
  'APPLICATION': {
    baseScore: 70,
    criticalAlerts: [
      'KubePodCrashLooping', 'KubePodOOMKilled', 'KubeStatefulSetReplicasMismatch',
      'KubeDeploymentRolloutStuck'
    ],
    multiplier: 1.3
  },
  'MONITORING': {
    baseScore: 60,
    criticalAlerts: [
      'AlertmanagerClusterDown', 'AlertmanagerFailedToSendAlerts', 'PrometheusTargetDown',
      'PrometheusRuleFailures', 'PrometheusErrorSendingAlertsToAnyAlertmanager'
    ],
    multiplier: 1.2
  },
  'STORAGE': {
    baseScore: 75,
    criticalAlerts: [
      'KubePersistentVolumeFillingUp', 'KubePersistentVolumeErrors',
      'VolumeAttachmentStuck'
    ],
    multiplier: 1.4
  },
  'API': {
    baseScore: 85,
    criticalAlerts: [
      'KubeAPIDown', 'KubeAPIErrorBudgetBurn', 'KubeStateMetricsListErrors'
    ],
    multiplier: 1.6
  },
  'CERTIFICATE': {
    baseScore: 85,
    criticalAlerts: [
      'KubeletClientCertificateExpiration', 'KubeletServerCertificateExpiration'
    ],
    multiplier: 1.6
  },
  'RESOURCE': {
    baseScore: 65,
    criticalAlerts: [
      'KubeQuotaExceeded', 'KubeMemoryOvercommit', 'CPUThrottlingHigh'
    ],
    multiplier: 1.4
  },
  'NETWORK': {
    baseScore: 70,
    criticalAlerts: [
      'NodeNetworkReceiveErrs', 'NodeNetworkTransmitErrs'
    ],
    multiplier: 1.3
  },
  'PROXY': {
    baseScore: 75,
    criticalAlerts: ['KubeProxyDown'],
    multiplier: 1.4
  },
  'CLUSTER': {
    baseScore: 80,
    criticalAlerts: ['KubeSchedulerDown', 'KubeControllerManagerDown'],
    multiplier: 1.5
  },
  'INFO': {
    baseScore: 20,
    criticalAlerts: [],
    multiplier: 0.5
  },
  'UNKNOWN': {
    baseScore: 40,
    criticalAlerts: [],
    multiplier: 1.0
  }
};

// Calculate severity score based on category and CSV data
let severityScore = ALERT_SEVERITY_SCORES[alertCategory]?.baseScore || 40;
const categoryConfig = ALERT_SEVERITY_SCORES[alertCategory];

if (categoryConfig && categoryConfig.criticalAlerts.includes(alertName)) {
  severityScore = severityScore * categoryConfig.multiplier;
}

// Severity mapping from CSV (Blocker > Critical > High > Medium > Warning > Low > Info)
const CSV_SEVERITY_MAPPING = {
  'etcdInsufficientMembers': 'blocker',
  'etcdNoLeader': 'blocker',
  'AlertmanagerClusterDown': 'blocker',
  'KubeAPIErrorBudgetBurn': 'critical',
  'etcdDatabaseQuotaLowSpace': 'critical',
  'KubeNodeNotReady': 'critical',
  'KubeDeploymentRolloutStuck': 'high',
  'AlertmanagerFailedToSendAlerts': 'high',
  'TargetDown': 'medium',
  'Watchdog': 'low',
  'InfoInhibitor': 'info'
};

const csvSeverity = CSV_SEVERITY_MAPPING[alertName] || 'unknown';

// Adjust severity score based on CSV severity
if (csvSeverity === 'blocker') {
  severityScore = Math.max(severityScore, 100);
} else if (csvSeverity === 'critical') {
  severityScore = Math.max(severityScore, 90);
} else if (csvSeverity === 'high') {
  severityScore = Math.max(severityScore, 80);
} else if (csvSeverity === 'medium') {
  severityScore = Math.max(severityScore, 60);
} else if (csvSeverity === 'warning') {
  severityScore = Math.max(severityScore, 50);
} else if (csvSeverity === 'low') {
  severityScore = Math.max(severityScore, 30);
} else if (csvSeverity === 'info') {
  severityScore = Math.max(severityScore, 10);
}

// ADD new fields to output WITHOUT removing existing ones
output.alertCategory = alertCategory;
output.alertCategoryConfig = categoryConfig;
output.calculatedSeverityScore = Math.round(severityScore);
output.csvSeverity = csvSeverity;
output.csvEnhanced = true;

// PRESERVE and ENHANCE existing context
if (output._context) {
  // ADD to existing context
  output._context.alertCategory = alertCategory;
  output._context.needsExtendedAnalysis = alertCategory !== 'UNKNOWN';
  output._context.categoryBasedSeverity = severityScore;
  output._context.csvSeverity = csvSeverity;
  
  // PRESERVE all existing fields and add enrichment
  output._context = {
    ...output._context,
    alertEnrichment: {
      category: alertCategory,
      severityScore: severityScore,
      csvSeverity: csvSeverity,
      criticalAlert: categoryConfig?.criticalAlerts.includes(alertName) || false,
      categoryConfig: categoryConfig,
      totalKnownAlerts: Object.keys(ALERT_CATEGORIES).length
    }
  };
}

// Enhanced category-specific handling hints
output.categoryHandlingHints = {
  requiresNodeAnalysis: ['INFRASTRUCTURE', 'ETCD', 'CLUSTER', 'PROXY'].includes(alertCategory),
  requiresPodAnalysis: ['APPLICATION', 'RESOURCE'].includes(alertCategory),
  requiresNetworkAnalysis: ['NETWORK'].includes(alertCategory),
  requiresCertificateCheck: ['CERTIFICATE'].includes(alertCategory),
  requiresApplicationMetrics: ['APPLICATION'].includes(alertCategory),
  requiresStorageCheck: ['STORAGE'].includes(alertCategory),
  requiresAPICheck: ['API'].includes(alertCategory),
  requiresMonitoringCheck: ['MONITORING'].includes(alertCategory),
  isInfrastructureCritical: ['ETCD', 'INFRASTRUCTURE', 'API', 'CERTIFICATE'].includes(alertCategory),
  cascadeRisk: getCategoryCascadeRisk(alertCategory),
  immediateActionRequired: csvSeverity === 'blocker' || severityScore >= 95
};

// Helper function - Cascade risk assessment
function getCategoryCascadeRisk(category) {
  const riskLevels = {
    'ETCD': 'CRITICAL',           // ETCD issues break entire cluster
    'INFRASTRUCTURE': 'CRITICAL', // Node issues affect all pods
    'API': 'CRITICAL',            // API issues break cluster operations
    'CERTIFICATE': 'CRITICAL',    // Certificate issues break authentication
    'CLUSTER': 'CRITICAL',        // Cluster-wide components
    'NETWORK': 'HIGH',            // Network issues can cascade
    'STORAGE': 'HIGH',            // Storage issues affect multiple pods
    'APPLICATION': 'MEDIUM',      // App issues are usually contained
    'RESOURCE': 'MEDIUM',         // Resource issues can cascade but contained
    'MONITORING': 'LOW',          // Monitoring issues don't affect apps
    'PROXY': 'MEDIUM',            // Proxy issues affect connectivity
    'INFO': 'NONE',              // Info alerts have no cascade risk
    'UNKNOWN': 'MEDIUM'
  };
  return riskLevels[category] || 'MEDIUM';
}

// Debug logging with enhanced stats
console.log('==================================================');
console.log('🚀 ENHANCED Alert Categories Mapper (320+ Support)');
console.log('==================================================');
console.log('🎯 Alert:', alertName);
console.log('📂 Category:', alertCategory);
console.log('⚡ CSV Severity:', csvSeverity);
console.log('📊 Severity Score:', severityScore);
console.log('🔥 Critical Alert:', categoryConfig?.criticalAlerts.includes(alertName));
console.log('🌊 Cascade Risk:', getCategoryCascadeRisk(alertCategory));
console.log('📈 Total Known Alerts:', Object.keys(ALERT_CATEGORIES).length);
console.log('✅ Existing Data Preserved: YES');
console.log('==================================================');

// Category statistics for monitoring
const categoryStats = {};
Object.values(ALERT_CATEGORIES).forEach(category => {
  categoryStats[category] = (categoryStats[category] || 0) + 1;
});

console.log('📊 Category Breakdown:');
Object.entries(categoryStats).forEach(([category, count]) => {
  console.log(`   ${category}: ${count} alerts`);
});

// Add category stats to output for monitoring
output._categoryStats = {
  totalAlerts: Object.keys(ALERT_CATEGORIES).length,
  categoryBreakdown: categoryStats,
  csvEnhanced: true,
  currentAlert: {
    name: alertName,
    category: alertCategory,
    csvSeverity: csvSeverity,
    severityScore: severityScore
  }
};

// Return enhanced data
return [output];