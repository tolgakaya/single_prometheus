Flowun amacı prometheus api'sini kullanan agentlarla Kubernetes ortamında yer alan infrustrure , kubernetes ve uygulama metriklerini sorgulayıp anomali ve problem tespitini yapmak. Eğer bir problem yoksa yada varsa bunu raporlamak.

Bunu 6 ayrı stage'te yer alan agentlarla yapıyor. Flowun tamamı burada FreePrometheus\FreePrometheusFlow.json. Ayrıca her bir node'un içeriği ise bu klasör altında sıra numarası ile verilmiş js ve txt dosyalarında FreePrometheus\PrometheusNodes.

Flowun amacına uygun olarak her bir stage ile hedeflenen şeyi sana vereceğim ve bu hedef ve amaca uygun olarak yeni bir node eklemeden mevcut nodelar ve agent promptlarındaki geliştirmelerle flowun amacını gerçekleştirmek üzere değişiklikler yapacağız.

Genel kurallar şunlar:
1. Bana söylemeden hiçbir node silmeyecek ve hiçbir şekilde yeni bir node ekleyerek çözüm üretmeyeceksin.
2. Bütün geliştirmeyi bir dokümanda planlayıp, her bir adımda bu dokümanı güncelleyerek takip edeceksin.
3. Her bir stage için geliştirme hedefine uygun olarak maksimum ölçüde agent'ın AI'ından faydalanacak çözümler üreteceksin. Mümkün olduğu kadar rule based bir yaklaşım istemiyorum
4. Bir node içeriğinde bir şey değiştirirken bu değişikliğin önceki nodelardaki veriyi doğru aldığına emin olmalısın.
5. Bir node içeriğinde bir şey değiştirirken dhaa önceki node'larla veri bakımından tam olarak uyumlu olduğundan emin olman gerek. 
6. Her bir stage'in amacı dışında bir şey yapmamalısın.
7. Her bir stage'teki toollar'ı flowun tam halinde görebilirsin. FreePrometheus\FreePrometheusFlow.json
8. Yaptığın değişiklikleri ana flow dosyasınd adeğil node dosyalarında yapacaksın. Bunlar biliyorsun FreePrometheus\PrometheusNodes klasörü içinde sıra numarası ile verilmiş duurumda.
9. Promtlara çok dikkat et, gerekzi ve kafa karıştırıcı bir şey olmamalı ve amaç net bir şekilde belirtilmeli ve AI'dan maksimum fayda sağlamak için optimize edilmeli.
10. Her bir agent'ın duruma göre doğru tooları kullandığından emin olmalısın.
11. Sorgularda bir değişiklik yapman gerekirse, asla basitleştirme yoluna gitmemelisin ve her bir sorgu parametrenin amacı dışınd ayeni sorgu yazmamalısın.
12. Servis ismi ve namespace kullanılan veya kullanılması gerek sorgular olursa burada namespace listesini ve servis listesini services.txt dosyasından alarak tamamını kullanmalı ve sorguyu bu haliyle yazmalı yada düzeltmelisin.

Bu genel kuralları her bir session'da yeniden okuyacaksın. 

A. Stage 1: Health Snapshot ile başlayalım:
1. Buradaki amaç hızlı bir şekilde promotheus metrilerinde genel sağlık duurmunu kontrol etmek  bir problem olmaıs durumunda derin analize karar vermek
2. FreePrometheus\stage1.png dosyasından bu ilk aşamayı görebilirsin. 
3. Manuel Trigger yada Scheduled Trigger ile flow başlıyor

Manuel Trigger -> Orchestrator Input Handler -> Unified Entry Point -> Load Alert Knowledge Base -> Prepare Stage 1 Input -> Stage 1: Health Snapshot (Agent, burada iki http toolu var) -> Fix Stage 1 Context -> Stage 2 Decision -> If Node

