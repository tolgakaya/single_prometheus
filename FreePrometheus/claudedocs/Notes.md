Aşağıdaki referanslar undefined olarka geliyor, snaırım doğru yerden alınmıyor. Benzer değişkenlerden kontrol edilebilir. Ve verilen örnek inputtan doğru yerden alınarak güncellenebilir.

- Priority: {{ $json._context.priority }}
- Workflow Duration: {{ $json._context.createdAt }} to now
- Total Stages Executed: {{ $json._debug.stageSequence ? $json._debug.stageSequence.length : 5 }}

**All Stage Results**: 
- Stage 1: {{ JSON.stringify($json._context.stageResults?.stage1?.output?.overall_status) }}
- Stage 2: {{ JSON.stringify($json._context.stageResults?.stage2?.output?.root_cause?.issue) }}


-----

## 📚 LEARNING CAPTURE:

### What Happened?
- Root cause identification from context
- Impact assessment from all stages
- Timeline reconstruction: {{ $json._context.createdAt }} to now

### What Worked?
- Successful remediation steps from Stage 5
- Effective diagnostics from Stage 4
- Quick wins identified

### What Didn't?
- Failed attempts
- Misleading symptoms
- Time wasters

### What's Next?
- Preventive measures based on priority: {{ $json._context.priority }}
- Monitoring improvements
- Process updates


-----


    "severity": "{{ $json._context.priority }}",

------

      "action": "Add memory leak detection alert for {{ $json._context.initialParams.namespaces[0] }}",

-------
$json._context.stageResults?.stage2?.output?.root_cause?.component }}",
      "implementation": {
        "pr_url": "https://github.com/company/{{ $json._context.stageResults?.stage2?.output?.root_cause?.component }}/pull/auto-{{ $json._context.contextId }}",
        "fix_description": "Address root cause: {{ $json._context.stageResults?.stage2?.output?.root_cause?.issue }}",


-----


      "action": "Implement resource limits in {{ $json._context.initialParams.namespaces[0] }}",
----------

      "pattern": "{{ $json._context.stageResults?.stage2?.output?.root_cause?.issue }}",
-----------

      "runbook": "{{ $json._context.initialParams.namespaces[0] }}-troubleshooting",
      "section": "{{ $json._context.priority }} Priority Issues",
      "addition": "Context {{ $json._context.contextId }}: {{ $json._context.stageResults?.stage2?.output?.root_cause?.issue }}",
---------

      "team": "{{ $json._context.stageResults?.stage2?.output?.correlation_matrix?.affected_services?.[0] }}-team",
      "action": "Review and implement prevention actions for {{ $json._context.priority }} issues",
      "priority": "{{ $json._context.priority }}"
------

      "action": "Verify fix in {{ $json._context.initialParams.namespaces[0] }}",
      "when": "{{ $json._context.priority === 'critical' ? 'After emergency deployment' : 'Next release cycle' }}",
      "owner": "{{ $json._context.stageResults?.stage2?.output?.correlation_matrix?.affected_services?.[0] }}-team"

-----
    "receivedFromStage": "{{ $json._debug.nodeType }}",
    "stageSequence": {{ JSON.stringify($json._debug.stageSequence ? [...$json._debug.stageSequence, 'Stage 6: Prevention & Learning'] : ['Stage 6: Prevention & Learning']) }},

    