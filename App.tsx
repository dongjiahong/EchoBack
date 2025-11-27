import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  RefreshCw, 
  Languages, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Send, 
  Sparkles,
  RotateCcw,
  Settings as SettingsIcon,
  BookMarked,
  Menu,
  ChevronLeft,
  Cloud
} from 'lucide-react';
import Button from './components/Button';
import AnalysisCard from './components/AnalysisCard';
import SettingsModal from './components/SettingsModal';
import Notebook from './components/Notebook';
import Sidebar from './components/Sidebar';
import { AppState, Difficulty, Challenge, AnalysisResult, Topic, ContentLength, NotebookEntry, GapAnalysisItem, HistoryRecord } from './types';
import { generateChallenge, analyzeTranslation, aiConfigManager } from './services/aiService';
import { db } from './services/db';
import { webdav } from './services/webdav';

const GENERAL_SETTINGS_KEY = 'echoback_general_settings';

interface GeneralSettings {
  difficulty: Difficulty;
  topic: Topic;
  contentLength: ContentLength;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);

  // Preferences - Load from localStorage
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    try {
      const saved = localStorage.getItem(GENERAL_SETTINGS_KEY);
      if (saved) {
        const settings: GeneralSettings = JSON.parse(saved);
        return settings.difficulty || Difficulty.INTERMEDIATE;
      }
    } catch (e) {
      console.error('Failed to load difficulty from localStorage', e);
    }
    return Difficulty.INTERMEDIATE;
  });

  const [topic, setTopic] = useState<Topic>(() => {
    try {
      const saved = localStorage.getItem(GENERAL_SETTINGS_KEY);
      if (saved) {
        const settings: GeneralSettings = JSON.parse(saved);
        return settings.topic || Topic.GENERAL;
      }
    } catch (e) {
      console.error('Failed to load topic from localStorage', e);
    }
    return Topic.GENERAL;
  });

  const [contentLength, setContentLength] = useState<ContentLength>(() => {
    try {
      const saved = localStorage.getItem(GENERAL_SETTINGS_KEY);
      if (saved) {
        const settings: GeneralSettings = JSON.parse(saved);
        return settings.contentLength || ContentLength.SENTENCE;
      }
    } catch (e) {
      console.error('Failed to load contentLength from localStorage', e);
    }
    return ContentLength.SENTENCE;
  });
  
  // Data State
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [userTranslation, setUserTranslation] = useState('');
  const [isOriginalHidden, setIsOriginalHidden] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // History & Persistence - 分页管理
  const [displayedHistory, setDisplayedHistory] = useState<HistoryRecord[]>([]);
  const [currentHistoryPage, setCurrentHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // UI State - 分页管理
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [displayedNotebook, setDisplayedNotebook] = useState<NotebookEntry[]>([]);
  const [currentNotebookPage, setCurrentNotebookPage] = useState(0);
  const [hasMoreNotebook, setHasMoreNotebook] = useState(true);
  const [isLoadingNotebook, setIsLoadingNotebook] = useState(false);
  const [currentSessionSavedIndices, setCurrentSessionSavedIndices] = useState<number[]>([]);

  // Ref for auto-focusing
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Save General Settings to localStorage
  useEffect(() => {
    try {
      const settings: GeneralSettings = {
        difficulty,
        topic,
        contentLength
      };
      localStorage.setItem(GENERAL_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save general settings to localStorage', e);
    }
  }, [difficulty, topic, contentLength]);

  // Load Data from IDB & Sync - 使用分页加载
  useEffect(() => {
      const initApp = async () => {
          try {
              // 1. Load Local (只加载第一页，50条)
              const PAGE_SIZE = 50;
              let [hist, nb] = await Promise.all([
                  db.getHistoryPaged(0, PAGE_SIZE),
                  db.getNotebookPaged(0, PAGE_SIZE)
              ]);

              setDisplayedHistory(hist);
              setDisplayedNotebook(nb);
              setHasMoreHistory(hist.length === PAGE_SIZE);
              setHasMoreNotebook(nb.length === PAGE_SIZE);

              // 2. Try Sync if Configured
              if (webdav.getConfig()?.enabled) {
                  await performSync();
              }
          } catch (e) {
              console.error("Failed to load data from DB", e);
          }
      };
      initApp();
  }, []);

  const performSync = async () => {
      setIsSyncing(true);
      try {
          // 获取全部本地数据用于同步
          const [allHistory, allNotebook] = await Promise.all([
              db.getHistory(),
              db.getNotebookEntries()
          ]);

          const result = await webdav.syncData(allHistory, allNotebook);

          // Update DB
          await db.saveHistoryBatch(result.history);
          await db.saveNotebookBatch(result.notebook);

          // 重新加载显示的第一页
          const PAGE_SIZE = 50;
          const [hist, nb] = await Promise.all([
              db.getHistoryPaged(0, PAGE_SIZE),
              db.getNotebookPaged(0, PAGE_SIZE)
          ]);

          setDisplayedHistory(hist);
          setDisplayedNotebook(nb);
          setCurrentHistoryPage(0);
          setCurrentNotebookPage(0);
          setHasMoreHistory(hist.length === PAGE_SIZE);
          setHasMoreNotebook(nb.length === PAGE_SIZE);
      } catch (err) {
          console.error("Sync failed", err);
      } finally {
          setIsSyncing(false);
      }
  };

  const handleManualSync = () => {
      performSync();
  };

  // Scroll to top on state change
  useEffect(() => {
      if (state === AppState.IDLE || state === AppState.REVIEW) {
          mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
  }, [state]);

  // Focus Input
  useEffect(() => {
    if (state === AppState.INPUT && inputRef.current) {
        // Small delay to ensure render
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [state]);

  const handleStart = async () => {
    // 检查 AI 配置
    if (!aiConfigManager.hasValidConfig()) {
      setError("Please configure AI settings first (Settings -> AI Settings)");
      setIsSettingsOpen(true);
      return;
    }

    setState(AppState.GENERATING);
    setError(null);
    setAnalysis(null);
    setUserTranslation('');
    setIsOriginalHidden(false);
    setCurrentSessionSavedIndices([]);
    setCurrentRecordId(null); // New session, no record ID yet

    try {
      const newChallenge = await generateChallenge(difficulty, topic, contentLength);
      setChallenge(newChallenge);
      setState(AppState.STUDY);
    } catch (err: any) {
      setError(err.message || "Failed to generate content. Please check your connection or try again.");
      setState(AppState.IDLE);
    }
  };

  const handleProceedToInput = () => {
    setIsOriginalHidden(true);
    setState(AppState.INPUT);
  };

  const handleSubmit = async () => {
    if (!challenge || !userTranslation.trim()) return;

    setState(AppState.ANALYZING);
    try {
      const result = await analyzeTranslation(challenge.english, userTranslation, challenge.context);
      setAnalysis(result);
      setIsOriginalHidden(false);

      // Save to History DB
      const record: HistoryRecord = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          difficulty,
          topic,
          challenge,
          userTranslation,
          analysis: result
      };

      await db.saveHistory(record);

      // 添加到显示列表的开头
      setDisplayedHistory([record, ...displayedHistory]);
      setCurrentRecordId(record.id);

      // 自动保存所有 gap 到笔记本
      const savedIndices: number[] = [];
      if (result.gaps && result.gaps.length > 0) {
          const newNotebookEntries: NotebookEntry[] = [];

          for (let i = 0; i < result.gaps.length; i++) {
              const gap = result.gaps[i];

              // 检查是否已经保存过
              const alreadySaved = await db.isGapSaved(
                  challenge.english,
                  gap.userSegment,
                  gap.nativeSegment
              );

              if (!alreadySaved) {
                  const entry: NotebookEntry = {
                      id: crypto.randomUUID(),
                      timestamp: Date.now(),
                      originalContext: challenge.english,
                      gapType: gap.type,
                      nativeSegment: gap.nativeSegment,
                      userSegment: gap.userSegment,
                      explanation: gap.explanation
                  };

                  await db.saveNotebookEntry(entry);
                  newNotebookEntries.push(entry);
              }

              // 标记为已保存
              savedIndices.push(i);
          }

          // 更新显示的笔记本列表
          if (newNotebookEntries.length > 0) {
              setDisplayedNotebook([...newNotebookEntries, ...displayedNotebook]);
          }
      }

      setCurrentSessionSavedIndices(savedIndices);

      // Trigger Background Sync (Fire and forget)
      const allHistory = await db.getHistory();
      const allNotebook = await db.getNotebookEntries();
      webdav.pushChanges(allHistory, allNotebook);

      setState(AppState.REVIEW);
    } catch (err) {
      setError("Analysis failed. Please try again.");
      setState(AppState.INPUT);
    }
  };

  const handleRetry = () => {
      setUserTranslation('');
      setAnalysis(null);
      setState(AppState.STUDY);
      setIsOriginalHidden(false);
      setCurrentSessionSavedIndices([]);
      setCurrentRecordId(null);
  };

  const handleSaveGap = async (gap: GapAnalysisItem) => {
      if (!challenge || !analysis) return;
      
      const entry: NotebookEntry = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          originalContext: challenge.english,
          gapType: gap.type,
          nativeSegment: gap.nativeSegment,
          userSegment: gap.userSegment,
          explanation: gap.explanation
      };

      await db.saveNotebookEntry(entry);

      // 添加到显示列表的开头
      setDisplayedNotebook([entry, ...displayedNotebook]);

      // Trigger Background Sync
      const allHistory = await db.getHistory();
      const allNotebook = await db.getNotebookEntries();
      webdav.pushChanges(allHistory, allNotebook);
      
      const gapIndex = analysis.gaps.indexOf(gap);
      if (gapIndex !== -1) {
          setCurrentSessionSavedIndices(prev => [...prev, gapIndex]);
      }
  };

  const handleDeleteNotebookEntry = async (id: string) => {
      await db.deleteNotebookEntry(id);

      // 从显示列表中移除
      setDisplayedNotebook(displayedNotebook.filter(e => e.id !== id));

      // Trigger Background Sync
      const allHistory = await db.getHistory();
      const allNotebook = await db.getNotebookEntries();
      webdav.pushChanges(allHistory, allNotebook);
  };

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      await db.deleteHistory(id);

      // 从显示列表中移除
      setDisplayedHistory(displayedHistory.filter(h => h.id !== id));

      // Trigger Background Sync
      const allHistory = await db.getHistory();
      const allNotebook = await db.getNotebookEntries();
      webdav.pushChanges(allHistory, allNotebook);

      if (currentRecordId === id) {
          setState(AppState.IDLE);
          setCurrentRecordId(null);
      }
  };

  const handleSelectHistory = async (record: HistoryRecord) => {
      setChallenge(record.challenge);
      setUserTranslation(record.userTranslation);
      setAnalysis(record.analysis);
      setCurrentRecordId(record.id);
      setDifficulty(record.difficulty);
      setTopic(record.topic);

      // 检查哪些 gap 已经保存到笔记本
      const savedIndices: number[] = [];
      if (record.analysis?.gaps) {
          for (let i = 0; i < record.analysis.gaps.length; i++) {
              const gap = record.analysis.gaps[i];
              const isSaved = await db.isGapSaved(
                  record.challenge.english,
                  gap.userSegment,
                  gap.nativeSegment
              );
              if (isSaved) {
                  savedIndices.push(i);
              }
          }
      }
      setCurrentSessionSavedIndices(savedIndices);
      setState(AppState.REVIEW);
  };

  // 加载更多历史记录
  const handleLoadMoreHistory = async () => {
      if (isLoadingHistory || !hasMoreHistory) return;

      setIsLoadingHistory(true);
      try {
          const PAGE_SIZE = 50;
          const nextPage = currentHistoryPage + 1;
          const offset = nextPage * PAGE_SIZE;

          const moreRecords = await db.getHistoryPaged(offset, PAGE_SIZE);

          if (moreRecords.length > 0) {
              setDisplayedHistory([...displayedHistory, ...moreRecords]);
              setCurrentHistoryPage(nextPage);
              setHasMoreHistory(moreRecords.length === PAGE_SIZE);
          } else {
              setHasMoreHistory(false);
          }
      } catch (err) {
          console.error("Failed to load more history", err);
      } finally {
          setIsLoadingHistory(false);
      }
  };

  // 加载更多笔记本条目
  const handleLoadMoreNotebook = async () => {
      if (isLoadingNotebook || !hasMoreNotebook) return;

      setIsLoadingNotebook(true);
      try {
          const PAGE_SIZE = 50;
          const nextPage = currentNotebookPage + 1;
          const offset = nextPage * PAGE_SIZE;

          const moreEntries = await db.getNotebookPaged(offset, PAGE_SIZE);

          if (moreEntries.length > 0) {
              setDisplayedNotebook([...displayedNotebook, ...moreEntries]);
              setCurrentNotebookPage(nextPage);
              setHasMoreNotebook(moreEntries.length === PAGE_SIZE);
          } else {
              setHasMoreNotebook(false);
          }
      } catch (err) {
          console.error("Failed to load more notebook entries", err);
      } finally {
          setIsLoadingNotebook(false);
      }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden">
      
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        history={displayedHistory}
        onSelect={handleSelectHistory}
        onDelete={handleDeleteHistory}
        currentRecordId={currentRecordId}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onLoadMore={handleLoadMoreHistory}
        hasMore={hasMoreHistory}
        isLoading={isLoadingHistory}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        
        {/* Modals */}
        <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            topic={topic}
            setTopic={setTopic}
            contentLength={contentLength}
            setContentLength={setContentLength}
            onSyncTrigger={handleManualSync}
        />

        <Notebook
            isOpen={isNotebookOpen}
            onClose={() => setIsNotebookOpen(false)}
            entries={displayedNotebook}
            onDelete={handleDeleteNotebookEntry}
            onLoadMore={handleLoadMoreNotebook}
            hasMore={hasMoreNotebook}
            isLoading={isLoadingNotebook}
        />

        {/* Header */}
        <header className="bg-white border-b border-slate-200 flex-shrink-0 z-20 shadow-sm">
            <div className="px-4 h-16 flex items-center justify-between">
                <div className="flex items-center">
                    <button 
                        className="md:hidden mr-3 p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        <Menu size={20} />
                    </button>
                    
                    <div 
                        className="flex items-center space-x-2 cursor-pointer" 
                        onClick={() => setState(AppState.IDLE)}
                    >
                        <img src="/logo.svg" alt="Logo" className="h-8 w-8 hidden sm:block" />
                        <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                        EchoBack
                        </h1>
                    </div>
                    {isSyncing && (
                         <div className="ml-4 flex items-center text-xs text-indigo-500 animate-pulse bg-indigo-50 px-2 py-1 rounded-full">
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Syncing...
                         </div>
                    )}
                </div>
            
                <div className="flex items-center space-x-2">
                    {/* Manual Sync Button */}
                    <button 
                        onClick={handleManualSync}
                        disabled={isSyncing || !webdav.getConfig()?.enabled}
                        className={`p-2 rounded-full transition-colors relative ${
                            !webdav.getConfig()?.enabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-100'
                        }`}
                        title={webdav.getConfig()?.enabled ? "Sync Now" : "Sync Disabled"}
                    >
                        <RefreshCw size={20} className={isSyncing ? "animate-spin text-indigo-600" : ""} />
                    </button>

                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
                        title="Settings"
                    >
                        <SettingsIcon size={20} />
                    </button>
                    
                    <button
                        onClick={() => setIsNotebookOpen(true)}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
                        title="My Notebook"
                    >
                        <BookMarked size={20} />
                        {displayedNotebook.length > 0 && (
                            <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-amber-500 rounded-full border-2 border-white"></span>
                        )}
                    </button>
                </div>
            </div>
        </header>

        {/* Scrollable Main View */}
        <div ref={mainScrollRef} className="flex-1 overflow-y-auto p-3 md:p-8 relative scroll-smooth">

            <div className="max-w-3xl mx-auto pb-16 md:pb-20">
                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg flex items-start animate-pulse">
                        <div className="flex-1 text-red-700 font-medium">{error}</div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                    </div>
                )}

                {/* STATE: IDLE */}
                {state === AppState.IDLE && (
                <div className="flex flex-col items-center text-center space-y-4 md:space-y-8 mt-2 md:mt-4 animate-in fade-in duration-500">
                    <div className="max-w-lg px-2">
                        <h2 className="text-xl md:text-3xl font-bold text-slate-900 mb-3 md:mb-4">Master English through Back-Translation</h2>
                        <p className="text-slate-600 text-sm md:text-lg leading-relaxed">
                            The professional "Echo Method". Study native text, hide it, recreate it, and bridge the gap.
                        </p>
                    </div>

                    <div className="w-full max-w-md bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="mb-4 flex justify-between items-center text-sm text-slate-500 border-b border-slate-100 pb-3">
                            <span>Current Config:</span>
                            <button 
                                onClick={() => setIsSettingsOpen(true)}
                                className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center"
                            >
                                Edit <SettingsIcon size={14} className="ml-1" />
                            </button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 justify-center mb-6">
                            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">{difficulty}</span>
                            <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">{topic}</span>
                            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">{contentLength}</span>
                        </div>

                        <Button 
                            onClick={handleStart} 
                            className="w-full justify-center py-3 text-lg shadow-lg shadow-indigo-200"
                        >
                            Start New Session
                        </Button>
                    </div>
                    
                    <div className="text-xs text-slate-400 mt-8">
                        Select a past session from the sidebar to review.
                    </div>
                </div>
                )}

                {/* STATE: GENERATING */}
                {state === AppState.GENERATING && (
                    <div className="flex flex-col items-center justify-center py-32 space-y-6">
                        <div className="relative">
                            <div className="h-16 w-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                            <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-indigo-600 h-6 w-6" />
                        </div>
                        <p className="text-slate-500 font-medium animate-pulse">
                            Curating {topic.toLowerCase()} content...
                        </p>
                    </div>
                )}

                {/* STATE: STUDY MODE */}
                {state === AppState.STUDY && challenge && (
                    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-bold tracking-wider text-indigo-500 uppercase bg-indigo-50 px-3 py-1 rounded-full">
                                Step 1: Input & Understand
                            </span>
                            <button onClick={handleStart} className="text-slate-400 hover:text-slate-600 transition-colors flex items-center text-sm">
                                <RotateCcw size={14} className="mr-1" /> New
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                            <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-500 flex items-center">
                                    <BookOpen size={16} className="mr-2" />
                                    Context: {challenge.context}
                                </span>
                            </div>
                            
                            <div className="p-4 md:p-8 space-y-6 md:space-y-8">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Native English</h3>
                                    <p className="text-lg md:text-2xl font-serif text-slate-900 leading-relaxed selection:bg-indigo-100 selection:text-indigo-800">
                                        {challenge.english}
                                    </p>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                        <div className="w-full border-t border-slate-100"></div>
                                    </div>
                                    <div className="relative flex justify-center">
                                        <span className="bg-white px-2 text-slate-300 text-xs uppercase">Translation</span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Chinese Meaning</h3>
                                    <p className="text-base md:text-xl font-medium text-slate-700">
                                        {challenge.chinese}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-3 md:p-4 rounded-lg border border-blue-100 mb-6 md:mb-8 text-xs md:text-sm text-blue-800 flex items-start">
                            <Eye className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3 flex-shrink-0 mt-0.5" />
                            <p>Read the English sentence carefully. Understand the structure. When you are ready, we will hide it.</p>
                        </div>

                        <Button onClick={handleProceedToInput} size="lg" className="w-full justify-center text-sm md:text-base">
                            I'm Ready to Translate <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                    </div>
                )}

                {/* STATE: INPUT MODE */}
                {state === AppState.INPUT && challenge && (
                    <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <span className="text-xs font-bold tracking-wider text-purple-500 uppercase bg-purple-50 px-3 py-1 rounded-full">
                                Step 2: Output (Back-Translation)
                            </span>
                            <button onClick={() => setState(AppState.STUDY)} className="text-sm text-slate-400 hover:text-indigo-600">
                                Peek at Original
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                            {/* Blurred Original */}
                            <div className="p-4 md:p-6 bg-slate-50 border-b border-slate-100 relative select-none">
                                <div className="filter blur-sm opacity-40 pointer-events-none select-none" aria-hidden="true">
                                    <p className="text-base md:text-xl font-serif text-slate-900">{challenge.english}</p>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm flex items-center text-slate-500 text-sm font-medium border border-slate-200">
                                        <EyeOff size={16} className="mr-2" />
                                        Hidden
                                    </div>
                                </div>
                            </div>

                            {/* Chinese Prompt */}
                            <div className="px-4 md:px-6 py-3 md:py-4 bg-white">
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Translate back to English</h3>
                                <p className="text-base md:text-lg font-medium text-slate-800">{challenge.chinese}</p>
                            </div>

                            {/* User Input - White Theme */}
                            <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100">
                                <textarea
                                    ref={inputRef}
                                    value={userTranslation}
                                    onChange={(e) => setUserTranslation(e.target.value)}
                                    placeholder="Type the English translation here..."
                                    className="w-full p-3 md:p-4 text-base md:text-xl text-slate-900 bg-white placeholder:text-slate-400 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none min-h-[120px] md:min-h-[160px] outline-none shadow-sm transition-all"
                                    spellCheck={false}
                                />
                            </div>
                        </div>

                        <Button 
                            onClick={handleSubmit} 
                            size="lg" 
                            className="w-full justify-center"
                            disabled={userTranslation.length < 3}
                        >
                            Check My Translation <Send className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* STATE: ANALYZING */}
                {state === AppState.ANALYZING && (
                    <div className="flex flex-col items-center justify-center py-24 space-y-6">
                        <div className="flex space-x-2">
                            <div className="h-4 w-4 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="h-4 w-4 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="h-4 w-4 bg-indigo-600 rounded-full animate-bounce"></div>
                        </div>
                        <p className="text-slate-600 font-medium">AI Teacher is analyzing your work...</p>
                    </div>
                )}

                {/* STATE: REVIEW (Used for both fresh analysis and History playback) */}
                {state === AppState.REVIEW && analysis && challenge && (
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center">
                                {currentRecordId && (
                                    <span className="mr-3 text-xs font-bold text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded">
                                        Historical Review
                                    </span>
                                )}
                                <span className="text-xs font-bold tracking-wider text-emerald-600 uppercase bg-emerald-50 px-3 py-1 rounded-full">
                                    Step 3: Gap Analysis
                                </span>
                            </div>
                            
                            <div className="flex space-x-3">
                                {!currentRecordId && (
                                    <Button variant="outline" size="sm" onClick={handleRetry} className="flex items-center">
                                    <RefreshCw size={14} className="mr-2" /> Retry
                                    </Button>
                                )}
                                <Button size="sm" onClick={handleStart} className="flex items-center">
                                    Next Challenge <ArrowRight size={14} className="ml-2" />
                                </Button>
                            </div>
                        </div>

                        <AnalysisCard 
                            analysis={analysis} 
                            original={challenge.english}
                            chinese={challenge.chinese}
                            userTranslation={userTranslation}
                            onSaveGap={handleSaveGap}
                            savedGapIndices={currentSessionSavedIndices}
                        />

                         <div className="mt-12 flex justify-center">
                            <Button variant="secondary" onClick={handleStart} size="lg" className="shadow-xl shadow-emerald-100 px-12">
                                Start New Session
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;