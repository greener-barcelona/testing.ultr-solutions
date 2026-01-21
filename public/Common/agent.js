class Agent {
  constructor({ id, modelProvider, debug = false, perfil }) {
    this.id = id;
    this.provider = modelProvider.toLowerCase();
    this.debug = debug;

    if (perfil && (!perfil.role || !perfil.content)) {
      throw new Error("perfil debe tener propiedades {role, content}");
    }
    this.perfil = perfil;

    this.llmConfig = {
      temperature: 0.7,
      top_p: 0.9,
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
      max_tokens: 5000,
    };

    this.systemPrompt = null;

    this.tripState = {
      active: false,
      intensity: null,
      effects: {},
      startTime: null,
    };

    this.metrics = {
      totalCalls: 0,
      totalTokens: 0,
      callsByPhase: {},
    };

    this.events = [];
  }

  setSystemPrompt(prompt) {
    this.systemPrompt = prompt;
    if (this.debug) {
      console.log(
        `[Agent ${this.id}] System prompt configurado:`,
        prompt.substring(0, 100) + "...",
      );
    }
  }

  clearSystemPrompt() {
    this.systemPrompt = null;
  }

  setPerfil(perfil) {
    if (perfil && (!perfil.role || !perfil.content)) {
      throw new Error("perfil debe tener propiedades {role, content}");
    }

    this.perfil = perfil;
    if (this.debug) {
      console.log(
        `[Agent ${this.id}] Perfil configurado:`,
        perfil?.content.substring(0, 100) + "...",
      );
    }
  }

  clearPerfil() {
    this.perfil = null;
  }

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

  async generate({
    prompt,
    temperature,
    top_p,
    max_tokens,
    phase = "unknown",
  }) {
    if (!Array.isArray(prompt)) {
      throw new Error("prompt debe ser un array de mensajes");
    }

    const isValid = prompt.every(
      (msg) => msg && typeof msg === "object" && msg.role && msg.content,
    );

    if (!isValid) {
      throw new Error("Cada mensaje debe tener {role, content}");
    }

    const finalTemp = (temperature ?? this.llmConfig.temperature) > 1.7 ? 1.7 : (temperature ?? this.llmConfig.temperature);
    const finalTopP = top_p ?? this.llmConfig.top_p;
    const finalMaxTokens = max_tokens ?? this.llmConfig.max_tokens;

    const apiCall = {
      provider: this.provider,
      temperature: finalTemp,
      top_p: finalTopP,
      max_tokens: finalMaxTokens,
      presence_penalty: this.llmConfig.presence_penalty,
      frequency_penalty: this.llmConfig.frequency_penalty,
      phase,
      promptMessagesCount: prompt.length,
      systemPromptLength: this.systemPrompt?.length || 0,
      hasSystemPrompt: !!this.systemPrompt,
      hasPerfil: !!this.perfil,
    };

    if (this.debug) {
      console.log(`[Agent ${this.id}] 🚀 API Call:`, apiCall);
    }

    this.metrics.totalCalls++;
    this.metrics.callsByPhase[phase] =
      (this.metrics.callsByPhase[phase] || 0) + 1;

    try {
      let response;
      switch (this.provider) {
        case "openai":
          response = await this.generateOpenAI(
            prompt,
            finalTemp,
            finalTopP,
            finalMaxTokens,
          );
          break;
        default:
          throw new Error(`Proveedor no soportado: ${this.provider}`);
      }

      if (this.debug) {
        console.log(`[Agent ${this.id}] ✅ Response length:`, response.reply.length);
      }

      return response;
    } catch (error) {
      console.error(`[Agent ${this.id}] ❌ Error:`, error.message);
      return `[ERROR ${this.provider}] ${error.message}`;
    }
  }

  async complete(prompt, phase = "unknown") {
    return await this.generate({
      prompt,
      temperature: this.llmConfig.temperature,
      top_p: this.llmConfig.top_p,
      max_tokens: this.llmConfig.max_tokens,
      phase,
    });
  }

  async generateOpenAI(prompt, temperature, top_p, max_tokens) {
    const messages = [...prompt];

    if (this.systemPrompt) {
      messages.unshift({
        role: "system",
        content: this.systemPrompt,
      });
    }

    const body = {
      perfil: this.perfil || "",
      messages: messages,
      temperature,
      top_p,
      max_tokens,
    };

    if (this.llmConfig.presence_penalty !== 0) {
      body.presence_penalty = this.llmConfig.presence_penalty;
    }
    if (this.llmConfig.frequency_penalty !== 0) {
      body.frequency_penalty = this.llmConfig.frequency_penalty;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);

    try {
      const response = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenAI ${response.status}: ${errorData.error?.message || "Unknown"}`,
        );
      }

      const data = await response.json();

      if (data.usage) {
        this.metrics.totalTokens += data.usage.total_tokens;
      }

      return data;
    } catch (error) {
      clearTimeout(timeout);

      if (error.name === "AbortError") {
        throw new Error("Request timeout después de 30s");
      }
      throw error;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      tripActive: this.tripState.active,
      currentIntensity: this.tripState.intensity,
    };
  }

  getState() {
    return {
      id: this.id,
      provider: this.provider,
      llmConfig: { ...this.llmConfig },
      tripState: { ...this.tripState },
      hasSystemPrompt: !!this.systemPrompt,
      hasPerfil: !!this.perfil,
      metrics: this.getMetrics(),
      eventCount: this.events.length,
    };
  }

  reset() {
    this.llmConfig = {
      temperature: 0.7,
      top_p: 0.9,
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
      max_tokens: 5000,
    };
    this.systemPrompt = null;
    this.perfil = null;
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
