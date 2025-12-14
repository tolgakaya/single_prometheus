// =====================================
// PROCESS AI OUTPUT - BACKWARD COMPATIBLE CHAOS ENHANCED
// =====================================
// Bu version Execute Orchestrator Analysis hanging sorununu çözer
// Tüm chaos enhancement'ları korur ama Orchestrator'ın beklediği structure kullanır

const aiOutput = $input.item.json.output || $input.item.json.text || $input.item.json;
const normalizedAlert = $node["Normalize Alerts"].json;

console.log('🎯 Process AI Output v2 - Backward Compatible Chaos Enhanced');
console.log('📊 Alert name:', normalizedAlert.alertname);
console.log('🔍 Container from alert:', normalizedAlert.container);
console.log('🔍 Pod from alert:', normalizedAlert.pod);
console.log('🔍 Service from alert:', normalizedAlert.service);
console.log('🔍 Namespace from alert:', normalizedAlert.namespace);

// Detect if this is a chaos engineering tatbikat
const isChaosTest = detectChaosEngineering(normalizedAlert);
console.log('🧪 Chaos Engineering Detected:', isChaosTest);

// Default production namespaces (12 total: 10 application + 1 monitoring + 1 control-plane)
// Infrastructure alerts (like KubeAPIDown) don't have namespace labels - this is NORMAL
// When namespace is missing/default, we search across ALL these namespaces
const DEFAULT_NAMESPACES = [
  'bss-prod-eks-monitoring',      // 45 services: Prometheus, Grafana, Loki, Alertmanager
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
  'em-control-plane-prod'          // 5 services: control plane components
];

// Extract key Kubernetes filters (critical for targeting)
// Multi-namespace support: infrastructure alerts without namespace → search ALL production namespaces
const hasSpecificNamespace = normalizedAlert.namespace && normalizedAlert.namespace !== 'default';
const kubernetesFilters = {
    container: normalizedAlert.container || null,
    pod: normalizedAlert.pod || null,
    namespace: hasSpecificNamespace ? normalizedAlert.namespace : null,  // Single namespace (app alerts)
    namespaces: hasSpecificNamespace ? [normalizedAlert.namespace] : DEFAULT_NAMESPACES,  // Multi-namespace (infra alerts)
    service: normalizedAlert.service || null,
    deployment: normalizedAlert.deployment || null,
    node: normalizedAlert.node || null,
    persistentvolumeclaim: normalizedAlert.persistentvolumeclaim || null,
    volumename: normalizedAlert.volumename || null,
    useSpecificFilters: !!(normalizedAlert.container || normalizedAlert.pod || normalizedAlert.service),
    useMultiNamespace: !hasSpecificNamespace  // Flag for query builders
};

// Determine focus areas based on alert type and chaos context
const focusAreas = determineFocusAreas(normalizedAlert, isChaosTest);
const errorPatterns = buildErrorPatterns(normalizedAlert, isChaosTest);
const affectedServices = extractAffectedServices(normalizedAlert);

