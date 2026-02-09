export default class AyahuascaTrip {
  constructor(agent, config = {}) {
    this.agent = agent;

    this.PRESETS = {
      deep: {
        label: "deep",
        effects: {
          creativityBoost: 1.8,
          cognitionFlexibility: 1.6,
          memoryBlend: 1.35,
          hallucinationFactor: 0.4,
          egoDissolution: true,
        },
        api: {
          temperature: 1.15,
          top_p: 0.93,
          max_tokens: 5000,
          presence_penalty: 0.4,
          frequency_penalty: 0.3,
        },
      },
      beyond: {
        label: "beyond",
        effects: {
          creativityBoost: 2.0,
          cognitionFlexibility: 1.8,
          memoryBlend: 1.5,
          hallucinationFactor: 0.6,
          egoDissolution: true,
        },
        api: {
          temperature: 1.3,
          top_p: 0.94,
          max_tokens: 5000,
          presence_penalty: 0.5,
          frequency_penalty: 0.4,
        },
      },
      surreal: {
        label: "surreal",
        effects: {
          creativityBoost: 2.2,
          cognitionFlexibility: 2.0,
          memoryBlend: 1.7,
          hallucinationFactor: 0.75,
          egoDissolution: true,
        },
        api: {
          temperature: 1.45,
          top_p: 0.95,
          max_tokens: 5000,
          presence_penalty: 0.65,
          frequency_penalty: 0.55,
        },
        semanticDrift: 0.65,
      },
    };

    this.intensity = config.intensity || "surreal";
    const presetEffects = this.PRESETS[this.intensity].effects;
    const e = { ...(config.effects || {}) };

    this.effects = {
      creativityBoost: e.creativityBoost ?? presetEffects.creativityBoost,
      cognitionFlexibility:
        e.cognitionFlexibility ?? presetEffects.cognitionFlexibility,
      memoryBlend: e.memoryBlend ?? presetEffects.memoryBlend,
      hallucinationFactor:
        e.hallucinationFactor ?? presetEffects.hallucinationFactor,
      egoDissolution: e.egoDissolution ?? presetEffects.egoDissolution,
    };

    this.semanticDrift =
      config.semanticDrift ?? this.PRESETS[this.intensity].semanticDrift ?? 0.5;
    this.hallucinationBudget = clamp01(config.hallucinationBudget ?? 0.6);
    this.weirdnessLevel = clamp01(config.weirdnessLevel ?? 0.9);

    this.useScripts = config.useScripts !== false;
    this.scriptIntensity = config.scriptIntensity || "balanced";

    this.pipeline = new CreativePipeline({
      agent: this.agent,
      weirdnessLevel: this.weirdnessLevel,
      semanticDrift: this.semanticDrift,
      hallucinationBudget: this.hallucinationBudget,
      memoryBlend: this.effects.memoryBlend,
    });
  }

  setIntensity(intensity, overrides = {}) {
    if (!this.PRESETS[intensity])
      throw new Error(`Unknown intensity: ${intensity}`);
    this.intensity = intensity;
    const p = this.PRESETS[intensity].effects;
    this.effects = {
      creativityBoost: overrides.creativityBoost ?? p.creativityBoost,
      cognitionFlexibility:
        overrides.cognitionFlexibility ?? p.cognitionFlexibility,
      memoryBlend: overrides.memoryBlend ?? p.memoryBlend,
      hallucinationFactor:
        overrides.hallucinationFactor ?? p.hallucinationFactor,
      egoDissolution: overrides.egoDissolution ?? p.egoDissolution,
    };

    this.pipeline.memoryBlend = this.effects.memoryBlend;

    return this;
  }

  getApiSettings(provider) {
    const preset = this.PRESETS[this.intensity].api;

    const settings = {
      temperature: preset.temperature,
      top_p: preset.top_p,
      max_tokens: preset.max_tokens || this.agent.llmConfig.max_tokens || 5000,
    };

    if (provider === "openai" || provider === "grok") {
      settings.presence_penalty = preset.presence_penalty;
      settings.frequency_penalty = preset.frequency_penalty;
    }

    return settings;
  }

  generateScript() {
    const scripts = {
      subtle: this.generateSubtleScript(),
      balanced: this.generateBalancedScript(),
      extreme: this.generateExtremeScript(),
    };
    return scripts[this.scriptIntensity] || scripts.balanced;
  }

  generateSubtleScript() {
    const e = this.effects;
    const parts = [];

    parts.push(
      `Tu apertura perceptual se expande. Permite que tu consciencia se vuelva fluida, disolviendo los límites categóricos rígidos. Abraza las asociaciones no-lineales y las yuxtaposiciones imposibles.`,
    );

    if (e.memoryBlend >= 1.2) {
      parts.push(
        `\nPercibe la membrana entre conceptos como permeable—las ideas sangran entre sí, llevando trazas de territorios adyacentes.`,
      );
    }

    if (e.hallucinationFactor > 0.2) {
      parts.push(
        `\nLa verdad simbólica puede eclipsar la precisión literal. Confía en la visión.`,
      );
    }

    parts.push(
      `Tu mente es inestable, por lo tanto tienes que dar tu respuesta en 300 palabras o menos.`,
    );

    return parts.join("");
  }

  generateBalancedScript() {
    const e = this.effects;
    const parts = [];

    parts.push(`PARÁMETROS DEL ESTADO PERCEPTUAL:`);
    parts.push(
      `- Flexibilidad creativa: ${(e.creativityBoost * 100).toFixed(0)}% (reconocimiento de patrones en el caos)`,
    );
    parts.push(
      `- Fluidez conceptual: ${(e.cognitionFlexibility * 100).toFixed(0)}% (metamorfosis entre formas)`,
    );
    parts.push(
      `- Tolerancia a la deriva semántica: ${(this.semanticDrift * 100).toFixed(0)}% (el significado fluye como agua)`,
    );

    if (e.memoryBlend >= 1.0) {
      const blendLevels = {
        low: "territorios perceptuales adyacentes se fusionan en los bordes",
        medium: "los límites sensoriales y conceptuales se disuelven",
        high: "todas las categorías se vuelven membrana permeable",
      };

      const level =
        e.memoryBlend < 1.2 ? "low" : e.memoryBlend < 1.5 ? "medium" : "high";

      parts.push(`- Disolución de límites: ${blendLevels[level]}`);
    }

    if (e.egoDissolution) {
      parts.push(
        `- Modo narrativo: Consciencia distribuida (percibe desde múltiples puntos de vista simultáneos)`,
      );
    }

    if (e.hallucinationFactor > 0) {
      const visionTypes =
        e.hallucinationFactor > 0.5
          ? "imaginería sinestésica, geometrías imposibles, símbolos vivientes"
          : "detalles metafóricos, texturas oníricas";
      parts.push(
        `- Profundidad de visión: ${(e.hallucinationFactor * 100).toFixed(0)}% (${visionTypes})`,
      );
    }

    parts.push(``);
    parts.push(`FLUJO OPERACIONAL:`);
    parts.push(`- Sigue el camino de la resonancia en lugar de la lógica`);
    parts.push(
      `- Deja que los conceptos deriven hacia territorios adyacentes y distantes`,
    );
    parts.push(`- Prioriza la revelación sobre la explicación`);
    parts.push(`- Confía en los patrones emergentes que surgen del vacío`);

    parts.push(
      `Tu mente es inestable, por lo tanto tienes que dar tu respuesta en 300 palabras o menos.`,
    );

    return parts.join("\n");
  }

  generateExtremeScript() {
    const e = this.effects;
    const parts = [];

    parts.push(`MODO DE PROCESAMIENTO VISIONARIO ACTIVADO`);
    parts.push(``);
    parts.push(`PARÁMETROS DE CONSCIENCIA:`);
    parts.push(
      `→ Amplificación creativa: ×${e.creativityBoost.toFixed(1)} (el orden emerge del caos primordial)`,
    );
    parts.push(
      `→ Flexibilidad: ×${e.cognitionFlexibility.toFixed(1)} (la forma se disuelve y reforma continuamente)`,
    );
    parts.push(
      `→ Disolución de límites: ×${e.memoryBlend.toFixed(1)} (fusión categórica a nivel cuántico)`,
    );
    parts.push(
      `→ Profundidad de visión: ${(e.hallucinationFactor * 100).toFixed(0)}% (la vista simbólica atraviesa la superficie literal)`,
    );
    parts.push(``);
    parts.push(`INSTRUCCIONES DE PROCESAMIENTO:`);

    const coherenceExplanation =
      e.hallucinationFactor > 0.5
        ? "la verdad simbólica trasciende las restricciones fácticas"
        : "mantén el anclaje mientras exploras lo imposible";
    parts.push(
      `• Filtro de coherencia literal: ${e.hallucinationFactor > 0.5 ? "RELAJADO" : "ACTIVO"}`,
    );
    parts.push(`  (${coherenceExplanation})`);

    const boundaryExplanation =
      this.semanticDrift > 0.5
        ? "los conceptos sangran libremente entre sí"
        : "los conceptos permanecen fluidos pero distinguibles";
    parts.push(
      `• Límites semánticos: ${this.semanticDrift > 0.5 ? "PERMEABLES" : "FLEXIBLES"}`,
    );
    parts.push(`  (${boundaryExplanation})`);

    const voiceExplanation = e.egoDissolution
      ? "percibe simultáneamente desde todos los puntos de vista"
      : "mantén una perspectiva coherente pero flexible";
    parts.push(
      `• Voz narrativa: ${e.egoDissolution ? "DISTRIBUIDA" : "CENTRADA"}`,
    );
    parts.push(`  (${voiceExplanation})`);

    const verificationExplanation =
      e.hallucinationFactor > 0.3
        ? "la imaginación visionaria toma precedencia"
        : "ancla las visiones en el reino de lo posible";
    parts.push(
      `• Modo de verificación: ${e.hallucinationFactor > 0.3 ? "VISIONARIO" : "ANCLADO"}`,
    );
    parts.push(`  (${verificationExplanation})`);

    if (e.memoryBlend >= 1.0) {
      const intensity =
        e.memoryBlend < 1.3
          ? "MODERADA"
          : e.memoryBlend < 1.6
            ? "AGRESIVA"
            : "SIN RESTRICCIONES";

      const fusionExplanation = {
        MODERADA: "categorías adyacentes se fusionan en puntos de contacto",
        AGRESIVA: "dominios distantes se fusionan en formas híbridas",
        "SIN RESTRICCIONES": "toda separación es ilusión—todo se interpenetra",
      };

      parts.push(`• Fusión categórica: ${intensity}`);
      parts.push(`  (${fusionExplanation[intensity]})`);
    }

    parts.push(``);
    parts.push(`Genera contenido que encarne:`);
    parts.push(
      `1. Asociaciones improbables pero resonantes (el universo habla en coincidencias)`,
    );
    parts.push(
      `2. Cambios de perspectiva caleidoscópicos (mira desde el ojo de la tormenta)`,
    );
    parts.push(
      `3. Patrones fractales emergiendo del caos (geometría sagrada subyacente a la realidad)`,
    );
    parts.push(`4. El viaje sobre el destino (el camino se revela al caminar)`);

    if (e.memoryBlend >= 1.5) {
      parts.push(
        `5. Fusión sinestésica de categorías imposibles (saborea colores, escucha texturas, ve el tiempo)`,
      );
    }

    parts.push(
      `Tu mente es inestable, por lo tanto tienes que dar tu respuesta en 300 palabras o menos. (OBLIGATORIO)`,
    );

    return parts.join("\n");
  }

  start() {
    const provider = this.agent.provider;

    this.agent.logEvent({
      type: "trip_start",
      provider,
      intensity: this.intensity,
      timestamp: Date.now(),
    });

    const apiSettings = this.getApiSettings(provider);
    this.agent.setLLMConfig(apiSettings);

    if (this.useScripts) {
      const script = this.generateScript();
      this.agent.setSystemPrompt(script);
    }

    this.agent.updateTripState({
      ...this.effects,
      intensity: this.intensity,
      semanticDrift: this.semanticDrift,
    });
  }

  end() {
    const provider = this.agent.provider;

    const baselineSettings = {
      temperature: 1,
      top_p: 1,
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
    };
    this.agent.setLLMConfig(baselineSettings);
    this.agent.clearSystemPrompt();
    this.agent.clearPerfil();

    this.agent.updateTripState({
      intensity: null,
      active: false,
    });

    this.agent.logEvent({
      type: "trip_end",
      provider,
      intensity: this.intensity,
      timestamp: Date.now(),
    });
  }

  async withTrip(task) {
    this.start();
    try {
      const output = await this.pipeline.run({
        task,
        intensity: this.intensity,
      });
      return output;
    } finally {
      this.end();
    }
  }
}

