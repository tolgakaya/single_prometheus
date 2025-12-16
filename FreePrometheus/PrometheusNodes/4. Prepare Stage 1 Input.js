// Prepare Stage 1 Input - Ensure context is properly passed
const unifiedOutput = $input.first().json;

console.log("=== PREPARING STAGE 1 INPUT ===");
console.log("Context ID:", unifiedOutput._context?.contextId);
console.log("Context exists:", !!unifiedOutput._context);
console.log("Full context:", JSON.stringify(unifiedOutput._context, null, 2));

// Stage 1 için input hazırla
const stage1Input = {
  ...unifiedOutput,
  // Context'i root level'a da koy
  contextId: unifiedOutput._context.contextId,
  contextData: unifiedOutput._context,
  // Debug için
  _inputPrepared: true,
  _preparedAt: new Date().toISOString()
};

console.log("Stage 1 will receive:", JSON.stringify(stage1Input, null, 2).substring(0, 500) + "...");
console.log("==============================");

return [{
  json: stage1Input
}];