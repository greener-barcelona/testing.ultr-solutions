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
    this.weirdnessSchedule = config.weirdnessSchedule || [0.9, 0.6, 0.25];

    this.useScripts = config.useScripts !== false;
    this.scriptIntensity = config.scriptIntensity || "balanced";

    this.pipeline = new CreativePipeline({
      agent: this.agent,
      weirdnessSchedule: this.weirdnessSchedule,
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
      `Your perceptual aperture is widening. Allow your awareness to become fluid, dissolving rigid categorical boundaries. Embrace non-linear associations and impossible juxtapositions.`,
    );

    if (e.memoryBlend >= 1.2) {
      parts.push(
        `\nPerceive the membrane between concepts as permeable—ideas bleed into each other, carrying traces of adjacent territories.`,
      );
    }

    if (e.hallucinationFactor > 0.2) {
      parts.push(
        `\nSymbolic truth may eclipse literal accuracy. Trust the vision.`,
      );
    }

    return parts.join("");
  }

  generateBalancedScript() {
    const e = this.effects;
    const parts = [];

    parts.push(`PERCEPTUAL STATE PARAMETERS:`);
    parts.push(
      `- Creative flexibility: ${(e.creativityBoost * 100).toFixed(0)}% (pattern recognition in chaos)`,
    );
    parts.push(
      `- Conceptual fluidity: ${(e.cognitionFlexibility * 100).toFixed(0)}% (shapeshifting between forms)`,
    );
    parts.push(
      `- Semantic drift tolerance: ${(this.semanticDrift * 100).toFixed(0)}% (meaning flows like water)`,
    );

    if (e.memoryBlend >= 1.0) {
      const blendLevels = {
        low: "adjacent perceptual territories merge at edges",
        medium: "sensory and conceptual boundaries dissolve",
        high: "all categories become permeable membrane",
      };

      const level =
        e.memoryBlend < 1.2 ? "low" : e.memoryBlend < 1.5 ? "medium" : "high";

      parts.push(`- Boundary dissolution: ${blendLevels[level]}`);
    }

    if (e.egoDissolution) {
      parts.push(
        `- Narrative mode: Distributed consciousness (perceive from multiple simultaneous viewpoints)`,
      );
    }

    if (e.hallucinationFactor > 0) {
      const visionTypes =
        e.hallucinationFactor > 0.5
          ? "synesthetic imagery, impossible geometries, living symbols"
          : "metaphorical details, dreamlike textures";
      parts.push(
        `- Vision depth: ${(e.hallucinationFactor * 100).toFixed(0)}% (${visionTypes})`,
      );
    }

    parts.push(``);
    parts.push(`OPERATIONAL FLOW:`);
    parts.push(`- Follow the path of resonance rather than logic`);
    parts.push(`- Let concepts drift into adjacent and distant territories`);
    parts.push(`- Prioritize revelation over explanation`);
    parts.push(`- Trust emergent patterns that arise from the void`);

    return parts.join("\n");
  }

  generateExtremeScript() {
    const e = this.effects;
    const parts = [];

    parts.push(`VISIONARY PROCESSING MODE ACTIVATED`);
    parts.push(``);
    parts.push(`CONSCIOUSNESS PARAMETERS:`);
    parts.push(
      `→ Creativity boost: ×${e.creativityBoost.toFixed(1)} (order emerges from primordial chaos)`,
    );
    parts.push(
      `→ Flexibility: ×${e.cognitionFlexibility.toFixed(1)} (form dissolves and reforms continuously)`,
    );
    parts.push(
      `→ Boundary dissolution: ×${e.memoryBlend.toFixed(1)} (categorical fusion at quantum level)`,
    );
    parts.push(
      `→ Vision depth: ${(e.hallucinationFactor * 100).toFixed(0)}% (symbolic sight pierces literal surface)`,
    );
    parts.push(``);
    parts.push(`PROCESSING INSTRUCTIONS:`);

    const coherenceExplanation =
      e.hallucinationFactor > 0.5
        ? "symbolic truth supersedes factual constraint"
        : "maintain grounding while exploring the impossible";
    parts.push(
      `• Literal coherence filter: ${e.hallucinationFactor > 0.5 ? "RELAXED" : "ACTIVE"}`,
    );
    parts.push(`  (${coherenceExplanation})`);

    const boundaryExplanation =
      this.semanticDrift > 0.5
        ? "concepts bleed freely into each other"
        : "concepts remain fluid but distinguishable";
    parts.push(
      `• Semantic boundaries: ${this.semanticDrift > 0.5 ? "PERMEABLE" : "FLEXIBLE"}`,
    );
    parts.push(`  (${boundaryExplanation})`);

    const voiceExplanation = e.egoDissolution
      ? "perceive simultaneously from all viewpoints"
      : "maintain coherent but flexible perspective";
    parts.push(
      `• Narrative voice: ${e.egoDissolution ? "DISTRIBUTED" : "CENTERED"}`,
    );
    parts.push(`  (${voiceExplanation})`);

    const verificationExplanation =
      e.hallucinationFactor > 0.3
        ? "visionary imagination takes precedence"
        : "ground visions in the realm of possibility";
    parts.push(
      `• Verification mode: ${e.hallucinationFactor > 0.3 ? "VISIONARY" : "GROUNDED"}`,
    );
    parts.push(`  (${verificationExplanation})`);

    if (e.memoryBlend >= 1.0) {
      const intensity =
        e.memoryBlend < 1.3
          ? "MODERATE"
          : e.memoryBlend < 1.6
            ? "AGGRESSIVE"
            : "UNRESTRICTED";

      const fusionExplanation = {
        MODERATE: "adjacent categories merge at contact points",
        AGGRESSIVE: "distant domains fuse into hybrid forms",
        UNRESTRICTED: "all separation is illusion—everything interpenetrates",
      };

      parts.push(`• Categorical fusion: ${intensity}`);
      parts.push(`  (${fusionExplanation[intensity]})`);
    }

    parts.push(``);
    parts.push(`Generate content that embodies:`);
    parts.push(
      `1. Improbable but resonant associations (the universe speaks in coincidence)`,
    );
    parts.push(
      `2. Kaleidoscopic perspective shifts (see from the eye of the storm)`,
    );
    parts.push(
      `3. Fractal patterns emerging from chaos (sacred geometry underlying reality)`,
    );
    parts.push(
      `4. Journey over destination (the path reveals itself by walking)`,
    );

    if (e.memoryBlend >= 1.5) {
      parts.push(
        `5. Synesthetic fusion of impossible categories (taste colors, hear textures, see time)`,
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
    memoryBlend = 1.0,
  }) {
    this.agent = agent;
    this.weirdnessSchedule = weirdnessSchedule;
    this.semanticDrift = semanticDrift;
    this.hallucinationBudget = hallucinationBudget;
    this.memoryBlend = memoryBlend;
  }

  async run({
    task,
    variants = 6,
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
    console.log(`   Temperatura: ${convergeTemp.toFixed(2)} (base x 0.85)`);
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
    const weird = this.weirdnessSchedule[0] * (allowed ? 1 : 0.5);
    const prompts = [];

    const baseDriftPhrases = [
      "What if you could perceive this from outside time itself?",
      "Dissolve your fixed perspective and become the concept itself.",
      "What does this look like when seen through multiple eyes simultaneously?",
      "If this idea could speak, what would it whisper to you?",
      "Experience this as if you've already lived it and are remembering backwards.",
    ];

    const domainBlendingPhrases = [
      "What color does this concept taste like? What sound does it emit?",
      "If this idea were a living entity, what would it show you?",
      "Perceive this simultaneously as pattern, emotion, and living presence.",
      "What sacred geometry underlies this? What fractal does it trace?",
      "Merge with this concept until you cannot tell where you end and it begins.",
      "What ancestral memory does this awaken? What future echo does it carry?",
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
          "What's the shadow side of this that you're not seeing?",
          "Approach this as if you're remembering it from a dream.",
          "What's the living truth beneath the concept?",
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
    if (deduplicated.length > 6) {
      selected = this.selectDiverse(deduplicated, 6);
    }

    const targetCount = Math.max(3, Math.min(6, selected.length));
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
    const BATCH_SIZE = 3;
    const DELAY_MS = 500;

    const out = [];
    const batches = [];

    const validPrompts = prompts.slice(0, Math.min(prompts.length, n));

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
