# NODE 10: Force Deep Analysis Override - COMPLETE ANALYSIS

**Dosya**: PrometheusNodes/10. Force Deep Analysis Override.js (180 lines)
**Fonksiyon**: Priority-based override + context enrichment + Stage 2 parameter preparation

## ÖZET

### Ana Fonksiyon:
1. **Override Logic**: proceed_to_stage2=false durumunda forceDeepAnalysis kontrolü
2. **Context Enrichment**: Unified Entry Point'ten orijinal parametreleri ekle
3. **Stage 2 Preparation**: namespace, service, timeRange parametrelerini hazırla
4. **Critical Detection**: overall_status/urgency='critical' → stageConfig update

### KRİTİK PATTERN'LER

✅ **Multi-Source Priority Check**:
```javascript
const forceDeepAnalysis = 
  unifiedData.forceDeepAnalysis || 
  unifiedData.priority === 'critical' ||
  unifiedData.stageConfig?.forceDeepAnalysis || false;
```

✅ **Conditional Override** (KubeAPIDown'da SKIP edildi):
```javascript
if (forceDeepAnalysis && !stage1Result.proceed_to_stage2) {
  // Override applied (but proceed_to_stage2=true already)
}
// Result: overrideApplied=true (BUT not needed, already true!)
```

✅ **Context Decisions Tracking**:
```javascript
_context.decisions.forceDeepAnalysisOverride = {
  timestamp, originalDecision, forceDeepAnalysis, 
  overrideApplied, reason
};
_context.stageResults.forceDeepAnalysisOverride = {...};
```

✅ **Critical Status Detection → Stage Config Update**:
```javascript
if (overall_status === 'critical' || urgency === 'critical') {
  _context.stageConfig.maxStages = 6;
  _context.stageConfig.enablePatternAnalysis = true;
  _context.priority = 'critical';
  _context.updatedDueToCriticalStatus = true;
}
```

✅ **Stage 2 Input Preparation**:
```javascript
output.stage2Input = {
  proceed: true, priority: 'critical',
  analysisParams, timeRange: {start, end},
  namespaces, focusAreas
};
output.namespace = namespaces[0] || DEFAULT_NAMESPACES[0];
output.service = requestedService;
output.startTime/endTime
```

⚠️ **DEFAULT_NAMESPACES** (10 instead of 12):
```javascript
const DEFAULT_NAMESPACES = [
  'bstp-cms-global-production', 'bstp-cms-prod-v3',
  'em-global-prod-3pp', 'em-global-prod-eom',
  'em-global-prod-flowe', 'em-global-prod',
  'em-prod-3pp', 'em-prod-eom',
  'em-prod-flowe', 'em-prod'
  // MISSING: 'bss-prod-eks-monitoring', 'em-control-plane-prod'
];
```

### VERİ AKIŞI

**INPUT (Node 9)**:
- proceed_to_stage2: true (already!)
- forceDeepAnalysis: true
- priority: "critical"

**CODE**:
- Check forceDeepAnalysis sources
- Override condition: false (already true)
- Add originalContext from Unified Entry Point
- Prepare stage2Input
- Detect critical → update stageConfig
- Track decision in context

**OUTPUT**:
- All input PRESERVED
- overridden: true (flag set, but not needed)
- overrideApplied: true (but skipped override logic)
- originalContext: {source, priority, stageConfig, analysisParams}
- stage2Input: {proceed, priority, analysisParams, timeRange, namespaces, focusAreas}
- namespace: "default"
- service: "default"
- startTime/endTime: added
- stage2Instructions: {service, namespace, message}
- _context.decisions.forceDeepAnalysisOverride: tracked
- _context.stageResults.forceDeepAnalysisOverride: tracked

### 🎯 KRİTİK BULGU

**LOGIC CONFUSION**:
```
if (forceDeepAnalysis && !stage1Result.proceed_to_stage2) {
  // Override applied
  output.proceed_to_stage2 = true;
  output.overridden = true;
}

KubeAPIDown Case:
  stage1Result.proceed_to_stage2 = true (ALREADY TRUE!)
  Condition: false (skip override)
  BUT: overrideDecision.overrideApplied = true (TRACKED AS TRUE!)
  
Result: Decision tracked as "overridden" BUT logic was skipped!
```

### SORUNLAR

1. **DEFAULT_NAMESPACES Incomplete**: 10 namespaces (same as Node 1, 2)
2. **Override Logic Confusion**: Tracks "overrideApplied=true" even when skip
3. **⚠️ HALA BOZUK**: Node 2 query'leri (pod="null") downstream'e geçiyor

### NEXT NODE

All context + Stage 2 params → Category Based Deep Analysis Enhancer (Node 11)

---

**İlerleme**: 10/19 node (%53)
