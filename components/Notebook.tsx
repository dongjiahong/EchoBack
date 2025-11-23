import React from 'react';
import { NotebookEntry, GapAnalysisItem } from '../types';
import { Trash2, X, BookMarked, Search } from 'lucide-react';

interface NotebookProps {
  isOpen: boolean;
  onClose: () => void;
  entries: NotebookEntry[];
  onDelete: (id: string) => void;
}

const Notebook: React.FC<NotebookProps> = ({ isOpen, onClose, entries, onDelete }) => {
  const [filter, setFilter] = React.useState<string>('all');
  const [search, setSearch] = React.useState('');

  if (!isOpen) return null;

  const getBadgeColor = (type: GapAnalysisItem['type']) => {
    switch (type) {
      case 'vocabulary': return 'bg-blue-100 text-blue-800';
      case 'grammar': return 'bg-red-100 text-red-800';
      case 'tone': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEntries = entries.filter(entry => {
      const matchesType = filter === 'all' || entry.gapType === filter;
      const matchesSearch = entry.nativeSegment.toLowerCase().includes(search.toLowerCase()) || 
                            entry.explanation.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                <BookMarked size={20} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-slate-800">My Notebook</h2>
                <p className="text-xs text-slate-500">{entries.length} saved items</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100 space-y-3">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <input 
                    type="text" 
                    placeholder="Search your notes..." 
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
             </div>
             <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                 {['all', 'vocabulary', 'grammar', 'tone', 'structure'].map((t) => (
                     <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                            filter === t 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                     >
                        {t}
                     </button>
                 ))}
             </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {filteredEntries.length === 0 ? (
                <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4">
                        <BookMarked className="text-slate-300 h-8 w-8" />
                    </div>
                    <p className="text-slate-500">No entries found.</p>
                </div>
            ) : (
                filteredEntries.map((entry) => (
                    <div key={entry.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                        <button 
                            onClick={() => onDelete(entry.id)}
                            className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            title="Remove"
                        >
                            <Trash2 size={16} />
                        </button>

                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-2 ${getBadgeColor(entry.gapType)}`}>
                            {entry.gapType}
                        </span>

                        <div className="space-y-2 mb-3">
                             <div className="flex items-baseline gap-2 text-sm">
                                <span className="text-slate-400 w-12 flex-shrink-0 text-xs uppercase">Native</span>
                                <span className="font-bold text-emerald-700">{entry.nativeSegment}</span>
                             </div>
                             <div className="flex items-baseline gap-2 text-sm">
                                <span className="text-slate-400 w-12 flex-shrink-0 text-xs uppercase">You</span>
                                <span className="font-medium text-slate-500 line-through decoration-red-300 decoration-2">{entry.userSegment || '(blank)'}</span>
                             </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 italic border-l-2 border-indigo-200">
                            "{entry.explanation}"
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-slate-100">
                             <p className="text-[10px] text-slate-400 truncate">
                                Source: {entry.originalContext}
                             </p>
                        </div>
                    </div>
                ))
            )}
        </div>

      </div>
    </div>
  );
};

export default Notebook;
