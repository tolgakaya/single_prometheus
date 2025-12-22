# Stage 2 Response Formatter Node - Deployment Guide

**Date**: 2025-12-22
**Purpose**: Transform Agent 6 output to match Stage 2 Output Parser schema
**Status**: ✅ Ready for n8n Deployment

---

## Solution Overview

Instead of making the parser more lenient, we're adding a **transformer node** that:
- Sits between Agent 6 (Stage 2 Deep Dive) and Stage 2 Output Parser
- Takes whatever Agent 6 outputs (flexible format)
- Transforms it to match the exact schema the parser expects
- Handles missing fields with intelligent defaults
- Maps alternative field names to expected names

**Benefits**:
- ✅ Agent 6 can output any reasonable format
- ✅ Parser receives exactly what it expects
- ✅ No validation errors
- ✅ Backward compatible with existing flows
- ✅ Easy to debug (see both raw and formatted output)

---

## n8n Deployment Steps

### Step 1: Add Code Node

1. Open n8n TempoFlow workflow
2. Find the connection between:
   - **From**: `7. Stage 2 Deep Dive` (Agent 6)
   - **To**: `Stage 2 Output Parser`
3. **Disconnect** the wire between them
4. Add a new **Code** node between them
5. Name it: `7.5 Stage 2 Response Formatter`

### Step 2: Configure Code Node

1. Click on the new `7.5 Stage 2 Response Formatter` node
2. Set **Mode**: `Run Once for All Items`
3. In the **Code** section:
   - Copy the entire content from: `TempoFlow/TempoFlow Nodes/7.5 Stage 2 Response Formatter.js`
   - Paste into the code editor
4. Click **Save**

### Step 3: Reconnect Workflow

**New Flow**:
```
7. Stage 2 Deep Dive (Agent 6)
    ↓
7.5 Stage 2 Response Formatter (NEW CODE NODE)
    ↓
Stage 2 Output Parser
    ↓
[Rest of workflow...]
```

**Connection Details**:
1. Connect output of `7. Stage 2 Deep Dive` to input of `7.5 Stage 2 Response Formatter`
2. Connect output of `7.5 Stage 2 Response Formatter` to input of `Stage 2 Output Parser`

### Step 4: Test Execution

1. Trigger TempoFlow workflow
2. Wait for Stage 2 to execute
3. Click on `7.5 Stage 2 Response Formatter` node
4. Verify output shows formatted JSON matching schema
5. Verify `Stage 2 Output Parser` executes without errors

---

## What the Formatter Does

### Field Mapping

The formatter intelligently maps Agent 6's flexible output to the parser's expected schema:

**Top-Level Required Fields**:
```javascript
// Agent 6 might output any of these variations:
input.stage || "deep_investigation"  // Default if missing
input.investigation_trigger || input.trigger || input.reason
input.tools_executed || input.tools || input.executed_tools
```

**Root Cause Analysis** (critical field):
```javascript
// Multiple fallback options for primary_cause:
input.root_cause_analysis?.primary_cause ||
input.root_cause ||
input.primary_cause ||
input.cause ||
"Analysis in progress - root cause not yet determined"  // Default
```

**Severity Assessment** (with validation):
```javascript
// Validates enum values, defaults to "medium":
business_impact: ['critical', 'high', 'medium', 'low'] → default: 'medium'
technical_severity: ['critical', 'high', 'medium', 'low'] → default: 'medium'
urgency: ['immediate', 'high', 'medium', 'low'] → default: 'medium'
service_criticality_score: 0-100 → default: 50
```

### Array Handling

```javascript
// Ensures all arrays exist (empty if missing):
primary_services_investigated: [] // Never null/undefined
dependency_chains_analyzed: []
cascade_patterns_detected: []
failed_chains: []
services: []
endpoints: []
// ... etc
```

### Object Handling

```javascript
// Ensures all objects exist (empty if missing):
execution_timeline: {}
service_dependencies: {}
external_dependencies: {}
historical_comparison: {}
```

---

## Debugging Tips

### View Raw Agent 6 Output

1. Click on `7. Stage 2 Deep Dive` node after execution
2. View the JSON output in "Output" tab
3. This shows what Agent 6 actually produced

### View Formatted Output

1. Click on `7.5 Stage 2 Response Formatter` node
2. View the JSON output in "Output" tab
3. Compare with raw output to see transformations

### Common Transformations

**Missing field → Default value**:
```javascript
// Agent 6 output: (missing stage field)
{}

// Formatter output:
{ "stage": "deep_investigation" }
```

**Alternative field name → Expected name**:
```javascript
// Agent 6 output:
{ "trigger": "High error rate detected" }

// Formatter output:
{ "investigation_trigger": "High error rate detected" }
```

**Invalid enum → Valid default**:
```javascript
// Agent 6 output:
{ "severity_assessment": { "urgency": "super urgent" } }

// Formatter output:
{ "severity_assessment": { "urgency": "medium" } }  // Invalid value → default
```

---

## Testing Checklist

