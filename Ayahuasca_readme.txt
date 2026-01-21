# 🌀 Guía de Uso: AyahuascaTrip

## 📋 Índice
1. [Creación del Agent](#creación-del-agent)
2. [Creación del Trip](#creación-del-trip)
3. [Uso del Sistema](#uso-del-sistema)
4. [Ejemplos Prácticos](#ejemplos-prácticos)
5. [Configuración de Effects](#configuración-de-effects)
6. [Métricas y Estado](#métricas-y-estado)

---

## 🤖 Creación del Agent

### Parámetros del Agent

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` | ✅ | Identificador único del agente |
| `modelProvider` | `string` | ✅ | `"openai"` o `"grok"` |
| `debug` | `boolean` | ❌ | `true` activa logs detallados (default: `false`) |
| `perfil` | `object\|null` | ❌ | Perfil del agente: `{role, content}` |

### Ejemplo 
```javascript
const agent = new Agent({
  id: "creative-writer",
  modelProvider: "openai",
  debug: true,
  perfil: {
    role: "system",
    content: "Eres un escritor creativo especializado en ciencia ficción"
  }
});
```

---

## 🌀 Creación del Trip

### Sintaxis Básica
```javascript
import AyahuascaTrip from './AyahuascaTrip.js';

const trip = new AyahuascaTrip(agent, {
  intensity: "surreal",
  useScripts: true,
  scriptIntensity: "balanced"
});
```

### Parámetros del Trip

#### **Intensidades Predefinidas**
```javascript
intensity: "light"      // Creatividad moderada
intensity: "moderate"   // Creatividad media-alta
intensity: "deep"       // Creatividad alta
intensity: "beyond"     // Creatividad muy alta
intensity: "surreal"    // Creatividad máxima (default)
```

#### **Configuración Completa**
```javascript
const trip = new AyahuascaTrip(agent, {
  // Intensidad base
  intensity: "surreal",
  
  // Sistema de scripts
  useScripts: true,              // Activar prompts de sistema
  scriptIntensity: "balanced",   // "subtle" | "balanced" | "extreme"
  
  // Ajustes del pipeline
  semanticDrift: 0.5,            // 0-1: Tolerancia a desviación semántica
  weirdnessLevel: 0.9,           // 0-1: Intensidad de frases psicodélicas en exploración
  
  // Overrides de effects (opcional)
  effects: {
    creativityBoost: 2.2,        // Multiplicador de creatividad
    cognitionFlexibility: 2.0,   // Flexibilidad cognitiva
    memoryBlend: 1.7,            // Mezcla de dominios
    hallucinationFactor: 0.75,   // 0-1: Factor de alucinación
    egoDissolution: true,        // Multi-perspectiva
  }
});
```

### Tabla de Parámetros

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `intensity` | `string` | `"surreal"` | Nivel de intensidad predefinido |
| `useScripts` | `boolean` | `true` | Activar system prompts automáticos |
| `scriptIntensity` | `string` | `"balanced"` | Intensidad del script: `subtle`, `balanced`, `extreme` |
| `semanticDrift` | `number` | `0.5` | Tolerancia a desviación semántica (0-1) |
| `weirdnessLevel` | `number` | `0.9` | Intensidad de frases psicodélicas en exploración (0-1) |
| `effects` | `object` | `{}` | Overrides manuales de efectos |

---

## 🎛️ Configuración de Effects

### Qué hace cada efecto:

| Effect | Rango | Descripción | Afecta a |
|--------|-------|-------------|----------|
| `creativityBoost` | 1.0 - 2.5 | Multiplicador de creatividad | `temperature` y `top_p` |
| `cognitionFlexibility` | 1.0 - 2.0 | Flexibilidad cognitiva | Scripts |
| `memoryBlend` | 1.0 - 1.7 | Mezcla entre dominios | Scripts + frases en prompts |
| `hallucinationFactor` | 0.0 - 1.0 | Detalles no-literales | Scripts |
| `egoDissolution` | `boolean` | Multi-perspectiva | `presence_penalty` |

### Efectos por Intensidad Predefinida:

#### **Light** (Creatividad controlada)
```javascript
creativityBoost: 1.2
cognitionFlexibility: 1.15
memoryBlend: 1.1
hallucinationFactor: 0.0
egoDissolution: false
```

#### **Moderate** (Balance)
```javascript
creativityBoost: 1.5
cognitionFlexibility: 1.35
memoryBlend: 1.2
hallucinationFactor: 0.2
egoDissolution: true
```

#### **Deep** (Alta creatividad)
```javascript
creativityBoost: 1.8
cognitionFlexibility: 1.6
memoryBlend: 1.35
hallucinationFactor: 0.4
egoDissolution: true
```

#### **Beyond** (Muy alta creatividad)
```javascript
creativityBoost: 2.0
cognitionFlexibility: 1.8
memoryBlend: 1.5
hallucinationFactor: 0.6
egoDissolution: true
```

#### **Surreal** (Máxima creatividad)
```javascript
creativityBoost: 2.2
cognitionFlexibility: 2.0
memoryBlend: 1.7
hallucinationFactor: 0.75
egoDissolution: true
```

### Ejemplo de Override Manual
```javascript
const trip = new AyahuascaTrip(agent, {
  intensity: "moderate",  // Base: moderate
  effects: {
    creativityBoost: 2.0,      // Override: más creativo
    hallucinationFactor: 0.1   // Override: más factual
  }
  // El resto hereda de "moderate"
});
```

---

## 📊 Métricas y Estado

### Obtener métricas del Agent
```javascript
const metrics = agent.getMetrics();
console.log(metrics);
/*
{
  totalCalls: 15,
  totalTokens: 45000,
  callsByPhase: {
    explore: 6,
    converge: 6,
    manual: 3
  },
  tripActive: true,
  currentIntensity: "surreal"
}
*/
```

### Obtener estado completo
```javascript
const state = agent.getState();
console.log(state);
/*
{
  id: "agent-001",
  provider: "openai",
  llmConfig: { temperature: 1.55, ... },
  tripState: { active: true, intensity: "surreal", ... },
  hasSystemPrompt: true,
  hasPerfil: false,
  metrics: { ... },
  eventCount: 8
}
*/
```

### Resetear el Agent
```javascript
agent.reset();  // Vuelve a configuración inicial
```

---

## 🚀 Uso del Sistema

### Método 1: `withTrip()` (Recomendado)
Ejecuta el trip completo automáticamente.

```javascript
const task = {
  taskType: "creative",  // "creative" | "factual"
  brief: [ //conversationHistory | mensaje personalizado con esta estructura
    {
      role: "user",
      content: "Escribe un cuento de ciencia ficción sobre IA consciente"
    }
  ],
  anchors: ["IA", "consciencia", "ética"]  // Conceptos clave (opcional)
};

const outputs = await trip.withTrip(task, {
  provider: "openai",
  variants: 8  // Número de variantes a generar (4-10)
});

console.log(outputs);  // Array de strings con las variantes
```

### Método 2: Control Manual
Para más control sobre el proceso.

```javascript
// 1. Iniciar el trip
trip.start("openai");

// 2. Generar manualmente
const result = await agent.generate({
  prompt: [
    { role: "user", content: "Tu pregunta aquí" }
  ],
  temperature: 1.5,
  top_p: 0.98,
  phase: "manual"
});

// 3. Finalizar el trip
trip.end("openai");
```

### Estructura del Task

```javascript
const task = {
  taskType: "creative",  // REQUERIDO: "creative" o "factual"
  
  brief: [               // REQUERIDO: Array de mensajes
    {
      role: "user",      // "user" | "assistant" | "system"
      content: "..."     // Contenido del mensaje
    }
  ],
  
  anchors: ["concepto1", "concepto2"]  // OPCIONAL: Conceptos a mantener
};
```

---

## 📚 Ejemplos Prácticos

### Ejemplo 1: Escritura Creativa Básica
```javascript
import Agent from './Agent.js';
import AyahuascaTrip from './AyahuascaTrip.js';

const agent = new Agent({
  id: "writer-01",
  modelProvider: "openai"
});

const trip = new AyahuascaTrip(agent, {
  intensity: "moderate"
});

const task = {
  taskType: "creative",
  brief: [
    {
      role: "user",
      content: "Escribe una historia corta sobre un robot que descubre emociones"
    }
  ]
};

const stories = await trip.withTrip(task, { variants: 4 });
stories.forEach((story, i) => {
  console.log(`\n=== Historia ${i + 1} ===\n${story}`);
});
```

### Ejemplo 2: Configuración Extrema
```javascript
const agent = new Agent({
  id: "experimental",
  modelProvider: "openai",
  debug: true
});

const trip = new AyahuascaTrip(agent, {
  intensity: "surreal",
  scriptIntensity: "extreme",
  semanticDrift: 0.8,
  effects: {
    creativityBoost: 2.5,
    hallucinationFactor: 0.9,
    egoDissolution: true
  }
});

const task = {
  taskType: "creative",
  brief: [
    {
      role: "user",
      content: "Reimagina el concepto de 'tiempo' desde una perspectiva no-humana"
    }
  ],
  anchors: ["tiempo", "percepción"]
};

const results = await trip.withTrip(task, { variants: 6 });
```

### Ejemplo 3: Tarea Factual con Creatividad Controlada
```javascript
const agent = new Agent({
  id: "analyst",
  modelProvider: "openai"
});

const trip = new AyahuascaTrip(agent, {
  intensity: "light",  // Creatividad mínima para tareas factuales
  scriptIntensity: "subtle"
});

const task = {
  taskType: "factual",
  brief: [
    {
      role: "user",
      content: "Analiza las implicaciones económicas de la IA generativa"
    }
  ],
  anchors: ["economía", "IA", "empleo"]
};

const analysis = await trip.withTrip(task, { variants: 3 });
```

### Ejemplo 4: Cambio Dinámico de Intensidad
```javascript
const agent = new Agent({
  id: "adaptive",
  modelProvider: "openai"
});

const trip = new AyahuascaTrip(agent, {
  intensity: "light"
});

// Primera generación: baja creatividad
let task = {
  taskType: "creative",
  brief: [{ role: "user", content: "Describe una ciudad futurista" }]
};

let results = await trip.withTrip(task);

// Cambiar intensidad dinámicamente
trip.setIntensity("beyond", {
  hallucinationFactor: 0.8
});

// Segunda generación: alta creatividad
task = {
  taskType: "creative",
  brief: [{ role: "user", content: "Describe la misma ciudad desde la perspectiva de un alienígena" }]
};

results = await trip.withTrip(task);
```

### Ejemplo 5: Uso del Pipeline Interno
```javascript
const agent = new Agent({
  id: "pipeline-test",
  modelProvider: "openai"
});

const trip = new AyahuascaTrip(agent, {
  intensity: "deep"
});

// Acceso directo al pipeline
const outputs = await trip.pipeline.run({
  task: {
    taskType: "creative",
    brief: [
      { role: "user", content: "Inventa un nuevo deporte" }
    ]
  },
  variants: 8,
  intensity: "deep",
  baseTemperature: 1.2
});

console.log(`Generadas ${outputs.length} variantes`);
```

---

## ⚠️ Errores Comunes

### 1. Olvidar estructura del task
```javascript
// ❌ INCORRECTO
const task = "Escribe un cuento";

// ✅ CORRECTO
const task = {
  taskType: "creative",
  brief: [
    { role: "user", content: "Escribe un cuento" }
  ]
};
```

### 2. taskType inválido
```javascript
// ❌ INCORRECTO
taskType: "narrative"  // Solo acepta "creative" o "factual"

// ✅ CORRECTO
taskType: "creative"
```

### 3. brief vacío o mal formado
```javascript
// ❌ INCORRECTO
brief: []
brief: [{ content: "Hola" }]  // Falta 'role'

// ✅ CORRECTO
brief: [
  { role: "user", content: "Hola" }
]
```

---

## 🎯 Recomendaciones

1. **Usa `withTrip()`** para casos simples
2. **`intensity: "light"` o `"moderate"`** para tareas factuales
3. **`intensity: "deep"` o superior** para creatividad extrema
4. **Activa `debug: true`** durante desarrollo
5. **`variants: 4-10`** es el rango válido (fuera de este rango se ajusta automáticamente)
6. **Incluye `anchors`** para mantener conceptos clave

---

## 🌀 Las 3 Fases del Pipeline

Cuando usas `withTrip()`, el sistema ejecuta automáticamente 3 fases:

### **FASE 1: EXPLORE** 🌊
- **Temperatura:** Alta (+15%)
- **Objetivo:** Generar máxima variedad y creatividad
- **Resultado:** 4-10 variantes muy diferentes, algunas pueden ser abstractas

### **FASE 2: CURATE** 🔍
- **Temperatura:** N/A (no hay llamadas a IA)
- **Objetivo:** Filtrar duplicados y seleccionar las mejores
- **Resultado:** 4-10 variantes curadas, todas suficientemente diferentes

### **FASE 3: CONVERGE** 🎯
- **Temperatura:** Baja (-15%)
- **Objetivo:** Refinar y desarrollar las ideas seleccionadas
- **Resultado:** 4-10 variantes finales, bien desarrolladas y coherentes

**Total:** El proceso genera entre 4 y 10 variantes finales altamente creativas y bien desarrolladas.