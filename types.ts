export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  STUDY = 'STUDY',
  INPUT = 'INPUT',
  ANALYZING = 'ANALYZING',
  REVIEW = 'REVIEW',
}

export enum Difficulty {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced',
  BUSINESS = 'Business English',
  IDIOMATIC = 'Idiomatic',
}

export enum Topic {
  GENERAL = 'General / Daily Life',
  BUSINESS = 'Business & Career',
  ACADEMIC = 'Academic & Science',
  TRAVEL = 'Travel & Culture',
  TECH = 'Technology',
  PHILOSOPHY = 'Philosophy & Ideas'
}

export enum ContentLength {
  SENTENCE = 'Single Sentence',
  PARAGRAPH = 'Short Paragraph'
}

export interface Challenge {
  english: string;
  chinese: string;
  context: string;
}

export interface GapAnalysisItem {
  type: 'vocabulary' | 'grammar' | 'tone' | 'structure';
  userSegment: string;
  nativeSegment: string;
  explanation: string;
}

export interface AnalysisResult {
  score: number;
  feedback: string;
  gaps: GapAnalysisItem[];
  betterAlternative?: string;
}

export interface NotebookEntry {
  id: string;
  timestamp: number;
  originalContext: string; // The full english sentence context
  gapType: GapAnalysisItem['type'];
  userSegment: string;
  nativeSegment: string;
  explanation: string;
}

export interface HistoryRecord {
  id: string;
  timestamp: number;
  difficulty: Difficulty;
  topic: Topic;
  challenge: Challenge;
  userTranslation: string;
  analysis: AnalysisResult;
}