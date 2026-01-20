/**
 * Agent v2.0 - Interfaz mejorada para AyahuascaTrip
 * Características:
 * - Logging detallado de parámetros enviados
 * - Validación de configuración
 * - Soporte para system prompts
 * - Métricas de uso
 */
class Agent {
  constructor({ id, modelProvider, apiKey, model, debug = false }) {
    this.id = id;
    this.provider = modelProvider.toLowerCase();
    this.apiKey = apiKey || this.getApiKeyFromEnv();
    this.model = model || this.getDefaultModel();
    this.debug = debug;

    // Configuración del LLM (estado persistente)
    this.llmConfig = {
      temperature: 0.7,
      top_p: 0.9,
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
      max_tokens: 2000,
    };

    // System prompt (contexto persistente)
    this.systemPrompt = null;

    // Parámetros de efectos (metadatos del trip)
    this.tripState = {
      active: false,
      intensity: null,
      effects: {},
      startTime: null,
    };

    // Métricas
    this.metrics = {
      totalCalls: 0,
      totalTokens: 0,
      callsByPhase: {},
    };

    // Log de eventos
    this.events = [];
  }

  getApiKeyFromEnv() {
    if (typeof process !== "undefined" && process.env) {
      const envMap = {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        grok: process.env.GROQ_API_KEY,
      };
      return envMap[this.provider];
    }
    return null;
  }

  getDefaultModel() {
    const modelMap = {
      openai: "gpt-4o",
      anthropic: "claude-sonnet-4-20250514",
      grok: "grok-4-1-fast-reasoning",
    };
    return modelMap[this.provider] || "gpt-3.5-turbo";
  }

  /**
   * Configura el system prompt (contexto que persiste en todas las llamadas)
   */
  setSystemPrompt(prompt) {
    this.systemPrompt = prompt;
    if (this.debug) {
      console.log(
        `[Agent ${this.id}] System prompt configurado:`,
        prompt.substring(0, 100) + "...",
      );
    }
  }

  /**
   * Limpia el system prompt
   */
  clearSystemPrompt() {
    this.systemPrompt = null;
  }

  /**
   * Configura parámetros del LLM - REQUERIDO por AyahuascaTrip
   */
  setLLMConfig(config) {
    const oldConfig = { ...this.llmConfig };

    if (config.temperature !== undefined) {
      this.llmConfig.temperature = config.temperature;
    }
    if (config.top_p !== undefined) {
      this.llmConfig.top_p = config.top_p;
    }
    if (config.presence_penalty !== undefined) {
      this.llmConfig.presence_penalty = config.presence_penalty;
    }
    if (config.frequency_penalty !== undefined) {
      this.llmConfig.frequency_penalty = config.frequency_penalty;
    }
    if (config.max_tokens !== undefined) {
      this.llmConfig.max_tokens = config.max_tokens;
    }

    if (this.debug) {
      console.log(`[Agent ${this.id}] LLM Config actualizado:`, {
        old: oldConfig,
        new: this.llmConfig,
      });
    }
  }

  /**
   * Modifica el estado del trip - REQUERIDO por AyahuascaTrip
   */
  modifyParameters(params) {
    this.tripState = {
      ...this.tripState,
      ...params,
      active: true,
    };

    if (this.debug) {
      console.log(`[Agent ${this.id}] Trip state:`, this.tripState);
    }
  }

  /**
   * Registra eventos del trip
   */
  logEvent(event) {
    const logEntry = {
      ...event,
      agentId: this.id,
      timestamp: event.timestamp || Date.now(),
    };

    this.events.push(logEntry);

    if (this.debug) {
      console.log(`[Agent ${this.id}] Event:`, event.type, event);
    }
  }

  /**
   * MÉTODO PRINCIPAL: Genera respuesta fusionando configuraciones
   *
   * Estrategia de fusión:
   * 1. Parámetros inline (temp, top_p) > llmConfig si se proveen
   * 2. Penalties SIEMPRE vienen de llmConfig
   * 3. System prompt se añade automáticamente
   */
  async generate({
    prompt,
    temperature,
    top_p,
    max_tokens,
    phase = "unknown", // Para métricas
  }) {
    // FUSIÓN: inline override > llmConfig default
    const finalTemp = temperature ?? this.llmConfig.temperature;
    const finalTopP = top_p ?? this.llmConfig.top_p;
    const finalMaxTokens = max_tokens ?? this.llmConfig.max_tokens;

    // Construir el prompt completo con system prompt si existe
    const fullPrompt = this.systemPrompt
      ? `${this.systemPrompt}\n\n---\n\n${prompt}`
      : prompt;

    // Log de lo que realmente se enviará
    const apiCall = {
      provider: this.provider,
      model: this.model,
      temperature: finalTemp,
      top_p: finalTopP,
      max_tokens: finalMaxTokens,
      presence_penalty: this.llmConfig.presence_penalty,
      frequency_penalty: this.llmConfig.frequency_penalty,
      phase,
      promptLength: fullPrompt.length,
      hasSystemPrompt: !!this.systemPrompt,
    };

    if (this.debug) {
      console.log(`[Agent ${this.id}] 🚀 API Call:`, apiCall);
    }

    // Actualizar métricas
    this.metrics.totalCalls++;
    this.metrics.callsByPhase[phase] =
      (this.metrics.callsByPhase[phase] || 0) + 1;

    try {
      let response;
      switch (this.provider) {
        case "openai":
          response = await this.generateOpenAI(
            fullPrompt,
            finalTemp,
            finalTopP,
            finalMaxTokens,
          );
          break;
        /*case 'anthropic':
          response = await this.generateAnthropic(fullPrompt, finalTemp, finalTopP, finalMaxTokens);
          break;
        case 'grok':
          response = await this.generateGrok(fullPrompt, finalTemp, finalTopP, finalMaxTokens);
          break;*/
        default:
          throw new Error(`Proveedor no soportado: ${this.provider}`);
      }

      if (this.debug) {
        console.log(`[Agent ${this.id}] ✅ Response length:`, response.length);
      }

      return response;
    } catch (error) {
      console.error(`[Agent ${this.id}] ❌ Error:`, error.message);
      return `[ERROR ${this.provider}] ${error.message}`;
    }
  }

