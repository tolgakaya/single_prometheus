// Test Stage 3 Mock Data Validation
// Simulates Node 14.5 validation to ensure forbidden fields are blocked

console.log("=== STAGE 3 MOCK DATA VALIDATION TEST ===\n");

// Mock Stage 3 output WITH forbidden fields (should FAIL)
const mockStage3WithForbidden = {
  stage: "root_cause_analysis",
  root_cause: {
    component: "bstp-id-service",
    issue_type: "DNS resolution failure",
    evidence: ["java.net.UnknownHostException"],
    confidence: 0.9
  },
  affected_systems: {
    services: [
      { name: "bstp-id-service", impact: "Service disruption" }
    ],
    users_affected: 1000,  // ❌ FORBIDDEN
    revenue_impact: "Potential loss...",  // ❌ FORBIDDEN
    sla_breach: true  // ❌ FORBIDDEN
  },
  business_impact: {  // ❌ FORBIDDEN OBJECT
    services: [],
    users_affected: 1000,
    revenue_impact: "high",
    sla_breach: true
  },
  findings: {
    impact_timeline: {
      issue_start: "2025-12-19T14:16:20Z",
      estimated_recovery: "2025-12-19T15:30:00Z"  // ❌ FORBIDDEN
    }
  },
  tools_executed: ["Stack_Trace_Pattern_Analyzer"]
};

// Mock Stage 3 output WITHOUT forbidden fields (should PASS)
const mockStage3Clean = {
  stage: "root_cause_analysis",
  root_cause: {
    component: "bstp-id-service",
    issue_type: "DNS resolution failure",
    evidence: ["java.net.UnknownHostException"],
    confidence: 0.9
  },
  affected_systems: {
    services: [
      { name: "bstp-id-service", impact: "Service disruption from DNS failure" },
      { name: "ntf-history-service", impact: "Cannot connect to message queue" }
    ]
  },
  findings: {
    impact_timeline: {
      issue_start: "2025-12-19T14:16:20Z",
      peak_impact: "2025-12-19T14:20:00Z",
      current_state: "ongoing"
    }
  },
  tools_executed: ["Stack_Trace_Pattern_Analyzer", "Pod_Restart_Logs"]
};

// Validation function (matches Node 14.5)
function validateStage3(stage3) {
  const errors = [];

  const forbiddenFields = [
    'users_affected',
    'revenue_impact',
    'sla_breach',
    'estimated_recovery'
  ];

  // Check in affected_systems
  if (stage3.affected_systems) {
    forbiddenFields.forEach(field => {
      if (stage3.affected_systems[field] !== undefined) {
        errors.push(`FORBIDDEN FIELD: stage3.affected_systems.${field} - Log analysis cannot determine business metrics`);
      }
    });
  }

  // Check in business_impact object (should not exist at all)
  if (stage3.business_impact) {
    errors.push("FORBIDDEN OBJECT: stage3.business_impact - Log analysis cannot determine business metrics");
    forbiddenFields.forEach(field => {
      if (stage3.business_impact[field] !== undefined) {
        errors.push(`FORBIDDEN FIELD: stage3.business_impact.${field}`);
      }
    });
  }

  // Check in impact_timeline (estimated_recovery not allowed)
  if (stage3.findings?.impact_timeline?.estimated_recovery) {
    errors.push("FORBIDDEN FIELD: stage3.findings.impact_timeline.estimated_recovery - Cannot predict recovery from logs");
  }

  return errors;
}

// Test 1: Stage 3 with forbidden fields (should FAIL)
console.log("TEST 1: Stage 3 with forbidden fields");
console.log("========================================");
const errors1 = validateStage3(mockStage3WithForbidden);
if (errors1.length > 0) {
  console.log("❌ VALIDATION FAILED (as expected):");
  errors1.forEach(err => console.log(`  - ${err}`));
  console.log("\n✅ TEST PASSED: Validation correctly rejected forbidden fields\n");
} else {
  console.log("❌ TEST FAILED: Validation should have caught forbidden fields!\n");
}

// Test 2: Stage 3 without forbidden fields (should PASS)
console.log("TEST 2: Stage 3 without forbidden fields");
console.log("========================================");
const errors2 = validateStage3(mockStage3Clean);
if (errors2.length === 0) {
  console.log("✅ VALIDATION PASSED: No forbidden fields detected");
  console.log("✅ TEST PASSED: Clean Stage 3 output accepted\n");
} else {
  console.log("❌ TEST FAILED: Validation rejected valid output:");
  errors2.forEach(err => console.log(`  - ${err}`));
  console.log();
}

// Summary
console.log("=== VALIDATION SUMMARY ===");
console.log("Forbidden Fields Tested:");
console.log("  - users_affected");
console.log("  - revenue_impact");
console.log("  - sla_breach");
console.log("  - estimated_recovery");
console.log("  - business_impact (entire object)");
console.log("\nAllowed Fields:");
console.log("  - affected_systems.services (array of services)");
console.log("  - findings.impact_timeline (without estimated_recovery)");
console.log("  - root_cause with evidence");
console.log("\nResult: " +
  (errors1.length > 0 && errors2.length === 0
    ? "✅ ALL TESTS PASSED"
    : "❌ SOME TESTS FAILED"));
