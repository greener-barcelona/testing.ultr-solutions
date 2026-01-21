export default class AyahuascaTrip {
  constructor(agent, config = {}) {
    this.agent = agent;

    this.PRESETS = {
      light: {
        label: "light",
        effects: {
          creativityBoost: 1.2,
          cognitionFlexibility: 1.15,
          memoryBlend: 1.1,
          hallucinationFactor: 0.0,
          egoDissolution: false,
        },
        api: {
          temperature: 0.8,
          top_p: 0.9,
          presence_penalty: 0.0,
          frequency_penalty: 0.0,
        },
      },
      moderate: {
        label: "moderate",
        effects: {
          creativityBoost: 1.5,
          cognitionFlexibility: 1.35,
          memoryBlend: 1.2,
          hallucinationFactor: 0.2,
          egoDissolution: true,
        },
        api: {
          temperature: 0.95,
          top_p: 0.95,
          presence_penalty: -0.1,
          frequency_penalty: 0.0,
        },
      },
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
          top_p: 0.98,
          presence_penalty: -0.2,
          frequency_penalty: -0.05,
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
          temperature: 1.35,
          top_p: 1.0,
          presence_penalty: -0.35,
          frequency_penalty: -0.1,
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
          temperature: 1.55,
          top_p: 1.0,
          presence_penalty: -0.45,
          frequency_penalty: -0.15,
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

    let temperature = Math.min(
      2.0,
      preset.temperature + (this.effects.creativityBoost - 1.0) * 0.25,
    );

    let top_p = Math.min(
      1.0,
      preset.top_p + (this.effects.creativityBoost - 1.0) * 0.1,
    );

    const settings = {
      temperature,
      top_p,
      max_tokens: 2000,
    };

    if (provider === "openai" || provider === "grok") {
      settings.presence_penalty = this.effects.egoDissolution
        ? Math.min(preset.presence_penalty, -0.25)
        : preset.presence_penalty;
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

    return parts.join("\n");
  }

  start(provider = "openai") {
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

    this.agent.modifyParameters({
      ...this.effects,
      intensity: this.intensity,
      semanticDrift: this.semanticDrift,
    });
  }

  end(provider = "openai") {
    const baselineSettings = {
      temperature: 0.7,
      top_p: 0.9,
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
    };
    this.agent.setLLMConfig(baselineSettings);
    this.agent.clearSystemPrompt();
    this.agent.clearPerfil();

    this.agent.modifyParameters({
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

  async withTrip(task, options = {}) {
    const provider = options.provider || "openai";
    this.start(provider);
    try {
      const outputs = await this.pipeline.run({
        task,
        variants: options.variants ?? 3,
        intensity: this.intensity,
        baseTemperature: this.agent.llmConfig.temperature,
      });
      return outputs;
    } finally {
      this.end(provider);
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

  async run({
    task,
    variants = 3,
    intensity = "surreal",
    baseTemperature = 1.0,
  }) {
    if (!task || typeof task !== "object") {
      throw new Error("task debe ser un objeto válido");
    }

    const VALID_TASK_TYPES = ["creative", "factual"];
    const taskType = task.taskType || "creative";

    if (!VALID_TASK_TYPES.includes(taskType)) {
      throw new Error(
        `taskType inválido: ${taskType}. Debe ser: ${VALID_TASK_TYPES.join(", ")}`,
      );
    }

    const allowed = taskType === "creative";
    const drift = allowed
      ? this.semanticDrift
      : Math.min(0.15, this.semanticDrift);

    console.log(`\n🌀 Iniciando pipeline creativo:`);
    console.log(`   Intensidad: ${intensity}`);
    console.log(`   Temperatura base: ${baseTemperature.toFixed(2)}`);
    console.log(`   Tipo de tarea: ${taskType}`);
    console.log(`   Memory blend: ${this.memoryBlend.toFixed(2)}`);

    const exploreTemp = Math.min(2.0, baseTemperature * 1.15);
    const exploreTopP = Math.min(1.0, 0.98);

    console.log(`\n📡 FASE 1 - EXPLORE`);
    console.log(`   Temperatura: ${exploreTemp.toFixed(2)} (base × 1.15)`);
    console.log(`   Top-P: ${exploreTopP.toFixed(2)}`);

    const explorePrompts = this.generateExplorePrompts(
      task,
      drift,
      allowed,
      variants,
    );
    const rawVariants = await this.sampleMany(explorePrompts, variants, {
      temp: exploreTemp,
      top_p: exploreTopP,
      phase: "explore",
    });

    console.log(`\n🔍 FASE 2 - CURATE`);
    const curated = this.curate(rawVariants);
    console.log(`   Variantes: ${rawVariants.length} → ${curated.length}`);

    const convergeTemp = baseTemperature * 0.85;
    const convergeTopP = 0.95;

    console.log(`\n🎯 FASE 3 - CONVERGE`);
    console.log(`   Temperatura: ${convergeTemp.toFixed(2)} (base × 0.85)`);
    console.log(`   Top-P: ${convergeTopP.toFixed(2)}`);

    const convergePrompts = this.generateConvergePrompts(curated, task);
    const finals = await this.sampleMany(
      convergePrompts,
      convergePrompts.length,
      { temp: convergeTemp, top_p: convergeTopP, phase: "converge" },
    );

    console.log(
      `\n✨ Pipeline completado: ${finals.length} variantes finales\n`,
    );
    return finals;
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

  generateExplorePrompts(task, drift, allowed) {
    const weird = this.weirdnessLevel * (allowed ? 1 : 0.5);
    const prompts = [];

    const baseDriftPhrases = [
      "¿Y si pudieras percibir esto desde fuera del tiempo mismo?",
      "Disuelve tu perspectiva fija y conviértete en el concepto mismo.",
      "¿Cómo se ve esto cuando lo observas a través de múltiples ojos simultáneamente?",
      "Si esta idea pudiera hablar, ¿qué te susurraría?",
      "Experiméntalo como si ya lo hubieras vivido y estuvieras recordando hacia atrás.",
    ];

    const domainBlendingPhrases = [
      "¿De qué color sabe este concepto? ¿Qué sonido emite?",
      "Si esta idea fuera una entidad viviente, ¿qué te mostraría?",
      "Percíbelo simultáneamente como patrón, emoción y presencia viviente.",
      "¿Qué geometría sagrada subyace a esto? ¿Qué fractal traza?",
      "Fusiónate con este concepto hasta que no puedas distinguir dónde terminas tú y dónde empieza él.",
      "¿Qué memoria ancestral despierta esto? ¿Qué eco del futuro porta?",
    ];

    for (let i = 0; i < 6; i++) {
      const prompt = [...task.brief];

      if (drift > 0.4 && weird > 0.6) {
        const lastUserIndex = prompt.map((m) => m.role).lastIndexOf("user");
        if (lastUserIndex !== -1) {
          const sanitizedContent = this.sanitizeContent(
            prompt[lastUserIndex].content,
          );

          let enhancedContent =
            sanitizedContent +
            "\n\n" +
            baseDriftPhrases[i % baseDriftPhrases.length];

          if (this.memoryBlend >= 1.3 && allowed) {
            enhancedContent +=
              "\n" + domainBlendingPhrases[i % domainBlendingPhrases.length];
          }

          prompt[lastUserIndex] = {
            ...prompt[lastUserIndex],
            content: enhancedContent,
          };
        }
      } else if (weird > 0.4) {
        const subtleHints = [
          "¿Cuál es el lado oscuro de esto que no estás viendo?",
          "Acércate a esto como si lo estuvieras recordando desde un sueño.",
          "¿Cuál es la verdad viviente bajo el concepto?",
        ];

        const lastUserIndex = prompt.map((m) => m.role).lastIndexOf("user");
        if (lastUserIndex !== -1) {
          const sanitizedContent = this.sanitizeContent(
            prompt[lastUserIndex].content,
          );

          let enhancedContent =
            sanitizedContent + "\n\n" + subtleHints[i % subtleHints.length];

          if (this.memoryBlend >= 1.5 && allowed) {
            enhancedContent += "\nBlend concepts from different domains.";
          }

          prompt[lastUserIndex] = {
            ...prompt[lastUserIndex],
            content: enhancedContent,
          };
        }
      }

      prompts.push(prompt);
    }

    return prompts;
  }

  curate(variants) {
    const unique = [...new Set(variants)];

    const valid = unique.filter(
      (v) =>
        v.length > 50 && !v.startsWith("[ERROR") && !v.startsWith("// SAMPLE"),
    );

    if (valid.length === 0) return unique.slice(0, 4);

    const deduplicated = [];
    for (const variant of valid) {
      const isDuplicate = deduplicated.some(
        (existing) => this.semanticSimilarity(variant, existing) > 0.85,
      );
      if (!isDuplicate) {
        deduplicated.push(variant);
      }
    }

    let selected = deduplicated;
    if (deduplicated.length > 10) {
      selected = this.selectDiverse(deduplicated, 10);
    }

    const targetCount = Math.max(4, Math.min(10, selected.length));
    return selected.slice(0, targetCount);
  }

  selectDiverse(variants, n) {
    if (variants.length <= n) return variants;

    const selected = [variants[0]];

    while (selected.length < n && selected.length < variants.length) {
      let maxMinSim = -1;
      let bestCandidate = null;

      for (const candidate of variants) {
        if (selected.includes(candidate)) continue;

        const minSim = Math.min(
          ...selected.map((s) => this.semanticSimilarity(candidate, s)),
        );

        if (minSim > maxMinSim) {
          maxMinSim = minSim;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate) {
        selected.push(bestCandidate);
      } else {
        break;
      }
    }

    return selected;
  }

  semanticSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().match(/\w+/g) || []);
    const words2 = new Set(text2.toLowerCase().match(/\w+/g) || []);

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  generateConvergePrompts(curated, task) {
    return curated.map((variant, index) => {
      let messages = [];

      if (Array.isArray(variant)) {
        messages = [...variant];
      } else if (typeof variant === "string") {
        messages = [
          {
            role: "assistant",
            content: variant,
          },
        ];
      }

      messages.push({
        role: "user",
        content: this.buildConvergeInstructions(
          variant,
          task,
          index,
          curated.length,
        ),
      });

      return messages;
    });
  }

  buildConvergeInstructions(variant, task, index, totalVariants) {
    const parts = [];

    if (typeof variant === "string") {
      parts.push("Refina y desarrolla este concepto más profundamente:");
      parts.push("");
      parts.push(variant);
      parts.push("");
    } else {
      parts.push("Refina y desarrolla el concepto anterior más profundamente.");
      parts.push("");
    }

    if (task.anchors && task.anchors.length > 0) {
      parts.push(`Conceptos clave a mantener: ${task.anchors.join(", ")}`);
    }

    if (task.taskType === "creative") {
      parts.push("");
      parts.push(
        "Desarrolla los aspectos más convincentes manteniendo la coherencia.",
      );
    } else if (task.taskType === "factual") {
      parts.push("");
      parts.push(
        "Asegura la precisión y claridad preservando las revelaciones centrales.",
      );
    }

    const variations = [
      "Enfócate en las implicaciones inesperadas.",
      "Enfatiza las aplicaciones prácticas.",
      "Explora casos límite y limitaciones.",
      "Considera múltiples perspectivas.",
      "Desarrolla los principios subyacentes.",
      "Conecta con contextos más amplios.",
    ];

    if (totalVariants > 1) {
      parts.push("");
      parts.push(variations[index % variations.length]);
    }

    return parts.join("\n");
  }

  async sampleMany(prompts, n, { temp = 1.0, top_p = 1.0, phase = "unknown" }) {
    const BATCH_SIZE = 3;
    const DELAY_MS = 500;

    const out = [];
    const batches = [];

    // Asegurar que n esté entre 2 y 10
    const targetVariants = Math.max(2, Math.min(10, n));
    const validPrompts = prompts.slice(
      0,
      Math.min(prompts.length, targetVariants),
    );

    for (let i = 0; i < validPrompts.length; i += BATCH_SIZE) {
      batches.push(validPrompts.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (prompt) => {
        if (!Array.isArray(prompt)) {
          console.warn(`Prompt inválido en sampleMany:`, prompt);
          return `// SAMPLE → invalid prompt`;
        }

        if (typeof this.agent.generate === "function") {
          return await this.agent.generate({
            prompt: prompt,
            temperature: temp,
            top_p,
            phase,
          });
        } else if (
          typeof this.agent.setLLMConfig === "function" &&
          typeof this.agent.complete === "function"
        ) {
          this.agent.setLLMConfig({ temperature: temp, top_p });
          return await this.agent.complete(prompt, phase);
        } else {
          const previewContent = prompt[prompt.length - 1]?.content || "";
          return `// SAMPLE → ${previewContent.substring(0, 200)}...`;
        }
      });

      const results = await Promise.all(batchPromises);
      out.push(...results);

      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    return out;
  }
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

export { CreativePipeline };