// Build simplified but enhanced analysis - FLATTENED STRUCTURE
const alertAnalysis = {
    alertId: `alert-${Date.now()}`,
    analyzedAt: new Date().toISOString(),
    
    // Incident timing info (flattened)
    incidentTimeRange: {
        detectedAt: normalizedAlert.timestamp || new Date().toISOString(),
        startedAt: new Date(Date.now() - 30*60*1000).toISOString(),
        isOngoing: true,
        duration: "30 minutes"
    },
    
    // Affected components (simplified)
    affectedComponents: buildAffectedComponents(normalizedAlert, affectedServices, isChaosTest),
    
    // Pattern analysis (chaos-aware)
    pattern: {
        type: determineIncidentPattern(normalizedAlert, isChaosTest),
        description: buildPatternDescription(normalizedAlert),
        frequency: isChaosTest ? "triggered" : "continuous", 
        trend: isChaosTest ? "test-induced" : "stable"
    },
    
    // Technical indicators (enhanced but flattened)
    technicalIndicators: {
        errorRates: [],
        latencyMetrics: [],
        resourceUtilization: extractResourceUtilization(normalizedAlert, aiOutput),
        errorMessages: errorPatterns,
        httpCodes: [],
        thresholdsBreached: []
    },
    
    // Severity assessment (chaos-aware)
    severity: {
        level: determineSeverityLevel(normalizedAlert, isChaosTest),
        reasoning: buildSeverityReasoning(normalizedAlert, isChaosTest),
        businessImpact: determineBusinessImpact(normalizedAlert, isChaosTest),
        estimatedAffectedUsers: isChaosTest ? "Test Environment" : "Unknown",
        financialImpact: isChaosTest ? "No Impact" : "TBD"
    },
    
    // Correlations and root cause hints
    correlations: {
        relatedAlerts: [],
        commonPatterns: [],
        rootCauseHints: buildRootCauseHints(normalizedAlert, isChaosTest)
    },
    
    // Orchestrator parameters (CRITICAL for targeting)
    orchestratorParams: {
        priority: determinePriority(normalizedAlert, isChaosTest),
        forceDeepAnalysis: shouldForceDeepAnalysis(normalizedAlert, isChaosTest),
        suggestedAgents: ["tempo", "prometheus", "loki"],
        focusAreas: focusAreas,
        timeWindowMinutes: isChaosTest ? 30 : 60,
        kubernetesFilters: kubernetesFilters
    },
    
    // Action requirements (chaos-aware)
    actionRequired: {
        immediate: determineImmediateAction(normalizedAlert, isChaosTest),
        escalation: determineEscalation(normalizedAlert, isChaosTest),
        suggestedActions: buildSuggestedActions(normalizedAlert, isChaosTest)
    }
};

// Add chaos-specific context if detected
if (isChaosTest) {
    alertAnalysis.chaosContext = {
        testType: detectChaosTestType(normalizedAlert),
        expectedBehavior: describeChaosExpectedBehavior(normalizedAlert),
        recoveryMetrics: {
            expectedRecoveryTime: estimateRecoveryTime(normalizedAlert),
            autoHealingCapability: assessAutoHealing(normalizedAlert)
        },
        monitoringFocus: buildMonitoringFocus(normalizedAlert),
        successCriteria: defineChaosSuccessCriteria(normalizedAlert)
    };
}

console.log('🎯 Enhanced Analysis Summary:');
console.log('   Alert Type:', normalizedAlert.alertname);
console.log('   Chaos Test:', isChaosTest);
console.log('   Impact Level:', alertAnalysis.severity.level);
console.log('   Affected Components:', alertAnalysis.affectedComponents.length);
console.log('   Focus Areas:', focusAreas.join(', '));
console.log('   Use Specific Filters:', kubernetesFilters.useSpecificFilters);
console.log('   Analysis Mode:', kubernetesFilters.useSpecificFilters ? 'TARGETED' : 'GENERAL');

// BACKWARD COMPATIBLE RETURN FORMAT - What Execute Orchestrator Analysis expects
return {
    // 1. Keep normalizedAlert at ROOT LEVEL (critical!)
    normalizedAlert: normalizedAlert,
    
    // 2. Flattened alertAnalysis 
    alertAnalysis: alertAnalysis,
    
    // 3. Essential fields at root level for Orchestrator compatibility
    alertId: alertAnalysis.alertId,
    
    // 4. Quick access to key targeting info
    kubernetesFilters: kubernetesFilters,
    focusAreas: focusAreas,
    affectedServices: affectedServices,
    
    // 5. Chaos context flag for downstream processing
    isChaosTest: isChaosTest,
    chaosEnhanced: true,
    
    // 6. Metadata
    processedAt: new Date().toISOString(),
    version: "v2-backward-compatible-chaos-enhanced"
};

// === HELPER FUNCTIONS ===

