import React, { useState } from 'react';
import { HistoryRecord } from '../types';
import { Clock, CheckCircle2, MoreVertical, Trash2, CalendarDays, History, Languages } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  history: HistoryRecord[];
  onSelect: (record: HistoryRecord) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  currentRecordId: string | null;
  onCloseMobile: () => void;
}

// Sub-component for individual history items to manage "Show Chinese" state independently
const SidebarItem: React.FC<{
    record: HistoryRecord;
    isActive: boolean;
    onSelect: (record: HistoryRecord) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
    onCloseMobile: () => void;
}> = ({ record, isActive, onSelect, onDelete, onCloseMobile }) => {
    const [showChinese, setShowChinese] = useState(false);

    return (
        <div 
            onClick={() => {
                onSelect(record);
                onCloseMobile();
            }}
            className={`
                relative group cursor-pointer p-3 rounded-xl border transition-all hover:shadow-md
                ${isActive
                ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' 
                : 'bg-white border-slate-200 hover:border-indigo-100'}
            `}
        >
            {/* Timeline Dot */}
            <div className={`absolute -left-[23px] top-4 w-3 h-3 rounded-full border-2 border-white ${isActive ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>

            <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-medium text-slate-400">
                    {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${record.analysis.score >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {record.analysis.score}
                </div>
            </div>

            <div className="flex items-start justify-between mb-1">
                <p className="text-xs text-slate-500 line-clamp-1 italic flex-1">
                    "{record.challenge.context}"
                </p>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowChinese(!showChinese);
                    }}
                    className={`ml-2 p-1 rounded hover:bg-slate-200 transition-colors ${showChinese ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300'}`}
                    title="Toggle Chinese Translation"
                >
                    <Languages size={12} />
                </button>
            </div>

            <p className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug">
                {record.challenge.english}
            </p>

            {showChinese && (
                <div className="mt-2 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                    <p className="text-xs text-slate-600 font-medium">
                        {record.challenge.chinese}
                    </p>
                </div>
            )}

            <button 
                onClick={(e) => onDelete(record.id, e)}
                className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded"
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  history, 
  onSelect, 
  onDelete, 
  currentRecordId,
  onCloseMobile
}) => {
  
  // Group history by date (Today, Yesterday, Older)
  const groupedHistory = React.useMemo(() => {
    const groups: Record<string, HistoryRecord[]> = {
      'Today': [],
      'Yesterday': [],
      'Earlier': []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    history.forEach(record => {
      if (record.timestamp >= today) {
        groups['Today'].push(record);
      } else if (record.timestamp >= yesterday) {
        groups['Yesterday'].push(record);
      } else {
        groups['Earlier'].push(record);
      }
    });

    return groups;
  }, [history]);

  const baseClasses = `
    fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out
    flex flex-col
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    md:relative md:translate-x-0
  `;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={onCloseMobile}
        ></div>
      )}

      <aside className={baseClasses}>
        <div className="p-4 border-b border-slate-100 flex items-center space-x-2 bg-slate-50">
          <History className="text-indigo-600" size={20} />
          <h2 className="font-bold text-slate-800">History Timeline</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {history.length === 0 ? (
            <div className="text-center py-10 opacity-50">
               <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
               <p className="text-sm text-slate-500">No history yet.<br/>Start a session!</p>
            </div>
          ) : (
            (Object.entries(groupedHistory) as [string, HistoryRecord[]][]).map(([label, items]) => (
              items.length > 0 && (
                <div key={label}>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                    <CalendarDays size={12} className="mr-1" /> {label}
                  </h3>
                  <div className="space-y-3 relative border-l-2 border-slate-100 ml-1.5 pl-4">
                    {items.map((record) => (
                        <SidebarItem 
                            key={record.id}
                            record={record}
                            isActive={currentRecordId === record.id}
                            onSelect={onSelect}
                            onDelete={onDelete}
                            onCloseMobile={onCloseMobile}
                        />
                    ))}
                  </div>
                </div>
              )
            ))
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;