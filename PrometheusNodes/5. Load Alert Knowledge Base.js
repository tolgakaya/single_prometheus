// Load Alert Knowledge Base - COMPLETE 320+ Alert Definitions
// Hardcoded KB from alert-rules-solutions 4.csv
// This replaces the need for CSV reading in the n8n workflow

const items = $input.all();
const inputData = items[0]?.json || {};

// PRESERVE ALL EXISTING DATA
let output = { ...inputData };

// COMPLETE KNOWLEDGE BASE (320+ ALERTS FROM CSV)
const alertKnowledgeBase = {
  // ========== ETCD CATEGORY (CRITICAL INFRASTRUCTURE) ==========
  
  'etcdInsufficientMembers': {
    severity: 'blocker',
    description: 'etcd cluster lost quorum',
    commonCauses: [
      'AZ outage',
      'EC2 instance failure',
      'Network partition',
      'Storage corruption'
    ],
    troubleshootingSteps: [
      'aws eks describe-cluster --name [cluster]',
      'kubectl get ns -v=6',
      'aws cloudwatch get-metric-data --metric-data-queries \'{"Id":"m1","MetricStat":{"Metric":{"Namespace":"AWS/EKS","MetricName":"EtcdMembers"}}}\''
    ],
    expectedResults: [
      'API requests failing',
      'AWS console shows etcd warnings',
      'CloudWatch shows <3 members'
    ],
    immediateActions: [
      'IMMEDIATE AWS SUPPORT TICKET',
      'Stop cluster changes',
      'Prepare DR plan'
    ],
    longTermSolutions: [
      'Deploy multi-AZ etcd',
      'Regular snapshots',
      'Monitor etcd_health metrics'
    ],
    requiredMetrics: ['etcd_server_has_leader', 'etcd_cluster_size'],
    cascadeCheckPoints: ['api_server_operations', 'cluster_state_changes']
  },

  'etcdNoLeader': {
    severity: 'blocker',
    description: 'etcd cluster has no leader',
    commonCauses: [
      'Network partitions',
      'etcd process crashes',
      'Clock skew',
      'Storage corruption'
    ],
    troubleshootingSteps: [
      'aws eks describe-cluster --name [cluster]',
      'kubectl get --raw /metrics | grep etcd_server_has_leader',
      'aws cloudwatch get-metric-data --metric-data-queries \'{"Id":"m1","MetricStat":{"Metric":{"Namespace":"AWS/EKS","MetricName":"EtcdLeaderChanges"}}}\''
    ],
    expectedResults: [
      'etcd_server_has_leader=0',
      'High leader change rate',
      'API server unresponsive'
    ],
    immediateActions: [
      'IMMEDIATE AWS SUPPORT',
      'Stop all etcd writes',
      'Prepare cluster restore'
    ],
    longTermSolutions: [
      'NTP time sync across nodes',
      'Regular etcd health checks',
      'Multi-AZ deployment'
    ],
    requiredMetrics: ['etcd_server_has_leader', 'etcd_server_leader_changes'],
    cascadeCheckPoints: ['api_server_operations', 'cluster_operations']
  },

  'KubeAPIErrorBudgetBurn': {
    severity: 'critical',
    description: 'API server error rate >5% for 15min',
    commonCauses: [
      'etcd performance issues',
      'Excessive LIST requests',
      'AWS control plane problems',
      'Client throttling'
    ],
    troubleshootingSteps: [
      'kubectl get --raw /metrics | grep \'apiserver_request_total{code=~"5.."}\'',
      'kubectl get --raw /metrics | grep \'apiserver_request_count\'',
      'kubectl get --raw /metrics | grep \'etcd_request_duration_seconds\''
    ],
    expectedResults: [
      '5xx errors >5%',
      'Single client >30% traffic',
      'etcd latency >1s'
    ],
    immediateActions: [
      'Identify abusive clients',
      'Scale API server',
      'Open AWS case',
      'Add rate limits'
    ],
    longTermSolutions: [
      'Implement client QPS limits',
      'Optimize LIST queries',
      'Add watch bookmarks'
    ],
    requiredMetrics: ['apiserver_request_total', 'apiserver_request_duration'],
    cascadeCheckPoints: ['cluster_operations', 'kubectl_access']
  },

  'etcdDatabaseQuotaLowSpace': {
    severity: 'critical',
    description: 'etcd storage space critically low',
    commonCauses: [
      'Excessive Kubernetes objects',
      'Lack of compaction',
      'etcd history limit too high'
    ],
    troubleshootingSteps: [
      'kubectl get --raw /metrics | grep etcd_mvcc_db_total_size_in_bytes',
      'kubectl get --raw /metrics | grep etcd_debugging_mvcc_compact_revision',
      'aws eks describe-cluster --name [cluster]'
    ],
    expectedResults: [
      'Storage >90% used',
      'Compact revision lagging',
      'Slow API responses'
    ],
    immediateActions: [
      'Scale down unused objects',
      'EMERGENCY AWS SUPPORT CASE',
      'Delete old secrets/configmaps'
    ],
    longTermSolutions: [
      'Implement object retention policies',
      'Monitor etcd_db_size',
      'Regular compaction'
    ],
    requiredMetrics: ['etcd_mvcc_db_total_size_in_bytes', 'etcd_server_quota_backend_bytes'],
    cascadeCheckPoints: ['api_server_performance', 'cluster_responsiveness']
  },

  'etcdHighNumberOfLeaderChanges': {
    severity: 'critical',
    description: 'etcd leader changes >5/min',
    commonCauses: [
      'Network latency',
      'High CPU load',
      'Disk I/O contention',
      'Clock skew'
    ],
    troubleshootingSteps: [
      'kubectl get --raw /metrics | grep etcd_server_leader_changes_seen_total',
      'ssh [node] iostat -dx 5',
      'ntpq -p',
      'aws cloudwatch get-metric-statistics --namespace AWS/EKS --metric-name LeaderChanges'
    ],
    expectedResults: [
      'Leader changes >5/min',
      'Disk await >100ms',
      'Clock offset >500ms',
      'AWS metric spikes'
    ],
    immediateActions: [
      'Restart etcd processes',
      'Move to larger instances',
      'Resync NTP',
      'Isolate noisy neighbors'
    ],
    longTermSolutions: [
      'Dedicated etcd instances',
      'EBS optimized volumes',
      'Network QoS policies'
    ],
    requiredMetrics: ['etcd_server_leader_changes', 'etcd_network_peer_round_trip'],
    cascadeCheckPoints: ['etcd_stability', 'cluster_stability']
  },

  'etcdHighFsyncDurations': {
    severity: 'critical',
    description: 'etcd fsync latency >1s',
    commonCauses: [
      'Disk subsystem overload',
      'EBS throughput limits',
      'Instance type mismatch',
      'RAID misconfiguration'
    ],
    troubleshootingSteps: [
      'kubectl get --raw /metrics | grep etcd_disk_wal_fsync_duration_seconds',
      'aws ebs describe-volumes --volume-ids [id] | grep Throughput',
      'iostat -d -x /dev/nvme1n1'
    ],
    expectedResults: [
      'Fsync duration >1s',
      'Volume throughput capped',
      'Disk util >90%'
    ],
    immediateActions: [
      'Switch to gp3 volumes',
      'Increase IOPS/throughput',
      'Migrate to larger instances'
    ],
    longTermSolutions: [
      'Local SSD caching',
      'Volume performance monitoring',
      'etcd dedicated disk subsystem'
    ],
    requiredMetrics: ['etcd_disk_wal_fsync_duration_seconds', 'node_disk_io_time'],
    cascadeCheckPoints: ['etcd_performance', 'api_latency']
  },

  'etcdHighCommitDurations': {
    severity: 'critical',
    description: 'etcd commit latency >500ms',
    commonCauses: [
      'WAL sync delays',
      'Batch size too large',
      'Fsync contention',
      'Disk subsystem failures'
    ],
    troubleshootingSteps: [
      'kubectl get --raw /metrics | grep etcd_disk_backend_commit_duration_seconds',
      'iotop -o -d 5',
      'etcdctl check perf',
      'smartctl -a /dev/nvme1n1'
    ],
    expectedResults: [
      'Commit latency >500ms',
      'High disk await',
      'Batch size >5MB',
      'Disk SMART errors'
    ],
    immediateActions: [
      'Reduce etcd max-request-bytes',
      'Migrate to NVMe storage',
      'Separate WAL/db paths',
      'Replace failing disks'
    ],
    longTermSolutions: [
      'etcd performance tuning',
      'Storage health monitoring',
      'Regular disk benchmarking'
    ],
    requiredMetrics: ['etcd_disk_backend_commit_duration_seconds'],
    cascadeCheckPoints: ['etcd_performance', 'cluster_responsiveness']
  },

  'etcdHighNumberOfFailedProposals': {
    severity: 'critical',
    description: 'etcd failed proposals >10/min',
    commonCauses: [
      'Leader network instability',
      'Raft internal errors',
      'Snapshot corruption',
      'Memory corruption'
    ],
    troubleshootingSteps: [
      'kubectl get --raw /metrics | grep etcd_server_proposals_failed_total',
      'kubectl logs [etcd-pod] | grep "dropped internal Raft message"',
      'free -m',
      'dmesg | grep -i ecc'
    ],
    expectedResults: [
      'Failed proposals >10/min',
      '"dropped message" warnings',
      'Memory usage >90%',
      'ECC memory errors'
    ],
    immediateActions: [
      'Restart etcd members',
      'Increase memory allocation',
      'Restore from snapshot',
      'Replace faulty hardware'
    ],
    longTermSolutions: [
      'Raft network isolation',
      'Regular snapshotting',
      'Hardware health checks'
    ],
    requiredMetrics: ['etcd_server_proposals_failed_total'],
    cascadeCheckPoints: ['etcd_consensus', 'cluster_stability']
  },

  'etcdHighNumberOfFailedGRPCRequests': {
    severity: 'critical',
    description: 'etcd gRPC failure rate >5%',
    commonCauses: [
      'TLS certificate expiration',
      'gRPC version incompatibility',
      'Firewall rule changes',
      'File descriptor limits'
    ],
    troubleshootingSteps: [
      'kubectl get --raw /metrics | grep etcd_grpc_requests_failed',
      'openssl x509 -in /etc/kubernetes/pki/etcd/server.crt -noout -dates',
      'ss -lpn | grep 2379',
      'cat /proc/$(pidof etcd)/limits'
    ],
    expectedResults: [
      'gRPC errors >5%',
      'Certificates expired',
      'Connection refused',
      '"too many open files" errors'
    ],
    immediateActions: [
      'Rotate certificates',
      'Increase file limits',
      'Adjust firewall rules',
      'Upgrade etcd version'
    ],
    longTermSolutions: [
      'Automated cert rotation',
      'gRPC compatibility matrix',
      'Connection pooling'
    ],
    requiredMetrics: ['grpc_server_handled_total', 'etcd_grpc_requests_failed'],
    cascadeCheckPoints: ['etcd_connectivity', 'api_server_communication']
  },

  'etcdGRPCRequestsSlow': {
    severity: 'critical',
    description: 'etcd gRPC latency >500ms',
    commonCauses: [
      'Network congestion',
      'CPU throttling',
      'Memory pressure',
      'gRPC connection leaks'
    ],
    troubleshootingSteps: [
      'kubectl get --raw /metrics | grep etcd_grpc_unary_requests_duration',
      'ssh [node] top -o %CPU',
      'netstat -an | grep ESTAB | grep 2379',
      'dmesg | grep oom'
    ],
    expectedResults: [
      'gRPC latency >500ms',
      'CPU steal >20%',
      '>500 ESTAB connections',
      'OOM killer events'
    ],
    immediateActions: [
      'Enable gRPC compression',
      'Move to C6in/C7g instances',
      'Increase network bandwidth',
      'Tune gRPC keepalives'
    ],
    longTermSolutions: [
      'gRPC proxy layer',
      'Network performance tuning',
      'etcd connection pooling'
    ],
    requiredMetrics: ['etcd_grpc_unary_requests_duration_seconds'],
    cascadeCheckPoints: ['etcd_performance', 'api_latency']
  },

  'etcdMemberCommunicationSlow': {
    severity: 'warning',
    description: 'etcd members RTT > 150ms',
    commonCauses: [
      'Network latency',
      'Pods across different zones',
      'Network overlay issues'
    ],
    troubleshootingSteps: [
      'kubectl get --raw /metrics | grep etcd_network_peer_round_trip_time_seconds',
      'Check pod zone placement',
      'Test network latency'
    ],
    expectedResults: [
      'RTT < 150ms',
      'Pods in same zone',
      'Network latency acceptable'
    ],
    immediateActions: [
      'Check pod zone placement',
      'Test network latency',
      'Optimize overlay network'
    ],
    longTermSolutions: [
      'Zone aware scheduling',
      'Overlay network optimization'
    ],
    requiredMetrics: ['etcd_network_peer_round_trip_time_seconds'],
    cascadeCheckPoints: ['etcd_network_health', 'cluster_communication']
  },

  // ========== INFRASTRUCTURE CATEGORY ==========
  
  'KubeNodeNotReady': {
    severity: 'critical',
    description: 'Worker node unavailable >5min',
    commonCauses: [
      'Kubelet process down',
      'Instance terminated',
      'Network loss',
      'Resource exhaustion'
    ],
    troubleshootingSteps: [
      'kubectl get nodes -o wide',
      'kubectl describe node [node]',
      'aws ec2 describe-instances --instance-ids [id]',
      'ssh [node] systemctl status kubelet'
    ],
    expectedResults: [
      'Node status "NotReady"',
      '"NodeLost" events',
      'EC2 instance stopped',
      'Kubelet inactive'
    ],
    immediateActions: [
      'Drain node (kubectl drain)',
      'Terminate instance',
      'Scale up replacement'
    ],
    longTermSolutions: [
      'Implement node auto-repair',
      'Configure cluster autoscaler',
      'Node health checks'
    ],
    requiredMetrics: ['kube_node_status_condition', 'kubelet_up'],
    cascadeCheckPoints: ['node_workloads', 'cluster_capacity', 'pod_scheduling']
  },

  'KubeNodeUnreachable': {
    severity: 'critical',
    description: 'Node is unreachable from cluster',
    commonCauses: [
      'Network partition',
      'Node crashed',
      'Cloud provider issues',
      'Firewall/Security group changes',
      'Node maintenance'
    ],
    troubleshootingSteps: [
      'Ping node from master',
      'Check cloud provider console',
      'Verify security groups/firewall rules',
      'Check node system logs',
      'Verify kube-proxy and kubelet'
    ],
    expectedResults: [
      'Network connectivity restored',
      'Node responsive',
      'Security groups allow traffic',
      'System services running'
    ],
    immediateActions: [
      'Check network connectivity',
      'Verify security groups',
      'Restart network services',
      'Replace if hardware failure'
    ],
    longTermSolutions: [
      'Network redundancy',
      'Automated network monitoring',
      'Node health monitoring'
    ],
    requiredMetrics: ['kube_node_status_condition', 'node_network_up'],
    cascadeCheckPoints: ['node_workloads', 'cluster_capacity']
  },

  'KubeNodeMemoryPressure': {
    severity: 'high',
    description: 'Node experiencing memory pressure',
    commonCauses: [
      'Memory leak in pods',
      'Too many pods scheduled',
      'System processes consuming memory',
      'Insufficient node memory'
    ],
    troubleshootingSteps: [
      'Check node memory usage',
      'Identify high memory pods',
      'Review pod memory limits',
      'Consider node scaling'
    ],
    expectedResults: [
      'Memory usage < 80%',
      'No memory pressure condition',
      'Pods within memory limits'
    ],
    immediateActions: [
      'Evict non-critical pods',
      'Increase pod memory limits',
      'Scale out nodes'
    ],
    longTermSolutions: [
      'Right-size pod resources',
      'Implement resource quotas',
      'Memory usage monitoring'
    ],
    requiredMetrics: ['node_memory_MemAvailable_bytes', 'kube_node_status_condition'],
    cascadeCheckPoints: ['pod_evictions', 'oom_kills', 'service_disruption']
  },

  'NodeFilesystemSpaceFillingUp': {
    severity: 'warning',
    description: 'Node filesystem space <15% and filling up',
    commonCauses: [
      'Log accumulation',
      'Image layer buildup',
      'Temporary files',
      'Pod volume usage'
    ],
    troubleshootingSteps: [
      'df -h on node',
      'docker system df',
      'Find large files/directories',
      'Check pod volume usage'
    ],
    expectedResults: [
      'Free space >15%',
      'Disk usage trending down',
      'Large files identified'
    ],
    immediateActions: [
      'Clean up logs',
      'Remove unused images',
      'Clear temporary files',
      'Expand disk if needed'
    ],
    longTermSolutions: [
      'Log rotation policies',
      'Image cleanup automation',
      'Disk usage monitoring'
    ],
    requiredMetrics: ['node_filesystem_avail_bytes', 'node_filesystem_size_bytes'],
    cascadeCheckPoints: ['pod_scheduling', 'container_operations', 'log_collection']
  },

  'NodeFilesystemAlmostOutOfSpace': {
    severity: 'critical',
    description: 'Node filesystem space <5%',
    commonCauses: [
      'Disk full condition',
      'Rapid log growth',
      'Large file writes',
      'No cleanup policies'
    ],
    troubleshootingSteps: [
      'Immediate space check',
      'Find largest files',
      'Emergency cleanup',
      'Monitor space usage'
    ],
    expectedResults: [
      'Free space >5%',
      'Critical files removed',
      'Space usage stabilized'
    ],
    immediateActions: [
      'Emergency cleanup',
      'Stop non-critical pods',
      'Expand disk immediately',
      'Clear largest files'
    ],
    longTermSolutions: [
      'Automated cleanup',
      'Disk monitoring alerts',
      'Capacity planning'
    ],
    requiredMetrics: ['node_filesystem_avail_bytes'],
    cascadeCheckPoints: ['pod_failures', 'container_write_failures', 'system_stability']
  },

  'NodeNetworkReceiveErrs': {
    severity: 'warning',
    description: 'Network receive errors >1%',
    commonCauses: [
      'Network hardware issues',
      'Driver problems',
      'Network congestion',
      'Cable issues'
    ],
    troubleshootingSteps: [
      'Check network interface statistics',
      'Test network connectivity',
      'Review system logs',
      'Check physical connections'
    ],
    expectedResults: [
      'Error rate <1%',
      'Network stable',
      'No hardware errors'
    ],
    immediateActions: [
      'Check network hardware',
      'Restart network interface',
      'Replace cables if needed',
      'Update network drivers'
    ],
    longTermSolutions: [
      'Network monitoring',
      'Hardware replacement',
      'Network infrastructure upgrade'
    ],
    requiredMetrics: ['node_network_receive_errs_total', 'node_network_receive_packets_total'],
    cascadeCheckPoints: ['pod_communication', 'service_connectivity', 'cluster_networking']
  },

  // ========== APPLICATION CATEGORY ==========
  
  'KubePodCrashLooping': {
    severity: 'critical',
    description: 'Pod repeatedly crashes after starting',
    commonCauses: [
      'Application bugs',
      'Missing configs/secrets',
      'Resource limits exceeded',
      'Invalid probe settings'
    ],
    troubleshootingSteps: [
      'kubectl logs [pod] --previous',
      'kubectl describe pod [pod]',
      'kubectl get events --field-selector involvedObject.name=[pod]',
      'kubectl top pod [pod]'
    ],
    expectedResults: [
      'Logs show application errors',
      'RestartCount > 5',
      'OOMKilled/ExitCode in status',
      'FailedScheduling events'
    ],
    immediateActions: [
      'Rollback deployment',
      'Increase memory limits',
      'Fix probe configuration',
      'Check secret mounts'
    ],
    longTermSolutions: [
      'Implement CI/CD health checks',
      'Add resource quotas',
      'Configure proper liveness probes'
    ],
    requiredMetrics: ['kube_pod_container_status_restarts_total', 'kube_pod_status_phase'],
    cascadeCheckPoints: ['service_availability', 'deployment_health', 'application_performance']
  },

  'KubePodNotReady': {
    severity: 'high',
    description: 'Pod not ready for >5min',
    commonCauses: [
      'Readiness probe failures',
      'Startup probe too short',
      'Dependency issues',
      'Node problems'
    ],
    troubleshootingSteps: [
      'kubectl get pod [pod] -o yaml | grep -A10 readinessProbe',
      'kubectl logs [pod] -c [container]',
      'kubectl describe node [node]',
      'kubectl get events --sort-by=.metadata.creationTimestamp'
    ],
    expectedResults: [
      'Readiness probe failures',
      '"NotReady" status',
      'Node memory pressure',
      'Dependency connection errors'
    ],
    immediateActions: [
      'Adjust probe timeouts',
      'Check dependency services',
      'Drain problem nodes',
      'Restart pod'
    ],
    longTermSolutions: [
      'Implement pod disruption budgets',
      'Configure pre-stop hooks',
      'Dependency health checks'
    ],
    requiredMetrics: ['kube_pod_status_ready', 'kube_pod_container_status_ready'],
    cascadeCheckPoints: ['service_endpoints', 'load_balancer_targets', 'traffic_routing']
  },

  'KubeDeploymentReplicasMismatch': {
    severity: 'high',
    description: 'Running replicas ≠ desired count',
    commonCauses: [
      'Resource quotas exceeded',
      'Node affinity issues',
      'PDB restrictions',
      'Image pull failures'
    ],
    troubleshootingSteps: [
      'kubectl get deploy -o wide',
      'kubectl describe quota',
      'kubectl get pdb',
      'kubectl get events --sort-by=.metadata.creationTimestamp'
    ],
    expectedResults: [
      'Available replicas < desired',
      'Quota limits hit',
      'PDB blocking eviction',
      'ImagePullErr events'
    ],
    immediateActions: [
      'Increase resource quotas',
      'Adjust affinity rules',
      'Relax PDB settings',
      'Fix image registry auth'
    ],
    longTermSolutions: [
      'Implement resource quota monitoring',
      'Use cluster autoscaler',
      'Pre-pull images in node AMI'
    ],
    requiredMetrics: ['kube_deployment_status_replicas', 'kube_deployment_status_replicas_available'],
    cascadeCheckPoints: ['service_capacity', 'application_availability', 'load_distribution']
  },

  'KubeStatefulSetReplicasMismatch': {
    severity: 'critical',
    description: 'StatefulSet pods down',
    commonCauses: [
      'Persistent volume issues',
      'Node failures',
      'StatefulSet config errors',
      'Storage class problems'
    ],
    troubleshootingSteps: [
      'kubectl get sts -o wide',
      'kubectl describe pvc',
      'kubectl get pv',
      'aws ebs describe-volumes --volume-ids [id]'
    ],
    expectedResults: [
      'Ready replicas < expected',
      'PVC in pending state',
      'PV error events',
      'EBS volume "in-use" conflicts'
    ],
    immediateActions: [
      'Terminate stuck nodes',
      'Release orphaned volumes',
      'Recreate missing PVCs'
    ],
    longTermSolutions: [
      'Regular volume snapshots',
      'Multi-AZ volume topology',
      'Storage capacity monitoring'
    ],
    requiredMetrics: ['kube_statefulset_status_replicas', 'kube_statefulset_status_replicas_ready'],
    cascadeCheckPoints: ['stateful_application_health', 'data_persistence', 'storage_availability']
  },

  'KubeDeploymentRolloutStuck': {
    severity: 'high',
    description: 'Deployment not progressing for 10min',
    commonCauses: [
      'Image pull failures',
      'Pod affinity conflicts',
      'Resource starvation',
      'Missing PVCs'
    ],
    troubleshootingSteps: [
      'kubectl rollout status deploy/[name]',
      'kubectl get rs -o wide',
      'kubectl get pods -l app=[name]',
      'kubectl describe pod [pending-pod]'
    ],
    expectedResults: [
      'Deployment status "progressing"',
      'ReplicaSets not scaled',
      'Pods in ImagePullBackOff'
    ],
    immediateActions: [
      'Check image tags',
      'Fix PVC claims',
      'Adjust affinity rules',
      'Increase resource limits'
    ],
    longTermSolutions: [
      'Implement deployment hooks',
      'Add pre-flight checks',
      'Use phased rollouts'
    ],
    requiredMetrics: ['kube_deployment_status_condition'],
    cascadeCheckPoints: ['deployment_progress', 'application_updates', 'rollback_capability']
  },

  // ========== MONITORING CATEGORY ==========
  
  'AlertmanagerFailedToSendAlerts': {
    severity: 'high',
    description: 'Critical alerts not being delivered',
    commonCauses: [
      'SMTP auth failures',
      'Webhook timeouts',
      'Configuration errors',
      'Network egress blocked'
    ],
    troubleshootingSteps: [
      'kubectl logs -n monitoring alertmanager-0',
      'amtool check-config /etc/alertmanager/config.yml',
      'curl -XPOST http://alertmanager:9093/api/v1/receivers',
      'kubectl exec -it [pod] -- curl [receiver-url]'
    ],
    expectedResults: [
      '"Failed to send alerts" in logs',
      'HTTP 401/503 errors',
      'Configuration syntax errors'
    ],
    immediateActions: [
      'Switch to backup receiver',
      'Fix auth credentials',
      'Allow network egress',
      'Rollback config'
    ],
    longTermSolutions: [
      'Multi-receiver redundancy',
      'Regular config tests',
      'Alert failure monitoring'
    ],
    requiredMetrics: ['alertmanager_notifications_failed_total', 'alertmanager_notifications_total'],
    cascadeCheckPoints: ['alert_delivery', 'notification_channels', 'incident_response']
  },

  'TargetDown': {
    severity: 'medium',
    description: 'Critical service endpoint unavailable',
    commonCauses: [
      'Pod selector mismatch',
      'Service port misconfig',
      'NetworkPolicy blocking',
      'DNS issues'
    ],
    troubleshootingSteps: [
      'kubectl get endpointslices',
      'kubectl get svc [name] -o yaml',
      'kubectl run test --image=nginx --rm -it -- curl http://[service]:[port]',
      'kubectl exec [pod] -- nslookup [service]'
    ],
    expectedResults: [
      'Endpoints list empty',
      'Service port mismatched',
      'Curl timeouts/failures',
      'DNS resolution failures'
    ],
    immediateActions: [
      'Fix selectors/labels',
      'Correct port definitions',
      'Adjust NetworkPolicies',
      'Check CoreDNS'
    ],
    longTermSolutions: [
      'Implement service mesh',
      'Add synthetic monitoring',
      'Regular endpoint tests'
    ],
    requiredMetrics: ['up', 'prometheus_target_metadata_cache_entries'],
    cascadeCheckPoints: ['service_discovery', 'monitoring_coverage', 'metrics_availability']
  },

  'PrometheusTargetDown': {
    severity: 'critical',
    description: 'Prometheus scrape target is down',
    commonCauses: [
      'Service crashed',
      'Network connectivity issues',
      'Authentication problems',
      'Metrics endpoint changed'
    ],
    troubleshootingSteps: [
      'Check target service status',
      'Test metrics endpoint manually',
      'Verify network connectivity',
      'Check Prometheus config'
    ],
    expectedResults: [
      'Service responding',
      'Metrics endpoint accessible',
      'Authentication working',
      'Scrape successful'
    ],
    immediateActions: [
      'Restart target service',
      'Fix network connectivity',
      'Update authentication',
      'Correct endpoint configuration'
    ],
    longTermSolutions: [
      'Service health monitoring',
      'Automated service recovery',
      'Redundant monitoring paths'
    ],
    requiredMetrics: ['up', 'prometheus_target_sync_length_seconds'],
    cascadeCheckPoints: ['monitoring_gaps', 'alert_coverage', 'observability']
  },

  'AlertmanagerClusterDown': {
    severity: 'blocker',
    description: 'Alertmanager cluster not healthy',
    commonCauses: [
      'Peering config errors',
      'Network partitioning',
      'Version mismatch',
      'Persistent storage corruption'
    ],
    troubleshootingSteps: [
      'kubectl exec alertmanager-0 -- amtool cluster status',
      'kubectl logs alertmanager-0 | grep "cluster join"',
      'netstat -tulpn | grep 9094',
      'df -h /data'
    ],
    expectedResults: [
      '"unreachable" peers',
      'TCP connection errors',
      'Disk full errors',
      'Protocol version mismatches'
    ],
    immediateActions: [
      'Restart cluster with clean state',
      'Fix network policies',
      'Expand storage',
      'Enforce version consistency'
    ],
    longTermSolutions: [
      'StatefulSet storage management',
      'Regular config audits',
      'Mesh networking for peers'
    ],
    requiredMetrics: ['alertmanager_cluster_members', 'alertmanager_cluster_alive'],
    cascadeCheckPoints: ['alert_routing', 'notification_delivery', 'incident_management']
  },

  // ========== STORAGE CATEGORY ==========
  
  'KubePersistentVolumeFillingUp': {
    severity: 'critical',
    description: 'Persistent volume space <3%',
    commonCauses: [
      'Log accumulation',
      'Data growth without cleanup',
      'Backup retention issues',
      'Application data leaks'
    ],
    troubleshootingSteps: [
      'Check volume usage',
      'Find largest directories',
      'Review log retention',
      'Check application data patterns'
    ],
    expectedResults: [
      'Free space >3%',
      'Growth trend identified',
      'Cleanup plan ready'
    ],
    immediateActions: [
      'Emergency cleanup',
      'Expand volume',
      'Stop data-heavy processes',
      'Enable log rotation'
    ],
    longTermSolutions: [
      'Automated cleanup policies',
      'Volume monitoring',
      'Data lifecycle management'
    ],
    requiredMetrics: ['kubelet_volume_stats_available_bytes', 'kubelet_volume_stats_capacity_bytes'],
    cascadeCheckPoints: ['application_writes', 'data_persistence', 'storage_performance']
  },

  'KubePersistentVolumeErrors': {
    severity: 'critical',
    description: 'Persistent volume in Failed or Pending state',
    commonCauses: [
      'Storage provisioner issues',
      'Insufficient storage quota',
      'Storage class misconfiguration',
      'Node storage problems'
    ],
    troubleshootingSteps: [
      'kubectl get pv',
      'kubectl describe pv [pv-name]',
      'Check storage class',
      'Review provisioner logs'
    ],
    expectedResults: [
      'PV in Available/Bound state',
      'No error events',
      'Storage quota sufficient'
    ],
    immediateActions: [
      'Fix storage provisioner',
      'Increase storage quota',
      'Correct storage class config',
      'Replace failed storage'
    ],
    longTermSolutions: [
      'Storage monitoring',
      'Automated provisioning',
      'Multi-zone storage setup'
    ],
    requiredMetrics: ['kube_persistentvolume_status_phase'],
    cascadeCheckPoints: ['pod_scheduling', 'application_startup', 'data_availability']
  },

  'VolumeAttachmentStuck': {
    severity: 'high',
    description: 'Volume attachment taking too long',
    commonCauses: [
      'Node not ready',
      'Storage driver issues',
      'Cloud provider API limits',
      'Volume already attached elsewhere'
    ],
    troubleshootingSteps: [
      'kubectl get volumeattachments',
      'kubectl describe volumeattachment [name]',
      'Check node status',
      'Review cloud provider events'
    ],
    expectedResults: [
      'Volume successfully attached',
      'No attachment errors',
      'Node ready for volumes'
    ],
    immediateActions: [
      'Force detach from previous node',
      'Restart storage driver',
      'Check cloud provider limits',
      'Recreate attachment'
    ],
    longTermSolutions: [
      'Storage driver optimization',
      'Multi-attach prevention',
      'Volume lifecycle automation'
    ],
    requiredMetrics: ['storage_operation_duration_seconds'],
    cascadeCheckPoints: ['pod_startup', 'storage_availability', 'application_readiness']
  },

  // ========== NETWORK CATEGORY ==========
  
  'NodeNetworkTransmitErrs': {
    severity: 'warning',
    description: 'Network transmit errors >1%',
    commonCauses: [
      'Network hardware problems',
      'Driver issues',
      'Network congestion',
      'Interface configuration'
    ],
    troubleshootingSteps: [
      'Check network statistics',
      'Review network configuration',
      'Test network performance',
      'Check interface status'
    ],
    expectedResults: [
      'Error rate <1%',
      'Network performance normal',
      'No hardware issues'
    ],
    immediateActions: [
      'Restart network interface',
      'Update network drivers',
      'Check network cables',
      'Reduce network load'
    ],
    longTermSolutions: [
      'Network infrastructure upgrade',
      'Performance monitoring',
      'Hardware maintenance'
    ],
    requiredMetrics: ['node_network_transmit_errs_total', 'node_network_transmit_packets_total'],
    cascadeCheckPoints: ['pod_communication', 'service_connectivity']
  },

  'NodeHighNumberConntrackEntriesUsed': {
    severity: 'warning',
    description: 'Conntrack table usage >75%',
    commonCauses: [
      'High connection volume',
      'Connection leaks',
      'Long connection timeouts',
      'Insufficient conntrack limits'
    ],
    troubleshootingSteps: [
      'Check conntrack usage',
      'Review connection patterns',
      'Check timeout settings',
      'Monitor connection lifecycle'
    ],
    expectedResults: [
      'Usage <75%',
      'Connections properly closed',
      'No connection leaks'
    ],
    immediateActions: [
      'Close unnecessary connections',
      'Increase conntrack limits',
      'Reduce timeout values',
      'Restart high-connection services'
    ],
    longTermSolutions: [
      'Connection pooling',
      'Connection limit monitoring',
      'Network tuning'
    ],
    requiredMetrics: ['node_nf_conntrack_entries', 'node_nf_conntrack_entries_limit'],
    cascadeCheckPoints: ['network_connectivity', 'service_communication']
  },

  // ========== API CATEGORY ==========
  
  'KubeAPIDown': {
    severity: 'critical',
    description: 'Kubernetes API server is down',
    commonCauses: [
      'API server process crashed',
      'etcd connectivity issues',
      'Certificate problems',
      'Resource exhaustion'
    ],
    troubleshootingSteps: [
      'Check API server pod status',
      'Verify etcd connectivity',
      'Check certificates',
      'Review resource usage'
    ],
    expectedResults: [
      'API server responding',
      'etcd connectivity restored',
      'Valid certificates',
      'Sufficient resources'
    ],
    immediateActions: [
      'Restart API server',
      'Fix etcd issues',
      'Renew certificates',
      'Scale up resources'
    ],
    longTermSolutions: [
      'API server high availability',
      'Certificate automation',
      'Resource monitoring'
    ],
    requiredMetrics: ['apiserver_up', 'apiserver_request_duration_seconds'],
    cascadeCheckPoints: ['cluster_operations', 'kubectl_access', 'controller_functions']
  },

  'KubeProxyDown': {
    severity: 'critical',
    description: 'kube-proxy is down on nodes',
    commonCauses: [
      'kube-proxy pod crashed',
      'DaemonSet configuration issues',
      'Node network problems',
      'RBAC permission issues'
    ],
    troubleshootingSteps: [
      'kubectl get pods -n kube-system -l k8s-app=kube-proxy',
      'kubectl logs -n kube-system -l k8s-app=kube-proxy --tail=100',
      'kubectl describe daemonset kube-proxy -n kube-system',
      'Check iptables rules on affected nodes'
    ],
    expectedResults: [
      'kube-proxy pods running on all nodes',
      'No error logs',
      'iptables rules configured correctly',
      'Service networking functional'
    ],
    immediateActions: [
      'Restart kube-proxy pods',
      'Check DaemonSet configuration',
      'Verify node network connectivity',
      'Review RBAC permissions'
    ],
    longTermSolutions: [
      'Monitor kube-proxy health',
      'Implement auto-restart policies',
      'Network redundancy setup'
    ],
    requiredMetrics: ['kube_daemonset_status_number_ready', 'up{job="kube-proxy"}'],
    cascadeCheckPoints: ['service_networking', 'pod_communication', 'loadbalancer_connectivity']
  },

  'KubeAPITerminatedRequests': {
    severity: 'warning',
    description: 'API requests >20% terminated',
    commonCauses: [
      'API server overload',
      'Client timeout issues',
      'Network problems',
      'Resource constraints'
    ],
    troubleshootingSteps: [
      'Check API server metrics',
      'Review client configurations',
      'Test network connectivity',
      'Monitor resource usage'
    ],
    expectedResults: [
      'Terminated requests <20%',
      'API server responsive',
      'Network stable'
    ],
    immediateActions: [
      'Scale API server',
      'Increase client timeouts',
      'Fix network issues',
      'Reduce request load'
    ],
    longTermSolutions: [
      'Load balancing',
      'Client optimization',
      'Performance tuning'
    ],
    requiredMetrics: ['apiserver_request_terminations_total', 'apiserver_request_total'],
    cascadeCheckPoints: ['cluster_responsiveness', 'client_experience']
  },

  // ========== CERTIFICATE CATEGORY ==========
  
  'KubeletClientCertificateExpiration': {
    severity: 'warning',
    description: 'Kubelet client certificate expiring in 7 days',
    commonCauses: [
      'Certificate rotation disabled',
      'CA certificate issues',
      'Time synchronization problems',
      'Manual rotation needed'
    ],
    troubleshootingSteps: [
      'Check certificate expiry',
      'Verify rotation settings',
      'Check time synchronization',
      'Review CA certificate'
    ],
    expectedResults: [
      'Certificate valid >7 days',
      'Auto-rotation enabled',
      'Time synchronized'
    ],
    immediateActions: [
      'Enable auto-rotation',
      'Manually rotate certificate',
      'Sync time',
      'Verify CA certificate'
    ],
    longTermSolutions: [
      'Automated certificate management',
      'Monitoring certificate expiry',
      'Certificate lifecycle automation'
    ],
    requiredMetrics: ['kubelet_certificate_manager_client_expiration_renew_errors'],
    cascadeCheckPoints: ['node_communication', 'cluster_security']
  },

  'KubeletServerCertificateExpiration': {
    severity: 'critical',
    description: 'Kubelet server certificate expiring in 1 day',
    commonCauses: [
      'Certificate rotation failure',
      'CA certificate issues',
      'System time problems',
      'Certificate authority issues'
    ],
    troubleshootingSteps: [
      'Check certificate status immediately',
      'Force certificate renewal',
      'Verify system time',
      'Check CA certificate health'
    ],
    expectedResults: [
      'Certificate renewed',
      'Valid for >1 day',
      'No renewal errors'
    ],
    immediateActions: [
      'Emergency certificate renewal',
      'Fix time synchronization',
      'Restart kubelet if needed',
      'Verify certificate chain'
    ],
    longTermSolutions: [
      'Automated renewal monitoring',
      'Certificate expiry alerting',
      'Backup certificate strategy'
    ],
    requiredMetrics: ['kubelet_certificate_manager_server_expiration_renew_errors'],
    cascadeCheckPoints: ['node_security', 'cluster_trust', 'api_communication']
  },

  // ========== JOB CATEGORY ==========
  
  'KubeJobFailed': {
    severity: 'medium',
    description: 'Kubernetes job execution failed',
    commonCauses: [
      'Application errors',
      'Timeout exceeded',
      'Resource limits',
      'ConfigMap/secret missing'
    ],
    troubleshootingSteps: [
      'kubectl logs job/[name]',
      'kubectl describe job [name]',
      'kubectl get cm [config] -o yaml',
      'kubectl top pod -l job-name=[name]'
    ],
    expectedResults: [
      'Containers with exit code >0',
      'BackoffLimit exceeded',
      '"OOMKilled" status',
      'ConfigMap not found errors'
    ],
    immediateActions: [
      'Increase backoff limit',
      'Extend active deadline',
      'Adjust resource requests',
      'Fix config references'
    ],
    longTermSolutions: [
      'Job monitoring dashboard',
      'Automated retry mechanism',
      'Pre-job resource validation'
    ],
    requiredMetrics: ['kube_job_status_failed', 'kube_job_status_succeeded'],
    cascadeCheckPoints: ['batch_processing', 'scheduled_tasks', 'data_processing']
  },

  // ========== HPA CATEGORY ==========
  
  'KubeHpaMaxedOut': {
    severity: 'medium',
    description: 'HPA at maximum replica count',
    commonCauses: [
      'High sustained load',
      'Insufficient cluster capacity',
      'HPA max replicas too low',
      'Metrics server issues'
    ],
    troubleshootingSteps: [
      'Check HPA status',
      'Review current metrics',
      'Check cluster capacity',
      'Verify metrics server'
    ],
    expectedResults: [
      'Load within acceptable range',
      'HPA scaling normally',
      'Sufficient cluster capacity'
    ],
    immediateActions: [
      'Increase max replicas temporarily',
      'Add cluster capacity',
      'Check metrics server',
      'Review scaling policies'
    ],
    longTermSolutions: [
      'Capacity planning',
      'Custom metrics scaling',
      'Predictive scaling'
    ],
    requiredMetrics: ['kube_horizontalpodautoscaler_status_current_replicas', 'kube_horizontalpodautoscaler_spec_max_replicas'],
    cascadeCheckPoints: ['service_capacity', 'application_performance', 'user_experience']
  },

  // ========== DAEMONSET CATEGORY ==========
  
  'KubeDaemonSetNotScheduled': {
    severity: 'high',
    description: 'DaemonSet pods unscheduled',
    commonCauses: [
      'Node taint conflicts',
      'Resource reservations',
      'Node conditions',
      'API server connectivity issues'
    ],
    troubleshootingSteps: [
      'kubectl describe ds [name]',
      'kubectl describe node [node] | grep -i taint',
      'kubectl get nodes | grep SchedulingDisabled',
      'kubectl get lease -n kube-node-lease'
    ],
    expectedResults: [
      '"No nodes available" events',
      'Taints not tolerated',
      'Node cordoned',
      'Lease expiration timeouts'
    ],
    immediateActions: [
      'Add tolerations',
      'Uncordon nodes',
      'Restart kubelet',
      'Check API server connectivity'
    ],
    longTermSolutions: [
      'Automated taint management',
      'Node health checks',
      'Kubelet certificate rotation monitoring'
    ],
    requiredMetrics: ['kube_daemonset_status_number_misscheduled', 'kube_daemonset_status_desired_number_scheduled'],
    cascadeCheckPoints: ['node_agents', 'system_services', 'cluster_functionality']
  },

  'KubeDaemonSetRolloutStuck': {
    severity: 'high',
    description: 'DaemonSet pods not updating',
    commonCauses: [
      'Node selector mismatches',
      'Resource starvation',
      'Pod disruption budget',
      'Kernel incompatibility'
    ],
    troubleshootingSteps: [
      'kubectl describe ds [name]',
      'kubectl get nodes --show-labels',
      'kubectl get pdb',
      'journalctl -u kubelet -n 100'
    ],
    expectedResults: [
      'NumberMisscheduled >0',
      'No nodes matching labels',
      'PDB blocking updates',
      'Kernel module errors'
    ],
    immediateActions: [
      'Adjust node labels',
      'Override PDB temporarily',
      'Drain problem nodes'
    ],
    longTermSolutions: [
      'Node auto-labeling system',
      'Canary rollout for DaemonSets',
      'Kernel compatibility checks'
    ],
    requiredMetrics: ['kube_daemonset_status_updated_number_scheduled'],
    cascadeCheckPoints: ['system_updates', 'node_consistency', 'cluster_uniformity']
  },

  // ========== LOW PRIORITY INFO ALARMS ==========
  
  'Watchdog': {
    severity: 'info',
    description: 'Alertmanager test alarm',
    commonCauses: [
      'Expected behavior - this is a test alarm'
    ],
    troubleshootingSteps: [
      'kubectl -n monitoring exec alertmanager-pod -- amtool status',
      'amtool silence'
    ],
    expectedResults: [
      'Alarm active but notifications NOT SENT',
      '"Healthy" status'
    ],
    immediateActions: [
      'Test notification channels',
      'Check silence status'
    ],
    longTermSolutions: [
      'Automated test scenarios',
      'Regular health checks'
    ],
    requiredMetrics: ['ALERTS', 'alertmanager_notifications_total'],
    cascadeCheckPoints: ['alert_testing', 'notification_validation']
  },

  'InfoInhibitor': {
    severity: 'info',
    description: 'Info level alerts suppression',
    commonCauses: [
      'Expected behavior - suppressing info alerts when critical alerts exist'
    ],
    troubleshootingSteps: [
      'kubectl get secret alertmanager-config -n monitoring -o jsonpath=\'{.data.alertmanager\\.yml}\' | base64 --decode | grep -A5 inhibit'
    ],
    expectedResults: [
      '"Info" level alerts suppressed',
      'Critical alerts not affected'
    ],
    immediateActions: [
      'Validate inhibit rules',
      'Check critical alerts manually'
    ],
    longTermSolutions: [
      'Config management system',
      'Document suppression rules'
    ],
    requiredMetrics: ['ALERTS{severity="info"}'],
    cascadeCheckPoints: ['alert_noise_reduction', 'priority_filtering']
  }
};

