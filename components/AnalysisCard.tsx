import React from 'react';
import { AnalysisResult, GapAnalysisItem } from '../types';
import { AlertCircle, CheckCircle, Award, ArrowRight, Bookmark, Check } from 'lucide-react';

interface AnalysisCardProps {
  analysis: AnalysisResult;
  original: string;
  userTranslation: string;
  onSaveGap: (gap: GapAnalysisItem) => void;
  savedGapIndices: number[];
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ 
    analysis, 
    original, 
    userTranslation, 
    onSaveGap,
    savedGapIndices
}) => {
  
  const getBadgeColor = (type: GapAnalysisItem['type']) => {
    switch (type) {
      case 'vocabulary': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'grammar': return 'bg-red-100 text-red-800 border-red-200';
      case 'tone': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Score Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Performance Analysis</h3>
          <p className="text-slate-500 text-sm mt-1">{analysis.feedback}</p>
        </div>
        <div className="flex flex-col items-center justify-center h-16 w-16 rounded-full bg-indigo-50 text-indigo-700 border-2 border-indigo-100">
          <span className="text-xl font-bold">{analysis.score}</span>
          <span className="text-[10px] uppercase tracking-wide font-semibold">Score</span>
        </div>
      </div>

      {/* Direct Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
           <div className="flex items-center space-x-2 mb-3">
             <div className="h-2 w-2 rounded-full bg-slate-400"></div>
             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Translation</h4>
           </div>
           <p className="text-lg text-slate-700 leading-relaxed font-medium">{userTranslation}</p>
        </div>

        <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-2 opacity-10">
             <Award size={64} className="text-emerald-600" />
           </div>
           <div className="flex items-center space-x-2 mb-3">
             <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
             <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Native Original</h4>
           </div>
           <p className="text-lg text-emerald-900 leading-relaxed font-semibold">{original}</p>
        </div>
      </div>

      {/* Gap Analysis List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 text-indigo-500" />
          The Gap Analysis
        </h3>
        
        {analysis.gaps.length === 0 ? (
            <div className="p-6 bg-green-50 rounded-xl text-center border border-green-100">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-green-800 font-medium">Perfect match! No significant gaps found.</p>
            </div>
        ) : (
            <div className="grid gap-4">
            {analysis.gaps.map((gap, idx) => {
                const isSaved = savedGapIndices.includes(idx);
                
                return (
                    <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
                        <div className="flex items-start justify-between mb-3 pr-8">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeColor(gap.type)}`}>
                            {gap.type.toUpperCase()}
                            </span>
                            
                            <button 
                                onClick={() => onSaveGap(gap)}
                                disabled={isSaved}
                                className={`absolute top-4 right-4 p-2 rounded-full transition-all flex items-center justify-center ${
                                    isSaved 
                                    ? 'bg-amber-100 text-amber-600' 
                                    : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-500'
                                }`}
                                title={isSaved ? "Saved to Notebook" : "Save to Notebook"}
                            >
                                {isSaved ? <Check size={16} /> : <Bookmark size={16} />}
                            </button>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-3">
                            <div className="flex-1">
                                <p className="text-xs text-slate-400 mb-1 uppercase">You Wrote</p>
                                <p className="text-red-500 font-medium line-through decoration-red-300 decoration-2">{gap.userSegment || '(Missed)'}</p>
                            </div>
                            <ArrowRight className="text-slate-300 hidden sm:block" size={20} />
                            <div className="flex-1">
                                <p className="text-xs text-slate-400 mb-1 uppercase">Native Speaker</p>
                                <p className="text-emerald-600 font-bold">{gap.nativeSegment}</p>
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 italic border-l-4 border-indigo-300">
                            "{gap.explanation}"
                        </div>
                    </div>
                );
            })}
            </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisCard;