  /**
   * Método alternativo: usa solo llmConfig
   */
  async complete(prompt, phase = "unknown") {
    return await this.generate({
      prompt,
      temperature: this.llmConfig.temperature,
      top_p: this.llmConfig.top_p,
      max_tokens: this.llmConfig.max_tokens,
      phase,
    });
  }

  /**
   * OpenAI implementation
   */
  async generateOpenAI(prompt, temperature, top_p, max_tokens) {
    const body = {
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      top_p,
      max_tokens,
    };

    // Añadir penalties si no son 0
    if (this.llmConfig.presence_penalty !== 0) {
      body.presence_penalty = this.llmConfig.presence_penalty;
    }
    if (this.llmConfig.frequency_penalty !== 0) {
      body.frequency_penalty = this.llmConfig.frequency_penalty;
    }

    const response = await fetch("/api/openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const res = await fetch(`/api/openai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        perfil,
        messages: [recordatorio, ...conversationHistory],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI ${response.status}: ${errorData.error?.message || "Unknown"}`,
      );
    }

    const data = await response.json();

    // Actualizar métricas de tokens
    if (data.usage) {
      this.metrics.totalTokens += data.usage.total_tokens;
    }

    return data.choices[0].message.content;
  }

  /**
   * Anthropic implementation
   */
  /*async generateAnthropic(prompt, temperature, top_p, max_tokens) {
    // Advertencia: Anthropic no soporta penalties
    if (this.debug && (this.llmConfig.presence_penalty !== 0 || this.llmConfig.frequency_penalty !== 0)) {
      console.warn(`[Agent ${this.id}] ⚠️  Anthropic no soporta presence/frequency_penalty`);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens,
        temperature,
        top_p,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Anthropic ${response.status}: ${errorData.error?.message || 'Unknown'}`);
    }

    const data = await response.json();
    
    // Actualizar métricas de tokens
    if (data.usage) {
      this.metrics.totalTokens += data.usage.input_tokens + data.usage.output_tokens;
    }

    return data.content[0].text;
  }

  /**
   * Grok implementation
    */
  /*async generateGrok(prompt, temperature, top_p, max_tokens) {
    const body = {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      top_p,
      max_tokens
    };

    if (this.llmConfig.presence_penalty !== 0) {
      body.presence_penalty = this.llmConfig.presence_penalty;
    }
    if (this.llmConfig.frequency_penalty !== 0) {
      body.frequency_penalty = this.llmConfig.frequency_penalty;
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Grok ${response.status}: ${errorData.error?.message || 'Unknown'}`);
    }

    const data = await response.json();
    
    if (data.usage) {
      this.metrics.totalTokens += data.usage.total_tokens;
    }

    return data.choices[0].message.content;
  }*/

  /**
   * Obtiene métricas de uso
   */
  getMetrics() {
    return {
      ...this.metrics,
      tripActive: this.tripState.active,
      currentIntensity: this.tripState.intensity,
    };
  }

  /**
   * Obtiene el estado completo
   */
  getState() {
    return {
      id: this.id,
      provider: this.provider,
      model: this.model,
      llmConfig: { ...this.llmConfig },
      tripState: { ...this.tripState },
      hasSystemPrompt: !!this.systemPrompt,
      metrics: this.getMetrics(),
      eventCount: this.events.length,
    };
  }

  /**
   * Resetea el agente a estado inicial
   */
  reset() {
    this.llmConfig = {
      temperature: 0.7,
      top_p: 0.9,
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
      max_tokens: 2000,
    };
    this.systemPrompt = null;
    this.tripState = {
      active: false,
      intensity: null,
      effects: {},
      startTime: null,
    };
    this.events = [];

    if (this.debug) {
      console.log(`[Agent ${this.id}] 🔄 Reset completo`);
    }
  }

  getEvents() {
    return this.events;
  }

  clearEvents() {
    this.events = [];
  }
}

export default Agent;
