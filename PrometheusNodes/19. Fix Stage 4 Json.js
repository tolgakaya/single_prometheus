// Agent'tan gelen veriyi al
const items = $input.all();

// Dönüştürülmüş sonuçları tutacak array
const transformedItems = [];

for (const item of items) {
  try {
    let outputData;
    
    // Veriyi parse etmeye çalış
    if (typeof item.json.output === 'string') {
      // String JSON ise parse et
      outputData = JSON.parse(item.json.output);
    } else if (item.json.output && typeof item.json.output === 'object') {
      // Zaten object ise direkt kullan
      outputData = item.json.output;
    } else if (typeof item.json === 'string') {
      // Bazen direkt item.json string olabilir
      outputData = JSON.parse(item.json);
    } else {
      // Diğer durumlar için
      outputData = item.json;
    }
    
    // Eğer outputData hala output anahtarı içeriyorsa, onu çıkar
    if (outputData.output) {
      outputData = outputData.output;
    }
    
    // Stage 4 için gerekli alanları kontrol et ve varsayılan değerler ekle
    if (!outputData.stage) {
      outputData.stage = "automated_diagnosis";
    }
    
    // diagnostics_executed kontrolü
    if (!outputData.diagnostics_executed) {
      outputData.diagnostics_executed = [];
    }
    
    // enriched_context kontrolü
    if (!outputData.enriched_context) {
      outputData.enriched_context = {
        deployment_info: {},
        recent_changes: [],
        dependencies: {
          upstream: [],
          downstream: [],
          databases: [],
          external: []
        }
      };
    }
    
    // diagnostic_summary kontrolü
    if (!outputData.diagnostic_summary) {
      outputData.diagnostic_summary = {
        confirmed_issues: [],
        secondary_issues: []
      };
    }
    
    // Boolean alanları kontrol et
    if (outputData.proceed_to_stage5 === undefined) {
      outputData.proceed_to_stage5 = false;
    }
    
    // remediation_confidence kontrolü
    if (outputData.remediation_confidence === undefined) {
      outputData.remediation_confidence = 0;
    }
    
    // _context kontrolü ve düzeltmesi
    if (!outputData._context || typeof outputData._context === 'string') {
      // Eğer string ise veya yoksa, boş object yap
      outputData._context = {
        contextId: typeof outputData._context === 'string' ? outputData._context : "",
        createdAt: new Date().toISOString()
      };
    }
    
    // Circular reference'ları temizle
    if (outputData._context && outputData._context === "[Circular Reference]") {
      outputData._context = {};
    }
    
    // stageResults içindeki circular reference'ları temizle
    if (outputData._context && outputData._context.stageResults) {
      cleanCircularReferences(outputData._context.stageResults);
    }
    
    // _debug alanını kontrol et
    if (!outputData._debug) {
      outputData._debug = {
        nodeType: "Stage 4: Automated Diagnosis",
        processedAt: new Date().toISOString(),
        contextId: outputData._context.contextId || "",
        contextPreserved: true
      };
    }
    
    // Sonucu format et
    const transformedItem = {
      json: {
        output: outputData
      }
    };
    
    transformedItems.push(transformedItem);
    
  } catch (error) {
    // Hata durumunda log ve orijinal veriyi döndür
    console.error('Parse error:', error.message);
    transformedItems.push({
      json: {
        error: error.message,
        originalData: item.json
      }
    });
  }
}

// Circular reference temizleme fonksiyonu
function cleanCircularReferences(obj) {
  if (!obj || typeof obj !== 'object') return;
  
  for (const key in obj) {
    if (obj[key] === "[Circular Reference]") {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      cleanCircularReferences(obj[key]);
    }
  }
}

return transformedItems;