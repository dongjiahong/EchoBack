import React, { useState, useEffect } from 'react';
import { Difficulty, Topic, ContentLength, WebDAVConfig } from '../types';
import { Settings, X, Layout, Layers, GraduationCap, Cloud, Check, AlertCircle, Save } from 'lucide-react';
import Button from './Button';
import { webdav } from '../services/webdav';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  topic: Topic;
  setTopic: (t: Topic) => void;
  contentLength: ContentLength;
  setContentLength: (l: ContentLength) => void;
  onSyncTrigger?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  difficulty,
  setDifficulty,
  topic,
  setTopic,
  contentLength,
  setContentLength,
  onSyncTrigger
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'sync'>('general');
  const [davConfig, setDavConfig] = useState<WebDAVConfig>({
      url: '',
      username: '',
      password: '',
      enabled: false
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
      const current = webdav.getConfig();
      if (current) setDavConfig(current);
  }, [isOpen]);

  const handleTestConnection = async () => {
      setTestStatus('testing');
      const success = await webdav.checkConnection(davConfig);
      setTestStatus(success ? 'success' : 'error');
  };

  const handleSaveWebDAV = () => {
      webdav.saveConfig(davConfig);
      if (davConfig.enabled && onSyncTrigger) {
          onSyncTrigger();
      }
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-slate-500" />
                Settings
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
            <button 
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'general' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                onClick={() => setActiveTab('general')}
            >
                General
            </button>
            <button 
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'sync' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                onClick={() => setActiveTab('sync')}
            >
                Sync (WebDAV)
            </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
            
            {activeTab === 'general' ? (
                <>
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
                </>
            ) : (
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start">
                        <Cloud className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
                        <p className="text-sm text-blue-800">
                            Sync your history and notebook with any WebDAV-compatible cloud storage (e.g., Nextcloud, Fastmail, Koofr).
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">WebDAV URL</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg text-sm"
                            placeholder="https://cloud.example.com/remote.php/dav/files/user/"
                            value={davConfig.url}
                            onChange={e => setDavConfig({...davConfig, url: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg text-sm"
                            value={davConfig.username}
                            onChange={e => setDavConfig({...davConfig, username: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                        <input 
                            type="password" 
                            className="w-full p-2 border rounded-lg text-sm"
                            value={davConfig.password}
                            onChange={e => setDavConfig({...davConfig, password: e.target.value})}
                        />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={davConfig.enabled}
                                onChange={e => setDavConfig({...davConfig, enabled: e.target.checked})}
                            />
                            <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            <span className="ms-3 text-sm font-medium text-slate-700">Enable Sync</span>
                        </label>

                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleTestConnection}
                            isLoading={testStatus === 'testing'}
                        >
                            Test Connection
                        </Button>
                    </div>

                    {testStatus === 'success' && (
                        <div className="flex items-center text-green-600 text-sm">
                            <Check className="w-4 h-4 mr-1" /> Connection Successful
                        </div>
                    )}
                    {testStatus === 'error' && (
                        <div className="flex items-center text-red-600 text-sm">
                            <AlertCircle className="w-4 h-4 mr-1" /> Connection Failed
                        </div>
                    )}
                </div>
            )}

        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
            {activeTab === 'general' ? (
                <Button onClick={onClose} className="w-full justify-center">
                    Done
                </Button>
            ) : (
                <Button onClick={handleSaveWebDAV} className="w-full justify-center">
                    <Save className="w-4 h-4 mr-2" /> Save & Sync
                </Button>
            )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;