Stage 1: Health Snapshot Toolları şunlar
a. Quick Cluster Health
Kullanılan parametre ise şöyle:
(sum(kube_node_status_condition{condition="Ready",status="false",namespace=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod"} == 1) > 0) 
or 
(sum(rate(kube_pod_container_status_restarts_total{namespace=~"bstp-cms-global-production|bstp-cms-prod-v3|em-global-prod-3pp|em-global-prod-eom|em-global-prod-flowe|em-global-prod|em-prod-3pp|em-prod-eom|em-prod-flowe|em-prod|etiyamobile-production|etiyamobile-prod"}[5m]) > 0.1) > 0)

b. Active Alerts Count
Kullanılan parametre ise şöyle:
count by (alertname, severity) (ALERTS{alertstate="firing"})


B. Stage 2: Deep Analysis
1. Buradaki amaç Stage 1'de bulunan problem ve anomaliler sebebiyle daha derinlemesine analiz yapmak.
2. FreePrometheus\stage2.png dosyasından bu ilk aşamayı görebilirsin. 

-> If Node -> Force Deep Analysis Override -> Stage 2: Deep Analysis (Agent, burada agent'ın kullanması için çok sayıda http tool var) -> Fix Stage2 Json

Stage 2: Deep Analysis Toolları şunlar:

a. Node Resource Status
   parametreler ise şöyle:
   topk(10, (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100) or topk(10, 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)) or topk(10, (1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100)

b. Node Conditions
   parametreler ise şöyle:
   kube_node_status_condition{condition=~"Ready|MemoryPressure|DiskPressure|PIDPressure|NetworkUnavailable"} == 1

c. Pod Status Check
   parametreler ise şöyle:
   {{ 
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';
  
  if (svc) {
    return `kube_pod_container_status_restarts_total{namespace="${ns}", pod=~".*${svc}.*"} or kube_pod_container_status_waiting_reason{namespace="${ns}", pod=~".*${svc}.*"} or kube_pod_status_phase{namespace="${ns}", pod=~".*${svc}.*"}`;
  } else {
    // Rate filtresi yerine, restart count > 0 olan pod'ları göster
    return `topk(20, kube_pod_container_status_restarts_total{namespace="${ns}"} > 0) or topk(20, kube_pod_container_status_waiting_reason{namespace="${ns}", reason!='ContainerCreating'}) or topk(20, kube_pod_status_phase{namespace="${ns}", phase=~'Failed|Unknown|Pending'} == 1)`;
  }
})()
}}
d. Node Network Health
   parametreler ise şöyle:
   {{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  
  // Node metriklerine namespace filtresi ekleyemeyiz, sadece genel node network health
  return `sum by (node, device) (rate(node_network_receive_errs_total{device!~"lo|veth.*|docker.*|flannel.*|cali.*|cbr.*"}[5m])) > 0 or sum by (node, device) (rate(node_network_transmit_errs_total{device!~"lo|veth.*|docker.*|flannel.*|cali.*|cbr.*"}[5m])) > 0 or sum by (node) (rate(node_network_receive_drop_total[5m])) > 0`;
})()
}}

e. Container Restarts
   {{ 
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';
  
  if (svc) {
    return `topk(10, sum by (namespace, pod, container) (kube_pod_container_status_restarts_total{namespace="${ns}", pod=~".*${svc}.*"})) or topk(10, sum by (namespace, pod, container, reason) (kube_pod_container_status_last_terminated_reason{namespace="${ns}", pod=~".*${svc}.*", reason!="Completed"}))`;
  } else {
    return `topk(10, sum by (namespace, pod, container) (kube_pod_container_status_restarts_total)) or topk(10, sum by (namespace, pod, container, reason) (kube_pod_container_status_last_terminated_reason{reason!="Completed"}))`;
  }
})()
}}

f. Application Metrics
   parametreler ise şöyle:
   {{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';
  
  // Farklı metrik kombinasyonları deneyelim
  if (svc) {
    // Service-specific metrics - container network metrikleri kullanarak
    return `topk(10, sum by (namespace, pod) (rate(container_network_receive_bytes_total{namespace="${ns}", pod=~".*${svc}.*"}[5m]))) or topk(10, sum by (namespace, pod) (rate(container_network_transmit_bytes_total{namespace="${ns}", pod=~".*${svc}.*"}[5m])))`;
  } else {
    // Genel namespace metrikleri
    return `topk(10, sum by (namespace, pod) (rate(container_network_receive_bytes_total{namespace="${ns}"}[5m]))) or topk(10, sum by (namespace, pod) (rate(container_network_transmit_bytes_total{namespace="${ns}"}[5m])))`;
  }
})()
}} 100)

g. HTTP Error Rates
   parametreler ise şöyle:
   {{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';
  
  if (svc) {
    // Pod failure rate as proxy for errors
    return `topk(10, sum by (namespace, pod) (kube_pod_status_phase{namespace="${ns}", pod=~".*${svc}.*", phase=~"Failed|Unknown"} == 1)) or topk(10, sum by (namespace, pod, reason) (kube_pod_container_status_waiting_reason{namespace="${ns}", pod=~".*${svc}.*", reason!="ContainerCreating"}))`;
  } else {
    return `topk(10, sum by (namespace, pod) (kube_pod_status_phase{namespace="${ns}", phase=~"Failed|Unknown"} == 1)) or topk(10, sum by (namespace, pod, reason) (kube_pod_container_status_waiting_reason{namespace="${ns}", reason!="ContainerCreating"}))`;
  }
})()
}}

