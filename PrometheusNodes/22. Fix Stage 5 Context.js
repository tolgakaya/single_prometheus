// ================ KB-ENHANCED FIX STAGE 5 CONTEXT ================
// This file preserves ALL original 1156 lines and ADDS KB enhancements
// Version: KB-Enhanced-Full-v1.0
// Enhancement Date: 2025-01-28
// Original functionality: 100% preserved
// KB Enhancement: ADDED (not replaced)

// Fix Stage 5 Context - Optimized with Category-Based Remediation Templates
const stage5Output = $input.first().json;

// Önceki stage'den context ve data'yı al
let previousContext;
let stage4Data;

try {
  stage4Data = $node["Fix Stage 4 Context"].json;
  previousContext = stage4Data._context;
  
  console.log("✅ Got context from Stage 4:", previousContext?.contextId);
  console.log("Stage 1 data available:", !!stage4Data.stage1Data);
  console.log("Stage 2 data available:", !!stage4Data.stage2Data);
  console.log("Stage 3 data available:", !!stage4Data.stage3Data);
  console.log("Stage 4 data available:", !!stage4Data.stage4Data);
} catch (e) {
  console.error("❌ Error getting Stage 4 data:", e);
  previousContext = {
    contextId: "ctx-emergency-" + Date.now(),
    createdAt: new Date().toISOString(),
    stageResults: {},
    decisions: {},
    initialParams: {
      startTime: Math.floor(Date.now() / 1000) - 3600,
      endTime: Math.floor(Date.now() / 1000)
    }
  };
}

// Validate previousContext
if (!previousContext || typeof previousContext !== 'object') {
  console.error("❌ Invalid previousContext, creating new one");
  previousContext = {
    contextId: "ctx-recovery-" + Date.now(),
    createdAt: new Date().toISOString(),
    stageResults: {},
    decisions: {},
    initialParams: {
      startTime: Math.floor(Date.now() / 1000) - 3600,
      endTime: Math.floor(Date.now() / 1000)
    }
  };
}

// Ensure stageResults exists
if (!previousContext.stageResults) {
  previousContext.stageResults = {};
}

console.log("=== FIXING STAGE 5 CONTEXT ===");
console.log("Previous context ID:", previousContext?.contextId);

// Deep copy
let fixedOutput = JSON.parse(JSON.stringify(stage5Output));

// Output wrapper kontrolü
const hasOutputWrapper = !!fixedOutput.output;
let actualOutput = hasOutputWrapper ? fixedOutput.output : fixedOutput;

console.log("Has output wrapper:", hasOutputWrapper);

// String output handling
if (typeof actualOutput === 'string') {
  console.log("⚠️ Stage 5 output is string, attempting to parse...");
  
  try {
    let cleanOutput = actualOutput;
    if (cleanOutput.includes('```json')) {
      cleanOutput = cleanOutput.replace(/```json\s*\n?/g, '');
      cleanOutput = cleanOutput.replace(/```\s*$/g, '');
    }
    
    if (cleanOutput.includes('{{') || cleanOutput.includes('$json')) {
      console.log("⚠️ Stage 5 output contains templates, resolving...");
      
      const context = previousContext;
      const stage4Results = stage4Data?.stage4Data || {};
      const primaryDiagnosis = stage4Data?.primaryDiagnosis || {};
      
      cleanOutput = cleanOutput
        .replace(/\{\{ \$json\._context\.contextId \}\}/g, context.contextId || 'unknown')
        .replace(/\{\{ \$json\.stage4Results\.enriched_context\.deployment_info\.name \}\}/g, 
          stage4Results?.enriched_context?.deployment_info?.name || 'unknown-deployment')
        .replace(/\{\{ \$json\.primaryDiagnosis\.namespace \}\}/g, 
          primaryDiagnosis?.namespace || 'default')
        .replace(/\{\{ JSON\.stringify\(\$json\._context\) \}\}/g, 
          JSON.stringify(context))
        .replace(/\{\{ \$json\._context\.initialParams\.startTime \}\}/g, 
          context.initialParams?.startTime || 0)
        .replace(/\{\{ \$json\._context\.initialParams\.endTime \}\}/g, 
          context.initialParams?.endTime || 0)
        .replace(/<use new Date\(\)\.toISOString\(\)>/g, new Date().toISOString())
        .replace(/<current ISO timestamp>/g, new Date().toISOString());
    }
    
    actualOutput = JSON.parse(cleanOutput);
    console.log("✅ Successfully parsed Stage 5 output");
  } catch (e) {
    console.error("❌ Failed to parse Stage 5 output:", e.message);
    actualOutput = {
      stage: "ai_powered_analysis",
      analysis_id: previousContext.contextId + "-stage5",
      error: "Failed to parse output",
      remediation_plan: {
        immediate_actions: [],
        short_term_fixes: [],
        long_term_solutions: [],
        preventive_measures: []
      },
      risk_assessment: {
        overall_risk: "unknown",
        factors: [],
        mitigation_steps: []
      },
      implementation_order: [],
      success_metrics: {
        immediate: [],
        short_term: [],
        long_term: []
      },
      rollback_plan: {
        trigger_conditions: [],
        steps: [],
        validation: ""
      }
    };
  }
}

// Validate actualOutput
if (!actualOutput || typeof actualOutput !== 'object') {
  console.error("❌ Invalid actualOutput, creating default structure");
  actualOutput = {
    stage: "ai_powered_analysis",
    analysis_id: previousContext.contextId + "-stage5",
    remediation_plan: {
      immediate_actions: [],
      short_term_fixes: [],
      long_term_solutions: [],
      preventive_measures: []
    },
    risk_assessment: {
      overall_risk: "unknown",
      factors: [],
      mitigation_steps: []
    }
  };
}

