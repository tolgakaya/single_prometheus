// Fix Stage 3 Agent Output - Parser Replacement
// Agent'ın çıktısını parser schema'sına uygun formata dönüştürür

const items = $input.all();
const fixedItems = [];

for (const item of items) {
  try {
    // Agent output'u al
    let agentOutput;
    
    // Farklı output formatlarını handle et
    if (typeof item.json === 'string') {
      // String JSON ise parse et
      agentOutput = JSON.parse(item.json);
    } else if (item.json.output) {
      // Output wrapper varsa
      if (typeof item.json.output === 'string') {
        agentOutput = JSON.parse(item.json.output);
      } else {
        agentOutput = item.json.output;
      }
    } else {
      // Direkt obje
      agentOutput = item.json;
    }
    
    // Helper function - Safe value getter
    const safeGet = (obj, path, defaultValue) => {
      const keys = path.split('.');
      let result = obj;
      for (const key of keys) {
        if (result && typeof result === 'object' && key in result) {
          result = result[key];
        } else {
          return defaultValue;
        }
      }
      return result ?? defaultValue;
    };
    
    // Helper function - Ensure array
    const ensureArray = (value) => {
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object') return [value];
      return [];
    };
    
    // Helper function - Ensure valid number
    const ensureNumber = (value, defaultValue = 0) => {
      const num = parseFloat(value);
      return isNaN(num) ? defaultValue : num;
    };
    
    // Helper function - Ensure valid string
    const ensureString = (value, defaultValue = '') => {
      if (value === null || value === undefined) return defaultValue;
      return String(value);
    };
    
    // Helper function - Ensure valid boolean
    const ensureBoolean = (value, defaultValue = false) => {
      if (typeof value === 'boolean') return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      return defaultValue;
    };
    
    // Fix active_alerts
    let activeAlerts = ensureArray(agentOutput.active_alerts);
    activeAlerts = activeAlerts.map(alert => ({
      name: ensureString(alert.name || alert.alertname, 'Unknown Alert'),
      severity: ensureString(alert.severity, 'unknown'),
      count: ensureNumber(alert.count, 0),
      duration: ensureString(alert.duration, 'unknown'),
      labels: (alert.labels && typeof alert.labels === 'object') ? alert.labels : {},
      annotations: (alert.annotations && typeof alert.annotations === 'object') ? alert.annotations : {}
    }));
    
    // Fix alert_groups
    let alertGroups = ensureArray(agentOutput.alert_groups);
    alertGroups = alertGroups.map(group => ({
      root_alert: ensureString(group.root_alert, 'none'),
      related_alerts: ensureArray(group.related_alerts).map(a => ensureString(a)),
      correlation_score: ensureNumber(group.correlation_score, 0),
      shared_labels: (group.shared_labels && typeof group.shared_labels === 'object') ? group.shared_labels : {}
    }));
    
    // Fix knowledge_base_matches
    let kbMatches = ensureArray(agentOutput.knowledge_base_matches);
    kbMatches = kbMatches.map(match => ({
      alert: ensureString(match.alert, 'none'),
      kb_entry: (match.kb_entry && typeof match.kb_entry === 'object') ? {
        root_causes: ensureArray(match.kb_entry.root_causes).map(c => ensureString(c)),
        diagnostic_commands: ensureArray(match.kb_entry.diagnostic_commands).map(c => ensureString(c)),
        immediate_actions: ensureArray(match.kb_entry.immediate_actions).map(a => ensureString(a)),
        long_term_solutions: ensureArray(match.kb_entry.long_term_solutions).map(s => ensureString(s))
      } : {},
      applicability_score: ensureNumber(match.applicability_score, 0)
    }));
    
    // Fix alert_patterns
    let alertPatterns = agentOutput.alert_patterns || {};
    alertPatterns = {
      recurring: ensureArray(alertPatterns.recurring),
      storm_detection: {
        detected: ensureBoolean(alertPatterns.storm_detection?.detected, false),
        alert_count: ensureNumber(alertPatterns.storm_detection?.alert_count, 0),
        time_window: ensureString(alertPatterns.storm_detection?.time_window, '5m'),
        likely_root: alertPatterns.storm_detection?.likely_root || null
      }
    };
    
    // Fix slo_impact
    let sloImpact = agentOutput.slo_impact || {};
    let availabilitySlo = sloImpact.availability_slo || {};
    
    // SLO status validation
    const validStatuses = ['green', 'yellow', 'red', 'unknown'];
    let sloStatus = ensureString(availabilitySlo.status, 'green').toLowerCase();
    if (!validStatuses.includes(sloStatus)) {
      sloStatus = 'unknown';
    }
    
    // Fix NaN and invalid percentages
    const fixPercentage = (value, defaultValue = '100%') => {
      const str = ensureString(value, defaultValue);
      if (str === 'NaN%' || str === 'null%' || str === 'undefined%') {
        return defaultValue;
      }
      // Ensure it ends with %
      if (!str.endsWith('%')) {
        const num = parseFloat(str);
        if (!isNaN(num)) {
          return `${num}%`;
        }
      }
      return str || defaultValue;
    };
    
    sloImpact = {
      availability_slo: {
        target: fixPercentage(availabilitySlo.target, '99.9%'),
        current: fixPercentage(availabilitySlo.current, '100%'),
        error_budget_used: fixPercentage(availabilitySlo.error_budget_used, '0%'),
        time_remaining: ensureString(availabilitySlo.time_remaining, '30d'),
        status: sloStatus,
        components: {
          deployment_health: fixPercentage(availabilitySlo.components?.deployment_health, '100%')
        }
      },
      affected_slis: ensureArray(sloImpact.affected_slis).map(s => ensureString(s))
    };
    
    // Fix recommended_alert_actions
    let recommendedActions = ensureArray(agentOutput.recommended_alert_actions);
    recommendedActions = recommendedActions.map(action => ({
      alert: ensureString(action.alert, 'none'),
      action: ensureString(action.action, 'Monitor'),
      confidence: ensureNumber(action.confidence, 0),
      risk: ensureString(action.risk, 'medium'),
      command: action.command || null
    }));
    
    // Fix booleans
    const proceedToStage4 = ensureBoolean(agentOutput.proceed_to_stage4, activeAlerts.length > 0);
    const autoRemediationApproved = ensureBoolean(agentOutput.auto_remediation_approved, false);
    
    // Fix _context
    let context = agentOutput._context || {};
    if (typeof context === 'string') {
      try {
        context = JSON.parse(context);
      } catch (e) {
        context = {};
      }
    }
    
    // Fix _debug
    let debug = agentOutput._debug || {};
    if (!debug.nodeType) {
      debug.nodeType = 'Stage 3: Alert Intelligence';
    }
    if (!debug.processedAt) {
      debug.processedAt = new Date().toISOString();
    }
    if (!debug.toolCallCount && typeof debug.toolCallCount !== 'number') {
      debug.toolCallCount = 0;
    }
    if (!debug.alertHistoryCallCount && typeof debug.alertHistoryCallCount !== 'number') {
      debug.alertHistoryCallCount = 0;
    }
    
    // Build fixed output
    const fixedOutput = {
      stage: ensureString(agentOutput.stage, 'alert_intelligence'),
      active_alerts: activeAlerts,
      alert_groups: alertGroups,
      knowledge_base_matches: kbMatches,
      alert_patterns: alertPatterns,
      slo_impact: sloImpact,
      recommended_alert_actions: recommendedActions,
      proceed_to_stage4: proceedToStage4,
      auto_remediation_approved: autoRemediationApproved,
      _context: context,
      _debug: debug
    };
    
    // Wrap in expected format
    fixedItems.push({
      json: {
        output: fixedOutput
      }
    });
    
    // Log success
    console.log('✅ Stage 3 output successfully fixed');
    console.log('- Active alerts:', activeAlerts.length);
    console.log('- Alert groups:', alertGroups.length);
    console.log('- KB matches:', kbMatches.length);
    console.log('- SLO status:', sloImpact.availability_slo.status);
    console.log('- Proceed to Stage 4:', proceedToStage4);
    
  } catch (error) {
    console.error('❌ Error fixing Stage 3 output:', error.message);
    
    // Return a valid default structure on error
    fixedItems.push({
      json: {
        output: {
          stage: 'alert_intelligence',
          active_alerts: [],
          alert_groups: [],
          knowledge_base_matches: [],
          alert_patterns: {
            recurring: [],
            storm_detection: {
              detected: false,
              alert_count: 0,
              time_window: '5m',
              likely_root: null
            }
          },
          slo_impact: {
            availability_slo: {
              target: '99.9%',
              current: '100%',
              error_budget_used: '0%',
              time_remaining: '30d',
              status: 'green',
              components: {
                deployment_health: '100%'
              }
            },
            affected_slis: []
          },
          recommended_alert_actions: [],
          proceed_to_stage4: false,
          auto_remediation_approved: false,
          _context: {},
          _debug: {
            nodeType: 'Stage 3: Alert Intelligence',
            processedAt: new Date().toISOString(),
            error: error.message,
            originalData: item.json
          }
        }
      }
    });
  }
}

return fixedItems;