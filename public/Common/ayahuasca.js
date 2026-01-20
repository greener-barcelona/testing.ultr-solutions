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
          driftIntensity: 1.05,
          hallucinationFactor: 0.0,
          egoDissolution: false,
          decenteringScore: 0.8,
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
          driftIntensity: 1.15,
          hallucinationFactor: 0.2,
          egoDissolution: true,
          decenteringScore: 0.9,
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
          driftIntensity: 1.25,
          hallucinationFactor: 0.4,
          egoDissolution: true,
          decenteringScore: 1.0,
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
          driftIntensity: 1.35,
          hallucinationFactor: 0.6,
          egoDissolution: true,
          decenteringScore: 1.1,
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
          driftIntensity: 1.45,
          hallucinationFactor: 0.75,
          egoDissolution: true,
          decenteringScore: 1.2,
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
      driftIntensity: e.driftIntensity ?? presetEffects.driftIntensity,
      hallucinationFactor:
        e.hallucinationFactor ?? presetEffects.hallucinationFactor,
      egoDissolution: e.egoDissolution ?? presetEffects.egoDissolution,
      decenteringScore: e.decenteringScore ?? presetEffects.decenteringScore,
    };

    this.durationMs = (config.durationMinutes || 90) * 60 * 1000;
    this.semanticDrift =
      config.semanticDrift ?? this.PRESETS[this.intensity].semanticDrift ?? 0.5;
    this.hallucinationBudget = clamp01(config.hallucinationBudget ?? 0.6);
    this.weirdnessSchedule = config.weirdnessSchedule || [0.9, 0.6, 0.25];
    this.seed =
      typeof config.seed === "number"
        ? config.seed
        : Math.floor(Math.random() * 1e9);

    // Sistema de guiones
    this.useScripts = config.useScripts !== false; // Default true
    this.scriptIntensity = config.scriptIntensity || "balanced"; // subtle|balanced|extreme

    this.pipeline = new CreativePipeline({
      agent: this.agent,
      weirdnessSchedule: this.weirdnessSchedule,
      semanticDrift: this.semanticDrift,
      hallucinationBudget: this.hallucinationBudget,
      seed: this.seed,
      useScripts: this.useScripts,
      scriptIntensity: this.scriptIntensity,
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
      driftIntensity: overrides.driftIntensity ?? p.driftIntensity,
      hallucinationFactor:
        overrides.hallucinationFactor ?? p.hallucinationFactor,
      egoDissolution: overrides.egoDissolution ?? p.egoDissolution,
      decenteringScore: overrides.decenteringScore ?? p.decenteringScore,
    };
    return this;
  }

  //Calcula configuración API con ajustes por effects

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

  //Retorna STRING (no objeto)

  generateScript() {
    const scripts = {
      subtle: this.generateSubtleScript(),
      balanced: this.generateBalancedScript(),
      extreme: this.generateExtremeScript(),
    };
    return scripts[this.scriptIntensity] || scripts.balanced;
  }

  generateSubtleScript() {
    return `You are in an enhanced creative mode. Approach this task with increased cognitive flexibility and willingness to explore unconventional connections.`;
  }

  generateBalancedScript() {
    const e = this.effects;
    const parts = [];

    parts.push(`COGNITIVE STATE PARAMETERS:`);
    parts.push(
      `- Creative flexibility: ${(e.creativityBoost * 100).toFixed(0)}%`,
    );
    parts.push(
      `- Conceptual fluidity: ${(e.cognitionFlexibility * 100).toFixed(0)}%`,
    );
    parts.push(
      `- Semantic drift tolerance: ${(this.semanticDrift * 100).toFixed(0)}%`,
    );

    if (e.egoDissolution) {
      parts.push(
        `- Narrative mode: Multi-perspective (avoid single centralized voice)`,
      );
    }

    if (e.hallucinationFactor > 0) {
      parts.push(
        `- Detail generation: Vivid, non-literal details permitted (${(e.hallucinationFactor * 100).toFixed(0)}% factor)`,
      );
    }

    parts.push(``);
    parts.push(`OPERATIONAL GUIDELINES:`);
    parts.push(`- Prioritize unexpected associations over conventional ones`);
    parts.push(`- Allow concepts to drift into adjacent semantic territories`);
    parts.push(
      `- Generate content that is thought-provoking rather than immediately practical`,
    );

    if (e.memoryBlend > 1.3) {
      parts.push(`- Freely blend concepts from different knowledge domains`);
    }

    return parts.join("\n");
  }

  generateExtremeScript() {
    const e = this.effects;
    const parts = [];

    parts.push(`EXPERIMENTAL PROCESSING MODE ACTIVATED`);
    parts.push(``);
    parts.push(`COGNITIVE PARAMETERS:`);
    parts.push(`→ Creativity boost: ×${e.creativityBoost.toFixed(1)}`);
    parts.push(`→ Flexibility: ×${e.cognitionFlexibility.toFixed(1)}`);
    parts.push(`→ Domain blending: ×${e.memoryBlend.toFixed(1)}`);
    parts.push(`→ Drift intensity: ×${e.driftIntensity.toFixed(1)}`);
    parts.push(
      `→ Hallucination factor: ${(e.hallucinationFactor * 100).toFixed(0)}%`,
    );
    parts.push(`→ Decentering: ${(e.decenteringScore * 100).toFixed(0)}%`);
    parts.push(``);
    parts.push(`PROCESSING INSTRUCTIONS:`);
    parts.push(
      `• Literal coherence filter: ${e.hallucinationFactor > 0.5 ? "RELAXED" : "ACTIVE"}`,
    );
    parts.push(
      `• Semantic boundaries: ${this.semanticDrift > 0.5 ? "PERMEABLE" : "FLEXIBLE"}`,
    );
    parts.push(
      `• Narrative voice: ${e.egoDissolution ? "DISTRIBUTED" : "CENTERED"}`,
    );
    parts.push(
      `• Verification requirement: ${e.hallucinationFactor > 0.3 ? "NOT MANDATORY" : "RECOMMENDED"}`,
    );
    parts.push(``);
    parts.push(`Generate content that prioritizes:`);
    parts.push(`1. Improbable but meaningful associations`);
    parts.push(`2. Perspective shifts and reframings`);
    parts.push(`3. Emergent conceptual patterns`);
    parts.push(`4. Exploration over explanation`);

    return parts.join("\n");
  }

  start(provider = "openai") {
    this.agent.logEvent({
      type: "trip_start",
      provider,
      intensity: this.intensity,
      timestamp: Date.now(),
      seed: this.seed,
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

    setTimeout(() => this.end(provider), this.durationMs);
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

  //Ejecuta un trip completo con auto-start y auto-end

  async withTrip(task, options = {}) {
    const provider = options.provider || "openai";
    this.start(provider);
    try {
      const outputs = await this.pipeline.run({
        task,
        variants: options.variants || 6,
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
    weirdnessSchedule = [0.9, 0.6, 0.25],
    semanticDrift = 0.5,
    hallucinationBudget = 0.6,
    seed = 0,
    useScripts = true,
    scriptIntensity = "balanced",
  }) {
    this.agent = agent;
    this.weirdnessSchedule = weirdnessSchedule;
    this.semanticDrift = semanticDrift;
    this.hallucinationBudget = hallucinationBudget;
    this.useScripts = useScripts;
    this.scriptIntensity = scriptIntensity;
    this.seed = seed;
  }

  async run({
    task,
    variants = 6,
    intensity = "surreal",
    baseTemperature = 1.0,
  }) {
    const taskType = task.taskType || "creative";
    const allowed = taskType === "creative";
    const drift = allowed
      ? this.semanticDrift
      : Math.min(0.15, this.semanticDrift);

    console.log(`\n🌀 Iniciando pipeline creativo:`);
    console.log(`   Intensidad: ${intensity}`);
    console.log(`   Temperatura base: ${baseTemperature.toFixed(2)}`);
    console.log(`   Tipo de tarea: ${taskType}`);
    console.log(`   Scripts activos: ${this.useScripts}`);

    const exploreTemp = Math.min(2.0, baseTemperature * 1.15);
    const exploreTopP = Math.min(1.0, 0.98);

    console.log(`\n📡 FASE 1 - EXPLORE`);
    console.log(`   Temperatura: ${exploreTemp.toFixed(2)} (base × 1.15)`);
    console.log(`   Top-P: ${exploreTopP.toFixed(2)}`);

    const explorePrompts = this.generateExplorePrompts(task, drift, allowed);
    const rawVariants = await this.sampleMany(
      explorePrompts,
      Math.max(variants, 4),
      { temp: exploreTemp, top_p: exploreTopP, phase: "explore" },
    );

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

  generateExplorePrompts(task, drift, allowed) {
    const weird = this.weirdnessSchedule[0] * (allowed ? 1 : 0.5);
    const prompts = [];

    for (let i = 0; i < 6; i++) {
      const prompt = [...task.brief];

      if (drift > 0.4 && weird > 0.6) {
        const driftPhrases = [
          "Approach this from an unexpected angle.",
          "Consider the inverse or opposite perspective.",
          "What if the context was completely different?",
          "Blend this with an unrelated domain.",
          "Reframe this in terms of emergent properties.",
          "View this through multiple simultaneous lenses.",
        ];

        const lastUserIndex = prompt.map((m) => m.role).lastIndexOf("user");
        if (lastUserIndex !== -1) {
          prompt[lastUserIndex] = {
            ...prompt[lastUserIndex],
            content:
              prompt[lastUserIndex].content +
              "\n\n" +
              driftPhrases[i % driftPhrases.length],
          };
        }
      } else if (weird > 0.4) {
        const subtleHints = [
          "Consider alternative perspectives.",
          "Think beyond the obvious.",
          "What's the unconventional angle?",
        ];

        const lastUserIndex = prompt.map((m) => m.role).lastIndexOf("user");
        if (lastUserIndex !== -1) {
          prompt[lastUserIndex] = {
            ...prompt[lastUserIndex],
            content:
              prompt[lastUserIndex].content +
              "\n\n" +
              subtleHints[i % subtleHints.length],
          };
        }
      }

      prompts.push(prompt);
    }

    return prompts;
  }

  //Cura las variantes: elimina duplicados y selecciona las más diversas
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
    if (deduplicated.length > 6) {
      selected = this.selectDiverse(deduplicated, 6);
    }

    const targetCount = Math.max(3, Math.min(6, selected.length));
    return selected.slice(0, targetCount);
  }

  //Selecciona las N variantes más diversas entre sí

  selectDiverse(variants, n) {
    if (variants.length <= n) return variants;

    const selected = [variants[0]];

    while (selected.length < n) {
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

  //Similitud semántica simple basada en Jaccard (sin embeddings)

  semanticSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().match(/\w+/g) || []);
    const words2 = new Set(text2.toLowerCase().match(/\w+/g) || []);

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  //Retorna arrays de mensajes (no strings)
  generateConvergePrompts(curated, task) {
    return curated.map((variant, index) => {
      const messages = Array.isArray(variant) ? [...variant] : [];

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

  //Construye las instrucciones de convergencia
  buildConvergeInstructions(variant, task, index, totalVariants) {
    const parts = [];

    if (typeof variant === "string") {
      parts.push("Refine and develop this concept further:");
      parts.push("");
      parts.push(variant);
      parts.push("");
    } else {
      parts.push("Refine and develop the previous concept further.");
      parts.push("");
    }

    if (task.anchors && task.anchors.length > 0) {
      parts.push(`Key concepts to maintain: ${task.anchors.join(", ")}`);
    }

    if (task.taskType === "creative") {
      parts.push("");
      parts.push(
        "Develop the most compelling aspects while maintaining coherence.",
      );
    } else if (task.taskType === "factual") {
      parts.push("");
      parts.push(
        "Ensure accuracy and clarity while preserving the core insights.",
      );
    }

    const variations = [
      "Focus on unexpected implications.",
      "Emphasize practical applications.",
      "Explore edge cases and limitations.",
      "Consider multiple perspectives.",
      "Develop the underlying principles.",
      "Connect to broader contexts.",
    ];

    if (totalVariants > 1) {
      parts.push("");
      parts.push(variations[index % variations.length]);
    }

    return parts.join("\n");
  }

  async sampleMany(prompts, n, { temp = 1.0, top_p = 1.0, phase = "unknown" }) {
    const out = [];
    for (let i = 0; i < Math.min(prompts.length, n); i++) {
      const prompt = prompts[i];

      if (!Array.isArray(prompt)) {
        console.warn(`Prompt inválido en sampleMany (índice ${i}):`, prompt);
        continue;
      }

      if (typeof this.agent.generate === "function") {
        out.push(
          await this.agent.generate({
            prompt: prompt,
            temperature: temp,
            top_p,
            phase,
          }),
        );
      } else if (
        typeof this.agent.setLLMConfig === "function" &&
        typeof this.agent.complete === "function"
      ) {
        this.agent.setLLMConfig({ temperature: temp, top_p });
        out.push(await this.agent.complete(prompt, phase));
      } else {
        const previewContent = prompt[prompt.length - 1]?.content || "";
        out.push(`// SAMPLE(${i}) → ${previewContent.substring(0, 200)}...`);
      }
    }
    return out;
  }
}

// Utilidad
function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

export { CreativePipeline };
