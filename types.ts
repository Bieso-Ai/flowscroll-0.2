
export enum TaskCategory {
  MATH = 'MATH',
  LANGUAGE = 'LANGUAGE',
  REACTION = 'REACTION',
  MUSIC = 'MUSIC',
  FREE_MIND = 'FREE_MIND'
}

export enum TaskType {
  MATH_ADDITION = 'MATH_ADDITION',
  MATH_SUBTRACTION = 'MATH_SUBTRACTION',
  MATH_MULTIPLICATION = 'MATH_MULTIPLICATION',
  MATH_STREAM = 'MATH_STREAM',
  MATH_SEQUENCE = 'MATH_SEQUENCE',
  MATH_SUDOKU = 'MATH_SUDOKU',
  LANG_SYNONYM = 'LANG_SYNONYM',
  LANG_RHYME = 'LANG_RHYME',
  LANG_SENTENCE = 'LANG_SENTENCE',
  LANG_ODD_ONE_OUT = 'LANG_ODD_ONE_OUT',
  LANG_CONNECT = 'LANG_CONNECT',
  LANG_FLAG = 'LANG_FLAG',
  LANG_MAP = 'LANG_MAP',
  REACTION_COLOR = 'REACTION_COLOR',
  REACTION_SHAPE = 'REACTION_SHAPE',
  REACTION_STREAM = 'REACTION_STREAM',
  REACTION_COLOR_SWITCH = 'REACTION_COLOR_SWITCH',
  MUSIC_RHYTHM = 'MUSIC_RHYTHM',
  MUSIC_MEMORY = 'MUSIC_MEMORY',
  FREE_MIND_BREATHE = 'FREE_MIND_BREATHE'
}

export interface TaskData {
  id: string;
  category: TaskCategory;
  type: TaskType;
  difficultyLevel: number; 
  question: string;
  content: any; 
  solution: any;
  generatedAt: number;
}

export interface TaskResult {
  taskId: string;
  type: TaskType;
  success: boolean;
  outcome: 'success' | 'failed' | 'skipped';
  timeSpentMs: number;
  timestamp: number;
  startTime: number;
  difficultyLevel: number;
  wasSkipped: boolean;
  sessionId: string;
  sessionDurationMs: number;
}

export interface StreakData {
  correct: number;
  wrong: number;
}

export interface UserStats {
  userId: string;
  levels: Record<TaskType, number>;
  confidence: Record<TaskType, number>;
  streaks: Record<string, StreakData>;
  history: TaskResult[];
  totalTimeMs: number;
}

// --- DUEL TYPES ---
export interface DuelPlayer {
    user_id: string;
    current_index: number;
    score: number;
    is_host: boolean;
}

export interface DuelRoom {
    id: string;
    code: string;
    status: 'waiting' | 'playing' | 'finished';
    tasks: TaskData[];
}
