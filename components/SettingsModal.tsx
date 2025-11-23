import React from 'react';
import { Difficulty, Topic, ContentLength } from '../types';
import { Settings, X, Layout, Layers, GraduationCap } from 'lucide-react';
import Button from './Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  topic: Topic;
  setTopic: (t: Topic) => void;
  contentLength: ContentLength;
  setContentLength: (l: ContentLength) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  difficulty,
  setDifficulty,
  topic,
  setTopic,
  contentLength,
  setContentLength
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-slate-500" />
                Session Settings
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 space-y-6">
            
            {/* Difficulty */}
            <div>
                <label className="flex items-center text-sm font-semibold text-slate-700 mb-3">
                    <GraduationCap className="w-4 h-4 mr-2 text-indigo-500" />
                    Proficiency Level
                </label>
                <div className="grid grid-cols-1 gap-2">
                    {Object.values(Difficulty).map((level) => (
                        <button
                            key={level}
                            onClick={() => setDifficulty(level)}
                            className={`flex items-center px-3 py-2 rounded-lg text-sm border transition-all ${
                                difficulty === level 
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium' 
                                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                            }`}
                        >
                            <div className={`w-3 h-3 rounded-full mr-3 border ${difficulty === level ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}></div>
                            {level}
                        </button>
                    ))}
                </div>
            </div>

            {/* Topic */}
            <div>
                <label className="flex items-center text-sm font-semibold text-slate-700 mb-3">
                    <Layers className="w-4 h-4 mr-2 text-purple-500" />
                    Content Topic
                </label>
                <select 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value as Topic)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                    {Object.values(Topic).map((t) => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>
            </div>

            {/* Length */}
            <div>
                <label className="flex items-center text-sm font-semibold text-slate-700 mb-3">
                    <Layout className="w-4 h-4 mr-2 text-emerald-500" />
                    Length
                </label>
                <div className="flex space-x-2">
                    {Object.values(ContentLength).map((len) => (
                        <button
                            key={len}
                            onClick={() => setContentLength(len)}
                            className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                                contentLength === len
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                            }`}
                        >
                            {len}
                        </button>
                    ))}
                </div>
            </div>

        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
            <Button onClick={onClose} className="w-full justify-center">
                Apply Changes
            </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
