import React, { useState } from 'react';
import { X, Settings, Save, KeyRound, Bot } from 'lucide-react';
import { ApiKeys } from '../types';

interface SettingsModalProps {
  currentKeys: ApiKeys;
  onSave: (keys: ApiKeys) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ currentKeys, onSave, onClose }) => {
  const [keys, setKeys] = useState<ApiKeys>(currentKeys);

  const handleChange = (key: keyof ApiKeys, value: string) => {
    setKeys(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(keys);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-full"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-indigo-500/10 rounded-xl">
             <Settings className="text-indigo-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">API Configuration</h2>
            <p className="text-xs text-slate-400">Configure providers & fallback</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div className="group">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide group-focus-within:text-indigo-400 transition-colors">
                <KeyRound size={12} /> GIPHY API Key
              </label>
              <input 
                type="password" 
                value={keys.giphy} 
                onChange={(e) => handleChange('giphy', e.target.value)} 
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all" 
                placeholder="Enter your Giphy Beta/Prod Key"
              />
            </div>

            <div className="group">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide group-focus-within:text-indigo-400 transition-colors">
                <KeyRound size={12} /> Tenor API Key
              </label>
              <input 
                type="password" 
                value={keys.tenor} 
                onChange={(e) => handleChange('tenor', e.target.value)} 
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all" 
                placeholder="Enter your Tenor Key (Optional)"
              />
            </div>

            <div className="group">
              <label className="flex items-center gap-2 text-xs font-semibold text-green-400 mb-1.5 uppercase tracking-wide group-focus-within:text-green-300 transition-colors">
                <Bot size={12} /> Backup: OpenAI API Key
              </label>
              <input 
                type="password" 
                value={keys.openai || ''} 
                onChange={(e) => handleChange('openai', e.target.value)} 
                className="w-full bg-slate-800/50 border border-green-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-green-500 focus:ring-1 focus:ring-green-500/50 outline-none transition-all" 
                placeholder="For when Google is tired (GPT-4o-mini)"
              />
              <p className="text-[10px] text-slate-500 mt-1">Used automatically if Gemini quota is exceeded.</p>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Save size={16} /> Save & Reload
            </button>
            <p className="text-center text-[10px] text-slate-500 mt-3">
              Keys are stored locally in your browser.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};