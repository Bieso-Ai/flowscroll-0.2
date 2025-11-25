
import { TaskData, TaskType, TaskCategory, UserStats, TaskResult } from "../types";
import { generateLanguageTaskContent } from "./geminiService";

// --- HELPER: Safe UUID Generation ---
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const generateSessionId = () => `sess_${generateUUID().slice(0,8)}_${Date.now().toString(36)}`;

// Initial stats for a new user
export const INITIAL_STATS: UserStats = {
  userId: generateUUID(),
  levels: {
    [TaskType.MATH_ADDITION]: 2, 
    [TaskType.MATH_SUBTRACTION]: 2,
    [TaskType.MATH_MULTIPLICATION]: 2,
    [TaskType.MATH_SEQUENCE]: 1,
    [TaskType.MATH_SUDOKU]: 1, 
    [TaskType.REACTION_COLOR]: 1,
    [TaskType.REACTION_SHAPE]: 1,
    [TaskType.REACTION_STREAM]: 1,
    [TaskType.REACTION_COLOR_SWITCH]: 1,
    [TaskType.MUSIC_RHYTHM]: 1, 
    [TaskType.MUSIC_MEMORY]: 1,
    [TaskType.LANG_ODD_ONE_OUT]: 1,
    [TaskType.LANG_CONNECT]: 1,
    [TaskType.LANG_FLAG]: 1,
    [TaskType.LANG_MAP]: 1, // New
    [TaskType.LANG_SYNONYM]: 1,
    [TaskType.LANG_RHYME]: 1,
    [TaskType.LANG_SENTENCE]: 1,
  } as any,
  confidence: {} as any, 
  streaks: {} as any, 
  history: [],
  totalTimeMs: 0,
};

// --- DATA MIGRATION ---
export const migrateUserStats = (stats: any): UserStats => {
    const merged = { ...INITIAL_STATS, ...stats };
    
    // Ensure all level keys exist
    Object.keys(INITIAL_STATS.levels).forEach(key => {
        if (merged.levels[key] === undefined) {
            merged.levels[key] = 1;
        }
    });

    if (!merged.confidence) merged.confidence = {};
    if (!merged.streaks) merged.streaks = {};
    if (!merged.userId) merged.userId = generateUUID();
    
    return merged as UserStats;
};

// --- MATH ENGINE V3: FLOW ZONE & TOTAL DIGIT CAPACITY ---

