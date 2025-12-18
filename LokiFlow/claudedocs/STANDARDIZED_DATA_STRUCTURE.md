# LokiFlow Standardized Data Structure

## Problem Statement
Currently, data flows inconsistently between nodes with stage results stored in varying locations:
- Sometimes in `output` object
- Sometimes at root level
- Sometimes in `stage1_result`, `stage2_result`, etc.

This causes multiple nodes to require complex fallback logic with 3+ attempts to find data.

## Solution: Standardized Schema

All nodes will use this consistent structure from Node 2 onwards:

```javascript
{
  // === METADATA (Never changes, always preserved) ===
  metadata: {
    analysisId: string,           // Unique ID, never regenerated
    timestamp: string,            // ISO timestamp of analysis start
    priority: "normal"|"critical", // Request priority
    forceDeepAnalysis: boolean,   // Force all stages
    source: string                // Request source (scheduler/api/manual)
  },

  // === CONTEXT (Preserved throughout pipeline) ===
  context: {
    timeRange: {
      start: number,              // Unix timestamp ms
      end: number,
      startISO: string,
      endISO: string,
      durationHuman: string,
      step: string
    },
    affectedServices: string[],   // Services involved
    serviceDependencies: {        // From Node 4
      raw: {},
      reverse: {},
      criticality: {},
      metadata: {}
    }
  },

  // === STAGE RESULTS (Added as pipeline progresses) ===
  stageResults: {
    stage1: {                     // After Stage 1 execution
      stage: "health_snapshot",
      status: "healthy"|"warning"|"critical",
      execution_time: string,
      metrics: {
        total_logs: number,
        error_count: number,
        error_rate: string,
        top_error_services: string[]
      },
      anomalies: string[],
      quick_summary: string,
      tools_executed: string[],
      proceed_to_anomaly_check: boolean
    },

    stage1_5_anomaly: {           // After Anomaly Detection (if performed)
      performed: boolean,
      execution_time: string,
      anomaly_scores: {
        moving_average: number,
        std_deviation: number,
        rate_change: number,
        spike_ratio: number
      },
      anomaly_findings: {
        moving_average: string,
        std_deviation: string,
        rate_change: string,
        spike_ratio: string
      },
      service_anomalies: object[],
      raw_metrics: object[],
      anomaly_summary: string,
      tools_executed: string[],
      reason_skipped: string        // If not performed
    },

    stage2: {                     // After Pattern Analysis
      stage: "pattern_analysis",
      execution_time: string,
      patterns_identified: {
        dominant_errors: object[],
        cascade_path: string[],
        affected_services: string[],
        time_window: string
      },
      correlations: {
        thread_patterns: object[],
        service_correlations: object[]
      },
      user_impact: string,
      confidence_score: number,
      tools_executed: string[],
      anomaly_context: object,
      proceed_to_stage3: boolean
    },

    stage3: {                     // After Root Cause Analysis (if performed)
      stage: "root_cause_analysis",
      execution_time: string,
      root_cause: {
        component: string,
        issue_type: string,
        evidence: string[],
        confidence: number
      },
      technical_details: {
        stack_traces: string[],
        error_messages: string[],
        affected_endpoints: string[]
      },
      contributing_factors: string[],
      business_impact: string,
      recommended_actions: string[],
      tools_executed: string[]
    }
  },

  // === ENRICHMENTS (Added by analysis nodes) ===
  enrichments: {
    cascadeAnalysis: {            // From Cascade Failure Detector
      totalCascades: number,
      averageDuration: number,
      cascadePatterns: object[],
      criticalCascades: number,
      dependencyBasedCascades: number
    },

    serviceImpact: {              // From Cascade Failure Detector
      [serviceName]: {
        totalErrors: number,
        errorTypes: object,
        downtimeMs: number,
        blastRadius: object
      }
    },

    timeline: object[],           // Top 50 cascade events
    recommendation: string,       // High-level recommendation
    suggestedActions: string[]    // Detailed action items
  }
}
```

## Migration Strategy

