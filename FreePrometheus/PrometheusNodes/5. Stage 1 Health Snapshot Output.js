[
  {
    "output": {
      "stage": "health_snapshot",
      "timestamp": "2023-11-15T04:32:07.047Z",
      "overall_status": "unknown",
      "proceed_to_stage2": false,
      "urgency": "low",
      "reason": "Cluster health data is unavailable, but alerts indicate minor issues.",
      "alerts": {
        "total": 6,
        "critical": 0,
        "warning": 2,
        "top_alerts": [
          "KubeHpaMaxedOut",
          "KubeCPUOvercommit"
        ]
      },
      "scores": {
        "cluster_health": 3,
        "node_availability": 3,
        "pod_stability": 3,
        "api_reliability": 3
      },
      "quick_findings": [
        "No critical alerts detected.",
        "Minor warnings related to CPU overcommit and HPA maxed out."
      ],
      "forceDeepAnalysis": false,
      "overridden": false,
      "_context": {},
      "_debug": {
        "nodeType": "Stage 1: Health Snapshot",
        "processedAt": "2023-11-15T04:32:07.047Z",
        "contextId": "ctx-1765910727047-tj2ba2gdv"
      }
    }
  }
]