function detectChaosEngineering(alert) {
    const indicators = [
        alert.body?.toLowerCase().includes('chaos'),
        alert.body?.toLowerCase().includes('tatbikat'), 
        alert.body?.toLowerCase().includes('drill'),
        alert.body?.toLowerCase().includes('test'),
        alert.namespace?.includes('test'),
        alert.namespace?.includes('chaos'),
        // Time-based detection (if alerts are coming during planned hours)
        isPlannedTestingWindow()
    ];
    
    return indicators.filter(Boolean).length > 0;
}

function determineFocusAreas(alert, isChaos) {
    const areas = [];
    
    // Base focus areas by alert type
    if (alert.alertname?.includes('Pod') || alert.alertname?.includes('Container')) {
        areas.push('pod-analysis', 'container-logs');
    }
    if (alert.alertname?.includes('Node')) {
        areas.push('node-health', 'system-resources');
    }
    if (alert.alertname?.includes('etcd')) {
        areas.push('etcd-health', 'cluster-state');
    }
    if (alert.alertname?.includes('Memory') || alert.alertname?.includes('OOM')) {
        areas.push('resource-analysis', 'memory-analysis');
    }
    if (alert.alertname?.includes('Storage') || alert.alertname?.includes('Volume')) {
        areas.push('storage-analysis', 'volume-health');
    }
    
    // Chaos-specific focus areas
    if (isChaos) {
        areas.push('chaos-recovery', 'resilience-testing');
        
        if (alert.alertname?.includes('Node')) {
            areas.push('node-failure-simulation', 'pod-rescheduling');
        }
        if (alert.alertname?.includes('etcd')) {
            areas.push('cluster-recovery', 'leader-election');
        }
    }
    
    return [...new Set(areas)];
}

function buildErrorPatterns(alert, isChaos) {
    const patterns = [];
    
    if (alert.alertname?.includes('CrashLoop')) {
        patterns.push('Pod is crash looping', 'Container startup failure');
    }
    if (alert.alertname?.includes('NotReady')) {
        patterns.push('Node connectivity issues', 'System resource exhaustion');
    }
    if (alert.alertname?.includes('etcd')) {
        patterns.push('Cluster state inconsistency', 'etcd performance degradation');
    }
    if (alert.alertname?.includes('OOM')) {
        patterns.push('Out of memory detected', 'Memory limit exceeded');
    }
    
    if (isChaos) {
        patterns.push('Chaos engineering test pattern');
    }
    
    return patterns.length > 0 ? patterns : ['Alert pattern detected'];
}

function extractAffectedServices(alert) {
    const services = [];
    
    if (alert.service && !services.includes(alert.service)) {
        services.push(alert.service);
    }
    if (alert.job && !services.includes(alert.job)) {
        services.push(alert.job);
    }
    if (alert.container && !services.includes(alert.container)) {
        services.push(alert.container);
    }
    
    return services;
}

function buildAffectedComponents(alert, services, isChaos) {
    if (services.length > 0) {
        return services.map(service => ({
            name: service,
            type: "kubernetes-service",
            pod: alert.pod || null,
            namespace: alert.namespace || null,
            node: alert.node || null,
            instance: alert.instance || null,
            impact: determineImpactLevel(alert.severity, alert.alertname),
            confidence: "high",
            source: alert.service ? "service-field" : "container-field"
        }));
    }
    
    // Fallback to namespace if no specific services
    return [{
        name: alert.namespace || 'unknown-namespace',
        type: "namespace",
        impact: determineImpactLevel(alert.severity, alert.alertname),
        confidence: "low",
        source: "fallback"
    }];
}

function extractResourceUtilization(alert, aiOutput) {
    const utilization = {};
    
    // Extract from alert body
    const body = alert.body || '';
    
    const cpuMatch = body.match(/(\d+)%?\s*(cpu|processor)/i);
    if (cpuMatch) {
        utilization.cpu = cpuMatch[1] + "%";
    }
    
    const memoryMatch = body.match(/(\d+)%?\s*(memory|ram|oom)/i);
    if (memoryMatch) {
        utilization.memory = memoryMatch[1] + "%";
    }
    
    return utilization;
}

