// Agent'tan gelen veriyi al
const items = $input.all();

// FIX: Priority 6 - Context Recovery from Previous Node
// AI Agent only returns minimal context, we need to recover full context
let previousNodeData = {};
try {
  const forceDeepAnalysisNode = $node["Force Deep Analysis Override"];
  if (forceDeepAnalysisNode?.json) {
    previousNodeData = forceDeepAnalysisNode.json;
    console.log("✅ Context recovered from Force Deep Analysis Override");
  }
} catch(e) {
  console.log("⚠️ Previous node not available, context may be incomplete");
}

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

    // FIX: Priority 6 - Context Recovery with Full Preservation
    // Merge with previous node's complete context instead of creating minimal context
    const previousContext = previousNodeData._context || {};

    if (typeof parsedData._context === 'string') {
      // Agent returned contextId as string
      parsedData._context = {
        ...previousContext,  // ✅ Preserve ALL previous context
        contextId: parsedData._context,
        updatedAt: new Date().toISOString()
      };
    } else if (!parsedData._context || Object.keys(parsedData._context).length < 3) {
      // Agent returned minimal or no context
      parsedData._context = {
        ...previousContext,  // ✅ Preserve ALL previous context
        ...(parsedData._context || {}),  // Merge any AI-provided context
        updatedAt: new Date().toISOString()
      };
    }

    // Preserve knowledge base data
    if (!parsedData.knowledgeBase && previousNodeData.knowledgeBase) {
      parsedData.knowledgeBase = previousNodeData.knowledgeBase;
    }

    // Preserve category-specific data
    if (!parsedData.deepAnalysisHints && previousNodeData.deepAnalysisHints) {
      parsedData.deepAnalysisHints = previousNodeData.deepAnalysisHints;
    }

    // Preserve stage 1 results
    if (!parsedData.stage1Results && previousNodeData.stage1Results) {
      parsedData.stage1Results = previousNodeData.stage1Results;
    }
    if (!parsedData.stage1Data && previousNodeData.stage1Data) {
      parsedData.stage1Data = previousNodeData.stage1Data;
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