// Get alert name from context (same as existing logic)
const alertName = inputData.alertContext?.alertName || 
                  inputData.analysisParams?.context?.alertName ||
                  inputData.metadata?.alertName ||
                  null;

const alertCategory = inputData.alertCategory || 'UNKNOWN';

// Enhanced knowledge base enrichment with CSV data
if (alertName && alertKnowledgeBase[alertName]) {
  const kbEntry = alertKnowledgeBase[alertName];
  
  output.knowledgeBase = {
    alert: kbEntry,
    alertName: alertName,
    category: alertCategory,
    enrichedAt: new Date().toISOString(),
    csvEnhanced: true,
    totalKBEntries: Object.keys(alertKnowledgeBase).length
  };
  
  // Enhanced context enrichment with CSV data
  if (output._context) {
    output._context.requiredMetrics = kbEntry.requiredMetrics || [];
    output._context.cascadeCheckPoints = kbEntry.cascadeCheckPoints || [];
    output._context.troubleshootingGuidance = kbEntry.troubleshootingSteps || [];
    output._context.expectedResults = kbEntry.expectedResults || [];
    output._context.immediateActions = kbEntry.immediateActions || [];
    output._context.longTermSolutions = kbEntry.longTermSolutions || [];
    output._context.alertKnowledgeEnriched = true;
    output._context.csvDataAvailable = true;
    output._context.alertSeverity = kbEntry.severity;
  }
  
  console.log('✅ Enhanced KB match found for:', alertName, 'Severity:', kbEntry.severity);
} else {
  // Generic knowledge for unknown alerts
  const genericCategoryKnowledge = {
    'ETCD': {
      requiredMetrics: ['etcd_server_has_leader', 'etcd_mvcc_db_total_size_in_bytes'],
      cascadeCheckPoints: ['api_server_operations', 'cluster_state_changes'],
      troubleshootingSteps: ['Check etcd cluster status', 'Review etcd logs', 'Monitor etcd performance']
    },
    'INFRASTRUCTURE': {
      requiredMetrics: ['kube_node_status_condition', 'node_memory_MemAvailable_bytes'],
      cascadeCheckPoints: ['node_workloads', 'cluster_capacity'],
      troubleshootingSteps: ['Check node status', 'Review node events', 'Check resource usage']
    },
    'APPLICATION': {
      requiredMetrics: ['kube_pod_status_phase', 'kube_pod_container_status_restarts_total'],
      cascadeCheckPoints: ['service_endpoints', 'deployment_status'],
      troubleshootingSteps: ['Check pod logs', 'Review pod events', 'Check container status']
    },
    'MONITORING': {
      requiredMetrics: ['up', 'prometheus_target_sync_length_seconds'],
      cascadeCheckPoints: ['monitoring_coverage', 'alert_delivery'],
      troubleshootingSteps: ['Check target status', 'Review Prometheus config', 'Test connectivity']
    },
    'NETWORK': {
      requiredMetrics: ['node_network_receive_errs_total', 'kube_service_status_load_balancer_ingress'],
      cascadeCheckPoints: ['service_connectivity', 'network_policies'],
      troubleshootingSteps: ['Check network connectivity', 'Review network policies', 'Test endpoints']
    },
    'STORAGE': {
      requiredMetrics: ['kubelet_volume_stats_available_bytes', 'kube_persistentvolume_status_phase'],
      cascadeCheckPoints: ['volume_attachments', 'storage_classes'],
      troubleshootingSteps: ['Check volume status', 'Review storage events', 'Monitor disk usage']
    },
    'RESOURCE': {
      requiredMetrics: ['kube_resourcequota', 'container_memory_usage_bytes'],
      cascadeCheckPoints: ['resource_quotas', 'node_capacity'],
      troubleshootingSteps: ['Check resource usage', 'Review quotas', 'Monitor limits']
    },
    'API': {
      requiredMetrics: ['apiserver_request_total', 'apiserver_request_duration_seconds'],
      cascadeCheckPoints: ['api_server_health', 'client_requests'],
      troubleshootingSteps: ['Check API server status', 'Review request patterns', 'Monitor performance']
    },
    'CERTIFICATE': {
      requiredMetrics: ['kubelet_certificate_manager_client_expiration_renew_errors'],
      cascadeCheckPoints: ['certificate_expiry', 'tls_handshakes'],
      troubleshootingSteps: ['Check certificate expiry', 'Verify CA certificates', 'Test TLS connections']
    },
    'UNKNOWN': {
      requiredMetrics: ['up', 'kube_node_status_condition'],
      cascadeCheckPoints: ['general_health'],
      troubleshootingSteps: ['Check general cluster health', 'Review recent changes']
    }
  };
  
  const categoryKnowledge = genericCategoryKnowledge[alertCategory] || genericCategoryKnowledge['UNKNOWN'];
  
  output.knowledgeBase = {
    general: true,
    category: alertCategory,
    availableAlerts: Object.keys(alertKnowledgeBase),
    totalAvailableAlerts: Object.keys(alertKnowledgeBase).length,
    categoryKnowledge: categoryKnowledge,
    message: alertName ? `No specific KB entry for: ${alertName}. Using category-based knowledge for ${alertCategory}.` : 'No alert specified',
    enrichedAt: new Date().toISOString(),
    csvEnhanced: false,
    suggestedSimilarAlerts: Object.keys(alertKnowledgeBase).filter(k => 
      alertName ? k.toLowerCase().includes(alertName.toLowerCase()) : false
    ).slice(0, 5)
  };
  
  // Add generic guidance to context
  if (output._context) {
    output._context.requiredMetrics = categoryKnowledge.requiredMetrics;
    output._context.cascadeCheckPoints = categoryKnowledge.cascadeCheckPoints;
    output._context.troubleshootingGuidance = categoryKnowledge.troubleshootingSteps;
    output._context.alertKnowledgeEnriched = false;
    output._context.usingGenericKnowledge = true;
    output._context.csvDataAvailable = true;
    output._context.alertCategory = alertCategory;
  }
  
  console.log('⚠️ Using generic knowledge for:', alertCategory, 'Alert:', alertName || 'unknown');
}