// ============= MOCK DATA DETECTION VE TEMİZLEME =============
if (actualOutput.remediation_plan && actualOutput.remediation_plan.immediate_actions) {
  const immediateActions = actualOutput.remediation_plan.immediate_actions;
  
  immediateActions.forEach((action, index) => {
    if (action.command && action.command.includes('payment-service')) {
      console.warn("⚠️ MOCK COMMAND DETECTED! Replacing with actual data...");
      
      const actualRootCause = stage4Data?.stage2Data?.root_cause || {};
      let actualComponent = actualRootCause.component || 
                           stage4Data?.primaryDiagnosis?.component || 
                           "unknown-component";
      // Default namespaces for fallback
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

      const actualNamespace = stage4Data?.primaryDiagnosis?.namespace ||
                             stage4Data?.stage2Data?.affected_services?.[0]?.split('-')?.[0] ||
                             DEFAULT_NAMESPACES[0];
      const actualIssue = actualRootCause.issue || 
                         stage4Data?.primaryDiagnosis?.issue || 
                         "Unknown issue";
      
      const criticalPods = stage4Data?.stage2Data?.critical_pods || [];
      if (criticalPods.length > 0 && actualComponent === "unknown-component") {
        const firstPod = criticalPods[0];
        actualComponent = typeof firstPod === 'string' ? firstPod : firstPod.name || firstPod;
        console.log(`✅ Using actual pod: ${actualComponent}`);
      }
      
      if (actualIssue.includes('CrashLoopBackOff')) {
        immediateActions[index] = {
          action: `Delete and recreate pod ${actualComponent}`,
          command: `kubectl delete pod ${actualComponent} -n ${actualNamespace}`,
          risk: "low",
          estimated_time: "1-2 minutes",
          expected_outcome: "Pod will be recreated with fresh state"
        };
      } else if (actualIssue.includes('restart')) {
        const deploymentName = actualComponent.split('-').slice(0, -2).join('-') || actualComponent;
        immediateActions[index] = {
          action: `Scale down and up deployment for ${actualComponent}`,
          command: `kubectl scale deployment ${deploymentName} --replicas=0 -n ${actualNamespace} && kubectl scale deployment ${deploymentName} --replicas=1 -n ${actualNamespace}`,
          risk: "medium",
          estimated_time: "2-3 minutes",
          expected_outcome: "Deployment will be refreshed"
        };
      } else {
        immediateActions[index] = {
          action: `Investigate and restart ${actualComponent}`,
          command: `kubectl describe pod ${actualComponent} -n ${actualNamespace} && kubectl delete pod ${actualComponent} -n ${actualNamespace}`,
          risk: "low",
          estimated_time: "2-5 minutes",
          expected_outcome: "Component will be restarted after investigation"
        };
      }
      
      console.log("✅ Replaced mock command with actual component");
    }
    
    if (action.action && action.action.includes('payment-service')) {
      const actualComponent = stage4Data?.stage2Data?.root_cause?.component || "component";
      action.action = action.action.replace(/payment-service/g, actualComponent);
    }
  });
  
  if (actualOutput.remediation_plan.short_term_fixes) {
    actualOutput.remediation_plan.short_term_fixes.forEach((fix) => {
      if (fix.details && fix.details.includes('payment')) {
        const actualService = stage4Data?.stage2Data?.affected_services?.[0] || "service";
        fix.details = fix.details.replace(/payment processing/g, actualService + " processing");
      }
    });
  }
  
  if (actualOutput.remediation_plan.long_term_solutions) {
    actualOutput.remediation_plan.long_term_solutions.forEach((solution) => {
      if (solution.details && (solution.details.includes('TransactionHandler') || solution.details.includes('payment'))) {
        const actualComponent = stage4Data?.stage2Data?.root_cause?.component || "component";
        solution.action = `Fix issues in ${actualComponent}`;
        solution.details = `Review and fix the root cause in ${actualComponent} component`;
      }
    });
  }
}

// ============= KB REMEDIATION ENHANCEMENT =============
const stage4DiagnosticSummary = stage4Data?.stage4Data?.diagnostic_summary || {};
const stage4KBAnalysis = stage4Data?.stage4Data?.enriched_context?.kb_analysis || {};
const confirmedIssuesWithKB = stage4DiagnosticSummary.confirmed_issues?.filter(i => i.kb_enhanced) || [];

console.log("=== KB REMEDIATION ENHANCEMENT ===");
console.log("KB enhanced issues:", confirmedIssuesWithKB.length);

if (confirmedIssuesWithKB.length > 0 && actualOutput.remediation_plan) {
  console.log("Enhancing remediation plan with KB actions...");
  
  const kbImmediateActions = [];
  
  confirmedIssuesWithKB.forEach(issue => {
    if (issue.kb_immediate_actions && Array.isArray(issue.kb_immediate_actions)) {
      issue.kb_immediate_actions.forEach((action, idx) => {
        const actionText = action.replace(/^\d+\.\s*/, '');
        let command = "";
        let risk = "medium";
        let estimatedTime = "5-10 minutes";
        
        if (actionText.toLowerCase().includes('rollback')) {
          const component = issue.namespace || stage4Data?.primaryDiagnosis?.component || "deployment";
          command = `kubectl rollout undo deployment/${component} -n ${issue.namespace || 'default'}`;
          risk = "low";
          estimatedTime = "2-5 minutes";
        } else if (actionText.toLowerCase().includes('restart')) {
          const component = issue.namespace || stage4Data?.primaryDiagnosis?.component || "deployment";
          command = `kubectl rollout restart deployment/${component} -n ${issue.namespace || 'default'}`;
          risk = "low";
          estimatedTime = "2-3 minutes";
        }
        
        kbImmediateActions.push({
          action: actionText,
          command: command,
          risk: risk,
          estimated_time: estimatedTime,
          expected_outcome: `Resolve ${issue.issue}`,
          source: "Alert Knowledge Base",
          kb_severity: issue.kb_severity,
          priority_score: calculateActionPriority(issue.kb_severity, idx)
        });
      });
    }
  });
  
  kbImmediateActions.sort((a, b) => b.priority_score - a.priority_score);
  
  if (actualOutput.remediation_plan.immediate_actions.length === 0 || 
      actualOutput.remediation_plan.immediate_actions.some(a => a.command?.includes('payment-service'))) {
    actualOutput.remediation_plan.immediate_actions = kbImmediateActions.slice(0, 5);
  }
  
  console.log("✅ KB remediation enhancement complete");
}

// Helper function
function calculateActionPriority(severity, index) {
  const severityScores = {
    "Blocker": 1000,
    "Critical": 800,
    "High": 600,
    "Medium": 400,
    "Low": 200
  };
  return (severityScores[severity] || 100) - (index * 10);
}

// ============= KB REMEDIATION ACTIONS ENHANCEMENT (NEW) =============
// Add KB-based remediation actions
const currentAlert = stage4Data?.alertInfo?.alertName || previousContext?.alertContext?.alertName || 'unknown';
const kbEntry = kbAlertKnowledgeBase[currentAlert];
const kbActions = [];

if (kbEntry) {
  console.log("✅ Adding KB remediation actions for", currentAlert);
  
  // Add immediate actions from KB
  if (kbEntry.immediateActions && kbEntry.immediateActions.length > 0) {
    kbEntry.immediateActions.slice(0, 3).forEach((action, index) => {
      // Replace placeholders in KB actions
      let command = action;
      const filters = stage4Data?.alertInfo || {};
      if (filters.namespace && command.includes('{namespace}')) {
        command = command.replace(/{namespace}/g, filters.namespace);
      }
      if (filters.deployment && command.includes('{deployment}')) {
        command = command.replace(/{deployment}/g, filters.deployment);
      }
      if (filters.pod && command.includes('{pod}')) {
        command = command.replace(/{pod}/g, filters.pod);
      }
      
      kbActions.push({
        action: action,
        command: command,
        risk: kbEntry.severity === 'critical' ? 'high' : 'medium',
        estimated_time: index === 0 ? "1-2 minutes" : "5-10 minutes",
        expected_outcome: `${currentAlert} issue resolution`,
        source: "Alert Knowledge Base",
        kb_enhanced: true,
        priority: calculateActionPriority(kbEntry.severity, index),
        confidence: 0.95
      });
    });
  }
  
  // Add long-term solutions from KB
  if (kbEntry.longTermSolutions && kbEntry.longTermSolutions.length > 0) {
    kbEntry.longTermSolutions.slice(0, 2).forEach(solution => {
      kbActions.push({
        action: solution,
        command: `# KB Long-term solution: ${solution}`,
        risk: "low",
        estimated_time: "1-2 weeks",
        expected_outcome: "Prevent recurrence of this alert",
        source: "Alert Knowledge Base - Long Term",
        kb_enhanced: true,
        type: "long_term"
      });
    });
  }
}

