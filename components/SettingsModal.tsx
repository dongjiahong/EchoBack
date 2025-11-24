import React, { useState, useEffect } from 'react';
import { Difficulty, Topic, ContentLength, WebDAVConfig, AIConfig, AIProvider } from '../types';
import { Settings, X, Layout, Layers, GraduationCap, Cloud, Check, AlertCircle, Save, Sparkles } from 'lucide-react';
import Button from './Button';
import { webdav } from '../services/webdav';
import { aiConfigManager } from '../services/aiService';

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
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'sync'>('general');

  // Local state for General settings
  const [localDifficulty, setLocalDifficulty] = useState<Difficulty>(difficulty);
  const [localTopic, setLocalTopic] = useState<Topic>(topic);
  const [localContentLength, setLocalContentLength] = useState<ContentLength>(contentLength);

  const [davConfig, setDavConfig] = useState<WebDAVConfig>({
      url: '',
      username: '',
      password: '',
      enabled: false
  });
  const [aiConfig, setAiConfig] = useState<AIConfig>({
      provider: AIProvider.GEMINI,
      geminiApiKey: '',
      openaiApiKey: '',
      openaiBaseUrl: 'https://api.openai.com/v1',
      openaiModel: 'gpt-4o-mini'
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
      // Sync local state with props when modal opens
      setLocalDifficulty(difficulty);
      setLocalTopic(topic);
      setLocalContentLength(contentLength);

      const currentDav = webdav.getConfig();
      if (currentDav) setDavConfig(currentDav);

      const currentAi = aiConfigManager.getConfig();
      if (currentAi) setAiConfig(currentAi);
  }, [isOpen, difficulty, topic, contentLength]);

  const handleTestConnection = async () => {
      setTestStatus('testing');
      const success = await webdav.checkConnection(davConfig);
      setTestStatus(success ? 'success' : 'error');
  };

  const handleSaveGeneral = () => {
      setDifficulty(localDifficulty);
      setTopic(localTopic);
      setContentLength(localContentLength);
      onClose();
  };

  const handleSaveAI = () => {
      aiConfigManager.saveConfig(aiConfig);
      onClose();
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
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'ai' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                onClick={() => setActiveTab('ai')}
            >
                AI Settings
            </button>
            <button
                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'sync' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                onClick={() => setActiveTab('sync')}
            >
                Sync
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
                                onClick={() => setLocalDifficulty(level)}
                                className={`flex items-center px-3 py-2 rounded-lg text-sm border transition-all ${
                                    localDifficulty === level
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                                <div className={`w-3 h-3 rounded-full mr-3 border ${localDifficulty === level ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}></div>
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
                        value={localTopic}
                        onChange={(e) => setLocalTopic(e.target.value as Topic)}
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
                                onClick={() => setLocalContentLength(len)}
                                className={`flex-1 py-2 rounded-lg text-sm border transition-all ${
                                    localContentLength === len
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
            ) : activeTab === 'ai' ? (
                <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg flex items-start">
                        <Sparkles className="w-5 h-5 text-amber-500 mr-3 mt-0.5" />
                        <p className="text-sm text-amber-800">
                            选择 AI 提供商并配置 API Key。支持 Google Gemini 或兼容 OpenAI 的 API。
                        </p>
                    </div>

                    {/* Provider Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">AI Provider</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setAiConfig({...aiConfig, provider: AIProvider.GEMINI})}
                                className={`flex items-center justify-center px-4 py-3 rounded-lg text-sm border transition-all ${
                                    aiConfig.provider === AIProvider.GEMINI
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                                <div className={`w-3 h-3 rounded-full mr-2 border ${aiConfig.provider === AIProvider.GEMINI ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}></div>
                                Gemini
                            </button>
                            <button
                                onClick={() => setAiConfig({...aiConfig, provider: AIProvider.OPENAI})}
                                className={`flex items-center justify-center px-4 py-3 rounded-lg text-sm border transition-all ${
                                    aiConfig.provider === AIProvider.OPENAI
                                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium'
                                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                                <div className={`w-3 h-3 rounded-full mr-2 border ${aiConfig.provider === AIProvider.OPENAI ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}></div>
                                OpenAI
                            </button>
                        </div>
                    </div>

                    {/* Gemini Config */}
                    {aiConfig.provider === AIProvider.GEMINI && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Gemini API Key
                            </label>
                            <input
                                type="password"
                                className="w-full p-2 border rounded-lg text-sm font-mono"
                                placeholder="AIza... (支持多个 key，用逗号分隔)"
                                value={aiConfig.geminiApiKey || ''}
                                onChange={e => setAiConfig({...aiConfig, geminiApiKey: e.target.value})}
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                在 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a> 获取 API Key。支持多个 key，用逗号分隔，使用时会随机选择。
                            </p>
                        </div>
                    )}

                    {/* OpenAI Config */}
                    {aiConfig.provider === AIProvider.OPENAI && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    OpenAI API Key
                                </label>
                                <input
                                    type="password"
                                    className="w-full p-2 border rounded-lg text-sm font-mono"
                                    placeholder="sk-... (支持多个 key，用逗号分隔)"
                                    value={aiConfig.openaiApiKey || ''}
                                    onChange={e => setAiConfig({...aiConfig, openaiApiKey: e.target.value})}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    支持多个 key，用逗号分隔，使用时会随机选择。
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Base URL (可选)
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded-lg text-sm"
                                    placeholder="https://api.openai.com/v1"
                                    value={aiConfig.openaiBaseUrl || ''}
                                    onChange={e => setAiConfig({...aiConfig, openaiBaseUrl: e.target.value})}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    用于兼容 OpenAI 的第三方 API。尾部斜杠会自动处理。
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Model (可选)
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-2 border rounded-lg text-sm"
                                    placeholder="gpt-4o-mini"
                                    value={aiConfig.openaiModel || ''}
                                    onChange={e => setAiConfig({...aiConfig, openaiModel: e.target.value})}
                                />
                            </div>
                        </>
                    )}
                </div>
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
                <Button onClick={handleSaveGeneral} className="w-full justify-center">
                    <Save className="w-4 h-4 mr-2" /> Save General Settings
                </Button>
            ) : activeTab === 'ai' ? (
                <Button onClick={handleSaveAI} className="w-full justify-center">
                    <Save className="w-4 h-4 mr-2" /> Save AI Settings
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