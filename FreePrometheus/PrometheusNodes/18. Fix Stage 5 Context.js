// Fix Stage 5 Context - Optimized without circular references

// Default production namespaces
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
  'etiyamobile-production',
  'etiyamobile-prod'
];

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
    source: {
      type: "manual_trigger",
      triggeredBy: "user"
    },
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
    source: {
      type: "manual_trigger",
      triggeredBy: "user"
    },
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

// Risk assessment update
if (actualOutput.risk_assessment && actualOutput.risk_assessment.factors) {
  actualOutput.risk_assessment.factors = actualOutput.risk_assessment.factors.map(factor => {
    if (typeof factor === 'string' && factor.includes('Payment service')) {
      const actualService = stage4Data?.stage2Data?.affected_services?.[0] || "Service";
      return factor.replace('Payment service', actualService);
    }
    return factor;
  });
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

// Stage 5 summary data
fixedOutput.stage5Data = {
 analysis_id: actualOutput.analysis_id,
 remediation_plan: JSON.parse(JSON.stringify(actualOutput.remediation_plan)),
 risk_assessment: JSON.parse(JSON.stringify(actualOutput.risk_assessment)),
 implementation_order: JSON.parse(JSON.stringify(actualOutput.implementation_order || [])),
 success_metrics: JSON.parse(JSON.stringify(actualOutput.success_metrics || {})),
 rollback_plan: JSON.parse(JSON.stringify(actualOutput.rollback_plan || {})),
 primary_action: actualOutput.remediation_plan?.immediate_actions?.[0],
 overall_risk: actualOutput.risk_assessment?.overall_risk
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

// Namespaces and time range
fixedOutput.namespaces = previousContext?.initialParams?.namespaces || DEFAULT_NAMESPACES;
fixedOutput.timeRange = {
 start: previousContext?.initialParams?.startTime || 0,
 end: previousContext?.initialParams?.endTime || 0
};

// Summary logging
console.log("==============================");
console.log("Stage 5 Fix Summary:");
console.log("- Context ID:", actualOutput._context?.contextId);
console.log("- Immediate action:", fixedOutput.remediation_plan?.immediate_actions?.[0]?.action);
console.log("- Risk level:", fixedOutput.risk_assessment?.overall_risk);
console.log("- Command:", fixedOutput.remediation_plan?.immediate_actions?.[0]?.command);
console.log("- Previous stage data preserved:");
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