// ============= CATEGORY-BASED REMEDIATION TEMPLATES =============
// Only apply if no existing remediation plan or need enhancement
if (actualOutput.remediation_plan) {
  const existingActions = actualOutput.remediation_plan.immediate_actions || [];
  
  // Only enhance if current actions are generic or insufficient
  if (existingActions.length === 0 || 
      existingActions.some(a => a.command?.includes('payment-service')) ||
      !existingActions.some(a => a.source === 'Alert Knowledge Base')) {
    
    const alertCategory = stage4Data?.alertCategoryAnalysis?.category || 
                         stage4Data?.alertInfo?.category || 
                         'UNKNOWN';
    const rootCausePattern = stage4Data?.stage2Data?.root_cause?.pattern_matched || '';
    const primaryDiagnosis = stage4Data?.primaryDiagnosis || {};
    
    console.log("=== CATEGORY-BASED REMEDIATION ENHANCEMENT ===");
    console.log("Category:", alertCategory);
    console.log("Root Cause Pattern:", rootCausePattern);
    
    // Extended remediation templates by category and pattern
    const CATEGORY_REMEDIATION_TEMPLATES = {
      'INFRASTRUCTURE': {
        'node_memory_pressure': {
          immediate_actions: [
            {
              action: "Cordon node to prevent new pod scheduling",
              command: `kubectl cordon ${primaryDiagnosis.component || 'node-name'}`,
              risk: "medium",
              estimated_time: "30 seconds",
              expected_outcome: "No new pods will be scheduled on this node"
            },
            {
              action: "Evict non-critical pods from node",
              command: `kubectl drain ${primaryDiagnosis.component || 'node-name'} --ignore-daemonsets --delete-emptydir-data`,
              risk: "high",
              estimated_time: "2-5 minutes",
              expected_outcome: "Free up memory on the node"
            }
          ],
          short_term_fixes: [
            {
              action: "Increase node memory or add new nodes",
              timeline: "1-2 days",
              details: "Scale cluster horizontally or vertically"
            }
          ],
          long_term_solutions: [
            {
              action: "Implement pod resource limits and requests",
              timeline: "1 week",
              details: "Ensure all pods have proper memory limits"
            }
          ]
        },
        'node_disk_pressure': {
          immediate_actions: [
            {
              action: "Clean up docker images and logs",
              command: `ssh ${primaryDiagnosis.component || 'node'} 'docker system prune -af && journalctl --vacuum-time=1d'`,
              risk: "low",
              estimated_time: "2-3 minutes",
              expected_outcome: "Free up disk space"
            }
          ],
          short_term_fixes: [
            {
              action: "Expand disk volume",
              timeline: "4-6 hours",
              details: "Increase disk size on cloud provider"
            }
          ]
        },
        'node_network_connectivity': {
          immediate_actions: [
            {
              action: "Restart network components",
              command: `kubectl delete pods -n kube-system -l k8s-app=kube-proxy`,
              risk: "medium",
              estimated_time: "1-2 minutes",
              expected_outcome: "Reset network stack"
            }
          ]
        }
      },
      
      'POD': {
        'image_pull_error': {
          immediate_actions: [
            {
              action: "Verify image repository access",
              command: `kubectl describe pod ${primaryDiagnosis.component || 'pod-name'} -n ${primaryDiagnosis.namespace || 'default'} | grep -A 10 Events`,
              risk: "none",
              estimated_time: "10 seconds",
              expected_outcome: "Identify the exact image pull error"
            },
            {
              action: "Check and update image pull secrets",
              command: `kubectl get secret -n ${primaryDiagnosis.namespace || 'default'} | grep pull`,
              risk: "low",
              estimated_time: "1 minute",
              expected_outcome: "Ensure credentials are valid"
            }
          ],
          short_term_fixes: [
            {
              action: "Update deployment with correct image tag",
              timeline: "30 minutes",
              details: "Verify and fix image repository URL and tag"
            }
          ]
        },
        'liveness_probe_failure': {
          immediate_actions: [
            {
              action: "Temporarily disable liveness probe",
              command: `kubectl patch deployment ${primaryDiagnosis.component?.split('-')[0] || 'deployment'} -n ${primaryDiagnosis.namespace || 'default'} -p '{"spec":{"template":{"spec":{"containers":[{"name":"container","livenessProbe":null}]}}}}'`,
              risk: "medium",
              estimated_time: "30 seconds",
              expected_outcome: "Stop container restarts for debugging"
            }
          ],
          short_term_fixes: [
            {
              action: "Adjust probe thresholds",
              timeline: "1 hour",
              details: "Increase initialDelaySeconds and timeoutSeconds"
            }
          ]
        },
        'init_container_failure': {
          immediate_actions: [
            {
              action: "Check init container logs",
              command: `kubectl logs ${primaryDiagnosis.component || 'pod-name'} -c init-container-name -n ${primaryDiagnosis.namespace || 'default'}`,
              risk: "none",
              estimated_time: "10 seconds",
              expected_outcome: "Identify init container failure reason"
            }
          ]
        },
        'kb_memory_leak': {
          immediate_actions: [
            {
              action: "Restart pod with memory leak",
              command: `kubectl delete pod ${primaryDiagnosis.component || 'pod-name'} -n ${primaryDiagnosis.namespace || 'default'}`,
              risk: "low",
              estimated_time: "1-2 minutes",
              expected_outcome: "Temporary fix by restarting"
            },
            {
              action: "Enable memory profiling",
              command: `kubectl set env deployment/${primaryDiagnosis.component?.split('-')[0] || 'deployment'} ENABLE_PROFILING=true -n ${primaryDiagnosis.namespace || 'default'}`,
              risk: "low",
              estimated_time: "2 minutes",
              expected_outcome: "Collect memory usage data"
            }
          ]
        }
      },
      
      'WORKLOAD': {
        'hpa_maxed_out': {
          immediate_actions: [
            {
              action: "Temporarily increase HPA max replicas",
              command: `kubectl patch hpa ${primaryDiagnosis.component || 'hpa-name'} -n ${primaryDiagnosis.namespace || 'default'} -p '{"spec":{"maxReplicas":20}}'`,
              risk: "medium",
              estimated_time: "30 seconds",
              expected_outcome: "Allow more pods to handle load"
            }
          ],
          short_term_fixes: [
            {
              action: "Optimize application performance",
              timeline: "2-3 days",
              details: "Profile and optimize CPU/memory usage"
            }
          ]
        },
        'replica_mismatch': {
          immediate_actions: [
            {
              action: "Force deployment rollout restart",
              command: `kubectl rollout restart deployment/${primaryDiagnosis.component || 'deployment'} -n ${primaryDiagnosis.namespace || 'default'}`,
              risk: "medium",
              estimated_time: "2-3 minutes",
              expected_outcome: "Recreate all pods"
            }
          ]
        }
      },
      
      'RESOURCE': {
        'pvc_filling_up': {
          immediate_actions: [
            {
              action: "Clean up old data in PVC",
              command: `kubectl exec -n ${primaryDiagnosis.namespace || 'default'} ${primaryDiagnosis.component || 'pod'} -- sh -c 'find /data -mtime +7 -delete'`,
              risk: "medium",
              estimated_time: "1-5 minutes",
              expected_outcome: "Free up space in persistent volume"
            }
          ],
          short_term_fixes: [
            {
              action: "Expand PVC size",
              timeline: "1-2 hours",
              details: "Increase PersistentVolumeClaim size"
            }
          ]
        },
        'quota_exceeded': {
          immediate_actions: [
            {
              action: "Identify resource consumers",
              command: `kubectl top pods -n ${primaryDiagnosis.namespace || 'default'} --sort-by=memory`,
              risk: "none",
              estimated_time: "5 seconds",
              expected_outcome: "Find pods using most resources"
            },
            {
              action: "Scale down non-critical deployments",
              command: `kubectl scale deployment non-critical-app --replicas=1 -n ${primaryDiagnosis.namespace || 'default'}`,
              risk: "low",
              estimated_time: "30 seconds",
              expected_outcome: "Free up quota"
            }
          ]
        }
      },
      
      'NETWORK': {
        'endpoint_down': {
          immediate_actions: [
            {
              action: "Recreate service endpoints",
              command: `kubectl delete endpoints ${primaryDiagnosis.component || 'service'} -n ${primaryDiagnosis.namespace || 'default'} && kubectl get endpoints ${primaryDiagnosis.component || 'service'} -n ${primaryDiagnosis.namespace || 'default'}`,
              risk: "low",
              estimated_time: "30 seconds",
              expected_outcome: "Rebuild service endpoints"
            }
          ]
        },
        'dns_failure': {
          immediate_actions: [
            {
              action: "Restart CoreDNS pods",
              command: `kubectl rollout restart deployment/coredns -n kube-system`,
              risk: "medium",
              estimated_time: "1-2 minutes",
              expected_outcome: "Reset DNS resolution"
            }
          ]
        }
      },
      
      'ETCD': {
        'etcd_no_leader': {
          immediate_actions: [
            {
              action: "CRITICAL: Force etcd leader election",
              command: `kubectl exec -n kube-system etcd-0 -- etcdctl move-leader`,
              risk: "high",
              estimated_time: "10-30 seconds",
              expected_outcome: "Restore etcd quorum",
              priority: "P0"
            }
          ],
          short_term_fixes: [
            {
              action: "Add etcd member if needed",
              timeline: "30 minutes",
              details: "Restore etcd cluster to odd number of members"
            }
          ]
        },
        'etcd_disk_latency': {
          immediate_actions: [
            {
              action: "Defragment etcd database",
              command: `kubectl exec -n kube-system etcd-0 -- etcdctl defrag`,
              risk: "medium",
              estimated_time: "1-2 minutes",
              expected_outcome: "Reduce database size and improve performance"
            }
          ]
        }
      },
      
      'CERTIFICATE': {
        'cert_expiring': {
          immediate_actions: [
            {
              action: "Rotate certificates immediately",
              command: `kubeadm certs renew all`,
              risk: "high",
              estimated_time: "5-10 minutes",
              expected_outcome: "Renew all certificates",
              priority: "P0"
            }
          ],
          preventive_measures: [
            "Set up automated certificate rotation",
            "Implement certificate monitoring alerts at 30, 7, and 1 day thresholds"
          ]
        }
      },
      
      'CLUSTER': {
        'api_server_degradation': {
          immediate_actions: [
            {
              action: "Restart API server pods",
              command: `kubectl delete pods -n kube-system -l component=kube-apiserver`,
              risk: "high",
              estimated_time: "2-3 minutes",
              expected_outcome: "Reset API server state"
            }
          ]
        },
        'scheduler_failure': {
          immediate_actions: [
            {
              action: "Restart scheduler",
              command: `kubectl delete pods -n kube-system -l component=kube-scheduler`,
              risk: "medium",
              estimated_time: "1 minute",
              expected_outcome: "Reset scheduler state"
            }
          ]
        }
      },
      
      'MONITORING': {
        'monitoring_degradation': {
          immediate_actions: [
            {
              action: "Restart Prometheus",
              command: `kubectl rollout restart deployment/prometheus -n monitoring`,
              risk: "low",
              estimated_time: "2-3 minutes",
              expected_outcome: "Reset monitoring stack"
            }
          ]
        }
      },
      
      'APPLICATION': {
        'high_error_rate': {
          immediate_actions: [
            {
              action: "Enable circuit breaker",
              command: `kubectl patch deployment ${primaryDiagnosis.component || 'app'} -n ${primaryDiagnosis.namespace || 'default'} -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","env":[{"name":"CIRCUIT_BREAKER","value":"true"}]}]}}}}'`,
              risk: "low",
              estimated_time: "30 seconds",
              expected_outcome: "Prevent cascade failures"
            }
          ]
        },
        'high_latency': {
          immediate_actions: [
            {
              action: "Scale up application",
              command: `kubectl scale deployment ${primaryDiagnosis.component || 'app'} --replicas=5 -n ${primaryDiagnosis.namespace || 'default'}`,
              risk: "low",
              estimated_time: "1-2 minutes",
              expected_outcome: "Distribute load across more pods"
            }
          ]
        }
      }
    };
    
    // Get the appropriate remediation template
    const categoryTemplates = CATEGORY_REMEDIATION_TEMPLATES[alertCategory];
    if (categoryTemplates) {
      // Try to match with root cause pattern first
      let selectedTemplate = categoryTemplates[rootCausePattern];
      
      // If no pattern match, try to match with primary diagnosis
      if (!selectedTemplate && primaryDiagnosis.issue) {
        Object.keys(categoryTemplates).forEach(pattern => {
          if (primaryDiagnosis.issue.toLowerCase().includes(pattern.replace(/_/g, ' '))) {
            selectedTemplate = categoryTemplates[pattern];
          }
        });
      }
      
      // If still no match, use first available template for the category
      if (!selectedTemplate) {
        selectedTemplate = categoryTemplates[Object.keys(categoryTemplates)[0]];
      }
      
      if (selectedTemplate) {
        console.log("Applying category remediation template");
        
        // Merge with existing remediation plan
        if (!actualOutput.remediation_plan.immediate_actions || 
            actualOutput.remediation_plan.immediate_actions.length === 0) {
          actualOutput.remediation_plan.immediate_actions = selectedTemplate.immediate_actions || [];
        } else {
          // Add source tag to distinguish category-based actions
          const taggedActions = (selectedTemplate.immediate_actions || []).map(action => ({
            ...action,
            source: "Category Template",
            category: alertCategory
          }));
          
          // Merge, keeping KB actions first, then category templates
          const kbActions = actualOutput.remediation_plan.immediate_actions.filter(a => 
            a.source === "Alert Knowledge Base"
          );
          const otherActions = actualOutput.remediation_plan.immediate_actions.filter(a => 
            a.source !== "Alert Knowledge Base"
          );
          
          actualOutput.remediation_plan.immediate_actions = [
            ...kbActions,
            ...taggedActions,
            ...otherActions
          ].slice(0, 5); // Limit to 5 actions
        }
        
        // Add short-term fixes if not present
        if (selectedTemplate.short_term_fixes && 
            (!actualOutput.remediation_plan.short_term_fixes || 
             actualOutput.remediation_plan.short_term_fixes.length === 0)) {
          actualOutput.remediation_plan.short_term_fixes = selectedTemplate.short_term_fixes;
        }
        
        // Add long-term solutions if not present  
        if (selectedTemplate.long_term_solutions && 
            (!actualOutput.remediation_plan.long_term_solutions || 
             actualOutput.remediation_plan.long_term_solutions.length === 0)) {
          actualOutput.remediation_plan.long_term_solutions = selectedTemplate.long_term_solutions;
        }
        
        // Add preventive measures if not present
        if (selectedTemplate.preventive_measures && 
            (!actualOutput.remediation_plan.preventive_measures || 
             actualOutput.remediation_plan.preventive_measures.length === 0)) {
          actualOutput.remediation_plan.preventive_measures = selectedTemplate.preventive_measures;
        }
        
        console.log("✅ Category remediation template applied");
        console.log("- Actions added:", actualOutput.remediation_plan.immediate_actions.length);
        console.log("- Category:", alertCategory);
        console.log("- Pattern:", rootCausePattern);
      }
    }
  }
}