function determineIncidentPattern(alert, isChaos) {
    if (isChaos) return "chaos-induced";
    
    if (alert.alertname?.includes('CrashLoop')) return "restart-loop";
    if (alert.alertname?.includes('OOM')) return "resource-exhaustion";
    if (alert.alertname?.includes('Node')) return "infrastructure-failure";
    if (alert.alertname?.includes('etcd')) return "cluster-disruption";
    
    return "sudden";
}

function buildPatternDescription(alert) {
    const namespace = alert.namespace || 'unknown namespace';
    const pod = alert.pod || 'unknown pod';
    const node = alert.node || 'unknown node';
    const service = alert.service || 'unknown service';
    
    const descriptions = {
        'KubePodCrashLooping': `Pod ${namespace}/${pod} (${alert.container}) is in waiting state (reason: "CrashLoopBackOff").`,
        'KubeNodeNotReady': `Node ${node} is not ready for more than 15 minutes`,
        'etcdNoLeader': `etcd cluster has no leader - cluster functionality compromised`,
        'KubeAPIErrorBudgetBurn': `API server error rate exceeding SLI budget`,
        'TargetDown': `Service endpoint ${service} is unreachable`
    };
    
    return descriptions[alert.alertname] || `${alert.alertname} detected in ${namespace}`;
}

function determineSeverityLevel(alert, isChaos) {
    if (isChaos) {
        // For chaos tests, severity represents test impact, not business impact
        const blockerAlerts = ['etcdNoLeader', 'etcdInsufficientMembers', 'KubeAPIDown'];
        if (blockerAlerts.includes(alert.alertname)) return 'critical';
        
        const majorAlerts = ['KubeNodeNotReady', 'KubePodCrashLooping'];
        if (majorAlerts.includes(alert.alertname)) return 'high';
        
        return 'medium';
    }
    
    // Production severity mapping
    if (alert.severity === 'Critical') return 'critical';
    if (alert.severity === 'High') return 'high';
    if (alert.severity === 'Warning') return 'medium';
    if (alert.severity === 'Info') return 'low';
    
    return 'medium';
}

function buildSeverityReasoning(alert, isChaos) {
    if (isChaos) {
        return `Chaos engineering test impact assessment for ${alert.alertname}`;
    }
    
    return `Based on ${alert.alertname} type`;
}

function determineBusinessImpact(alert, isChaos) {
    if (isChaos) return "Test Environment - No Business Impact";
    
    const criticalAlerts = ['etcdNoLeader', 'KubeAPIDown', 'etcdInsufficientMembers'];
    if (criticalAlerts.includes(alert.alertname)) {
        return "High - Core platform functionality affected";
    }
    
    const highAlerts = ['KubeNodeNotReady', 'TargetDown'];
    if (highAlerts.includes(alert.alertname)) {
        return "Medium - Service availability may be impacted";
    }
    
    return "Under assessment";
}

function buildRootCauseHints(alert, isChaos) {
    if (isChaos) {
        return [
            "This is a planned chaos engineering test",
            "Monitor system recovery behavior",
            "Validate auto-healing mechanisms",
            "Document observed failure patterns"
        ];
    }
    
    const hints = {
        'KubePodCrashLooping': [
            "Check pod logs for startup errors",
            "Review recent deployments"
        ],
        'KubeNodeNotReady': [
            "Check node system resources",
            "Verify kubelet service status"
        ],
        'etcdNoLeader': [
            "Check etcd cluster member connectivity",
            "Verify etcd disk performance"
        ]
    };
    
    return hints[alert.alertname] || ["Investigate alert-specific metrics and logs"];
}

function determinePriority(alert, isChaos) {
    if (isChaos) return "medium"; // Chaos tests shouldn't trigger critical escalations
    
    return determineSeverityLevel(alert, false);
}

function shouldForceDeepAnalysis(alert, isChaos) {
    if (isChaos) return true; // Always do deep analysis for chaos tests
    
    const criticalAlerts = ['etcdNoLeader', 'KubeAPIDown', 'etcdInsufficientMembers'];
    return criticalAlerts.includes(alert.alertname) || alert.severity === 'Critical';
}