h. Pod Resource Usage
   parametreler ise şöyle:
   {{ 
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';
  
  if (svc) {
    // Limit olmasa bile memory usage göster
    return `topk(10, container_memory_working_set_bytes{namespace="${ns}", pod=~".*${svc}.*", container!=""}) or topk(10, rate(container_cpu_usage_seconds_total{namespace="${ns}", pod=~".*${svc}.*", container!=""}[5m]))`;
  } else {
    return `topk(10, container_memory_working_set_bytes{namespace="${ns}", container!=""}) or topk(10, rate(container_cpu_usage_seconds_total{namespace="${ns}", container!=""}[5m]))`;
  }
})()
}}

i. Resource Exhaustion Prediction
   parametreler ise şöyle:
   {{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';
  
  if (svc) {
    return `predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 4*3600) < 0 or predict_linear(container_memory_working_set_bytes{namespace="${ns}", pod=~".*${svc}.*"}[1h], 4*3600) > container_spec_memory_limit_bytes{namespace="${ns}", pod=~".*${svc}.*"} or predict_linear(kubelet_volume_stats_available_bytes{namespace="${ns}", persistentvolumeclaim=~".*${svc}.*"}[1h], 4*3600) < 1073741824`;
  } else {
    return `predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 4*3600) < 0 or predict_linear(node_memory_MemAvailable_bytes[1h], 4*3600) < 1073741824 or predict_linear(kubelet_volume_stats_available_bytes[1h], 4*3600) < 1073741824 or (kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) > 0.85`;
  }
})()
}}

j. Historical Comparison 24h
   parametreler ise şöyle:
   {{ 
(() => {
  // Default metric query
  let metricQuery = $json.metric_query || 'up{job="kubernetes-nodes"}';
  const svc = $json.service || '';
  
  // Eğer service varsa ve default metric ise, pod metric'e çevir
  if (svc && metricQuery === 'up{job="kubernetes-nodes"}') {
    metricQuery = `kube_pod_container_status_restarts_total{pod=~".*${svc}.*"}`;
  }
  
  return metricQuery;
})()
}}

k. Kubernetes PVC Status
   parametreler ise şöyle:
   {{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';
  
  if (svc) {
    return `(kubelet_volume_stats_used_bytes{namespace="${ns}", persistentvolumeclaim=~".*${svc}.*"} / kubelet_volume_stats_capacity_bytes{namespace="${ns}", persistentvolumeclaim=~".*${svc}.*"} > 0.8) * on(namespace, persistentvolumeclaim) group_left(storageclass, volumename) kube_persistentvolumeclaim_info{namespace="${ns}", persistentvolumeclaim=~".*${svc}.*"} or kube_persistentvolumeclaim_status_phase{namespace="${ns}", persistentvolumeclaim=~".*${svc}.*", phase!="Bound"} == 1`;
  } else {
    return `(kubelet_volume_stats_used_bytes{namespace="${ns}"} / kubelet_volume_stats_capacity_bytes{namespace="${ns}"} > 0.8) * on(namespace, persistentvolumeclaim) group_left(storageclass, volumename) kube_persistentvolumeclaim_info{namespace="${ns}"} or kube_persistentvolumeclaim_status_phase{namespace="${ns}", phase!="Bound"} == 1`;
  }
})()
}}

l. Kubernetes HPA Status
   parametreler ise şöyle:
   {{
(() => {
  const ns = $json.namespace || 'etiyamobile-production';
  const svc = $json.service || '';
  
  if (svc) {
    return `(kube_horizontalpodautoscaler_status_current_replicas{namespace="${ns}", horizontalpodautoscaler=~".*${svc}.*"} / kube_horizontalpodautoscaler_spec_max_replicas{namespace="${ns}", horizontalpodautoscaler=~".*${svc}.*"}) > 0.9 or kube_horizontalpodautoscaler_status_condition{namespace="${ns}", horizontalpodautoscaler=~".*${svc}.*", condition="ScalingLimited", status="true"} == 1`;
  } else {
    return `(kube_horizontalpodautoscaler_status_current_replicas{namespace="${ns}"} / kube_horizontalpodautoscaler_spec_max_replicas{namespace="${ns}"}) > 0.9 or (kube_horizontalpodautoscaler_status_current_replicas{namespace="${ns}"} == kube_horizontalpodautoscaler_spec_max_replicas{namespace="${ns}"}) or kube_horizontalpodautoscaler_status_condition{namespace="${ns}", condition="ScalingLimited", status="true"} == 1`;
  }
})()
}}

C. Stage 3: Alert Intelligence
1. Bu stage'teki amaç birinci ve ikinci stage bulguları üzerine alertler konusunda derinlemesine inceleme yapmaktır.
2. Flowun bu parçasının görselini şurada görebilirsin. FreePrometheus\stage3.png


