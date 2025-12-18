# LokiFlow Multi-Namespace Migration Plan

## Overview

Converting LokiFlow from single namespace (`etiyamobile-production`) to multi-namespace support across 12 production namespaces.

---

## Target Namespaces (12 Total)

```
bstp-cms-global-production
bstp-cms-prod-v3
em-global-prod-3pp
em-global-prod-eom
em-global-prod-flowe
em-global-prod
em-prod-3pp
em-prod-eom
em-prod-flowe
em-prod
etiyamobile-production
etiyamobile-prod
```

---

## Namespace Regex Pattern

### LogQL Format (for Loki queries)
```logql
{namespace=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod"}
```

### Breakdown by Group
**BSTP CMS** (2 namespaces):
- `bstp-cms-global-production`
- `bstp-cms-prod-v3`

**EM Global** (4 namespaces):
- `em-global-prod-3pp`
- `em-global-prod-eom`
- `em-global-prod-flowe`
- `em-global-prod`

**EM Prod** (4 namespaces):
- `em-prod-3pp`
- `em-prod-eom`
- `em-prod-flowe`
- `em-prod`

**Etiya Mobile** (2 namespaces):
- `etiyamobile-production`
- `etiyamobile-prod`

---

## Production Services (138 total)

Full list extracted to: `LokiFlow/production_services.txt`

**Key Service Categories**:
- BSS Microservices: `bss-mc-*` (30+ services)
- EOM Services: `eom-*` (10+ services)
- FSTP Services: `fstp-*` (10+ services)
- Infrastructure: `kafka`, `redis`, `elasticsearch`, `active-mq`
- WSO2 Services: `wso2am-*`

---

## Current Issues

### 1. Hardcoded Single Namespace

**Location**: All prompts and AgentTools.txt
**Current**: `namespace="etiyamobile-production"`
**Problem**: Only analyzes 1 out of 12 production namespaces

**Evidence**:
- `AgentTools.txt` line 6: `{namespace="etiyamobile-production"}`
- `AgentTools.txt` line 9: `{namespace="etiyamobile-production"}`
- Stage 1 prompt (line 5. Stage 1 Quick Health Check.txt)
- Stage 2 prompt (10. Stage 2 Pattern Analysis.txt)
- Stage 3 prompt (14. Stage 3 Root Cause Analysis.txt)

### 2. No Service Filtering

**Problem**: Queries don't filter by actual production services
**Impact**: May get results from monitoring/system pods

### 3. Potential Mock Data in Prompts

**Location**: Stage 3 Root Cause Analysis
**Similar Issue**: Like FreePrometheus Stage 3, may have hardcoded examples

---

## Migration Strategy

### Phase 1: Namespace Infrastructure (JS Files)

**Files to Update**:
1. `1. Orchestrator Input Handler.js`
   - Line 43: `namespaces: ['etiyamobile-production']` → `namespaces: [ALL 12]`

2. `3. Set Workflow Variables.js`
   - Add namespace regex builder function
   - Create LogQL-compatible regex pattern

3. `4. Service Dependency Loader.js`
   - Load production_services.txt
   - Filter by actual service names

### Phase 2: Agent Prompts

**Stage 1: Quick Health Check** (`5. Stage 1 Quick Health Check.txt`)
- Add namespace context display
- Update decision logic for multi-namespace

**Anomaly Detection** (`7. Anomaly Detection.txt`)
- Update context display
- Handle multi-namespace anomalies

**Stage 2: Pattern Analysis** (`10. Stage 2 Pattern Analysis.txt`)
- Add namespace correlation analysis
- Detect cross-namespace cascades

**Stage 3: Root Cause Analysis** (`14. Stage 3 Root Cause Analysis.txt`)
- Remove hardcoded namespace reference (line 22)
- Add multi-namespace analysis instructions
- Check for mock data (similar to FreePrometheus Stage 3 issue)

### Phase 3: Tool Definitions

**File**: `AgentTools.txt`

**Current Queries** (all use single namespace):
```logql
{namespace="etiyamobile-production"} |~ "ERROR|WARN|FATAL"
```

