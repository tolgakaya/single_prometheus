// Central Time Range Handler - Enhanced Null Safety
const inputs = $input.all();
let timeRange = {}, context = {}, affectedServices = [];

const input = inputs[0].json;

// Default time range values
const now = Date.now();
const defaultTimeRange = {
  end: Math.floor(now / 1000),
  start: Math.floor((now - 60 * 60 * 1000) / 1000) // 1 hour ago
};

// PRODUCTION: Log any null time values
if (input.startTime === null || input.startTime === undefined || 
    input.endTime === null || input.endTime === undefined) {
  console.warn("WARNING: Null time values detected, using defaults");
  console.warn("Input startTime:", input.startTime);
  console.warn("Input endTime:", input.endTime);
  console.warn("Input source:", input.context?.source || 'unknown');
  
  // Log to help debug the source of null values
  console.warn("Full input keys:", Object.keys(input));
  
  timeRange = defaultTimeRange;
  context = {
    source: 'default',
    reason: 'Null time values detected, using default 1 hour range',
    nullTimeDetected: true,
    originalInput: {
      startTime: input.startTime,
      endTime: input.endTime,
      source: input.context?.source
    }
  };
}
// ORCHESTRATOR INPUT HANDLING
else if (input.orchestratorId && input.analysisConfig) {
  timeRange = {
    start: input.startTime || defaultTimeRange.start,
    end: input.endTime || defaultTimeRange.end
  };
  context = {
    source: 'orchestrator',
    orchestratorId: input.orchestratorId,
    requestId: input.requestId,
    priority: input.priority || input.analysisConfig?.priority || 'normal',
    forceDeepAnalysis: input.analysisConfig?.forceDeepAnalysis || (input.priority === 'critical'),
    originalMessage: input.userMessage || ''
  };
  affectedServices = input.searchParams?.services || [];
  
  console.log('=== ORCHESTRATOR FORMAT DETECTED ===');
  console.log('Priority:', input.priority);
  console.log('Time range:', new Date(timeRange.start * 1000).toISOString(), 'to', new Date(timeRange.end * 1000).toISOString());
  
} else if (input.formFields) {
  const form = input.formFields;
  // Validate form timestamps
  const startTimeStr = form['Incident Start Time'];
  const endTimeStr = form['Incident End Time'];
  
  if (!startTimeStr || !endTimeStr) {
    console.warn("Form missing time values, using defaults");
    timeRange = defaultTimeRange;
    context = {
      source: 'form',
      reason: 'Form time fields missing',
      description: form['Incident Description'] || ''
    };
  } else {
    timeRange = {
      start: Math.floor(new Date(startTimeStr).getTime() / 1000),
      end: Math.floor(new Date(endTimeStr).getTime() / 1000)
    };
    context = {
      source: 'form',
      description: form['Incident Description'] || '',
      severity: form['Severity Level'],
      services: form['Affected Services'] || []
    };
  }
  affectedServices = form['Affected Services'] || [];
  
} else if (input.parsedTimeRange) {
  timeRange = {
    start: input.parsedTimeRange.start,
    end: input.parsedTimeRange.end
  };
  context = {
    source: 'chat',
    originalMessage: input.message,
    ...input.parsedTimeRange.context
  };
  affectedServices = input.parsedTimeRange.context.mentionedServices || [];
  
  // Auth error detection için time range extension
  if (input.message && (input.message.includes("401") || input.message.includes("Unauthorized"))) {
    timeRange.start = timeRange.start - 1800;
    context.authErrorDetected = true;
  }
  
} else if (input.headers && input.body) {
  const webhook = input.body;
  // Validate webhook timestamps
  if (!webhook.start_time || !webhook.end_time) {
    console.warn("Webhook missing time values, using defaults");
    timeRange = defaultTimeRange;
    context = {
      source: 'webhook',
      reason: 'Webhook time fields missing',
      incidentId: webhook.incident_id
    };
  } else {
    timeRange = {
      start: Math.floor(new Date(webhook.start_time).getTime() / 1000),
      end: Math.floor(new Date(webhook.end_time).getTime() / 1000)
    };
    context = {
      source: 'webhook',
      incidentId: webhook.incident_id,
      severity: webhook.severity,
      alertSource: webhook.source || 'external'
    };
  }
  affectedServices = webhook.affected_services || [webhook.affected_service] || [];
  
} else if (input.startTime && input.endTime) {
  timeRange = {
    start: input.startTime,
    end: input.endTime
  };
  context = {
    source: 'manual',
    description: input.description || ''
  };
  
} else {
  // Use default time range
  timeRange = defaultTimeRange;
  context = {
    source: 'default',
    reason: 'No time range specified, using last 1 hour'
  };
}

// Validation - More robust
const duration = timeRange.end - timeRange.start;
if (isNaN(duration) || duration <= 0) {
  console.error('Invalid time range detected, using defaults');
  timeRange = defaultTimeRange;
  context.validationError = 'Invalid duration calculated';
}
if (duration > 24 * 60 * 60) {
  console.warn('Time range exceeds 24 hours, capping to 24h');
  timeRange.start = timeRange.end - (24 * 60 * 60);
  context.capped = true;
}

// Calculate step
const durationMinutes = duration / 60;
let step;
if (durationMinutes <= 60) {
  step = 60;
} else if (durationMinutes <= 360) {
  step = 300;
} else if (durationMinutes <= 1440) {
  step = 600;
} else {
  step = 1800;
}

// Build output with validation
const output = {
  timeRange: {
    start: timeRange.start,
    end: timeRange.end,
    startISO: new Date(timeRange.start * 1000).toISOString(),
    endISO: new Date(timeRange.end * 1000).toISOString(),
    durationSeconds: duration,
    durationMinutes: Math.round(duration / 60),
    durationHuman: duration < 3600 ? `${Math.round(duration / 60)} minutes` : `${Math.round(duration / 3600)} hours`
  },
  queryParams: {
    start: timeRange.start,
    end: timeRange.end,
    step: step
  },
  context: context,
  affectedServices: affectedServices,
  analysisId: input.requestId || `analysis-${Date.now()}`,
  timestamp: new Date().toISOString(),
  
  // CRITICAL: Add forceDeepAnalysis at root level
  forceDeepAnalysis: context.forceDeepAnalysis || false,
  priority: context.priority || input.priority || 'normal',
  
  // PRODUCTION: Never enable test mode
  testMode: false
};

// Preserve orchestrator metadata
if (input.orchestratorId) {
  output.orchestratorId = input.orchestratorId;
  output.requestId = input.requestId;
  output.analysisConfig = input.analysisConfig;
  output.searchFilters = input.searchFilters;
  output.features = input.features;
  output.orchestratorMetadata = input.orchestratorMetadata;
}

// Force deep analysis flag - ensure it's set
if (context.forceDeepAnalysis || context.priority === 'critical') {
  output.forceDeepAnalysis = true;
}

// Debug log
console.log("=== TIME RANGE HANDLER OUTPUT ===");
console.log("Time Range:", output.timeRange.startISO, "to", output.timeRange.endISO);
console.log("Duration:", output.timeRange.durationHuman);
console.log("Priority:", output.priority);
console.log("Test Mode:", output.testMode, "(PRODUCTION: Always false)");
console.log("================================");

return [{ json: output }];