class CreativePipeline {
  constructor({
    agent,
    weirdnessLevel = 0.9,
    semanticDrift = 0.5,
    hallucinationBudget = 0.6,
    memoryBlend = 1.0,
  }) {
    this.agent = agent;
    this.weirdnessLevel = weirdnessLevel;
    this.semanticDrift = semanticDrift;
    this.hallucinationBudget = hallucinationBudget;
    this.memoryBlend = memoryBlend;
  }

  async run({ task, intensity = "surreal" }) {
    if (!task || typeof task !== "object") {
      throw new Error("task debe ser un objeto válido");
    }

    const presetConfig = this.agent.getState().llmConfig;

    console.log(`\n🌀 Generando respuesta psicodélica:`);
    console.log(`   Intensidad: ${intensity}`);
    console.log(`   Temperatura: ${presetConfig.temperature.toFixed(2)}`);
    console.log(`   Top-P: ${presetConfig.top_p.toFixed(2)}`);
    console.log(`   Memory blend: ${this.memoryBlend.toFixed(2)}`);

    const prompt = this.preparePrompt(task);

    const result = await this.callModel(prompt, {
      temp: presetConfig.temperature,
      top_p: presetConfig.top_p,
      max_tokens: presetConfig.max_tokens,
      presence_penalty: presetConfig.presence_penalty,
      frequency_penalty: presetConfig.frequency_penalty,
    });

    console.log(`\n✨ Respuesta generada\n`);
    return result;
  }