### Phase 1: Update Data Producers (Nodes that create stage results)
1. **Node 2 (Time Range Handler)**: Initialize standardized structure
2. **Stage 1 AI Agent**: Return results in `stageResults.stage1` format
3. **Anomaly Detection AI Agent**: Return results in `stageResults.stage1_5_anomaly` format
4. **Stage 2 AI Agent**: Return results in `stageResults.stage2` format
5. **Stage 3 AI Agent**: Return results in `stageResults.stage3` format

### Phase 2: Update Data Transformers (Nodes that pass/merge data)
6. **Node 3 (Set Workflow Variables)**: Extract from `stageResults.stage1`
7. **Node 6 (Pass Context to Anomaly)**: Preserve full structure, add flags
8. **Node 8 (Merge Anomaly Results)**: Merge into `stageResults.stage1_5_anomaly`
9. **Node 11 (Preserve Context After Stage 2)**: Preserve full structure
10. **Node 12 (Cascade Failure Detector)**: Add to `enrichments.cascadeAnalysis`

### Phase 3: Update Data Consumers (Nodes that read/combine data)
11. **Node 15 (Combine All Stages)**: Read from `stageResults.*`
12. **Node 16 (Format Final Output)**: Read from standardized structure

## Benefits

1. **No More Fallback Logic**: Every node knows exactly where to find data
2. **Clear Ownership**: Each section has a clear purpose and owner
3. **Easy Validation**: Can validate structure at each stage
4. **Backward Compatible**: Can be rolled out incrementally
5. **Self-Documenting**: Structure clearly shows what data is available

## Access Patterns

### Reading Stage Results
```javascript
// Old (unreliable)
const stage1 = input.json.stage1_result || input.json.output || input.json;

// New (reliable)
const stage1 = input.json.stageResults.stage1;
```

### Preserving Context
```javascript
// Old (complex)
const originalContext = /* try 3 different sources */;

// New (simple)
const preserved = {
  ...input.json,  // Contains metadata, context, stageResults, enrichments
  stageResults: {
    ...input.json.stageResults,
    stage2: newStage2Result  // Add new stage
  }
};
```

### Adding Enrichments
```javascript
// New pattern
const enriched = {
  ...input.json,
  enrichments: {
    ...input.json.enrichments,
    cascadeAnalysis: cascadeData  // Add enrichment
  }
};
```

## Validation Schema

Each node can validate incoming data:
```javascript
function validateStructure(data) {
  if (!data.metadata?.analysisId) throw new Error("Missing analysisId");
  if (!data.context?.timeRange) throw new Error("Missing timeRange");
  if (!data.stageResults) throw new Error("Missing stageResults");
  return true;
}
```

## Rollout Plan

1. **Week 1**: Implement in Node 2, test Stage 1 flow
2. **Week 2**: Update Nodes 3, 6, 8 for anomaly flow
3. **Week 3**: Update Nodes 11, 12 for cascade flow
4. **Week 4**: Update Nodes 15, 16 for final output
5. **Week 5**: Remove all fallback logic, add validation nodes

## Example Data Flow

**After Node 2:**
```javascript
{
  metadata: { analysisId: "analysis-123", ... },
  context: { timeRange: {...}, affectedServices: [] },
  stageResults: {}  // Empty, stages not run yet
}
```

**After Stage 1:**
```javascript
{
  metadata: { ... },
  context: { ... },
  stageResults: {
    stage1: { status: "warning", metrics: {...}, ... }
  }
}
```

**After Anomaly Detection:**
```javascript
{
  metadata: { ... },
  context: { ... },
  stageResults: {
    stage1: { ... },
    stage1_5_anomaly: { performed: true, anomaly_scores: {...}, ... }
  }
}
```

**After Cascade Detector:**
```javascript
{
  metadata: { ... },
  context: { ... },
  stageResults: {
    stage1: { ... },
    stage1_5_anomaly: { ... },
    stage2: { ... }
  },
  enrichments: {
    cascadeAnalysis: { totalCascades: 3, ... },
    serviceImpact: { ... }
  }
}
```

## Testing Strategy

1. **Unit Tests**: Each node validates input/output structure
2. **Integration Tests**: End-to-end flow with structure validation
3. **Regression Tests**: Ensure all existing features still work
4. **Monitoring**: Log structure violations in production
