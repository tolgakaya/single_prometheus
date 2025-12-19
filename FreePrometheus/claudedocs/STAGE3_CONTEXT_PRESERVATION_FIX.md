# Stage 3 Context Preservation Fix

## Problem

Node 14.5 validation was failing with:
```
CRITICAL: metadata.analysisId lost at final stage
CRITICAL: context.timeRange lost at final stage
CRITICAL: stageResults section lost
```

**Location**: LokiFlow/LokiNodes/15. Combine All Stages.js

---

## Root Cause

Same pattern as Stage 1, Anomaly, and Stage 2:

1. **AI Agent Output Behavior**:
   - Stage 3 Root Cause Analysis AI Agent (Node 14) only returns `output` field
   - Input fields (`metadata`, `context`, `stageResults`) are used by AI but NOT included in output

2. **Node 15 Original Logic** (WRONG):
   ```javascript
   // Look for context data (will have metadata and context sections)
   if (data.metadata || data.context) {
     contextData = data;  // ❌ data = AI Agent output (no metadata/context!)
   }

   // If no context found, try Cascade Failure Detector
   if (!contextData) {
     contextData = $node["Cascade Failure Detector"].json;  // ❌ Also won't have AI output
   }
   ```

3. **Result**: metadata, context, and stageResults (stage1, stage2) were lost

---

## Solution

Apply the same fix pattern used in Node 11 (Stage 2):

**Access Node 13 directly to restore context**:

```javascript
// CRITICAL FIX: AI Agent only returns 'output', but we need metadata/context from Node 13
const contextData = $('Pass Time Context to Stage 3').first().json;

console.log("Context from Node 13:", {
  hasMetadata: !!contextData.metadata,
  hasContext: !!contextData.context,
  hasStageResults: !!contextData.stageResults,
  analysisId: contextData.metadata?.analysisId
});
```

**Restore full structure**:

```javascript
const finalData = {
  // Restore metadata and context from Node 13 (lost in AI Agent output)
  metadata: contextData.metadata,
  context: contextData.context,
  timeRange: contextData.timeRange,

  // Preserve ALL stageResults from Node 13 and add Stage 3
  stageResults: {
    ...contextData.stageResults,  // stage1, stage1_5_anomaly, stage2
    stage3: {
      stage: "root_cause_analysis",
      execution_time: stage3Result.execution_time,
      root_cause: stage3Result.root_cause,
      technical_details: stage3Result.technical_details,
      contributing_factors: stage3Result.contributing_factors,
      business_impact: stage3Result.business_impact,
      recommended_actions: stage3Result.recommended_actions,
      tools_executed: stage3Result.tools_executed,
      confidence_score: stage3Result.confidence_score,
      severity: stage3Result.severity
    }
  },

  // Preserve enrichments if they exist
  enrichments: data.enrichments || contextData.enrichments,

  // Legacy fields for compatibility
  stage1: contextData.stageResults?.stage1 || null,
  stage2: contextData.stageResults?.stage2 || null,
  stage3: stage3Result,
  output: stage3Result
};
```

---

## File Changes

### LokiFlow/LokiNodes/15. Combine All Stages.js

**Complete rewrite** - 111 lines

**Key Changes**:
1. Line 20: `const contextData = $('Pass Time Context to Stage 3').first().json;`
2. Lines 52-54: Restore metadata, context, timeRange from Node 13
3. Lines 57-71: Merge stageResults (stage1, stage1_5_anomaly, stage2) with new stage3
4. Lines 22-27, 92-98: Added debug logging for verification
5. Lines 34-44: Added fallback for missing Stage 3 result

---

## Pattern Summary

This is the **4th node** using this pattern:

| Node | Stage | Fix Pattern |
|------|-------|-------------|
| Node 5.1 | After Stage 1 | Access Node 2 (Time Range Handler) |
| Node 7.1 | After Anomaly | Access Node 6 (Pass Context to Anomaly) |
| Node 11 | After Stage 2 | Access Node 9 (Pass Time Context to Stage 2) |
| Node 15 | After Stage 3 | Access Node 13 (Pass Time Context to Stage 3) |

**Universal Pattern**:
```javascript
// After AI Agent node:
const contextData = $('Previous Context Node').first().json;

return {
  json: {
    metadata: contextData.metadata,
    context: contextData.context,
    stageResults: {
      ...contextData.stageResults,
      [currentStage]: { /* AI output */ }
    }
  }
};
```

---

## Expected Test Results

### Node 15 Console Log (Success)

```
=== COMBINE ALL STAGES (Fixed) ===
Total inputs: 1
Input structure from Stage 3 AI:
  hasMetadata: false
  hasContext: false
  hasStageResults: false
  hasOutput: true
  outputStage: root_cause_analysis
Context from Node 13:
  hasMetadata: true ✅
  hasContext: true ✅
  hasStageResults: true ✅
  analysisId: loki-analysis-1734620283000 ✅
✅ Stage 3 result found, combining with context from Node 13
=== Final data structure ===
  hasMetadata: true ✅
  hasContext: true ✅
  hasStageResults: true ✅
  stageResultsKeys: ["stage1", "stage1_5_anomaly", "stage2", "stage3"] ✅
  analysisId: loki-analysis-1734620283000 ✅
✅ metadata and context restored from Node 13
```

### Node 14.5 Validation (Success)

```
=== VALIDATE AFTER STAGE 3 ===
Validation Results:
- Errors: 0 ✅
- Warnings: 0 ✅
✅ Stage 3 Validation PASSED
```

---

## n8n Deployment

1. **Update Node 15 in n8n**:
   - Open LokiFlow workflow
   - Find "15. Combine All Stages" Code node
   - Replace entire code with content from `LokiFlow/LokiNodes/15. Combine All Stages.js`

2. **Test Workflow**:
   - Run full workflow end-to-end
   - Check Node 15 execution log for debug messages
   - Verify Node 14.5 validation passes

3. **Expected Outcome**:
   - ✅ All validations pass (Stage 1, Anomaly, Stage 2, Stage 3)
   - ✅ Final output has complete stageResults with all 4 stages
   - ✅ metadata and context preserved throughout entire flow

---

## Related Issues

### Previously Fixed (Same Pattern)
- ✅ Stage 1: Node 5.1 Validate After Stage 1
- ✅ Anomaly: Node 7.1 Validate After Anomaly Detection
- ✅ Stage 2: Node 11 Preserve Context After Stage 2

### This Fix
- ✅ Stage 3: Node 15 Combine All Stages

---

**Date**: 2024-12-19
**Commit**: (pending)
**Related Docs**:
- STAGE2_TWO_CRITICAL_FIXES.md (Node 11 fix)
- STANDARDIZED_DATA_STRUCTURE.md (metadata/context/stageResults schema)
- END_TO_END_FLOW_ANALYSIS.md (complete flow documentation)
