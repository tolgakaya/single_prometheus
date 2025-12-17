// Redis State Check Node - UPDATED VERSION
// Purpose:
// 1. Parse Redis GET result
// 2. Determine if alert is new or existing
// 3. Calculate deduplication metrics
// 4. Decide on actions (create ticket, update ticket, escalate, etc.)

// IMPORTANT: This node receives data from TWO sources:
// 1. "Process Results & Decision" node (has fingerprint, alertSummary, etc.)
// 2. "Redis Get" node (has Redis value or empty)

// Get Process Results data - this contains the fingerprint and alert data
// In n8n, we reference other nodes' data like this: $node["Node Name"].json
const processedData = $node["Process Results & Decision"].json;
const fingerprint = processedData.fingerprint;

// Get Redis GET result - this is the current node's input
let redisValue = null;
try {
  // Redis GET node returns value in $input.item.json
  const redisResult = $input.item.json;
  
  // Try to extract value from various Redis response formats
  if (redisResult && redisResult.value !== undefined) {
    redisValue = redisResult.value;
  } else if (typeof redisResult === 'string') {
    redisValue = redisResult;
  }
  
  console.log('Redis value retrieved:', redisValue !== null && redisValue !== '' ? 'Found' : 'Empty');
} catch (e) {
  console.log('Error getting Redis value:', e.message);
  redisValue = null;
}

// Parse Redis data if exists
let existingData = null;
if (redisValue !== undefined && redisValue !== null && redisValue !== '') {
  try {
    // If value is already an object, use it directly
    if (typeof redisValue === 'object') {
      existingData = redisValue;
    } else {
      // Otherwise parse the JSON string
      existingData = JSON.parse(redisValue);
    }
  } catch (e) {
    console.log('Error parsing Redis value:', e.message);
    existingData = null;
  }
}

// Current timestamp
const now = Date.now();

// ============= ALERT IS EXISTING (Found in Redis) =============
if (existingData) {
  const lastSeen = parseInt(existingData.last_seen || '0');
  const firstSeen = parseInt(existingData.first_seen || now.toString());
  const occurrenceCount = parseInt(existingData.occurrence_count || '0') + 1;
  const callCount = parseInt(existingData.call_count || '0');
  const lastCallTime = parseInt(existingData.last_call_time || '0');
  
  // Calculate metrics
  const timeSinceLastSeen = (now - lastSeen) / 1000; // seconds
  const timeSinceFirstSeen = (now - firstSeen) / 1000; // seconds
  const timeSinceLastCall = lastCallTime > 0 ? (now - lastCallTime) / 1000 : null;
  const averageOccurrenceInterval = occurrenceCount > 1 ? timeSinceFirstSeen / (occurrenceCount - 1) : null;
  
  // ============= DECISION LOGIC =============
  
  // Should we skip full analysis? (if alert was seen recently)
  const shouldSkipAnalysis = timeSinceLastSeen < 600; // 10 minutes
  
  // Should we escalate? (if recurring too frequently)
  const shouldEscalate = (
    occurrenceCount > 5 && 
    existingData.severity !== 'critical' &&
    averageOccurrenceInterval !== null &&
    averageOccurrenceInterval < 1800 // Occurring more frequently than every 30 min
  );
  
  // Should we make a phone call? (for critical alerts)
  const shouldCallAgain = (
    callCount < 3 && 
    processedData.alertSummary?.severity === 'critical' &&
    (timeSinceLastCall === null || timeSinceLastCall > 1800) // Last call was >30 min ago
  );
  
  // Should we update the ticket?
  const shouldUpdateTicket = true; // Always update for existing tickets
  
  // ============= OUTPUT FOR EXISTING ALERT =============
  return {
    json: {
      // Preserve all data from Process Results & Decision
      ...processedData,
      
      // Add deduplication info
      fingerprint: fingerprint,
      dedupStatus: 'existing',
      
      existingTicket: {
        id: existingData.jira_ticket_id || null,
        key: existingData.jira_ticket_key || null,
        occurrences: occurrenceCount,
        firstSeen: firstSeen,
        lastSeen: lastSeen,
        lastCallTime: lastCallTime || null,
        callCount: callCount,
        previousSeverity: existingData.severity
      },
      
      metrics: {
        timeSinceLastSeen: timeSinceLastSeen,
        timeSinceFirstSeen: timeSinceFirstSeen,
        timeSinceLastCall: timeSinceLastCall,
        totalOccurrences: occurrenceCount,
        averageOccurrenceInterval: averageOccurrenceInterval,
        frequencyPerHour: averageOccurrenceInterval ? 3600 / averageOccurrenceInterval : 0
      },
      
      actions: {
        skipAnalysis: shouldSkipAnalysis,
        updateTicket: shouldUpdateTicket,
        escalate: shouldEscalate,
        makeCall: shouldCallAgain,
        createNewTicket: false // Don't create new ticket for existing alerts
      },
      
      alert: {
        ...(processedData.alertSummary || {}),
        dedupStatus: 'existing',
        fingerprint: fingerprint,
        existingTicket: {
          key: existingData.jira_ticket_key,
          occurrences: occurrenceCount
        }
      }
    }
  };
}

// ============= ALERT IS NEW (Not found in Redis) =============
else {
  return {
    json: {
      // Preserve all data from Process Results & Decision
      ...processedData,
      
      // Add deduplication info
      fingerprint: fingerprint,
      dedupStatus: 'new',
      
      existingTicket: null,
      
      metrics: {
        timeSinceLastSeen: 0,
        timeSinceFirstSeen: 0,
        timeSinceLastCall: null,
        totalOccurrences: 1,
        averageOccurrenceInterval: null,
        frequencyPerHour: 0
      },
      
      actions: {
        skipAnalysis: false,
        updateTicket: false,
        escalate: false,
        makeCall: processedData.alertSummary?.severity === 'critical',
        createNewTicket: processedData.needsJiraTicket // Use decision from Process Results
      },
      
      alert: {
        ...(processedData.alertSummary || {}),
        dedupStatus: 'new',
        fingerprint: fingerprint,
        existingTicket: null
      }
    }
  };
}