const generateNumberWithDigits = (digits: number): number => {
    if (digits <= 0) return 0;
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateFlowMathTask = (type: TaskType, level: number): Partial<TaskData> => {
    const totalDigits = Math.floor(level) + 1;
    
    let digitsA = Math.ceil(totalDigits / 2);
    let digitsB = Math.floor(totalDigits / 2);

    if (totalDigits >= 4 && Math.random() > 0.5) {
        [digitsA, digitsB] = [digitsB, digitsA];
    }

    let a = generateNumberWithDigits(digitsA);
    let b = generateNumberWithDigits(digitsB);

    if (type === TaskType.MATH_ADDITION) {
        return {
            question: `${a} + ${b}`,
            solution: a + b,
            content: { a, b, operator: type }
        };
    } 
    else if (type === TaskType.MATH_SUBTRACTION) {
        if (a < b) {
            [a, b] = [b, a];
        }
        return {
            question: `${a} - ${b}`,
            solution: a - b,
            content: { a, b, operator: type }
        };
    }
    else if (type === TaskType.MATH_MULTIPLICATION) {
        if (totalDigits === 4) {
             if (Math.random() > 0.5) { digitsA = 3; digitsB = 1; }
             else { digitsA = 2; digitsB = 2; }
        } else if (totalDigits >= 5) {
             digitsB = Math.min(2, digitsB);
             digitsA = totalDigits - digitsB;
        }

        a = generateNumberWithDigits(digitsA);
        b = generateNumberWithDigits(digitsB);

        if (level > 1 && digitsB === 1) {
            b = Math.floor(Math.random() * 8) + 2;
        }

        return {
            question: `${a} × ${b}`,
            solution: a * b,
            content: { a, b, operator: type }
        };
    }

    return {};
};

// --- LEGACY / OTHER GENERATORS ---

const generateMathSequenceTask = (level: number): Partial<TaskData> => {
      let patternType: 'linear' | 'progressive' | 'geometric' | 'fibonacci' | 'alternating' = 'linear';
      
      if (level >= 8) {
          const r = Math.random();
          if (r > 0.6) patternType = 'fibonacci';
          else if (r > 0.3) patternType = 'geometric';
          else patternType = 'alternating';
      } else if (level >= 4) {
          const r = Math.random();
          if (r > 0.5) patternType = 'progressive';
          else patternType = 'alternating';
      }

      let sequence: number[] = [];
      let current = Math.floor(Math.random() * 10) + 1;
      if (level > 5) current = Math.floor(Math.random() * 20) + 5;
      
      sequence.push(current);

      if (patternType === 'linear') {
          const step = Math.floor(Math.random() * 5) + 1 + Math.floor(level / 3);
          const isSub = Math.random() > 0.8 && current > 20;
          for(let i=0; i<4; i++) {
              current = isSub ? current - step : current + step;
              sequence.push(current);
          }
      } 
      else if (patternType === 'progressive') {
          const startStep = Math.floor(Math.random() * 2) + 1;
          const increment = Math.floor(Math.random() * 2) + 1;
          for(let i=0; i<4; i++) {
              const step = startStep + (i * increment);
              current += step;
              sequence.push(current);
          }
      }
      else if (patternType === 'geometric') {
          const factor = Math.random() > 0.7 ? 3 : 2;
          current = Math.floor(Math.random() * 3) + 1; 
          sequence = [current];
          for(let i=0; i<4; i++) {
              current *= factor;
              sequence.push(current);
          }
      }
      else if (patternType === 'fibonacci') {
          let a = Math.floor(Math.random() * 5) + 1;
          let b = Math.floor(Math.random() * 5) + 1;
          sequence = [a, b];
          for(let i=0; i<4; i++) {
              const next = a + b;
              sequence.push(next);
              a = b;
              b = next;
          }
      }
      else if (patternType === 'alternating') {
          const step1 = Math.floor(Math.random() * 3) + 2; 
          const step2 = Math.floor(Math.random() * 2) + 1; 
          for(let i=0; i<4; i++) {
              if (i % 2 === 0) current += step1;
              else current -= step2;
              sequence.push(current);
          }
      }

      const solution = sequence.pop()!;
      const displaySequence = sequence;
      const optionsSet = new Set<number>();
      optionsSet.add(solution);

      while(optionsSet.size < 4) {
          const offset = Math.floor(Math.random() * 5) + 1;
          const r = Math.random();
          let fake = 0;
          if (r < 0.3) fake = solution + offset;
          else if (r < 0.6) fake = solution - offset;
          else if (r < 0.8) fake = solution + 10;
          else fake = solution - 10;
          if (fake !== solution) optionsSet.add(fake);
      }

      return {
          question: "Setze die Reihe fort",
          solution: solution,
          content: {
              sequence: displaySequence,
              options: Array.from(optionsSet).sort(() => Math.random() - 0.5),
              correctValue: solution
          }
      };
};

const generateSudokuTask = (level: number): Partial<TaskData> => {
    let grid = [
        [1, 2, 3, 4],
        [3, 4, 1, 2],
        [2, 1, 4, 3],
        [4, 3, 2, 1]
    ];
    const map = [1,2,3,4].sort(() => Math.random() - 0.5);
    grid = grid.map(row => row.map(val => map[val-1]));

    if(Math.random() > 0.5) [grid[0], grid[1]] = [grid[1], grid[0]];
    if(Math.random() > 0.5) [grid[2], grid[3]] = [grid[3], grid[2]];
    
    if(Math.random() > 0.5) {
        [grid[0], grid[2]] = [grid[2], grid[0]];
        [grid[1], grid[3]] = [grid[3], grid[1]];
    }

    if(Math.random() > 0.5) {
        const newGrid: number[][] = [];
        for(let c=0; c<4; c++) {
            const newRow: number[] = [];
            for(let r=0; r<4; r++) {
                newRow.push(grid[r][c]);
            }
            newGrid.push(newRow);
        }
        grid = newGrid;
    }

    const solution = grid.map(row => [...row]);
    const puzzle = grid.map(row => [...row]);
    
    const removeCount = Math.min(10, 4 + Math.floor(level / 2)); 
    
    let removed = 0;
    let attempts = 0;
    while(removed < removeCount && attempts < 50) {
        const r = Math.floor(Math.random() * 4);
        const c = Math.floor(Math.random() * 4);
        if(puzzle[r][c] !== 0) {
            puzzle[r][c] = 0; 
            removed++;
        }
        attempts++;
    }
    
    return {
        question: "Mini Sudoku",
        content: { puzzle, gridSize: 4 },
        solution: solution
    };
};

const generateReactionTask = (type: TaskType, level: number): Partial<TaskData> => {
  if (type === TaskType.REACTION_COLOR) {
    const decay = Math.pow(0.9, level);
    const waitMin = Math.max(1000, 3500 * decay); 
    const waitMax = Math.max(2000, 5000 * decay);

    return {
      question: "Tippe bei Grün",
      content: { waitMin, waitMax },
      solution: 0 
    };
  } else if (type === TaskType.REACTION_SHAPE) {
    const gridSize = Math.min(5, 2 + Math.floor(level / 3));
    const oddIndex = Math.floor(Math.random() * (gridSize * gridSize));
    
    const modes = ['EMOJI', 'ROTATION'];
    const mode = modes[Math.floor(Math.random() * modes.length)];
    
    const items = { base: 'A', odd: 'B' }; 
    if (mode === 'EMOJI') {
        const pairs = [
            { base: '😐', odd: '😶' }, { base: '😀', odd: '😃' }, 
            { base: '⚪', odd: '⚫' }, { base: '⬛', odd: '⬜' },
            { base: '🍎', odd: '🍅' }, { base: '🕒', odd: '🕓' }
        ];
        const p = pairs[Math.floor(Math.random() * pairs.length)];
        items.base = p.base;
        items.odd = p.odd;
    }

    return {
      question: "Finde den Außenseiter",
      content: { gridSize, oddIndex, mode, items },
      solution: oddIndex
    };
  } else if (type === TaskType.REACTION_COLOR_SWITCH) {
      let tier: 'easy' | 'medium' | 'hard' = 'easy';
      if (level >= 8) tier = 'hard';
      else if (level >= 4) tier = 'medium';

      let params = {
          numTrials: 5, 
          distractorStepMin: 2,
          distractorStepMax: 4,
          colorChangeSpeed: 800, 
          targetWindow: 1200, 
          distractors: ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-purple-500', 'bg-orange-500'],
          targetColorClass: 'bg-green-500',
          targetColorName: 'Grün'
      };

      if (tier === 'medium') {
          params = {
              numTrials: 8,
              distractorStepMin: 3,
              distractorStepMax: 6,
              colorChangeSpeed: 600,
              targetWindow: 900,
              distractors: ['bg-red-500', 'bg-blue-600', 'bg-yellow-500', 'bg-purple-600', 'bg-orange-500', 'bg-pink-500'],
              targetColorClass: 'bg-green-500',
              targetColorName: 'Grün'
          };
      } else if (tier === 'hard') {
          params = {
              numTrials: 10,
              distractorStepMin: 4,
              distractorStepMax: 8,
              colorChangeSpeed: 400,
              targetWindow: 600,
              distractors: ['bg-teal-500', 'bg-lime-500', 'bg-emerald-700', 'bg-cyan-500', 'bg-yellow-400'],
              targetColorClass: 'bg-green-500',
              targetColorName: 'Grün'
          };
      }

      return {
          question: `Tippe nur bei ${params.targetColorName}`,
          content: { tier, ...params },
          solution: null
      };

  } else {
    let tier: 'easy' | 'medium' | 'hard' = 'easy';
    if (level >= 8) tier = 'hard';
    else if (level >= 4) tier = 'medium';

    let params = {
        numTargetEvents: 3, 
        distractorRatio: 2, 
        minInterval: 800,
        maxInterval: 1400,
        displayDuration: 800,
        emojiSize: 'text-7xl'
    };

    if (tier === 'medium') {
        params = {
            numTargetEvents: 4, 
            distractorRatio: 3,
            minInterval: 600,
            maxInterval: 1100,
            displayDuration: 600,
            emojiSize: 'text-6xl'
        };
    } else if (tier === 'hard') {
        params = {
            numTargetEvents: 5, 
            distractorRatio: 4,
            minInterval: 400,
            maxInterval: 900,
            displayDuration: 450,
            emojiSize: 'text-5xl'
        };
    }

    const EMOJI_SETS = [
        { target: '🦊', distractors: ['🐶', '🐱', '🦁', '🐯', '🐻', '🐨', '🐼'] },
        { target: '⚽', distractors: ['🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱'] },
        { target: '🍎', distractors: ['🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓'] },
        { target: '🚀', distractors: ['✈️', '🚁', '🚂', '🚗', '🚌', '🚲', '🛵'] },
        { target: '⭐', distractors: ['🌟', '✨', '💫', '☀️', '🌙', '⚡', '❄️'] },
    ];
    const set = EMOJI_SETS[Math.floor(Math.random() * EMOJI_SETS.length)];

    return {
        question: "Ziel Fokus",
        content: {
            tier,
            targetEmoji: set.target,
            distractors: set.distractors,
            ...params
        },
        solution: null 
    };
  }
};

const generateMusicTask = (type: TaskType, level: number): Partial<TaskData> => {
  if (type === TaskType.MUSIC_RHYTHM) {
      const steps = 4 + Math.floor(level / 2);
      const complexity = Math.min(0.8, 0.2 + (level * 0.05));
      const pattern = [];
      const instruments = ['kick', 'snare', 'hihat', 'tom'];
      for(let i=0; i<steps; i++) {
          const timeOffset = i * 500;
          if (i === 0 || Math.random() < complexity) {
              const inst = i === 0 ? 'kick' : instruments[Math.floor(Math.random() * instruments.length)];
              pattern.push({ timeOffset, type: inst });
          }
      }
      return {
          question: "Wiederhole den Beat",
          content: { pattern, totalDuration: steps * 500 },
          solution: pattern
      };
  } else {
      const length = 3 + Math.floor(level / 2);
      const speed = Math.max(300, 800 - (level * 50));
      const sequence = [];
      const activePads = Math.min(4, 2 + Math.floor(level / 3));
      for(let i=0; i<length; i++) {
          sequence.push(Math.floor(Math.random() * activePads));
      }
      return {
          question: "Merke dir den Klang",
          content: { sequence, playbackSpeed: speed, activePads },
          solution: sequence
      };
  }
};


// --- MAIN ENGINE ---

export const generateNextTask = async (userStats: UserStats): Promise<TaskData> => {
  const id = generateUUID();
  
  // Weights
  const weights = {
    [TaskCategory.MATH]: 0.40, 
    [TaskCategory.REACTION]: 0.30,
    [TaskCategory.MUSIC]: 0.10,
    [TaskCategory.LANGUAGE]: 0.20
  };

  const rand = Math.random();
  let category = TaskCategory.REACTION;
  let cumulative = 0;
  
  for (const [cat, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (rand < cumulative) {
      category = cat as TaskCategory;
      break;
    }
  }

  // Select Type
  let type: TaskType;
  if (category === TaskCategory.MATH) {
     const types = [
        TaskType.MATH_ADDITION, 
        TaskType.MATH_SUBTRACTION, 
        TaskType.MATH_MULTIPLICATION, 
        TaskType.MATH_SEQUENCE,
        TaskType.MATH_SUDOKU 
     ];
     type = types[Math.floor(Math.random() * types.length)];
  } else if (category === TaskCategory.REACTION) {
     const types = [TaskType.REACTION_COLOR, TaskType.REACTION_SHAPE, TaskType.REACTION_STREAM, TaskType.REACTION_COLOR_SWITCH];
     type = types[Math.floor(Math.random() * types.length)];
  } else if (category === TaskCategory.LANGUAGE) {
     const types = [TaskType.LANG_ODD_ONE_OUT, TaskType.LANG_CONNECT, TaskType.LANG_FLAG, TaskType.LANG_MAP]; 
     type = types[Math.floor(Math.random() * types.length)];
  } else {
     const types = [TaskType.MUSIC_RHYTHM, TaskType.MUSIC_MEMORY];
     type = types[Math.floor(Math.random() * types.length)];
  }

  let level = userStats.levels[type] || 1;
  
  // Generate Content
  let taskContent: Partial<TaskData> = {};

  if (category === TaskCategory.MATH) {
    if (type === TaskType.MATH_SEQUENCE) {
        taskContent = generateMathSequenceTask(level);
    } else if (type === TaskType.MATH_SUDOKU) {
        taskContent = generateSudokuTask(level);
    } else if (type === TaskType.MATH_STREAM) {
        taskContent = { question: "Math Stream", content: { startValue: 10, defaultSpeed: 2000, defaultOps: ['+'] }, solution: 0 };
    } else {
        taskContent = generateFlowMathTask(type, level);
    }
  } else if (category === TaskCategory.REACTION) {
    taskContent = generateReactionTask(type, level);
  } else if (category === TaskCategory.MUSIC) {
    taskContent = generateMusicTask(type, level);
  } else if (category === TaskCategory.LANGUAGE) {
    const content = await generateLanguageTaskContent(type, level);
    
    let question = "Löse die Aufgabe";
    if (type === TaskType.LANG_CONNECT) question = "Verbinde Wörter";
    else if (type === TaskType.LANG_ODD_ONE_OUT) question = "Was passt nicht?";
    else if (type === TaskType.LANG_FLAG) question = "Welches Land ist das?";
    else if (type === TaskType.LANG_MAP) question = "Welche Grenze ist das?";

    taskContent = {
        question,
        content,
        solution: "index"
    };
  }

  return {
    id,
    category,
    type,
    difficultyLevel: level,
    question: taskContent.question || "Task",
    content: taskContent.content,
    solution: taskContent.solution,
    generatedAt: Date.now()
  };
};

export const updateStats = (currentStats: UserStats, result: TaskResult): { newStats: UserStats, decision: string } => {
  const newStats = { ...currentStats };
  newStats.history = [...newStats.history, result];
  newStats.totalTimeMs += result.timeSpentMs;

  const type = result.type;
  let currentLevel = newStats.levels[type] || 1;
  let decision = "maintain";

  if (type === TaskType.MATH_ADDITION || type === TaskType.MATH_SUBTRACTION || type === TaskType.MATH_MULTIPLICATION || type === TaskType.MATH_SUDOKU) {
      
      const typeHistory = newStats.history.filter(h => h.type === type);
      const totalSolved = typeHistory.length;

      const windowSize = totalSolved < 30 ? 8 : 15;
      const window = typeHistory.slice(-windowSize);

      const wins = window.filter(h => h.success).length;
      const accuracy = wins / window.length;
      const totalTime = window.reduce((sum, h) => sum + h.timeSpentMs, 0);
      const avgTimeMs = totalTime / window.length;

      let FLOW_MIN_MS = 5000;
      let FLOW_MAX_MS = 20000;
      
      if (type === TaskType.MATH_SUDOKU) {
          FLOW_MIN_MS = 10000;
          FLOW_MAX_MS = 40000;
      }

      if (accuracy < 0.6 || avgTimeMs > (FLOW_MAX_MS * 1.2)) {
          currentLevel = Math.max(1, currentLevel - 1);
          decision = "decrease";
      } 
      else if (accuracy >= 0.9 && avgTimeMs < FLOW_MIN_MS) {
          if (totalSolved < 30) {
              currentLevel = Math.min(10, currentLevel + 1);
              decision = "increase_fast";
          } else {
              if (totalSolved % 15 === 0) {
                  currentLevel = Math.min(10, currentLevel + 1);
                  decision = "increase";
              }
          }
      }
      
      newStats.levels[type] = currentLevel;
      return { newStats, decision };
  }
  
  const currentConfidence = newStats.confidence[type] || 0.1; 
  let volatility = 1 + (1 - currentConfidence) * 2; 
  
  let baseChange = 0;
  if (result.success) {
      if (result.timeSpentMs < 3000) baseChange = 1.0; 
      else if (result.timeSpentMs < 5000) baseChange = 0.6; 
      else if (result.timeSpentMs < 10000) baseChange = 0.3; 
      else baseChange = 0.1; 
  } else if (result.wasSkipped) {
      if (result.timeSpentMs < 1500) baseChange = -0.5; 
      else baseChange = -0.2; 
  } else {
      baseChange = -0.5;
  }

  let change = baseChange * volatility;
  let newLevel = currentLevel + change;
  if (newLevel < 1) newLevel = 1;
  
  newStats.levels[type] = Math.round(newLevel * 100) / 100;
  const confGain = result.wasSkipped ? 0.01 : 0.05;
  newStats.confidence[type] = Math.min(1.0, currentConfidence + confGain);

  decision = change > 0 ? "increase_elo" : (change < 0 ? "decrease_elo" : "maintain");

  return { newStats, decision };
};