**New Pattern**:
```logql
{namespace=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod"} |~ "ERROR|WARN|FATAL"
```

**Queries to Update** (all 71 lines):
- Lines 6, 9, 12: Stage 1 tools (3 queries)
- Lines 20, 23, 26, 29: Anomaly tools (4 queries)
- Lines 37, 40, 43, 46, 49: Stage 2 tools (5 queries)
- Lines 55, 58, 61, 64, 67, 70: Stage 3 tools (6 queries)

**Total**: 18 query updates

### Phase 4: Context Passing

**Files**:
- `6. Pass Context to Anomaly Stage.js`
- `9. Pass Time Context to Stage 2.js`
- `11. Preserve Context After Stage 2.js`
- `13. Pass Time Context to Stage 3.js`

**Add**:
- `namespaceRegex`: LogQL regex pattern
- `namespaces`: Array of 12 namespaces
- `totalNamespaces`: 12

---

## Implementation Order

### Step 1: Create Helper Function (New File)
**File**: `LokiFlow/LokiNodes/0. Namespace Helper.js`

```javascript
function buildNamespaceRegex(namespaces) {
  // For LogQL: namespace=~"ns1|ns2|ns3"
  return namespaces.join('|');
}

function buildLogQLFilter(namespaces) {
  const regex = buildNamespaceRegex(namespaces);
  return `namespace=~"${regex}"`;
}

const PRODUCTION_NAMESPACES = [
  "bstp-cms-global-production",
  "bstp-cms-prod-v3",
  "em-global-prod-3pp",
  "em-global-prod-eom",
  "em-global-prod-flowe",
  "em-global-prod",
  "em-prod-3pp",
  "em-prod-eom",
  "em-prod-flowe",
  "em-prod",
  "etiyamobile-production",
  "etiyamobile-prod"
];

module.exports = {
  buildNamespaceRegex,
  buildLogQLFilter,
  PRODUCTION_NAMESPACES
};
```

### Step 2: Update Orchestrator (FIRST)
**File**: `1. Orchestrator Input Handler.js`
**Line 43**: Change to:
```javascript
namespaces: [
  "bstp-cms-global-production", "bstp-cms-prod-v3",
  "em-global-prod-3pp", "em-global-prod-eom", "em-global-prod-flowe", "em-global-prod",
  "em-prod-3pp", "em-prod-eom", "em-prod-flowe", "em-prod",
  "etiyamobile-production", "etiyamobile-prod"
]
```

### Step 3: Update Set Workflow Variables
**File**: `3. Set Workflow Variables.js`
Add:
```javascript
const namespaceRegex = namespaces.join('|');
const logQLFilter = `namespace=~"${namespaceRegex}"`;
```

### Step 4: Update AgentTools.txt (18 queries)
Replace ALL occurrences of:
```logql
{namespace="etiyamobile-production"}
```

With:
```logql
{namespace=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod"}
```

### Step 5: Update Stage Prompts (4 files)
Remove hardcoded namespace references, add multi-namespace instructions

### Step 6: Test & Validate

---

## Testing Checklist

- [ ] Stage 1 queries all 12 namespaces
- [ ] Anomaly detection works across namespaces
- [ ] Stage 2 detects cross-namespace cascades
- [ ] Stage 3 analyzes correct namespace-specific issues
- [ ] No hardcoded namespace="etiyamobile-production" remains
- [ ] Context preservation includes namespace data
- [ ] Service filtering uses production_services.txt

---

## Mock Data Review (Like FreePrometheus)

**Check Stage 3 Prompt** for:
- Hardcoded example service names
- Generic error messages
- Template responses AI might copy
- Placeholder values in output format

**Validation Rules** (add if needed):
- Use ACTUAL service names from logs
- Use ACTUAL error messages from Loki
- Use ACTUAL timestamps from data
- NO "example-service" or "sample-error"

---

**Status**: Ready to implement
**Estimated Changes**: 25 files (4 prompts, 18 query lines, 10 JS files, 1 helper, 2 docs)