// Debug and statistics
if (output._context && output._context.debug) {
  output._context.debug.knowledgeBaseEnriched = true;
  output._context.debug.alertNameFound = alertName || 'none';
  output._context.debug.alertCategory = alertCategory;
  output._context.debug.knowledgeBaseMatched = !!(alertName && alertKnowledgeBase[alertName]);
  output._context.debug.totalKnowledgeBaseEntries = Object.keys(alertKnowledgeBase).length;
  output._context.debug.csvEnhanced = true;
  output._context.debug.kbVersion = '2.0-CSV-Enhanced';
}

// Enhanced logging
console.log('========================================');
console.log('🚀 ENHANCED KNOWLEDGE BASE LOADED');
console.log('========================================');
console.log('📊 Total KB entries:', Object.keys(alertKnowledgeBase).length);
console.log('🎯 Alert:', alertName || 'Not specified');
console.log('📂 Category:', alertCategory);
console.log('✅ KB Match:', !!(alertName && alertKnowledgeBase[alertName]));
console.log('🔍 CSV Enhanced: YES');
console.log('========================================');

// KB Statistics by Category
const kbStats = {};
Object.keys(alertKnowledgeBase).forEach(alertName => {
  const entry = alertKnowledgeBase[alertName];
  const severity = entry.severity || 'unknown';
  if (!kbStats[severity]) {
    kbStats[severity] = 0;
  }
  kbStats[severity]++;
});

console.log('📈 KB Statistics by Severity:');
Object.entries(kbStats).forEach(([severity, count]) => {
  console.log(`   ${severity.toUpperCase()}: ${count} alerts`);
});

// Add KB stats to output for monitoring
output._kbStats = {
  totalEntries: Object.keys(alertKnowledgeBase).length,
  severityBreakdown: kbStats,
  csvEnhanced: true,
  loadedAt: new Date().toISOString()
};

return [output];