// ============= RISK ASSESSMENT BY CATEGORY =============
if (actualOutput.risk_assessment) {
  const alertCategory = stage4Data?.alertCategoryAnalysis?.category || 'UNKNOWN';
  
  // Category-based risk levels
  const CATEGORY_RISK_LEVELS = {
    'ETCD': { base: 'critical', factors: ['Cluster consensus at risk', 'Potential data loss', 'Control plane failure'] },
    'CERTIFICATE': { base: 'critical', factors: ['Authentication failure imminent', 'Service disruption', 'Security risk'] },
    'INFRASTRUCTURE': { base: 'high', factors: ['Node failures affect all workloads', 'Potential cascade', 'Resource exhaustion'] },
    'CLUSTER': { base: 'high', factors: ['Control plane issues', 'API degradation', 'Scheduling problems'] },
    'NETWORK': { base: 'high', factors: ['Service connectivity issues', 'DNS failures', 'Ingress problems'] },
    'RESOURCE': { base: 'medium', factors: ['Resource constraints', 'Quota limits', 'Storage issues'] },
    'WORKLOAD': { base: 'medium', factors: ['Deployment issues', 'Scaling problems', 'Replica health'] },
    'POD': { base: 'medium', factors: ['Container issues', 'Pod lifecycle problems', 'Resource limits'] },
    'APPLICATION': { base: 'low', factors: ['Application errors', 'Performance degradation', 'Dependency issues'] },
    'MONITORING': { base: 'low', factors: ['Observability gaps', 'Metric collection issues', 'Alert delivery problems'] },
    'UNKNOWN': { base: 'medium', factors: ['Unclassified issue', 'Requires investigation'] }
  };
  
  const categoryRisk = CATEGORY_RISK_LEVELS[alertCategory] || CATEGORY_RISK_LEVELS['UNKNOWN'];
  
  // Only update if not already set or if category risk is higher
  const riskPriority = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
  const currentRiskLevel = riskPriority[actualOutput.risk_assessment.overall_risk] || 0;
  const categoryRiskLevel = riskPriority[categoryRisk.base] || 2;
  
  if (categoryRiskLevel > currentRiskLevel) {
    actualOutput.risk_assessment.overall_risk = categoryRisk.base;
    actualOutput.risk_assessment.factors = [
      ...actualOutput.risk_assessment.factors.filter(f => !categoryRisk.factors.includes(f)),
      ...categoryRisk.factors
    ];
    actualOutput.risk_assessment.category_based = true;
    actualOutput.risk_assessment.alert_category = alertCategory;
  }
  
  // Add category-specific mitigation steps if not present
  if (!actualOutput.risk_assessment.mitigation_steps || 
      actualOutput.risk_assessment.mitigation_steps.length === 0) {
    const CATEGORY_MITIGATIONS = {
      'ETCD': ['Immediate backup of etcd data', 'Prepare for cluster recovery', 'Alert senior SRE team'],
      'CERTIFICATE': ['Prepare certificate renewal', 'Notify security team', 'Have rollback plan ready'],
      'INFRASTRUCTURE': ['Identify affected workloads', 'Prepare node drain procedure', 'Check resource capacity'],
      'NETWORK': ['Verify connectivity paths', 'Check firewall rules', 'Test DNS resolution'],
      'DEFAULT': ['Monitor closely after remediation', 'Keep team on standby', 'Document all actions']
    };
    
    actualOutput.risk_assessment.mitigation_steps = 
      CATEGORY_MITIGATIONS[alertCategory] || CATEGORY_MITIGATIONS['DEFAULT'];
  }
}

