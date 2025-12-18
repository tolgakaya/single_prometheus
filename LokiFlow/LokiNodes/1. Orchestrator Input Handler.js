// Loki Orchestrator Input Handler - COMPLETE FIXED VERSION
const input = $input.first().json;

// Check if this is simple format from manual trigger
if (input.requestId && input.userMessage && !input.orchestratorId) {
  console.log('=== SIMPLE ORCHESTRATOR FORMAT DETECTED ===');
  
  const now = Math.floor(Date.now() / 1000);
  const isCritical = input.priority === 'critical';
  
  // IMPORTANT: Generate actual time values
  const endTime = now;
  const startTime = now - 3600; // Default 1 hour
  
  console.log('Input:', JSON.stringify(input, null, 2));
  console.log('Priority:', input.priority);
  console.log('Is Critical:', isCritical);
  console.log('Start Time:', startTime, new Date(startTime * 1000).toISOString());
  console.log('End Time:', endTime, new Date(endTime * 1000).toISOString());
  
  // Convert to full orchestrator format
  const processedInput = {
    // IMPORTANT: Add these fields at root level for Time Range Handler
    orchestratorId: 'manual-test',
    requestId: input.requestId,
    priority: input.priority,
    userMessage: input.userMessage,
    
    // Time values - ENSURE THEY ARE NOT NULL
    startTime: startTime,
    endTime: endTime,
    
    // Analysis config with forceDeepAnalysis
    analysisConfig: {
      priority: input.priority,
      forceDeepAnalysis: isCritical,
      skipInitialCheck: isCritical,
      depth: isCritical ? 'deep' : 'standard'
    },
    
    // Search parameters - MULTI-NAMESPACE SUPPORT (12 production namespaces)
    searchParams: {
      namespaces: [
        'bstp-cms-global-production', 'bstp-cms-prod-v3',
        'em-global-prod-3pp', 'em-global-prod-eom', 'em-global-prod-flowe', 'em-global-prod',
        'em-prod-3pp', 'em-prod-eom', 'em-prod-flowe', 'em-prod',
        'etiyamobile-production', 'etiyamobile-prod'
      ],
      services: (input.userMessage.match(/(payment|order|user|notification|cpq|batch|rim|pcm|ntf|crm|eom|fstp)/gi) || []).map(s => s.toLowerCase())
    },
    
    // Context - IMPORTANT: Add forceDeepAnalysis here too
    context: {
      source: 'orchestrator',
      priority: input.priority,
      forceDeepAnalysis: isCritical
    },
    
    // Add at root level as well
    forceDeepAnalysis: isCritical
  };
  
  console.log('Force Deep Analysis:', processedInput.analysisConfig.forceDeepAnalysis);
  console.log('Root Level Force Deep Analysis:', processedInput.forceDeepAnalysis);
  console.log('Processed Input:', JSON.stringify(processedInput, null, 2));
  
  return [{ json: processedInput }];
}

// If already in full orchestrator format
if (input.orchestratorId && input.analysisConfig) {
  // Ensure forceDeepAnalysis is set based on priority
  const isCritical = input.priority === 'critical' || input.analysisConfig?.priority === 'critical';
  
  // Ensure time values exist
  const now = Math.floor(Date.now() / 1000);
  
  const processedInput = {
    ...input,
    // Ensure time values are not null
    startTime: input.startTime || (now - 3600),
    endTime: input.endTime || now,
    // Ensure forceDeepAnalysis is set at multiple levels
    forceDeepAnalysis: input.forceDeepAnalysis || input.analysisConfig?.forceDeepAnalysis || isCritical,
    analysisConfig: {
      ...input.analysisConfig,
      forceDeepAnalysis: input.analysisConfig?.forceDeepAnalysis || isCritical
    },
    context: {
      ...input.context,
      forceDeepAnalysis: input.context?.forceDeepAnalysis || isCritical
    }
  };
  
  console.log('=== FULL ORCHESTRATOR FORMAT ===');
  console.log('Priority:', input.priority);
  console.log('Force Deep Analysis:', processedInput.forceDeepAnalysis);
  console.log('Time values:', processedInput.startTime, processedInput.endTime);
  
  return [{ json: processedInput }];
}

// If neither format matches, pass through unchanged
return [{ json: input }];