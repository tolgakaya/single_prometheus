// Prepare Stage 1 Input - Ensure context is properly passed
const unifiedOutput = $input.first().json;

console.log("=== PREPARING STAGE 1 INPUT ===");
console.log("Context ID:", unifiedOutput._context?.contextId);
console.log("Context exists:", !!unifiedOutput._context);
console.log("Full context:", JSON.stringify(unifiedOutput._context, null, 2));

// Namespace ve service filtering için ready-to-use strings hazırla
const namespaces = unifiedOutput._context?.initialParams?.namespaces || [];
const services = unifiedOutput._context?.initialParams?.services || [];

// Prometheus query için regex pattern oluştur
const namespaceRegex = namespaces.join('|');
const serviceRegex = services.length > 0 ? services.join('|') : '.*';

// Ready-to-use query templates
const queryHelpers = {
  namespaceFilter: `namespace=~"${namespaceRegex}"`,
  serviceFilter: services.length > 0 ? `service=~"${serviceRegex}"` : 'service!=""',
  combinedFilter: services.length > 0
    ? `namespace=~"${namespaceRegex}",service=~"${serviceRegex}"`
    : `namespace=~"${namespaceRegex}",service!=""`,

  // Örnek kullanıma hazır sorgular
  exampleQueries: {
    podCount: `count by (namespace, service, pod) (up{namespace=~"${namespaceRegex}", service!="", pod!=""})`,
    serviceList: `group by (namespace, service) (up{namespace=~"${namespaceRegex}", service!=""})`,
    alertCount: `ALERTS{namespace=~"${namespaceRegex}"}`
  }
};

console.log("Generated query helpers:", queryHelpers);

// Stage 1 için input hazırla
const stage1Input = {
  ...unifiedOutput,
  // Context'i root level'a da koy
  contextId: unifiedOutput._context.contextId,
  contextData: unifiedOutput._context,

  // Query helpers - AI agent kullanabilsin
  queryHelpers: queryHelpers,
  namespaceRegex: namespaceRegex,
  serviceRegex: serviceRegex,

  // Debug için
  _inputPrepared: true,
  _preparedAt: new Date().toISOString()
};

console.log("Stage 1 will receive:", JSON.stringify(stage1Input, null, 2).substring(0, 500) + "...");
console.log("==============================");

return [{
  json: stage1Input
}];