# OKR_AI Documentation Index

Complete documentation for the OKR_AI Intelligent Alert Management System.

## Getting Started

Start here if you're new to OKR_AI:

1. [README](../README.md) - Project overview and quick introduction
2. [Quick Start Guide](QUICK_START.md) - Get running in 30 minutes
3. [Project Overview](PROJECT_OVERVIEW.md) - Detailed project understanding

## Core Documentation

### Architecture & Design
- [Architecture](ARCHITECTURE.md) - Complete system architecture
  - System components and data flow
  - Stage architecture details
  - Infrastructure topology
  - Integration points
  - Security architecture

### Stage Reference
- [Stage Reference Guide](STAGE_REFERENCE.md) - Complete reference for all 6 stages
  - Stage 0: Alert Listener
  - Stage 1: Initial Triage
  - Stage 2: Deep Analysis
  - Stage 3: Alert Intelligence
  - Stage 4: Automated Diagnosis
  - Stage 5: Smart Remediation
  - Stage 6: Prevention & Learning

## Implementation Guides

### Installation & Setup
- [Quick Start](QUICK_START.md)
  - Prerequisites checklist
  - Workflow import
  - Credential configuration
  - Alertmanager setup
  - End-to-end testing

### Configuration
- [README - Configuration](../README.md#configuration)
  - Alert Listener configuration
  - Analysis pipeline settings
  - AI model configuration
  - SLO tracking setup

## Reference Documentation

### API Reference
- [README - API Reference](../README.md#api-reference)
  - Alert Listener API
  - Context object schema
  - Stage input/output formats

### Data Models
- [Project Overview - Data Flow](PROJECT_OVERVIEW.md#data-flow)
  - Alert processing schema
  - Normalized alert format
  - Context object structure
  - Knowledge base schema

### Monitoring
- [Project Overview - Monitored Environments](PROJECT_OVERVIEW.md#monitored-environments)
  - Production clusters
  - Key namespaces
  - Service inventory

## Operational Guides

### Usage
- [README - Usage](../README.md#usage)
  - Alert format
  - Workflow execution
  - Monitoring workflow health

### Troubleshooting
- [README - Troubleshooting](../README.md#troubleshooting)
  - Common issues
  - Debug mode
  - Performance optimization

- [Quick Start - Common Issues](QUICK_START.md#common-issues--solutions)
  - Webhook not receiving alerts
  - AI analysis failing
  - Prometheus queries failing
  - Kubectl commands failing

### Best Practices
- [README - Best Practices](../README.md#best-practices)
  - Alert design
  - Workflow maintenance
  - SLO management
  - Knowledge base hygiene

## Technical Deep Dives

### Stage Architecture
- [Architecture - Stage Details](ARCHITECTURE.md#stage-architecture-details)
  - Stage 1: Initial Triage
  - Stage 2: Deep Analysis
  - Stage 3: Alert Intelligence
  - Stage 4: Automated Diagnosis
  - Stage 5: Smart Remediation
  - Stage 6: Prevention & Learning

### Data Management
- [Architecture - Data Management Layer](ARCHITECTURE.md#5-data-management-layer)
  - Context object structure
  - Knowledge base schema

### Infrastructure
- [Architecture - Infrastructure Architecture](ARCHITECTURE.md#infrastructure-architecture)
  - Kubernetes cluster topology
  - Network architecture

### Integration
- [Architecture - Integration Points](ARCHITECTURE.md#integration-points)
  - External systems
  - Internal systems

## Feature Documentation

### Alert Processing
- [Project Overview - Alert Listener Workflow](PROJECT_OVERVIEW.md#alert-listener-workflow)
- [Architecture - Alert Ingestion Layer](ARCHITECTURE.md#1-alert-ingestion-layer)

### AI Analysis
- [Project Overview - AI Integration](PROJECT_OVERVIEW.md#ai-integration)
- [Architecture - AI Analysis Layer](ARCHITECTURE.md#2-ai-analysis-layer)

### SLO Tracking
- [README - SLO Tracking](../README.md#slo-tracking)
- [Project Overview - SLO Tracking](PROJECT_OVERVIEW.md#slo-tracking)
- [Stage Reference - Stage 3 SLO Calculations](STAGE_REFERENCE.md#slo-calculations)

### Automated Remediation
- [README - Remediation Actions](../README.md#remediation-actions)
- [Stage Reference - Stage 5](STAGE_REFERENCE.md#stage-5-smart-remediation)

### Knowledge Base
- [README - Knowledge Base](../README.md#knowledge-base)
- [Architecture - Knowledge Base](ARCHITECTURE.md#knowledge-base)

## Development

### Extending OKR_AI
- [README - Development](../README.md#development)
  - Adding custom stages
  - Extending knowledge base
  - Custom remediation actions

### Contributing
- [README - Contributing](../README.md#contributing)

## Quick Reference

### Command Reference
- [Quick Start - Quick Reference Commands](QUICK_START.md#quick-reference-commands)

### Stage Reference
- [Stage Reference - Quick Reference](STAGE_REFERENCE.md#quick-reference)

### Common Patterns
- [Stage Reference - Common Patterns](STAGE_REFERENCE.md#common-patterns)

## Documentation by Role

### For Operators
1. [Quick Start Guide](QUICK_START.md) - Get system running
2. [README - Troubleshooting](../README.md#troubleshooting) - Fix issues
3. [README - Monitoring](../README.md#monitoring-workflow-health) - Health checks

### For Developers
1. [Architecture](ARCHITECTURE.md) - Understand system design
2. [Stage Reference](STAGE_REFERENCE.md) - Stage implementation details
3. [README - Development](../README.md#development) - Extend functionality

### For SREs
1. [Project Overview](PROJECT_OVERVIEW.md) - System understanding
2. [README - SLO Tracking](../README.md#slo-tracking) - SLO management
3. [README - Best Practices](../README.md#best-practices) - Operational excellence

### For Architects
1. [Architecture](ARCHITECTURE.md) - Complete architecture
2. [Project Overview - Data Flow](PROJECT_OVERVIEW.md#data-flow) - System flows
3. [Architecture - Infrastructure](ARCHITECTURE.md#infrastructure-architecture) - Infrastructure design

## Documentation by Task

### Setting Up OKR_AI
1. [Quick Start](QUICK_START.md) - Step-by-step setup
2. [README - Configuration](../README.md#configuration) - Configuration details

### Understanding Alert Flow
1. [Project Overview - Data Flow](PROJECT_OVERVIEW.md#data-flow) - High-level flow
2. [Architecture - Data Flow Patterns](ARCHITECTURE.md#data-flow-patterns) - Detailed patterns
3. [Stage Reference](STAGE_REFERENCE.md) - Stage-by-stage processing

### Troubleshooting Issues
1. [README - Troubleshooting](../README.md#troubleshooting) - Common issues
2. [Quick Start - Issues & Solutions](QUICK_START.md#common-issues--solutions) - Setup issues
3. [Stage Reference - Troubleshooting](STAGE_REFERENCE.md#troubleshooting) - Stage-specific issues

### Optimizing Performance
1. [README - Performance Optimization](../README.md#troubleshooting) - General optimization
2. [Stage Reference - Performance Guidelines](STAGE_REFERENCE.md#performance-guidelines) - Stage optimization
3. [Architecture - Scalability & Performance](ARCHITECTURE.md#scalability--performance) - System-wide optimization

### Configuring SLOs
1. [README - SLO Tracking](../README.md#slo-tracking) - SLO overview
2. [Project Overview - SLO Tracking](PROJECT_OVERVIEW.md#slo-tracking) - SLO details
3. [Stage Reference - Stage 3 SLO Calculations](STAGE_REFERENCE.md#slo-calculations) - Implementation

### Adding Remediation Actions
1. [README - Remediation Actions](../README.md#remediation-actions) - Available actions
2. [README - Custom Remediation](../README.md#custom-remediation-actions) - Adding new actions
3. [Stage Reference - Stage 5](STAGE_REFERENCE.md#stage-5-smart-remediation) - Implementation details

## External Resources

### n8n Documentation
- [n8n Official Docs](https://docs.n8n.io/)
- [n8n Workflow Automation](https://docs.n8n.io/workflows/)
- [n8n Credentials](https://docs.n8n.io/credentials/)

### Prometheus Documentation
- [Prometheus Documentation](https://prometheus.io/docs/)
- [PromQL Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/)

### Kubernetes Documentation
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [kubectl Reference](https://kubernetes.io/docs/reference/kubectl/)
- [Kubernetes API](https://kubernetes.io/docs/reference/kubernetes-api/)

### Grafana Documentation
- [Grafana Documentation](https://grafana.com/docs/)
- [Grafana Loki](https://grafana.com/docs/loki/latest/)
- [Grafana Tempo](https://grafana.com/docs/tempo/latest/)

## Document Status

| Document | Status | Last Updated | Version |
|----------|--------|--------------|---------|
| [README](../README.md) | Complete | 2025-12-13 | 1.0 |
| [Project Overview](PROJECT_OVERVIEW.md) | Complete | 2025-12-13 | 1.0 |
| [Architecture](ARCHITECTURE.md) | Complete | 2025-12-13 | 1.0 |
| [Quick Start](QUICK_START.md) | Complete | 2025-12-13 | 1.0 |
| [Stage Reference](STAGE_REFERENCE.md) | Complete | 2025-12-13 | 1.0 |
| [Index](INDEX.md) | Complete | 2025-12-13 | 1.0 |

## Feedback & Contributions

This documentation is continuously improved based on user feedback and system evolution.

**Found an issue?** Please note it for future documentation updates.

**Have suggestions?** Contributions to documentation are welcome.

---

**Navigation Tip**: Use your browser's search (Ctrl+F / Cmd+F) to quickly find topics across documentation files.