// Risk assessment update for generic factors
if (actualOutput.risk_assessment && actualOutput.risk_assessment.factors) {
  actualOutput.risk_assessment.factors = actualOutput.risk_assessment.factors.map(factor => {
    if (typeof factor === 'string' && factor.includes('Payment service')) {
      const actualService = stage4Data?.stage2Data?.affected_services?.[0] || "Service";
      return factor.replace('Payment service', actualService);
    }
    return factor;
  });
}

// ============= SUCCESS METRICS BY CATEGORY =============
if (actualOutput.success_metrics) {
  const alertCategory = stage4Data?.alertCategoryAnalysis?.category || 'UNKNOWN';
  
  const CATEGORY_SUCCESS_METRICS = {
    'INFRASTRUCTURE': {
      immediate: {
        expected: ['Node status = Ready', 'No pods in Evicted state', 'Resource pressure resolved'],
        commands: ['kubectl get nodes', 'kubectl get pods --all-namespaces --field-selector status.phase=Failed', 'kubectl top nodes']
      },
      short_term: {
        expected: ['No node failures in 24h', 'Stable resource usage', 'All workloads running'],
        commands: ['kubectl get events --all-namespaces --field-selector type=Warning --since=24h | grep Node', 'kubectl top nodes', 'kubectl get pods --all-namespaces --field-selector status.phase!=Running']
      },
      long_term: {
        expected: ['Node reliability > 99.9%', 'Capacity planning implemented'],
        commands: ['kubectl describe nodes', 'kubectl get hpa --all-namespaces', 'kubectl get vpa --all-namespaces']
      }
    },
    'POD': {
      immediate: {
        expected: ['Pod status = Running', 'No restart in 10 minutes', 'All containers ready'],
        commands: ['kubectl get pods -n __NAMESPACE__ | grep __DEPLOYMENT__', 'kubectl describe pod -l app=__DEPLOYMENT__ -n __NAMESPACE__ | grep "Restart Count"', 'kubectl get pods -n __NAMESPACE__ -l app=__DEPLOYMENT__ -o jsonpath=\'{.items[*].status.containerStatuses[*].ready}\'']
      },
      short_term: {
        expected: ['Stable for 24h', 'No OOM events', 'Successful health checks'],
        commands: ['kubectl get events -n __NAMESPACE__ --field-selector reason=OOMKilling --since=24h', 'kubectl get pods -n __NAMESPACE__ -l app=__DEPLOYMENT__ --watch --timeout=60s', 'kubectl get pods -n __NAMESPACE__ -l app=__DEPLOYMENT__ -o jsonpath=\'{.items[*].status.containerStatuses[*].restartCount}\'']
      },
      long_term: {
        expected: ['Resource limits optimized', 'Monitoring alerts configured'],
        commands: ['kubectl describe deployment __DEPLOYMENT__ -n __NAMESPACE__ | grep -A5 Limits', 'kubectl get servicemonitor -n __NAMESPACE__', 'kubectl get prometheusrule -n __NAMESPACE__']
      }
    },
    'WORKLOAD': {
      immediate: {
        expected: ['Desired replicas = Available replicas', 'All pods ready', 'No pending pods'],
        commands: ['kubectl get deployment __DEPLOYMENT__ -n __NAMESPACE__', 'kubectl get pods -n __NAMESPACE__ -l app=__DEPLOYMENT__', 'kubectl get pods -n __NAMESPACE__ --field-selector status.phase=Pending']
      },
      short_term: {
        expected: ['Stable replica count for 24h', 'HPA functioning normally'],
        commands: ['kubectl get deployment __DEPLOYMENT__ -n __NAMESPACE__ --watch --timeout=60s', 'kubectl get hpa -n __NAMESPACE__', 'kubectl describe hpa -n __NAMESPACE__']
      },
      long_term: {
        expected: ['Auto-scaling optimized', 'Load patterns understood'],
        commands: ['kubectl get hpa -n __NAMESPACE__', 'kubectl get vpa -n __NAMESPACE__', 'kubectl top pods -n __NAMESPACE__']
      }
    },
    'RESOURCE': {
      immediate: {
        expected: ['Resource usage < 80%', 'No quota violations', 'PVC available space > 20%'],
        commands: ['kubectl top pods -n __NAMESPACE__', 'kubectl describe resourcequota -n __NAMESPACE__', 'kubectl get pvc -n __NAMESPACE__']
      },
      short_term: {
        expected: ['Stable resource consumption', 'No growth anomalies'],
        commands: ['kubectl top pods -n __NAMESPACE__ --sort-by=memory', 'kubectl get events -n __NAMESPACE__ --field-selector reason=FailedScheduling --since=24h', 'kubectl describe limitrange -n __NAMESPACE__']
      },
      long_term: {
        expected: ['Resource governance implemented', 'Automated cleanup in place'],
        commands: ['kubectl get limitrange -n __NAMESPACE__', 'kubectl get resourcequota -n __NAMESPACE__', 'kubectl get networkpolicy -n __NAMESPACE__']
      }
    },
    'NETWORK': {
      immediate: {
        expected: ['All endpoints ready', 'Service accessible', 'DNS resolving'],
        commands: ['kubectl get endpoints -n __NAMESPACE__', 'kubectl get svc -n __NAMESPACE__', 'kubectl exec -n __NAMESPACE__ deployment/__DEPLOYMENT__ -- nslookup kubernetes.default.svc.cluster.local']
      },
      short_term: {
        expected: ['No connection errors in 24h', 'Stable latency'],
        commands: ['kubectl get events -n __NAMESPACE__ --field-selector type=Warning --since=24h | grep -i network', 'kubectl exec -n __NAMESPACE__ deployment/__DEPLOYMENT__ -- wget --spider --timeout=5 http://kubernetes.default.svc.cluster.local:443', 'kubectl get networkpolicy -n __NAMESPACE__']
      },
      long_term: {
        expected: ['Network policies optimized', 'Redundancy implemented'],
        commands: ['kubectl get networkpolicy -n __NAMESPACE__', 'kubectl get ingress -n __NAMESPACE__', 'kubectl get service -n __NAMESPACE__ -o wide']
      }
    },
    'ETCD': {
      immediate: {
        expected: ['Leader elected', 'All members healthy', 'Fsync < 50ms'],
        commands: ['kubectl exec -n kube-system etcd-master -- etcdctl endpoint status --cluster', 'kubectl exec -n kube-system etcd-master -- etcdctl endpoint health --cluster', 'kubectl exec -n kube-system etcd-master -- etcdctl endpoint status --write-out=table']
      },
      short_term: {
        expected: ['No leader changes in 24h', 'Stable performance'],
        commands: ['kubectl get events -n kube-system --field-selector involvedObject.name~=etcd --since=24h', 'kubectl logs -n kube-system -l component=etcd --since=24h | grep -i leader', 'kubectl exec -n kube-system etcd-master -- etcdctl endpoint status --cluster']
      },
      long_term: {
        expected: ['Backup strategy implemented', 'Monitoring enhanced'],
        commands: ['kubectl get cronjob -n kube-system | grep etcd', 'kubectl get servicemonitor -n kube-system | grep etcd', 'kubectl describe configmap -n kube-system etcd-config']
      }
    },
    'CERTIFICATE': {
      immediate: {
        expected: ['Certificates valid', 'TTL > 30 days', 'All components authenticated'],
        commands: ['kubectl get csr', 'kubectl get secrets -A -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,TYPE:.type | grep tls', 'openssl x509 -in /etc/kubernetes/pki/ca.crt -text -noout | grep "Not After"']
      },
      short_term: {
        expected: ['Rotation successful', 'No auth failures'],
        commands: ['kubectl get events --all-namespaces --field-selector type=Warning --since=24h | grep -i cert', 'kubectl logs -n kube-system -l component=kube-apiserver --since=24h | grep -i cert', 'kubectl get certificatesigningrequest']
      },
      long_term: {
        expected: ['Auto-rotation configured', 'Monitoring alerts set'],
        commands: ['kubectl get cronjob --all-namespaces | grep cert', 'kubectl get servicemonitor --all-namespaces | grep cert', 'kubectl get prometheusrule --all-namespaces | grep cert']
      }
    },
    'DEFAULT': {
      immediate: {
        expected: ['Issue resolved', 'Service stable', 'No error logs'],
        commands: ['kubectl get pods -n __NAMESPACE__ | grep __DEPLOYMENT__', 'kubectl logs -n __NAMESPACE__ deployment/__DEPLOYMENT__ --tail=50', 'kubectl get events -n __NAMESPACE__ --sort-by=.metadata.creationTimestamp | tail -10']
      },
      short_term: {
        expected: ['No recurrence in 24h', 'SLO met'],
        commands: ['kubectl get events -n __NAMESPACE__ --field-selector type=Warning --since=24h', 'kubectl top pods -n __NAMESPACE__', 'kubectl get svc -n __NAMESPACE__ && curl -s -o /dev/null -w "%{http_code}" http://__DEPLOYMENT__.__NAMESPACE__.svc.cluster.local']
      },
      long_term: {
        expected: ['Root cause fixed', 'Prevention measures in place'],
        commands: ['kubectl describe deployment __DEPLOYMENT__ -n __NAMESPACE__', 'kubectl get hpa -n __NAMESPACE__', 'kubectl get servicemonitor -n __NAMESPACE__']
      }
    }
  };
  
  // Extract context variables for kubectl commands
  const namespace = actualOutput._context?.kubernetesFilters?.namespace || 
                   actualOutput._context?.alertContext?.kubernetes?.namespace || 
                   'default';
  const deployment = actualOutput._context?.kubernetesFilters?.deployment || 
                    actualOutput._context?.alertContext?.kubernetes?.deployment ||
                    actualOutput._context?.kubernetesFilters?.service ||
                    'app';
  
  // Generate category-specific metrics with proper kubectl commands
  function generateSuccessMetricsWithCommands(category, ns, deploy) {
    const template = CATEGORY_SUCCESS_METRICS[category] || CATEGORY_SUCCESS_METRICS['DEFAULT'];
    
    // Replace placeholder strings in commands with actual values
    const processCommands = (commands) => {
      return commands.map(cmd => 
        cmd.replace(/__NAMESPACE__/g, ns)
           .replace(/__DEPLOYMENT__/g, deploy)
      );
    };
    
    return {
      immediate: {
        expected: template.immediate.expected,
        commands: processCommands(template.immediate.commands)
      },
      short_term: {
        expected: template.short_term.expected,
        commands: processCommands(template.short_term.commands)
      },
      long_term: {
        expected: template.long_term.expected,
        commands: processCommands(template.long_term.commands)
      }
    };
  }
  
  const categoryMetrics = generateSuccessMetricsWithCommands(alertCategory, namespace, deployment);
  
  // Merge with existing metrics, preserving any that were already set
  if (!actualOutput.success_metrics.immediate || actualOutput.success_metrics.immediate.length === 0) {
    actualOutput.success_metrics.immediate = categoryMetrics.immediate;
  }
  if (!actualOutput.success_metrics.short_term || actualOutput.success_metrics.short_term.length === 0) {
    actualOutput.success_metrics.short_term = categoryMetrics.short_term;
  }
  if (!actualOutput.success_metrics.long_term || actualOutput.success_metrics.long_term.length === 0) {
    actualOutput.success_metrics.long_term = categoryMetrics.long_term;
  }
  
  // Add category tag
  actualOutput.success_metrics.category_enhanced = true;
  actualOutput.success_metrics.alert_category = alertCategory;
}

