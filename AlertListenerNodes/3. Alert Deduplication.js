// Alert Deduplication & Fingerprinting Node - SIMPLE VERSION
const alert = $input.item.json;

// Alert için unique fingerprint oluştur
function createFingerprint(alert) {
  // Temizlenmiş title
  const cleanTitle = alert.title
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.\d]*Z?/g, 'TIMESTAMP')
    .replace(/\d+\s?(seconds?|minutes?|hours?)\s?ago/gi, 'TIME_AGO')
    .replace(/\d+(\.\d+)?%/g, 'X_PERCENT')
    .replace(/\d+(\.\d+)?(ms|s)/g, 'X_MS')
    .trim();
  
  // Key components for fingerprint
  const components = [
    alert.source,
    cleanTitle,
    alert.priority
  ];
  
  // Extract service names from body
  const serviceMatches = alert.body.match(/([\w-]+)-(api|service|app|server)/gi);
  if (serviceMatches) {
    components.push(serviceMatches.sort().join('-'));
  }
  
  // Extract error types
  const errorTypes = [];
  if (/connection/i.test(alert.body)) errorTypes.push('conn');
  if (/timeout/i.test(alert.body)) errorTypes.push('timeout');
  if (/401|unauthorized/i.test(alert.body)) errorTypes.push('auth');
  if (/500|internal/i.test(alert.body)) errorTypes.push('server');
  
  if (errorTypes.length > 0) {
    components.push(errorTypes.join('-'));
  }
  
  // Create a simple fingerprint
  const fingerprint = components
    .join('|')
    .toLowerCase()
    .replace(/[^a-z0-9|-]/g, '') // Remove special chars
    .substring(0, 64); // Limit length
  
  return fingerprint;
}

// Generate fingerprint
const fingerprint = createFingerprint(alert);
alert.fingerprint = fingerprint;

// Add debug info
alert.debug = {
  originalTitle: alert.title,
  fingerprint: fingerprint,
  timestamp: new Date().toISOString()
};

return { json: alert };