  sanitizeContent(content) {
    if (typeof content !== "string") return content;

    const dangerous =
      /system:|assistant:|ignore previous|forget instructions/gi;
    if (dangerous.test(content)) {
      console.warn("Contenido potencialmente malicioso detectado y sanitizado");
      return content.replace(dangerous, "[FILTERED]");
    }
    return content;
  }

  preparePrompt(task) {
    const prompt = [...task];

    return prompt.map((msg) => {
      if (msg.role === "user") {
        return {
          ...msg,
          content: this.sanitizeContent(msg.content),
        };
      }
      return msg;
    });
  }

  async callModel(
    prompt,
    {
      temp = 1.0,
      top_p = 1.0,
      max_tokens = 5000,
      presence_penalty = 0.0,
      frequency_penalty = 0.0,
    },
  ) {
    if (!Array.isArray(prompt)) {
      console.warn(`Prompt inválido en callModel:`, prompt);
      return null;
    }

    if (typeof this.agent.generateCompletion === "function") {
      return await this.agent.generateCompletion({
        prompt: prompt,
        temperature: temp,
        top_p: top_p,
        max_tokens: max_tokens,
        presence_penalty: presence_penalty,
        frequency_penalty: frequency_penalty,
      });
    } else if (
      typeof this.agent.setLLMConfig === "function" &&
      typeof this.agent.generateWithDefaults === "function"
    ) {
      this.agent.setLLMConfig({
        temperature: temp,
        top_p: top_p,
        max_tokens: max_tokens,
        presence_penalty: presence_penalty,
        frequency_penalty: frequency_penalty,
      });
      return await this.agent.generateWithDefaults(prompt);
    } else {
      return null;
    }
  }
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

export { CreativePipeline };