// ============= ROLLBACK PLAN BY CATEGORY =============
if (actualOutput.rollback_plan) {
  const alertCategory = stage4Data?.alertCategoryAnalysis?.category || 'UNKNOWN';
  
  const CATEGORY_ROLLBACK_CONDITIONS = {
    'ETCD': {
      trigger_conditions: [
        'etcd cluster loses quorum',
        'Multiple member failures',
        'Data corruption detected'
      ],
      steps: [
        'Restore from etcd backup immediately',
        'Rebuild cluster if necessary',
        'Escalate to senior SRE'
      ]
    },
    'INFRASTRUCTURE': {
      trigger_conditions: [
        'Node becomes completely unresponsive',
        'Multiple pod evictions',
        'Cascading node failures'
      ],
      steps: [
        'Cordon affected nodes',
        'Migrate workloads to healthy nodes',
        'Request infrastructure team intervention'
      ]
    },
    'POD': {
      trigger_conditions: [
        'Pod enters CrashLoopBackOff',
        'OOM kills continue',
        'Application errors increase'
      ],
      steps: [
        'Roll back deployment',
        'Restore previous pod template',
        'Revert configuration changes'
      ]
    },
    'DEFAULT': {
      trigger_conditions: [
        'Error rate > 5%',
        'Multiple component failures',
        'SLO violation continues'
      ],
      steps: [
        'Revert all changes',
        'Restore previous state',
        'Escalate to on-call lead'
      ]
    }
  };
  
  const categoryRollback = CATEGORY_ROLLBACK_CONDITIONS[alertCategory] || CATEGORY_ROLLBACK_CONDITIONS['DEFAULT'];
  
  // Only add if not already present
  if (!actualOutput.rollback_plan.trigger_conditions || 
      actualOutput.rollback_plan.trigger_conditions.length === 0) {
    actualOutput.rollback_plan.trigger_conditions = categoryRollback.trigger_conditions;
  }
  
  if (!actualOutput.rollback_plan.steps || 
      actualOutput.rollback_plan.steps.length === 0) {
    actualOutput.rollback_plan.steps = categoryRollback.steps;
  }
  
  // Add validation if not present
  if (!actualOutput.rollback_plan.validation) {
    actualOutput.rollback_plan.validation = `Verify ${alertCategory} stability before proceeding`;
  }
}

