// Orchestrator Input Handler - Fixed to preserve all data
const input = $input.first().json;

console.log('=== TEMPO INPUT HANDLER - FIXED ===');
console.log('Input source:', input.source);
console.log('Priority:', input.priority);
console.log('Has searchParams:', !!input.searchParams);
console.log('Force Deep Analysis:', input.analysisConfig?.forceDeepAnalysis);

// Always pass through all data, including orchestrator fields
const output = {
  ...input,  // Preserve ALL input data
  // Ensure critical orchestrator fields are preserved
  source: input.source || 'manual',
  orchestratorId: input.orchestratorId || null,
  requestId: input.requestId || null,
  priority: input.priority || 'normal',
  forceDeepAnalysis: input.forceDeepAnalysis || false
};

// Log what we're passing forward
console.log('=== OUTPUT TO SERVICE-AWARE QUERY BUILDER ===');
console.log('Source:', output.source);
console.log('Priority:', output.priority);
console.log('Force Deep Analysis:', output.forceDeepAnalysis);
console.log('Orchestrator ID:', output.orchestratorId);

return [{ json: output }];