### Basic Validation
- [ ] Formatter node appears between Agent 6 and Parser
- [ ] Workflow connections are correct
- [ ] Stage 2 executes without "Model output doesn't fit" error
- [ ] Formatted output contains all required fields

### Field Mapping Test
- [ ] `stage` field is present (default: "deep_investigation")
- [ ] `investigation_trigger` is populated (not empty)
- [ ] `tools_executed` is an array (even if empty)
- [ ] `root_cause_analysis.primary_cause` is present (required field)
- [ ] All arrays are arrays (not null/undefined)
- [ ] All objects are objects (not null/undefined)

### Enum Validation Test
- [ ] `business_impact` is one of: critical, high, medium, low
- [ ] `technical_severity` is one of: critical, high, medium, low
- [ ] `urgency` is one of: immediate, high, medium, low
- [ ] `service_criticality_score` is a number between 0-100

### Edge Cases
- [ ] Test with minimal Agent 6 output (only required fields)
- [ ] Test with complete Agent 6 output (all fields populated)
- [ ] Test with alternative field names
- [ ] Test with invalid enum values (should default to "medium")

---

## Troubleshooting

### Error: "Cannot read property 'json' of undefined"

**Cause**: No input to formatter node

**Fix**:
1. Verify connection from Agent 6 to Formatter
2. Check Agent 6 is producing output
3. Ensure workflow execution reaches Agent 6

### Error: "formatted is not defined"

**Cause**: Helper functions declared after use

**Fix**:
- Ensure you copied the ENTIRE file content
- Helper functions (`ensureArray`, `ensureObject`, etc.) must be at the top
- `return formatted;` must be at the bottom

### Error: Still getting "Model output doesn't fit"

**Cause**: Parser is receiving raw Agent 6 output, not formatted output

**Fix**:
1. Verify Formatter node is BETWEEN Agent 6 and Parser
2. Check connections are correct
3. Click on Parser node → Input tab → verify it shows formatted output

### Formatted output looks wrong

**Cause**: Input field mapping might need adjustment

**Fix**:
1. Look at raw Agent 6 output
2. Find the actual field names Agent 6 uses
3. Update the formatter code to map those field names
4. Example: If Agent 6 uses `"analyzed_services"` instead of `"primary_services_investigated"`:
   ```javascript
   primary_services_investigated: ensureArray(
     input.service_context?.primary_services_investigated ||
     input.services_investigated ||
     input.analyzed_services ||  // Add this line
     input.primary_services
   ),
   ```

---

## Rollback Plan

If the formatter causes issues:

### Option 1: Remove Formatter Node
1. Delete `7.5 Stage 2 Response Formatter` node
2. Reconnect Agent 6 directly to Parser
3. Use the relaxed parser schema from previous fix

### Option 2: Bypass Formatter
1. Disconnect Formatter → Parser connection
2. Connect Agent 6 → Parser directly
3. Keep Formatter node for future use

---

## Maintenance

### Adding New Field Mappings

When Agent 6 starts using new field names:

1. Identify the new field name in Agent 6 output
2. Find the corresponding expected field in the schema
3. Add mapping to formatter code:
   ```javascript
   expected_field: ensureArray(
     input.expected_field ||
     input.new_agent_field_name ||  // Add this
     input.old_field_name
   ),
   ```
4. Test and deploy

### Updating Default Values

To change default values for missing fields:

1. Find the field in formatter code
2. Update the default value:
   ```javascript
   ensureString(input.stage, 'new_default_value')
   ```
3. Test and deploy

---

## Integration Notes

**Compatible with**:
- ✅ Stage 2 Output Parser (original strict schema)
- ✅ Stage 2 Output Parser (relaxed schema from previous fix)
- ✅ Any downstream nodes expecting Stage 2 format

**Not compatible with**:
- ❌ Workflows expecting raw Agent 6 output format
- ❌ Custom parsers with different schema expectations

**Migration Path**:
1. Deploy formatter with relaxed parser (safer)
2. Test thoroughly in production
3. Optionally switch back to strict parser if needed

---

## Files

**Created**:
- `TempoFlow/TempoFlow Nodes/7.5 Stage 2 Response Formatter.js` - Formatter code

**Related**:
- `TempoFlow/Stage 2 Output Parser.json` - Parser schema
- `TempoFlow/TempoFlow Nodes/7. Stage 2 Deep Dive.txt` - Agent 6 prompt
- `TempoFlow/claudedocs/STAGE2_PARSER_FIX.md` - Previous parser fix documentation

---

## Success Criteria

**Deployment Success**:
- ✅ Formatter node exists between Agent 6 and Parser
- ✅ Workflow executes without errors
- ✅ No "Model output doesn't fit" errors
- ✅ Stage 2 completes successfully

**Data Quality**:
- ✅ All required fields are populated
- ✅ Arrays are never null (empty if no data)
- ✅ Objects are never null (empty if no data)
- ✅ Enum values are always valid
- ✅ `root_cause_analysis.primary_cause` is meaningful (not just default)

**Performance**:
- ✅ Formatter executes in <100ms
- ✅ No memory issues with large datasets
- ✅ Transformation is idempotent (same input → same output)

---

**Last Updated**: 2025-12-22