// ============= CONTEXT FIX =============
const expectedContextId = previousContext?.contextId;

if (!actualOutput._context || 
    actualOutput._context.contextId !== expectedContextId) {
  console.log("❌ Invalid or missing context, fixing...");
  
  // Deep copy of previous context
  const contextCopy = JSON.parse(JSON.stringify(previousContext));
  
  // Ensure stageResults exists
  if (!contextCopy.stageResults) {
    contextCopy.stageResults = {};
  }
  
  actualOutput._context = contextCopy;
  console.log("✅ Context replaced");
}

// Ensure stageResults exists
if (!actualOutput._context.stageResults) {
  actualOutput._context.stageResults = {};
}

// Add Stage 5 results - only this stage's data
actualOutput._context.stageResults.stage5 = {
  output: {
    analysis_id: actualOutput.analysis_id || `${expectedContextId}-stage5`,
    remediation_plan: JSON.parse(JSON.stringify(actualOutput.remediation_plan)),
    risk_assessment: JSON.parse(JSON.stringify(actualOutput.risk_assessment)),
    implementation_order: JSON.parse(JSON.stringify(actualOutput.implementation_order || [])),
    success_metrics: JSON.parse(JSON.stringify(actualOutput.success_metrics || {})),
    rollback_plan: JSON.parse(JSON.stringify(actualOutput.rollback_plan || {}))
  },
  completedAt: new Date().toISOString()
};

// Update debug info
actualOutput._debug = {
  nodeType: "Stage 5: AI-Powered Analysis",
  processedAt: actualOutput._debug?.processedAt || new Date().toISOString(),
  contextId: expectedContextId,
  contextPreserved: true,
  receivedFromStage: "Fix Stage 4 Context",
  priority: previousContext?.priority || "normal",
  stagesCompleted: 5,
  stageSequence: [
    "Unified Entry Point",
    "Stage 1: Health Snapshot",
    "Fix Stage 1 Context",
    "Stage 2 Decision",
    "Force Deep Analysis Override",
    "Wait 3s",
    "Stage 2: Deep Analysis",
    "Fix Stage 2 Context",
    "Stage 3: Alert Intelligence",
    "Fix Stage 3 Context",
    "Stage 4: Automated Diagnosis",
    "Fix Stage 4 Context",
    "Stage 5: AI-Powered Analysis",
    "Fix Stage 5 Context"
  ],
  analysisTimeRange: {
    start: previousContext?.initialParams?.startTime || 0,
    end: previousContext?.initialParams?.endTime || 0
  }
};

// Update root level context
fixedOutput._context = JSON.parse(JSON.stringify(actualOutput._context));
fixedOutput.contextId = expectedContextId;

// ============= MERGE KB ACTIONS WITH EXISTING PLAN (NEW) =============
// Enhance the remediation plan with KB actions
let enhancedRemediationPlan = JSON.parse(JSON.stringify(actualOutput.remediation_plan || {}));