-> Fix Stage 2 Context -> Stage 3: Alert Intelligence (Agent, 7 tane http tool ile promtheus sorguları yapabilir) -> Fix Stage 3 Context1

Stage 3: Alert Intelligence Toolları şunlar:

a. Alert History 24h
   parametreler ise şöyle:
   count by (alertname, severity) (ALERTS{alertstate="firing"})

b. Active Alerts Details
   parametreler ise şöyle:
   ALERTS{alertstate="firing",alertname=~"Kube.*|Container.*|Pod.*|Node.*"}

c. Pod Ready SLO
   parametreler ise şöyle:
   {{
(() => {
  const ns = $json.namespace || $json._context?.initialParams?.namespaces?.[0] || 'etiyamobile-production';
  const svc = $json.service || $json.output?.correlation_matrix?.affected_services?.[0] || '';
  
  if (svc) {
    return `(sum(kube_pod_status_ready{namespace="${ns}", pod=~".*${svc}.*", condition="true"}) / count(kube_pod_info{namespace="${ns}", pod=~".*${svc}.*"})) * 100`;
  } else {
    return `(sum(kube_pod_status_ready{namespace="${ns}", condition="true"}) / count(kube_pod_info{namespace="${ns}"})) * 100`;
  }
})()
}}

d. Node Ready SLO
   parametreler ise şöyle:
   {{
(() => {
  // Node metrikleri cluster seviyesinde, service filtresi uygulanamaz
  return `(sum(kube_node_status_condition{condition="Ready",status="true"}) / count(kube_node_info)) * 100`;
})()
}}

e. Container Running SLO
   parametreler ise şöyle:
   {{
(() => {
  const ns = $json.namespace || $json._context?.initialParams?.namespaces?.[0] || 'etiyamobile-production';
  const svc = $json.service || $json.output?.correlation_matrix?.affected_services?.[0] || '';
  
  if (svc) {
    return `(count(kube_pod_container_status_running{namespace="${ns}", pod=~".*${svc}.*"} == 1) / count(kube_pod_container_info{namespace="${ns}", pod=~".*${svc}.*"})) * 100`;
  } else {
    return `(count(kube_pod_container_status_running{namespace="${ns}"} == 1) / count(kube_pod_container_info{namespace="${ns}"})) * 100`;
  }
})()
}}

f. Pod Restart Rate SLO
   parametreler ise şöyle:
   {{
(() => {
  const ns = $json.namespace || $json._context?.initialParams?.namespaces?.[0] || 'etiyamobile-production';
  const svc = $json.service || $json.output?.correlation_matrix?.affected_services?.[0] || '';
  
  if (svc) {
    return `100 - (sum(rate(kube_pod_container_status_restarts_total{namespace="${ns}", pod=~".*${svc}.*"}[1h])) * 100)`;
  } else {
    return `100 - (sum(rate(kube_pod_container_status_restarts_total{namespace="${ns}"}[1h])) * 100)`;
  }
})()
}}

g. Deployment Replica Health
   parametreler ise şöyle:
  {{
(() => {
  const ns = $json.namespace || $json._context?.initialParams?.namespaces?.[0] || 'etiyamobile-production';
  const svc = $json.service || $json.output?.correlation_matrix?.affected_services?.[0] || '';
  
  if (svc) {
    return `(sum(kube_deployment_status_replicas_available{namespace="${ns}", deployment=~".*${svc}.*"}) / sum(kube_deployment_status_replicas{namespace="${ns}", deployment=~".*${svc}.*"})) * 100`;
  } else {
    return `(sum(kube_deployment_status_replicas_available{namespace="${ns}"}) / sum(kube_deployment_status_replicas{namespace="${ns}"})) * 100`;
  }
})()
}}

D. Stage 4: Automated Diagnosis
1. Bu stage'teki amaç "Automated Diagnosis & Deep Dive - Execute targeted diagnostics based on previous findings."
2. Flowun bu parçasının görselini şurada görebilirsin. FreePrometheus\stage4.png

 -> Stage 4: Automated Diagnosis (Agent, hiç bir tool yok) -> Fix Stage 4 Json->


E. Stage 5: Smart Remediation
1. Bu stage'teki amaç "Generate remediation plan based on all findings."
2. Flowun bu parçasının görselini şurada görebilirsin. FreePrometheus\stage5.png

 Fix Stage 4 Context -> Stage 5: Smart Remediation (Agent, hiç bir tool yok) -> 


F. Stage 6: Prevention & Learning
1. Bu stage'teki amaç "You are the Prevention specialist, implementing long-term fixes and capturing learnings."
2. Flowun bu parçasının görselini şurada görebilirsin. FreePrometheus\stage6.png

 Fix Stage 5 Context -> Stage 6: Prevention & Learning (Agent, hiç bir tool yok) -> Generate Final Report