function determineImmediateAction(alert, isChaos) {
    if (isChaos) return false; // No immediate action for planned tests
    
    const emergencyAlerts = ['etcdNoLeader', 'etcdInsufficientMembers', 'KubeAPIDown'];
    return emergencyAlerts.includes(alert.alertname);
}

function determineEscalation(alert, isChaos) {
    if (isChaos) return "test-team";
    
    if (alert.severity === 'Critical') return "management";
    if (alert.severity === 'High') return "team-lead";
    return "team";
}

function buildSuggestedActions(alert, isChaos) {
    if (isChaos) {
        return [
            "Monitor system recovery patterns",
            "Document observed behaviors",
            "Validate auto-healing mechanisms",
            "Measure recovery times",
            "Update runbooks based on findings"
        ];
    }
    
    const actions = {
        'KubePodCrashLooping': [
            "Immediately check service health and logs",
            "Review recent changes and deployments",
            "Check resource utilization (CPU, Memory, Disk)",
            "Verify upstream dependencies",
            "Consider rollback if recent deployment"
        ],
        'KubeNodeNotReady': [
            "SSH to node and check system status",
            "Cordon node and drain workloads",
            "Investigate kubelet and system logs",
            "Plan node replacement if needed"
        ],
        'etcdNoLeader': [
            "Check etcd cluster member status",
            "Restart etcd members if needed",
            "Verify network connectivity",
            "Monitor cluster recovery"
        ]
    };
    
    return actions[alert.alertname] || ["Investigate and monitor situation"];
}

function determineImpactLevel(severity, alertname) {
    const downAlerts = ['KubePodCrashLooping', 'KubeNodeNotReady', 'KubeAPIDown', 'etcdNoLeader'];
    if (downAlerts.includes(alertname)) return 'down';
    
    if (severity === 'Critical') return 'down';
    if (severity === 'High') return 'degraded';
    return 'affected';
}

function isPlannedTestingWindow() {
    const now = new Date();
    const hour = now.getHours();
    // Assume chaos tests typically run during business hours
    return hour >= 9 && hour <= 17;
}

// Chaos-specific helper functions
function detectChaosTestType(alert) {
    if (alert.alertname?.includes('Pod')) return "pod-failure";
    if (alert.alertname?.includes('Node')) return "node-failure";
    if (alert.alertname?.includes('etcd')) return "etcd-resilience";
    if (alert.alertname?.includes('Memory')) return "memory-pressure";
    return "unknown-chaos-test";
}

function describeChaosExpectedBehavior(alert) {
    const behaviors = {
        'KubePodCrashLooping': "Pod should be restarted by Kubernetes, service should remain available via other replicas",
        'KubeNodeNotReady': "Pods should be rescheduled to healthy nodes, no service interruption expected",
        'etcdNoLeader': "New leader should be elected, cluster should recover within minutes"
    };
    
    return behaviors[alert.alertname] || "System should demonstrate resilience and recover automatically";
}

function estimateRecoveryTime(alert) {
    const times = {
        'KubePodCrashLooping': "2-5 minutes",
        'KubeNodeNotReady': "5-10 minutes", 
        'etcdNoLeader': "30-60 seconds"
    };
    
    return times[alert.alertname] || "5-15 minutes";
}

function assessAutoHealing(alert) {
    const capabilities = {
        'KubePodCrashLooping': "Kubernetes will restart crashed pods automatically",
        'KubeNodeNotReady': "Kubernetes will reschedule pods to healthy nodes",
        'etcdNoLeader': "etcd will elect new leader automatically"
    };
    
    return capabilities[alert.alertname] || "Standard Kubernetes self-healing expected";
}

function buildMonitoringFocus(alert) {
    return [
        `Monitor ${alert.alertname} recovery pattern`,
        "Track pod rescheduling times",
        "Measure service availability impact",
        "Document recovery behavior"
    ];
}

function defineChaosSuccessCriteria(alert) {
    return [
        "System recovers automatically within expected timeframe",
        "No permanent data loss",
        "Service availability maintained above SLI thresholds",
        "No manual intervention required"
    ];
}