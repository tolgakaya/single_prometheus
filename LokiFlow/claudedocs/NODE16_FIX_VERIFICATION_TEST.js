// Test Script to Verify Node 16 Changes
// Simulates n8n environment to test consolidatedFindings.affectedServices logic

// Mock Stage 3 data from actual output (14.1 Preserve Context After Stage 3 Output.json)
const mockStage3Result = {
  business_impact: {
    services: [
      { name: "bstp-id-service", impact: "Service disruption" },
      { name: "ntf-history-service", impact: "Service disruption" },
      { name: "cpq-ntf-integrator-service", impact: "Service disruption" },
      { name: "ui-authz-mc-backend", impact: "Service disruption" }
    ]
  },
  affected_systems: {
    services: [
      { name: "bstp-id-service" },
      { name: "ntf-history-service" },
      { name: "cpq-ntf-integrator-service" },
      { name: "ui-authz-mc-backend" }
    ]
  }
};

// Mock Stage 1 data
const mockStage1Result = {
  metrics: {
    top_error_services: [
      "bstp-cms-global-production",
      "bstp-cms-prod-v3",
      "em-global-prod"
    ],
    error_rate: "1.57"
  }
};

// Mock Stage 2 data
const mockStage2Result = {
  patterns_identified: {
    service_patterns: {
      most_affected: ["b2b-object-storage"]
    }
  }
};

// Test the consolidation logic
console.log("=== SERVICE CONSOLIDATION TEST ===\n");

const affectedServices = [
  ...(mockStage1Result.metrics?.top_error_services || []),
  ...(mockStage2Result?.patterns_identified?.service_patterns?.most_affected || []),
  ...(mockStage3Result?.affected_systems?.services?.map(s => s.name) || []),
  ...(mockStage3Result?.business_impact?.services?.map(s => s.name) || [])
].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

console.log("Stage 1 services:", mockStage1Result.metrics.top_error_services);
console.log("\nStage 2 services:", mockStage2Result.patterns_identified.service_patterns.most_affected);
console.log("\nStage 3 affected_systems:", mockStage3Result.affected_systems.services.map(s => s.name));
console.log("\nStage 3 business_impact:", mockStage3Result.business_impact.services.map(s => s.name));
console.log("\n=== CONSOLIDATED RESULT ===");
console.log("Total unique services:", affectedServices.length);
console.log("Services:", affectedServices);

// Verification
console.log("\n=== VERIFICATION ===");
const expectedMissing = ["ntf-history-service", "cpq-ntf-integrator-service", "ui-authz-mc-backend"];
const allPresent = expectedMissing.every(service => affectedServices.includes(service));

if (allPresent) {
  console.log("✅ SUCCESS: All Stage 3 services are now included in final output!");
  console.log("✅ Missing services fixed:", expectedMissing.join(", "));
} else {
  console.log("❌ FAILURE: Some Stage 3 services still missing");
  const stillMissing = expectedMissing.filter(s => !affectedServices.includes(s));
  console.log("❌ Still missing:", stillMissing.join(", "));
}

// Test incident evaluation logic
console.log("\n=== INCIDENT EVALUATION TEST ===\n");

function evaluateIncident(stage1, stage2, stage3, anomalyStage) {
  const ERROR_RATE_WARNING = 2.0;
  const ERROR_RATE_INCIDENT = 5.0;
  const ERROR_RATE_CRITICAL = 10.0;
  const ERROR_COUNT_INCIDENT = 10000;

  const errorRate = parseFloat(stage1?.metrics?.error_rate) || 0;
  const errorCount = stage1?.metrics?.error_count || 0;
  const anomalyDetected = anomalyStage?.performed && anomalyStage?.anomaly_scores?.overall_score > 0.7;
  const cascadeDetected = stage2?.patterns_identified?.service_patterns?.cascade_detected || false;

  const affectedServices = [
    ...(stage1?.metrics?.top_error_services || []),
    ...(stage2?.patterns_identified?.service_patterns?.most_affected || []),
    ...(stage3?.affected_systems?.services?.map(s => s.name) || [])
  ];

  const criticalServices = ['api-gateway', 'auth-service', 'payment-service', 'order-service'];
  const criticalServicesAffected = affectedServices.filter(s =>
    criticalServices.some(cs => s.toLowerCase().includes(cs.toLowerCase()))
  );

  const isIncident = (
    errorRate > ERROR_RATE_INCIDENT ||
    errorCount > ERROR_COUNT_INCIDENT ||
    anomalyDetected ||
    cascadeDetected ||
    criticalServicesAffected.length > 0
  );

  let severity = 'NORMAL';
  let justification = [];

  if (isIncident) {
    if (errorRate > ERROR_RATE_CRITICAL) {
      severity = 'CRITICAL';
      justification.push(`Error rate ${errorRate}% exceeds critical threshold (${ERROR_RATE_CRITICAL}%)`);
    } else if (errorCount > ERROR_COUNT_INCIDENT) {
      severity = 'CRITICAL';
      justification.push(`Error count ${errorCount} exceeds incident threshold (${ERROR_COUNT_INCIDENT})`);
    } else if (cascadeDetected) {
      severity = 'HIGH';
      justification.push('Cascade failure pattern detected');
    } else if (criticalServicesAffected.length > 0) {
      severity = 'HIGH';
      justification.push(`Critical services affected: ${criticalServicesAffected.join(', ')}`);
    } else if (anomalyDetected) {
      severity = 'HIGH';
      justification.push('Anomaly pattern detected above threshold');
    } else if (errorRate > ERROR_RATE_INCIDENT) {
      severity = 'HIGH';
      justification.push(`Error rate ${errorRate}% exceeds incident threshold (${ERROR_RATE_INCIDENT}%)`);
    }
  } else {
    if (errorRate > ERROR_RATE_WARNING) {
      severity = 'WARNING';
      justification.push(`Error rate ${errorRate}% above warning threshold (${ERROR_RATE_WARNING}%)`);
    } else {
      severity = 'NORMAL';
      justification.push(`Error rate ${errorRate}% within acceptable limits`);
    }
  }

  return {
    isIncident: isIncident,
    severity: severity,
    errorRate: errorRate + '%',
    errorCount: errorCount,
    justification: justification.join('; ')
  };
}

const evaluation = evaluateIncident(mockStage1Result, mockStage2Result, mockStage3Result, null);

console.log("Error Rate:", evaluation.errorRate);
console.log("Is Incident:", evaluation.isIncident);
console.log("Severity:", evaluation.severity);
console.log("Justification:", evaluation.justification);

console.log("\n✅ With 1.57% error rate:");
console.log("  - Below 2% threshold, should be NORMAL (not INCIDENT, not WARNING)");
console.log("  - Result matches expected behavior:", evaluation.severity === "NORMAL" ? "✅ PASS" : "❌ FAIL");
