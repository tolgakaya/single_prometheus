// Service Dependency Loader - Enhanced with Graph Analysis
const input = $input.first().json;

// Embedded service dependencies from your file
const serviceDependencies = {
  "cpq-ntf-integrator-service": {
    "dependencies": ["domain-config-service", "ntf-engine-service", "ntf-history-service", "crm-customer-information", "bss-mc-ntf-engine-t4"]
  },
  "ntf-batch-service": {
    "dependencies": ["domain-config-service", "ntf-engine-service"]
  },
  "activity": {
    "dependencies": ["domain-config-service"]
  },
  "ui-authz-mc-backend": {
    "dependencies": ["domain-config-service"]
  },
  "crm-ntf-integrator-service": {
    "dependencies": ["domain-config-service", "ntf-engine-service", "crm-customer-information", "search-integrator-mc-backend"]
  },
  "search-integrator-mc-backend": {
    "dependencies": ["crm-customer-information"]
  },
  "crm-customer-information": {
    "dependencies": ["crm-asset", "domain-config-service", "bstp-pcm-product-catalog", "eca-t4", "bss-services-service.etiyamobile-production-eom", "bss-mc-domain-config-t4", "bss-mc-asset-management-t4", "bss-mc-ntf-engine-t4", "bss-mc-crm-customer-information-t4", "bss-mc-pcm-product-catalog-t4"]
  },
  "crm-mash-up": {
    "dependencies": ["crm-customer-information", "cpq-ordercapture", "bstp-pcm-product-catalog", "bstp-pcm-product-offer-detail", "bss-mc-cpq-t4", "bss-mc-crm-customer-information-t4", "bss-mc-asset-management-t4", "customer-search-mc-backend", "bstp-pcm-product-catalog", "bss-mc-pcm-product-catalog-t4"]
  },
  "bstp-pcm-product-catalog": {
    "dependencies": ["domain-config-service"]
  },
  "cpq-ordercapture": {
    "dependencies": ["bstp-pcm-product-catalog", "bstp-pcm-product-offer-detail", "domain-config-service", "activity"]
  },
  "bstp-pcm-product-offer-detail": {
    "dependencies": ["crm-asset"]
  },
  "ntf-engine-service": {
    "dependencies": ["ntf-history-service", "bss-services-service.etiyamobile-production-eom", "bss-mc-domain-config-t4"]
  },
  "domain-config-service": {
    "dependencies": ["ntf-engine-service", "ntf-history-service", "bss-mc-ntf-engine-t4"]
  },
  "ntf-history-service": {
    "dependencies": []
  },
  "crm-asset": {
    "dependencies": []
  },
  "bstp-cpq-batch": {
    "dependencies": ["bss-mc-domain-config-t4", "eca-t4"]
  },
  "bstp-id-service": {
    "dependencies": []
  },
  "em-b2c-wsc-new-ui": {
    "dependencies": ["eca-t4"]
  },
  "APIGateway": {
    "dependencies": ["crm-mash-up", "crm-customer-information", "cpq-ordercapture"]
  },
  "bss-services-service.etiyamobile-production-eom": {
    "dependencies": []
  },
  "eca-t4": {
    "dependencies": []
  },
  "bss-mc-domain-config-t4": {
    "dependencies": ["eca-t4"]
  },
  "bss-mc-cpq-t4": {
    "dependencies": []
  },
  "bss-mc-crm-customer-information-t4": {
    "dependencies": []
  },
  "bss-mc-ntf-engine-t4": {
    "dependencies": []
  },
  "bss-mc-pcm-product-catalog-t4": {
    "dependencies": []
  },
  "bss-mc-asset-management-t4": {
    "dependencies": []
  },
  "customer-search-mc-backend": {
    "dependencies": []
  }
};

// Build reverse dependencies (which services depend on this service)
const reverseDependencies = {};
Object.keys(serviceDependencies).forEach(service => {
  reverseDependencies[service] = [];
});

Object.entries(serviceDependencies).forEach(([service, data]) => {
  data.dependencies.forEach(dep => {
    if (!reverseDependencies[dep]) {
      reverseDependencies[dep] = [];
    }
    reverseDependencies[dep].push(service);
  });
});

// Calculate service criticality scores
const serviceCriticality = {};

// Helper function to calculate total impact (recursive)
function calculateTotalImpact(service, reverseDeps, visited) {
  if (visited.has(service)) return 0;
  visited.add(service);
  
  let impact = (reverseDeps[service] || []).length;
  (reverseDeps[service] || []).forEach(dependent => {
    impact += calculateTotalImpact(dependent, reverseDeps, visited);
  });
  
  return impact;
}

Object.keys(serviceDependencies).forEach(service => {
  const directDependents = reverseDependencies[service] || [];
  const totalImpact = calculateTotalImpact(service, reverseDependencies, new Set());
  
  serviceCriticality[service] = {
    directDependents: directDependents.length,
    totalImpact: totalImpact,
    criticalityScore: Math.min(100, totalImpact * 10), // Scale to 0-100
    tier: totalImpact >= 10 ? 'critical' : totalImpact >= 5 ? 'high' : totalImpact >= 2 ? 'medium' : 'low'
  };
});

// Identify service groups (clusters of tightly coupled services)
const serviceGroups = {
  "notification": ["ntf-engine-service", "ntf-history-service", "ntf-batch-service", "cpq-ntf-integrator-service", "crm-ntf-integrator-service", "bss-mc-ntf-engine-t4"],
  "customer": ["crm-customer-information", "crm-mash-up", "crm-asset", "customer-search-mc-backend", "bss-mc-crm-customer-information-t4"],
  "product": ["bstp-pcm-product-catalog", "bstp-pcm-product-offer-detail", "bss-mc-pcm-product-catalog-t4"],
  "order": ["cpq-ordercapture", "bss-mc-cpq-t4", "bstp-cpq-batch"],
  "config": ["domain-config-service", "bss-mc-domain-config-t4"],
  "auth": ["eca-t4", "ui-authz-mc-backend"],
  "integration": ["APIGateway", "search-integrator-mc-backend", "bss-services-service.etiyamobile-production-eom"]
};

// Find most critical services
const mostCritical = Object.entries(serviceCriticality)
  .sort((a, b) => b[1].criticalityScore - a[1].criticalityScore)
  .slice(0, 5)
  .map(([s, data]) => ({service: s, score: data.criticalityScore}));

// IMPORTANT: Return as an array with json property
return [{
  json: {
    ...input, // PRESERVE ALL EXISTING DATA
    serviceDependencies: {
      raw: serviceDependencies,
      reverse: reverseDependencies,
      criticality: serviceCriticality,
      serviceGroups: serviceGroups,
      metadata: {
        totalServices: Object.keys(serviceDependencies).length,
        avgDependencies: Object.values(serviceDependencies).reduce((sum, s) => sum + s.dependencies.length, 0) / Object.keys(serviceDependencies).length,
        mostCritical: mostCritical
      }
    }
  }
}];