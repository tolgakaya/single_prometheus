// Process test input - either manual trigger or chat
const input = $input.item.json;
let testAlert = {};

// Check if it's from chat (with text or image)
if (input.chatInput) {
  const message = input.chatInput.toLowerCase();
  
  // Check for predefined test scenarios
  if (message.includes('test critical') || message.includes('critical alert')) {
    testAlert = {
      alertType: 'infrastructure',
      severity: 'critical',
      title: 'CRITICAL: Database Connection Pool Exhausted',
      message: 'MySQL connection pool has been at 100% capacity for the last 15 minutes. Multiple services are experiencing timeouts. Error rate increased from 0.1% to 15%. Response time degraded from 200ms to 5000ms.',
      timestamp: new Date().toISOString(),
      source: 'prometheus',
      metrics: {
        connectionPoolUsage: 100,
        errorRate: 15,
        responseTime: 5000
      },
      affectedServices: ['payment-api', 'user-service', 'order-service'],
      pattern: 'sudden spike at 10:15 AM'
    };
  } else if (message.includes('test high') || message.includes('high priority')) {
    testAlert = {
      alertType: 'performance',
      severity: 'high',
      title: 'HIGH: API Response Time Degradation',
      message: 'API endpoint /api/v1/users showing increased latency. 95th percentile response time increased from 500ms to 2500ms. CPU usage at 85%. Memory usage normal.',
      timestamp: new Date().toISOString(),
      source: 'grafana',
      metrics: {
        p95ResponseTime: 2500,
        cpuUsage: 85,
        memoryUsage: 45
      },
      affectedServices: ['user-service'],
      pattern: 'gradual increase over 30 minutes'
    };
  } else if (message.includes('test medium')) {
    testAlert = {
      alertType: 'warning',
      severity: 'medium',
      title: 'WARNING: Disk Space Running Low',
      message: 'Server prod-web-03 disk usage at 78%. Logs are consuming significant space. Cleanup recommended.',
      timestamp: new Date().toISOString(),
      source: 'nagios',
      metrics: {
        diskUsage: 78,
        freeSpace: '22GB'
      },
      affectedServices: ['logging-service'],
      pattern: 'gradual increase'
    };
  } else {
    // Try to parse custom JSON from chat
    try {
      testAlert = JSON.parse(message);
    } catch (e) {
      // Default test alert
      testAlert = {
        alertType: 'test',
        severity: 'medium',
        title: 'Test Alert: ' + message.substring(0, 50),
        message: message,
        timestamp: new Date().toISOString(),
        source: 'manual-test'
      };
    }
  }
} else if (input.binary?.data) {
  // Image uploaded - simulate OCR or image analysis
  testAlert = {
    alertType: 'screenshot',
    severity: 'high',
    title: 'Alert from Screenshot Analysis',
    message: 'Alert detected from uploaded image. Multiple error indicators found in monitoring dashboard. Red status indicators visible. Error count: 247. Response time graphs showing spikes.',
    timestamp: new Date().toISOString(),
    source: 'image-analysis',
    imageAnalysis: {
      detected: 'monitoring dashboard screenshot',
      errorIndicators: 3,
      statusColor: 'red',
      extractedText: ['Error: 247', 'Response Time: 3.5s', 'CPU: 92%']
    }
  };
} else {
  // Manual trigger - provide sample alerts
  const sampleAlerts = [
    {
      alertType: 'infrastructure',
      severity: 'critical',
      title: 'CRITICAL: Kubernetes Node Down',
      message: 'Node k8s-worker-03 is not responding. 15 pods need to be rescheduled. Services affected: payment-api (3 replicas), user-service (2 replicas).',
      timestamp: new Date().toISOString(),
      source: 'kubernetes',
      metrics: {
        nodesDown: 1,
        podsAffected: 15,
        servicesImpacted: 2
      }
    },
    {
      alertType: 'application',
      severity: 'high',
      title: 'HIGH: Authentication Service Errors',
      message: '401 Unauthorized errors spiked to 1500/min. Normal rate is 10/min. Started at 14:30 UTC. Possible authentication service issue or token validation problem.',
      timestamp: new Date().toISOString(),
      source: 'elasticsearch',
      metrics: {
        errorRate: 1500,
        normalRate: 10,
        httpCode: 401
      }
    },
    {
      alertType: 'database',
      severity: 'critical',
      title: 'CRITICAL: Database Replication Lag',
      message: 'MySQL replication lag increased to 45 seconds. Write operations may be affected. Slave server is struggling with large transaction.',
      timestamp: new Date().toISOString(),
      source: 'mysql-monitor',
      metrics: {
        replicationLag: 45,
        slaveStatus: 'lagging'
      }
    }
  ];
  
  // Pick a random sample alert
  testAlert = sampleAlerts[Math.floor(Math.random() * sampleAlerts.length)];
}

// Add test flag
testAlert.isTest = true;
testAlert.testTimestamp = new Date().toISOString();

return { json: testAlert };