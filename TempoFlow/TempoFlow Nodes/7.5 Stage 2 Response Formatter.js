// Stage 2 Response Formatter
// Transforms Agent 6 output to match Stage 2 Output Parser schema
// Place this node between Agent 6 (Stage 2 Deep Dive) and Stage 2 Output Parser

const input = $input.all()[0].json;

// Helper function to ensure array
function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

// Helper function to ensure object
function ensureObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

// Helper function to ensure string
function ensureString(value, defaultValue = '') {
  if (!value) return defaultValue;
  if (typeof value === 'string') return value;
  return String(value);
}

// Build formatted output matching the schema
const formatted = {
  // Required top-level fields
  stage: ensureString(input.stage, 'deep_investigation'),

  investigation_trigger: ensureString(
    input.investigation_trigger || input.trigger || input.reason,
    'Stage 2 investigation triggered'
  ),

  tools_executed: ensureArray(input.tools_executed || input.tools || input.executed_tools),

  // Service context (optional structure)
  service_context: {
    primary_services_investigated: ensureArray(
      input.service_context?.primary_services_investigated ||
      input.services_investigated ||
      input.primary_services
    ),
    dependency_chains_analyzed: ensureArray(
      input.service_context?.dependency_chains_analyzed ||
      input.dependency_chains ||
      input.chains_analyzed
    ),
    cascade_patterns_detected: ensureArray(
      input.service_context?.cascade_patterns_detected ||
      input.cascade_patterns ||
      input.patterns_detected
    )
  },

  // Execution timeline (optional)
  execution_timeline: ensureObject(input.execution_timeline || input.timeline),

  // Findings (required structure, optional content)
  findings: {
    service_dependencies: {
      failed_chains: ensureArray(
        input.findings?.service_dependencies?.failed_chains ||
        input.failed_chains ||
        input.dependency_failures
      ),
      cascade_failures: ensureArray(
        input.findings?.service_dependencies?.cascade_failures ||
        input.cascade_failures ||
        input.cascades
      )
    },
    exceptions: {
      by_service: ensureObject(
        input.findings?.exceptions?.by_service ||
        input.exceptions_by_service ||
        input.service_exceptions
      )
    },
    performance: {
      service_latencies: ensureObject(
        input.findings?.performance?.service_latencies ||
        input.service_latencies ||
        input.latencies
      )
    },
    external_dependencies: ensureObject(
      input.findings?.external_dependencies ||
      input.external_dependencies
    ),
    historical_comparison: ensureObject(
      input.findings?.historical_comparison ||
      input.historical_comparison
    )
  },

  // Affected components (optional structure)
  affected_components: {
    services: ensureArray(
      input.affected_components?.services ||
      input.affected_services ||
      input.impacted_services
    ),
    service_dependencies: ensureObject(
      input.affected_components?.service_dependencies ||
      input.service_dependencies
    ),
    critical_paths_impacted: ensureArray(
      input.affected_components?.critical_paths_impacted ||
      input.critical_paths ||
      input.impacted_paths
    ),
    endpoints: ensureArray(
      input.affected_components?.endpoints ||
      input.affected_endpoints ||
      input.endpoints
    ),
    databases: ensureArray(
      input.affected_components?.databases ||
      input.affected_databases ||
      input.databases
    ),
    estimated_users_impacted: ensureString(
      input.affected_components?.estimated_users_impacted ||
      input.users_impacted ||
      input.estimated_impact,
      'Unknown'
    )
  },

  // Root cause analysis (required with primary_cause)
  root_cause_analysis: {
    primary_cause: ensureString(
      input.root_cause_analysis?.primary_cause ||
      input.root_cause ||
      input.primary_cause ||
      input.cause,
      'Analysis in progress - root cause not yet determined'
    ),
    service_root: ensureString(
      input.root_cause_analysis?.service_root ||
      input.service_root ||
      input.origin_service
    ),
    affected_chains: ensureArray(
      input.root_cause_analysis?.affected_chains ||
      input.affected_chains ||
      input.impacted_chains
    ),
    contributing_factors: ensureArray(
      input.root_cause_analysis?.contributing_factors ||
      input.contributing_factors ||
      input.factors
    ),
    evidence: ensureArray(
      input.root_cause_analysis?.evidence ||
      input.evidence ||
      input.supporting_evidence
    )
  },

  // Severity assessment (optional with defaults)
  severity_assessment: {
    business_impact: ensureValidEnum(
      input.severity_assessment?.business_impact ||
      input.business_impact,
      ['critical', 'high', 'medium', 'low'],
      'medium'
    ),
    technical_severity: ensureValidEnum(
      input.severity_assessment?.technical_severity ||
      input.technical_severity ||
      input.severity,
      ['critical', 'high', 'medium', 'low'],
      'medium'
    ),
    urgency: ensureValidEnum(
      input.severity_assessment?.urgency ||
      input.urgency,
      ['immediate', 'high', 'medium', 'low'],
      'medium'
    ),
    service_criticality_score: ensureNumber(
      input.severity_assessment?.service_criticality_score ||
      input.criticality_score ||
      input.score,
      50,
      0,
      100
    )
  },

  // Recommendations (optional structure)
  recommendations: {
    immediate_actions: ensureArray(
      input.recommendations?.immediate_actions ||
      input.immediate_actions ||
      input.actions
    ),
    service_specific: ensureObject(
      input.recommendations?.service_specific ||
      input.service_specific_recommendations ||
      input.service_recommendations
    ),
    short_term: ensureArray(
      input.recommendations?.short_term ||
      input.short_term_recommendations ||
      input.short_term
    ),
    long_term: ensureArray(
      input.recommendations?.long_term ||
      input.long_term_recommendations ||
      input.long_term
    )
  }
};

// Helper function to validate enum values
function ensureValidEnum(value, validValues, defaultValue) {
  if (!value) return defaultValue;
  const strValue = String(value).toLowerCase();
  if (validValues.includes(strValue)) return strValue;
  return defaultValue;
}

// Helper function to ensure number within range
function ensureNumber(value, defaultValue, min, max) {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  if (isNaN(num)) return defaultValue;
  if (min !== undefined && num < min) return min;
  if (max !== undefined && num > max) return max;
  return num;
}

// Return formatted output
return formatted;