if (kbActions.length > 0) {
  console.log("🔗 Merging", kbActions.length, "KB actions with existing remediation plan");
  
  // Add KB immediate actions
  const kbImmediateActions = kbActions.filter(a => a.type !== "long_term");
  if (kbImmediateActions.length > 0) {
    if (!enhancedRemediationPlan.immediate_actions) enhancedRemediationPlan.immediate_actions = [];
    // Prioritize KB actions at the beginning
    enhancedRemediationPlan.immediate_actions = [
      ...kbImmediateActions,
      ...enhancedRemediationPlan.immediate_actions
    ];
  }
  
  // Add KB long-term solutions
  const kbLongTermActions = kbActions.filter(a => a.type === "long_term");
  if (kbLongTermActions.length > 0) {
    if (!enhancedRemediationPlan.long_term_solutions) enhancedRemediationPlan.long_term_solutions = [];
    enhancedRemediationPlan.long_term_solutions = [
      ...enhancedRemediationPlan.long_term_solutions,
      ...kbLongTermActions
    ];
  }
}

// Stage 5 summary data
fixedOutput.stage5Data = {
  analysis_id: actualOutput.analysis_id,
  remediation_plan: enhancedRemediationPlan, // Use enhanced plan instead of original
  risk_assessment: JSON.parse(JSON.stringify(actualOutput.risk_assessment)),
  implementation_order: JSON.parse(JSON.stringify(actualOutput.implementation_order || [])),
  success_metrics: JSON.parse(JSON.stringify(actualOutput.success_metrics || {})),
  rollback_plan: JSON.parse(JSON.stringify(actualOutput.rollback_plan || {})),
  primary_action: enhancedRemediationPlan?.immediate_actions?.[0], // Use enhanced plan
  overall_risk: actualOutput.risk_assessment?.overall_risk,
  kb_actions_added: kbActions.length, // Track KB enhancement
  kb_enhanced: kbActions.length > 0
};

// Update decisions
if (!actualOutput._context.decisions) {
  actualOutput._context.decisions = previousContext?.decisions || {};
}

actualOutput._context.decisions.stage6Proceed = {
  timestamp: new Date().toISOString(),
  remediationPlanCreated: !!actualOutput.remediation_plan,
  riskAssessed: !!actualOutput.risk_assessment,
  primaryActionDefined: !!actualOutput.remediation_plan?.immediate_actions?.[0]
};

// Preserve ALL previous stage data
if (stage4Data?.stage1Data) {
  fixedOutput.stage1Data = JSON.parse(JSON.stringify(stage4Data.stage1Data));
  console.log("✅ Stage 1 data preserved (full copy)");
}

if (stage4Data?.stage2Data) {
  fixedOutput.stage2Data = JSON.parse(JSON.stringify(stage4Data.stage2Data));
  console.log("✅ Stage 2 data preserved (full copy)");
}

if (stage4Data?.stage3Data) {
  fixedOutput.stage3Data = JSON.parse(JSON.stringify(stage4Data.stage3Data));
  console.log("✅ Stage 3 data preserved (full copy)");
}

if (stage4Data?.stage4Data) {
  fixedOutput.stage4Data = JSON.parse(JSON.stringify(stage4Data.stage4Data));
  console.log("✅ Stage 4 data preserved (full copy)");
}

// Preserve additional data
if (stage4Data?.consolidatedFindings) {
  fixedOutput.consolidatedFindings = JSON.parse(JSON.stringify(stage4Data.consolidatedFindings));
}

if (stage4Data?.primaryDiagnosis) {
  fixedOutput.primaryDiagnosis = JSON.parse(JSON.stringify(stage4Data.primaryDiagnosis));
}

// Executive summary
fixedOutput.executiveSummary = {
  contextId: expectedContextId,
  issue: fixedOutput.primaryDiagnosis?.issue || "Unknown issue",
  severity: fixedOutput.primaryDiagnosis?.severity || "medium",
  immediateAction: actualOutput.remediation_plan?.immediate_actions?.[0]?.action || "No immediate action",
  command: actualOutput.remediation_plan?.immediate_actions?.[0]?.command || "N/A",
  risk: actualOutput.risk_assessment?.overall_risk || "unknown",
  estimatedTime: actualOutput.remediation_plan?.immediate_actions?.[0]?.estimated_time || "unknown",
  stagesCompleted: 5,
  timestamp: new Date().toISOString()
};

// Namespaces and time range - Default to all production namespaces
const DEFAULT_NAMESPACES_FALLBACK = [
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
fixedOutput.namespaces = previousContext?.initialParams?.namespaces || DEFAULT_NAMESPACES_FALLBACK;
fixedOutput.timeRange = {
  start: previousContext?.initialParams?.startTime || 0,
  end: previousContext?.initialParams?.endTime || 0
};

// Summary logging
console.log("==============================");
console.log("Stage 5 Fix Summary:");
console.log("- Context ID:", actualOutput._context?.contextId);
console.log("- Immediate action:", enhancedRemediationPlan?.immediate_actions?.[0]?.action);
console.log("- Risk level:", fixedOutput.risk_assessment?.overall_risk);
console.log("- Command:", enhancedRemediationPlan?.immediate_actions?.[0]?.command);

// Previous stage data preserved:
console.log("  * Stage 1:", !!fixedOutput.stage1Data);
console.log("  * Stage 2:", !!fixedOutput.stage2Data);
console.log("  * Stage 3:", !!fixedOutput.stage3Data);
console.log("  * Stage 4:", !!fixedOutput.stage4Data);
console.log("  * Stage 5:", !!fixedOutput.stage5Data);
console.log("- All data is FULL COPY (no summarization)");

// Validation
const validationPassed = 
  actualOutput._context?.contextId === expectedContextId &&
  !!fixedOutput.stage1Data &&
  !!fixedOutput.stage2Data &&
  !!fixedOutput.stage3Data &&
  !!fixedOutput.stage4Data &&
  !!fixedOutput.stage5Data;

if (validationPassed) {
  console.log("✅ Stage 5 context successfully fixed and validated!");
  console.log("🎉 ALL STAGES COMPLETED WITH FULL DATA PRESERVED!");
} else {
  console.error("⚠️ Stage 5 validation warnings - check data preservation");
}

// Debug info for next stage
fixedOutput._debugInfo = {
  fromNode: "Fix Stage 5 Context",
  contextFixed: true,
  validationPassed: validationPassed,
  templatesParsed: true,
  stage5Decision: !!actualOutput.remediation_plan,
  primaryAction: actualOutput.remediation_plan?.immediate_actions?.[0]?.action || "none",
  overallRisk: actualOutput.risk_assessment?.overall_risk || "unknown",
  allStagesDataPresent: !!(fixedOutput.stage1Data && fixedOutput.stage2Data && 
                           fixedOutput.stage3Data && fixedOutput.stage4Data && 
                           fixedOutput.stage5Data),
  timestamp: new Date().toISOString()
};

// Pass the output wrapper if needed
if (hasOutputWrapper) {
  fixedOutput.output = actualOutput;
}

return [{
  json: fixedOutput
}];