// Agent'tan gelen veriyi al
const items = $input.all();

// Dönüştürülmüş sonuçları tutacak array
const transformedItems = [];

for (const item of items) {
  try {
    // Agent'ın output'u string olarak geliyor, önce parse edelim
    let parsedData;
    
    if (typeof item.json.output === 'string') {
      // String JSON'ı parse et
      parsedData = JSON.parse(item.json.output);
    } else if (typeof item.json === 'string') {
      // Bazen direkt item.json string olabilir
      parsedData = JSON.parse(item.json);
    } else {
      // Zaten object ise
      parsedData = item.json.output || item.json;
    }
    
    // _context'i düzelt - eğer string ise object'e çevir
    if (typeof parsedData._context === 'string') {
      parsedData._context = {
        contextId: parsedData._context
      };
    } else if (!parsedData._context) {
      parsedData._context = {};
    }
    
    // Eksik alanları kontrol et ve varsayılan değerler ekle
    if (!parsedData.execution_phases) {
      parsedData.execution_phases = {
        instant: { tools_used: [], findings: {} },
        trend: { tools_used: [], findings: {} },
        anomaly: { tools_used: [], findings: {} }
      };
    }
    
    if (!parsedData.correlation_matrix) {
      parsedData.correlation_matrix = {
        primary_chain: "",
        affected_services: [],
        blast_radius: "",
        kubernetes_impact: {
          evicted_pods: 0,
          pending_pods: 0,
          failed_schedules: 0
        }
      };
    }
    
    if (!parsedData.root_cause) {
      parsedData.root_cause = {
        identified: false,
        component: "",
        issue: "",
        evidence: [],
        confidence: 0
      };
    }
    
    // Eksik boolean alanları ekle
    if (parsedData.proceed_to_stage3 === undefined) {
      parsedData.proceed_to_stage3 = false;
    }
    
    if (parsedData.alert_correlation_needed === undefined) {
      parsedData.alert_correlation_needed = false;
    }
    
    // _debug alanını kontrol et
    if (!parsedData._debug) {
      parsedData._debug = {
        nodeType: "Stage 2: Deep Analysis",
        processedAt: new Date().toISOString(),
        contextId: parsedData._context.contextId || "",
        contextPreserved: true,
        receivedFromStage: "",
        stageSequence: []
      };
    }
    
    // Sonucu eski formata uygun şekilde wrap et
    const transformedItem = {
      json: {
        output: parsedData
      }
    };
    
    transformedItems.push(transformedItem);
    
  } catch (error) {
    // Hata durumunda orijinal veriyi döndür ve hata mesajı ekle
    console.error('Parse error:', error.message);
    transformedItems.push({
      json: {
        error: error.message,
        originalData: item.json
      }
    });
  }
}

return transformedItems;