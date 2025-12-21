[
  {
    "timestamp": "2025-12-21T14:00:49.438Z",
    "executionId": "8376",
    "source": "manual",
    "mode": "standard",
    "priority": "normal",
    "context": {},
    "forceDeepAnalysis": false,
    "timeRange": {
      "start": 1766322049,
      "end": 1766325649
    },
    "serviceDependencies": {
      "APIGateway": {
        "dependencies": [
          "crm-mash-up",
          "crm-customer-information",
          "cpq-ordercapture"
        ],
        "criticality": "critical",
        "slaThresholds": {
          "errorRate": 0.005,
          "latencyP95": 500,
          "latencyP99": 1000
        },
        "category": "gateway"
      },
      "cpq-ordercapture": {
        "dependencies": [
          "bstp-pcm-product-catalog",
          "bstp-pcm-product-offer-detail",
          "domain-config-service",
          "activity"
        ],
        "criticality": "critical",
        "slaThresholds": {
          "errorRate": 0.01,
          "latencyP95": 1000,
          "latencyP99": 2000
        },
        "category": "cpq"
      },
      "crm-customer-information": {
        "dependencies": [
          "crm-asset",
          "domain-config-service",
          "bstp-pcm-product-catalog",
          "eca-t4",
          "bss-services-service.etiyamobile-production-eom",
          "bss-mc-domain-config-t4",
          "bss-mc-asset-management-t4",
          "bss-mc-ntf-engine-t4",
          "bss-mc-crm-customer-information-t4",
          "bss-mc-pcm-product-catalog-t4"
        ],
        "criticality": "critical",
        "slaThresholds": {
          "errorRate": 0.01,
          "latencyP95": 300,
          "latencyP99": 800
        },
        "category": "crm"
      },
      "crm-mash-up": {
        "dependencies": [
          "crm-customer-information",
          "cpq-ordercapture",
          "bstp-pcm-product-catalog",
          "bstp-pcm-product-offer-detail",
          "bss-mc-cpq-t4",
          "bss-mc-crm-customer-information-t4",
          "bss-mc-asset-management-t4",
          "customer-search-mc-backend",
          "bss-mc-pcm-product-catalog-t4"
        ],
        "criticality": "high",
        "slaThresholds": {
          "errorRate": 0.02,
          "latencyP95": 500,
          "latencyP99": 1200
        },
        "category": "crm"
      },
      "crm-asset": {
        "dependencies": [],
        "criticality": "high",
        "slaThresholds": {
          "errorRate": 0.02,
          "latencyP95": 400,
          "latencyP99": 1000
        },
        "category": "crm"
      },
      "bstp-pcm-product-catalog": {
        "dependencies": [
          "domain-config-service"
        ],
        "criticality": "high",
        "slaThresholds": {
          "errorRate": 0.02,
          "latencyP95": 300,
          "latencyP99": 800
        },
        "category": "catalog"
      },
      "bstp-pcm-product-offer-detail": {
        "dependencies": [
          "crm-asset"
        ],
        "criticality": "high",
        "slaThresholds": {
          "errorRate": 0.02,
          "latencyP95": 400,
          "latencyP99": 1000
        },
        "category": "catalog"
      },
      "ntf-engine-service": {
        "dependencies": [
          "ntf-history-service",
          "bss-services-service.etiyamobile-production-eom",
          "bss-mc-domain-config-t4"
        ],
        "criticality": "medium",
        "slaThresholds": {
          "errorRate": 0.05,
          "latencyP95": 2000,
          "latencyP99": 5000
        },
        "category": "notification"
      },
      "ntf-history-service": {
        "dependencies": [],
        "criticality": "low",
        "slaThresholds": {
          "errorRate": 0.05,
          "latencyP95": 1000,
          "latencyP99": 3000
        },
        "category": "notification"
      },
      "ntf-batch-service": {
        "dependencies": [
          "domain-config-service",
          "ntf-engine-service"
        ],
        "criticality": "low",
        "slaThresholds": {
          "errorRate": 0.05,
          "latencyP95": 5000,
          "latencyP99": 10000
        },
        "category": "notification"
      },
      "cpq-ntf-integrator-service": {
        "dependencies": [
          "domain-config-service",
          "ntf-engine-service",
          "ntf-history-service",
          "crm-customer-information",
          "bss-mc-ntf-engine-t4"
        ],
        "criticality": "medium",
        "slaThresholds": {
          "errorRate": 0.05,
          "latencyP95": 1500,
          "latencyP99": 3000
        },
        "category": "notification"
      },
      "crm-ntf-integrator-service": {
        "dependencies": [
          "domain-config-service",
          "ntf-engine-service",
          "crm-customer-information",
          "search-integrator-mc-backend"
        ],
        "criticality": "medium",
        "slaThresholds": {
          "errorRate": 0.05,
          "latencyP95": 1500,
          "latencyP99": 3000
        },
        "category": "notification"
      },
      "customer-search-mc-backend": {
        "dependencies": [],
        "criticality": "high",
        "slaThresholds": {
          "errorRate": 0.02,
          "latencyP95": 400,
          "latencyP99": 1000
        },
        "category": "search"
      },
      "search-integrator-mc-backend": {
        "dependencies": [
          "crm-customer-information"
        ],
        "criticality": "medium",
        "slaThresholds": {
          "errorRate": 0.03,
          "latencyP95": 500,
          "latencyP99": 1200
        },
        "category": "search"
      },
      "domain-config-service": {
        "dependencies": [
          "ntf-engine-service",
          "ntf-history-service",
          "bss-mc-ntf-engine-t4"
        ],
        "criticality": "critical",
        "slaThresholds": {
          "errorRate": 0.001,
          "latencyP95": 100,
          "latencyP99": 300
        },
        "category": "config"
      },
      "activity": {
        "dependencies": [
          "domain-config-service"
        ],
        "criticality": "low",
        "slaThresholds": {
          "errorRate": 0.05,
          "latencyP95": 1000,
          "latencyP99": 2000
        },
        "category": "support"
      },
      "ui-authz-mc-backend": {
        "dependencies": [
          "domain-config-service"
        ],
        "criticality": "critical",
        "slaThresholds": {
          "errorRate": 0.005,
          "latencyP95": 200,
          "latencyP99": 500
        },
        "category": "auth"
      },
      "bstp-cpq-batch": {
        "dependencies": [
          "bss-mc-domain-config-t4"
        ],
        "criticality": "medium",
        "slaThresholds": {
          "errorRate": 0.03,
          "latencyP95": 5000,
          "latencyP99": 10000
        },
        "category": "cpq"
      },
      "bstp-id-service": {
        "dependencies": [],
        "criticality": "high",
        "slaThresholds": {
          "errorRate": 0.01,
          "latencyP95": 200,
          "latencyP99": 500
        },
        "category": "auth"
      },
      "em-b2c-wsc-new-ui": {
        "dependencies": [
          "eca-t4"
        ],
        "criticality": "medium",
        "slaThresholds": {
          "errorRate": 0.02,
          "latencyP95": 500,
          "latencyP99": 1000
        },
        "category": "ui"
      },
      "bss-services-service.etiyamobile-production-eom": {
        "dependencies": [],
        "criticality": "critical",
        "slaThresholds": {
          "errorRate": 0.01,
          "latencyP95": 500,
          "latencyP99": 1000
        },
        "category": "backend"
      },
      "eca-t4": {
        "dependencies": [],
        "criticality": "high",
        "slaThresholds": {
          "errorRate": 0.02,
          "latencyP95": 300,
          "latencyP99": 800
        },
        "category": "t4-layer"
      },
      "bss-mc-domain-config-t4": {
        "dependencies": [],
        "criticality": "high",
        "slaThresholds": {
          "errorRate": 0.01,
          "latencyP95": 200,
          "latencyP99": 500
        },
        "category": "t4-layer"
      },
      "bss-mc-cpq-t4": {
        "dependencies": [],
        "criticality": "high",
        "slaThresholds": {
          "errorRate": 0.02,
          "latencyP95": 400,
          "latencyP99": 1000
        },
        "category": "t4-layer"
      },
      "bss-mc-crm-customer-information-t4": {
        "dependencies": [],
        "criticality": "high",
        "slaThresholds": {
          "errorRate": 0.02,
          "latencyP95": 300,
          "latencyP99": 800
        },
        "category": "t4-layer"
      },
      "bss-mc-ntf-engine-t4": {
        "dependencies": [],
        "criticality": "medium",
        "slaThresholds": {
          "errorRate": 0.03,
          "latencyP95": 1000,
          "latencyP99": 2000
        },
        "category": "t4-layer"
      },
      "bss-mc-pcm-product-catalog-t4": {
        "dependencies": [],
        "criticality": "high",
        "slaThresholds": {
          "errorRate": 0.02,
          "latencyP95": 300,
          "latencyP99": 800
        },
        "category": "t4-layer"
      },
      "bss-mc-asset-management-t4": {
        "dependencies": [],
        "criticality": "high",
        "slaThresholds": {
          "errorRate": 0.02,
          "latencyP95": 400,
          "latencyP99": 1000
        },
        "category": "t4-layer"
      }
    },
    "serviceCategories": {
      "backend": [
        "bss-services-service.etiyamobile-production-eom"
      ],
      "auth": [
        "ui-authz-mc-backend",
        "bstp-id-service"
      ],
      "crm": [
        "crm-customer-information",
        "crm-mash-up",
        "crm-asset"
      ],
      "catalog": [
        "bstp-pcm-product-catalog",
        "bstp-pcm-product-offer-detail"
      ],
      "cpq": [
        "cpq-ordercapture",
        "bstp-cpq-batch"
      ],
      "notification": [
        "ntf-engine-service",
        "ntf-history-service",
        "ntf-batch-service",
        "cpq-ntf-integrator-service",
        "crm-ntf-integrator-service"
      ],
      "search": [
        "customer-search-mc-backend",
        "search-integrator-mc-backend"
      ],
      "config": [
        "domain-config-service"
      ],
      "support": [
        "activity"
      ],
      "gateway": [
        "APIGateway"
      ],
      "ui": [
        "em-b2c-wsc-new-ui"
      ],
      "t4-layer": [
        "eca-t4",
        "bss-mc-domain-config-t4",
        "bss-mc-cpq-t4",
        "bss-mc-crm-customer-information-t4",
        "bss-mc-ntf-engine-t4",
        "bss-mc-pcm-product-catalog-t4",
        "bss-mc-asset-management-t4"
      ]
    },
    "criticalPaths": {
      "login": [
        "ui-authz-mc-backend",
        "crm-customer-information",
        "domain-config-service"
      ],
      "order": [
        "APIGateway",
        "cpq-ordercapture",
        "crm-customer-information",
        "bstp-pcm-product-catalog"
      ],
      "search": [
        "customer-search-mc-backend",
        "search-integrator-mc-backend",
        "crm-customer-information"
      ],
      "payment": [
        "APIGateway",
        "cpq-ordercapture",
        "bss-services-service.etiyamobile-production-eom"
      ]
    },
    "orchestratorId": null,
    "requestId": null,
    "serviceAnalysis": {
      "detectedServices": [
        "APIGateway",
        "crm-mash-up",
        "crm-customer-information",
        "crm-asset",
        "domain-config-service",
        "ntf-engine-service",
        "ntf-history-service",
        "bss-services-service.etiyamobile-production-eom",
        "bss-mc-domain-config-t4",
        "bss-mc-ntf-engine-t4",
        "bstp-pcm-product-catalog",
        "eca-t4",
        "bss-mc-asset-management-t4",
        "bss-mc-crm-customer-information-t4",
        "bss-mc-pcm-product-catalog-t4",
        "cpq-ordercapture",
        "bstp-pcm-product-offer-detail",
        "activity",
        "bss-mc-cpq-t4",
        "customer-search-mc-backend",
        "ui-authz-mc-backend"
      ],
      "dependencyChains": {
        "APIGateway": [
          "APIGateway",
          "crm-mash-up",
          "crm-customer-information",
          "crm-asset",
          "domain-config-service",
          "ntf-engine-service",
          "ntf-history-service",
          "bss-services-service.etiyamobile-production-eom",
          "bss-mc-domain-config-t4",
          "bss-mc-ntf-engine-t4",
          "bstp-pcm-product-catalog",
          "eca-t4",
          "bss-mc-asset-management-t4",
          "bss-mc-crm-customer-information-t4",
          "bss-mc-pcm-product-catalog-t4",
          "cpq-ordercapture",
          "bstp-pcm-product-offer-detail",
          "activity",
          "bss-mc-cpq-t4",
          "customer-search-mc-backend"
        ],
        "cpq-ordercapture": [
          "cpq-ordercapture",
          "bstp-pcm-product-catalog",
          "domain-config-service",
          "ntf-engine-service",
          "ntf-history-service",
          "bss-services-service.etiyamobile-production-eom",
          "bss-mc-domain-config-t4",
          "bss-mc-ntf-engine-t4",
          "bstp-pcm-product-offer-detail",
          "crm-asset",
          "activity"
        ],
        "crm-customer-information": [
          "crm-customer-information",
          "crm-asset",
          "domain-config-service",
          "ntf-engine-service",
          "ntf-history-service",
          "bss-services-service.etiyamobile-production-eom",
          "bss-mc-domain-config-t4",
          "bss-mc-ntf-engine-t4",
          "bstp-pcm-product-catalog",
          "eca-t4",
          "bss-mc-asset-management-t4",
          "bss-mc-crm-customer-information-t4",
          "bss-mc-pcm-product-catalog-t4"
        ],
        "domain-config-service": [
          "domain-config-service",
          "ntf-engine-service",
          "ntf-history-service",
          "bss-services-service.etiyamobile-production-eom",
          "bss-mc-domain-config-t4",
          "bss-mc-ntf-engine-t4"
        ],
        "ui-authz-mc-backend": [
          "ui-authz-mc-backend",
          "domain-config-service",
          "ntf-engine-service",
          "ntf-history-service",
          "bss-services-service.etiyamobile-production-eom",
          "bss-mc-domain-config-t4",
          "bss-mc-ntf-engine-t4"
        ],
        "bss-services-service.etiyamobile-production-eom": [
          "bss-services-service.etiyamobile-production-eom"
        ]
      },
      "criticalPathAffected": true,
      "enhancedQueries": {
        "serviceErrors": "{ resource.deployment.environment=~\"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod\" && (resource.service.name=\"APIGateway\" || resource.service.name=\"crm-mash-up\" || resource.service.name=\"crm-customer-information\" || resource.service.name=\"crm-asset\" || resource.service.name=\"domain-config-service\" || resource.service.name=\"ntf-engine-service\" || resource.service.name=\"ntf-history-service\" || resource.service.name=\"bss-services-service.etiyamobile-production-eom\" || resource.service.name=\"bss-mc-domain-config-t4\" || resource.service.name=\"bss-mc-ntf-engine-t4\" || resource.service.name=\"bstp-pcm-product-catalog\" || resource.service.name=\"eca-t4\" || resource.service.name=\"bss-mc-asset-management-t4\" || resource.service.name=\"bss-mc-crm-customer-information-t4\" || resource.service.name=\"bss-mc-pcm-product-catalog-t4\" || resource.service.name=\"cpq-ordercapture\" || resource.service.name=\"bstp-pcm-product-offer-detail\" || resource.service.name=\"activity\" || resource.service.name=\"bss-mc-cpq-t4\" || resource.service.name=\"customer-search-mc-backend\" || resource.service.name=\"ui-authz-mc-backend\") && span.http.status_code>=400 }",
        "criticalLatency": "{ resource.deployment.environment=~\"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod\" && (resource.service.name=\"APIGateway\" || resource.service.name=\"crm-customer-information\" || resource.service.name=\"domain-config-service\" || resource.service.name=\"bss-services-service.etiyamobile-production-eom\" || resource.service.name=\"cpq-ordercapture\" || resource.service.name=\"ui-authz-mc-backend\") && duration > 500ms }"
      },
      "serviceMetadata": {
        "APIGateway": {
          "criticality": "critical",
          "category": "gateway",
          "slaThresholds": {
            "errorRate": 0.005,
            "latencyP95": 500,
            "latencyP99": 1000
          }
        },
        "crm-mash-up": {
          "criticality": "high",
          "category": "crm",
          "slaThresholds": {
            "errorRate": 0.02,
            "latencyP95": 500,
            "latencyP99": 1200
          }
        },
        "crm-customer-information": {
          "criticality": "critical",
          "category": "crm",
          "slaThresholds": {
            "errorRate": 0.01,
            "latencyP95": 300,
            "latencyP99": 800
          }
        },
        "crm-asset": {
          "criticality": "high",
          "category": "crm",
          "slaThresholds": {
            "errorRate": 0.02,
            "latencyP95": 400,
            "latencyP99": 1000
          }
        },
        "domain-config-service": {
          "criticality": "critical",
          "category": "config",
          "slaThresholds": {
            "errorRate": 0.001,
            "latencyP95": 100,
            "latencyP99": 300
          }
        },
        "ntf-engine-service": {
          "criticality": "medium",
          "category": "notification",
          "slaThresholds": {
            "errorRate": 0.05,
            "latencyP95": 2000,
            "latencyP99": 5000
          }
        },
        "ntf-history-service": {
          "criticality": "low",
          "category": "notification",
          "slaThresholds": {
            "errorRate": 0.05,
            "latencyP95": 1000,
            "latencyP99": 3000
          }
        },
        "bss-services-service.etiyamobile-production-eom": {
          "criticality": "critical",
          "category": "backend",
          "slaThresholds": {
            "errorRate": 0.01,
            "latencyP95": 500,
            "latencyP99": 1000
          }
        },
        "bss-mc-domain-config-t4": {
          "criticality": "high",
          "category": "t4-layer",
          "slaThresholds": {
            "errorRate": 0.01,
            "latencyP95": 200,
            "latencyP99": 500
          }
        },
        "bss-mc-ntf-engine-t4": {
          "criticality": "medium",
          "category": "t4-layer",
          "slaThresholds": {
            "errorRate": 0.03,
            "latencyP95": 1000,
            "latencyP99": 2000
          }
        },
        "bstp-pcm-product-catalog": {
          "criticality": "high",
          "category": "catalog",
          "slaThresholds": {
            "errorRate": 0.02,
            "latencyP95": 300,
            "latencyP99": 800
          }
        },
        "eca-t4": {
          "criticality": "high",
          "category": "t4-layer",
          "slaThresholds": {
            "errorRate": 0.02,
            "latencyP95": 300,
            "latencyP99": 800
          }
        },
        "bss-mc-asset-management-t4": {
          "criticality": "high",
          "category": "t4-layer",
          "slaThresholds": {
            "errorRate": 0.02,
            "latencyP95": 400,
            "latencyP99": 1000
          }
        },
        "bss-mc-crm-customer-information-t4": {
          "criticality": "high",
          "category": "t4-layer",
          "slaThresholds": {
            "errorRate": 0.02,
            "latencyP95": 300,
            "latencyP99": 800
          }
        },
        "bss-mc-pcm-product-catalog-t4": {
          "criticality": "high",
          "category": "t4-layer",
          "slaThresholds": {
            "errorRate": 0.02,
            "latencyP95": 300,
            "latencyP99": 800
          }
        },
        "cpq-ordercapture": {
          "criticality": "critical",
          "category": "cpq",
          "slaThresholds": {
            "errorRate": 0.01,
            "latencyP95": 1000,
            "latencyP99": 2000
          }
        },
        "bstp-pcm-product-offer-detail": {
          "criticality": "high",
          "category": "catalog",
          "slaThresholds": {
            "errorRate": 0.02,
            "latencyP95": 400,
            "latencyP99": 1000
          }
        },
        "activity": {
          "criticality": "low",
          "category": "support",
          "slaThresholds": {
            "errorRate": 0.05,
            "latencyP95": 1000,
            "latencyP99": 2000
          }
        },
        "bss-mc-cpq-t4": {
          "criticality": "high",
          "category": "t4-layer",
          "slaThresholds": {
            "errorRate": 0.02,
            "latencyP95": 400,
            "latencyP99": 1000
          }
        },
        "customer-search-mc-backend": {
          "criticality": "high",
          "category": "search",
          "slaThresholds": {
            "errorRate": 0.02,
            "latencyP95": 400,
            "latencyP99": 1000
          }
        },
        "ui-authz-mc-backend": {
          "criticality": "critical",
          "category": "auth",
          "slaThresholds": {
            "errorRate": 0.005,
            "latencyP95": 200,
            "latencyP99": 500
          }
        }
      },
      "affectedPath": "login"
    },
    "searchParams": {
      "services": [
        "APIGateway",
        "crm-mash-up",
        "crm-customer-information",
        "crm-asset",
        "domain-config-service",
        "ntf-engine-service",
        "ntf-history-service",
        "bss-services-service.etiyamobile-production-eom",
        "bss-mc-domain-config-t4",
        "bss-mc-ntf-engine-t4",
        "bstp-pcm-product-catalog",
        "eca-t4",
        "bss-mc-asset-management-t4",
        "bss-mc-crm-customer-information-t4",
        "bss-mc-pcm-product-catalog-t4",
        "cpq-ordercapture",
        "bstp-pcm-product-offer-detail",
        "activity",
        "bss-mc-cpq-t4",
        "customer-search-mc-backend",
        "ui-authz-mc-backend"
      ],
      "customQuery": "{ resource.deployment.environment=~\"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod\" && (resource.service.name=\"APIGateway\" || resource.service.name=\"crm-mash-up\" || resource.service.name=\"crm-customer-information\" || resource.service.name=\"crm-asset\" || resource.service.name=\"domain-config-service\" || resource.service.name=\"ntf-engine-service\" || resource.service.name=\"ntf-history-service\" || resource.service.name=\"bss-services-service.etiyamobile-production-eom\" || resource.service.name=\"bss-mc-domain-config-t4\" || resource.service.name=\"bss-mc-ntf-engine-t4\" || resource.service.name=\"bstp-pcm-product-catalog\" || resource.service.name=\"eca-t4\" || resource.service.name=\"bss-mc-asset-management-t4\" || resource.service.name=\"bss-mc-crm-customer-information-t4\" || resource.service.name=\"bss-mc-pcm-product-catalog-t4\" || resource.service.name=\"cpq-ordercapture\" || resource.service.name=\"bstp-pcm-product-offer-detail\" || resource.service.name=\"activity\" || resource.service.name=\"bss-mc-cpq-t4\" || resource.service.name=\"customer-search-mc-backend\" || resource.service.name=\"ui-authz-mc-backend\") && span.http.status_code>=400 }",
      "limits": {
        "stage1": 200,
        "stage2": 100
      }
    },
    "analysisConfig": {
      "priority": "normal",
      "forceDeepAnalysis": false,
      "serviceContext": {
        "primaryServices": [
          "APIGateway",
          "cpq-ordercapture",
          "crm-customer-information",
          "domain-config-service",
          "ui-authz-mc-backend",
          "bss-services-service.etiyamobile-production-eom"
        ],
        "allServices": [
          "APIGateway",
          "crm-mash-up",
          "crm-customer-information",
          "crm-asset",
          "domain-config-service",
          "ntf-engine-service",
          "ntf-history-service",
          "bss-services-service.etiyamobile-production-eom",
          "bss-mc-domain-config-t4",
          "bss-mc-ntf-engine-t4",
          "bstp-pcm-product-catalog",
          "eca-t4",
          "bss-mc-asset-management-t4",
          "bss-mc-crm-customer-information-t4",
          "bss-mc-pcm-product-catalog-t4",
          "cpq-ordercapture",
          "bstp-pcm-product-offer-detail",
          "activity",
          "bss-mc-cpq-t4",
          "customer-search-mc-backend",
          "ui-authz-mc-backend"
        ],
        "criticalPathAffected": true,
        "affectedPath": "login",
        "serviceCount": 21,
        "criticalServiceCount": 6,
        "expectedLatencies": {
          "APIGateway": {
            "p95": 500,
            "p99": 1000
          },
          "crm-mash-up": {
            "p95": 500,
            "p99": 1200
          },
          "crm-customer-information": {
            "p95": 300,
            "p99": 800
          },
          "crm-asset": {
            "p95": 400,
            "p99": 1000
          },
          "domain-config-service": {
            "p95": 100,
            "p99": 300
          },
          "ntf-engine-service": {
            "p95": 2000,
            "p99": 5000
          },
          "ntf-history-service": {
            "p95": 1000,
            "p99": 3000
          },
          "bss-services-service.etiyamobile-production-eom": {
            "p95": 500,
            "p99": 1000
          },
          "bss-mc-domain-config-t4": {
            "p95": 200,
            "p99": 500
          },
          "bss-mc-ntf-engine-t4": {
            "p95": 1000,
            "p99": 2000
          },
          "bstp-pcm-product-catalog": {
            "p95": 300,
            "p99": 800
          },
          "eca-t4": {
            "p95": 300,
            "p99": 800
          },
          "bss-mc-asset-management-t4": {
            "p95": 400,
            "p99": 1000
          },
          "bss-mc-crm-customer-information-t4": {
            "p95": 300,
            "p99": 800
          },
          "bss-mc-pcm-product-catalog-t4": {
            "p95": 300,
            "p99": 800
          },
          "cpq-ordercapture": {
            "p95": 1000,
            "p99": 2000
          },
          "bstp-pcm-product-offer-detail": {
            "p95": 400,
            "p99": 1000
          },
          "activity": {
            "p95": 1000,
            "p99": 2000
          },
          "bss-mc-cpq-t4": {
            "p95": 400,
            "p99": 1000
          },
          "customer-search-mc-backend": {
            "p95": 400,
            "p99": 1000
          },
          "ui-authz-mc-backend": {
            "p95": 200,
            "p99": 500
          }
        }
      }
    }
  }
]