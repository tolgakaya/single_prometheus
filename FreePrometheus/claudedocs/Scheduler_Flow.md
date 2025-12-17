Yeni bir flow oluşturdum. Burada her bir node'un bağlantıları korunarak içeirklerinin düzenlenmesi ve konfigüre edilmesi gerekiyor. FreePrometheus\Scheduler Cluster Health Flow.json

Bu flow schedule olarak üzerinde çalışıp sonlandırdığımız 
1. FreePrometheus\FreePrometheusFlow.json flowunu tetikleyecek. Gelen çıktıyı
2. FreePrometheus\PrometheusNodes\20. Generate Final Report Output.json outputundaki gibi alacak. (Process Results & Decision node)
3. Gelen output'tan ilgili bir alandan (burası neresi olabilir bilmiyorum) minik bir finger print oluşturacak
4. Oluşan bu finger print ile redise get yapıp kontrol edecek(Redis State Check node)
5. Eğer redis te bu finger print yoksa redise yazacak(Prepare Redis Data node)
6. Eğer daha önceden yoksa jira ticket oluşturacak
7. Varsa ilgili ticket'ı bulup copmment ekleyecek

Flowun yapısını bozmadan her bir node için farklı bir dosya oluştur ve o dosyaya içeriği yaz ben manuel olarak implemente edeceğim.