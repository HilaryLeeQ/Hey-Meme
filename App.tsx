import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, Sparkles, AlertCircle, Settings, Terminal, Check, MessageSquareDashed } from 'lucide-react';
import { GifItem, ToastState, ApiKeys } from './types';
import { translateQueryToKeywords } from './services/geminiService';
import { GifGrid } from './components/GifGrid';
import { SettingsModal } from './components/SettingsModal';
import { ChatBot } from './components/ChatBot';

const DEMO_SCENARIOS = [
  "When my code runs on the first try...",
  "Me on Monday morning...",
  "My wallet watching me buy a new GPU...",
  "The microwave food spinning while I wait...",
  "Coding at 3 AM be like...",
  "Who wrote this code? (It was me)",
  "When the senior dev approves my PR..."
];

// Updated to use media.giphy.com with reliable IDs
const MASCOT_IMAGES = [
  "https://media.giphy.com/media/B37cYPCruqwwg/giphy.gif", // Hamster
  "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif", // Cat typing
  "https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif", // Grumpy Cat
  "https://media.giphy.com/media/13CoXDiaCcCoyk/giphy.gif", // Vibing Cat
  "https://media.giphy.com/media/C9x8gX02SnMIoA0qng/giphy.gif", // Crying
  "https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif", // Judgemental
];

const FALLBACK_MASCOT = "https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif";

export default function App() {
  // State
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [trendingGifs, setTrendingGifs] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeKeywords, setActiveKeywords] = useState('');
  
  // Random mascot on load
  const [mascotUrl, setMascotUrl] = useState(() => MASCOT_IMAGES[Math.floor(Math.random() * MASCOT_IMAGES.length)]);
  
  // API Keys Initialization Strategy:
  // 1. Check LocalStorage (User override) - Highest priority
  // 2. Check Environment Variables (Developer default) - with multiple prefix support
  // 3. Fallback to empty string (Force user input)
  
  const getEnvVar = (baseKey: string, viteKey: string, reactKey: string): string => {
    // We explicitly check specific process.env properties because bundlers (Webpack/Vite)
    // replace these exact strings at build time. Dynamic access like process.env[key] often fails.
    try {
      if (process.env[baseKey]) return process.env[baseKey] || '';
      if (process.env[viteKey]) return process.env[viteKey] || '';
      if (process.env[reactKey]) return process.env[reactKey] || '';
    } catch (e) {
      // In some strict environments accessing process might fail
    }
    return '';
  };

  const [apiKeys, setApiKeys] = useState<ApiKeys>(() => ({
    giphy: localStorage.getItem('giphy_key') || getEnvVar('GIPHY_API_KEY', 'VITE_GIPHY_API_KEY', 'REACT_APP_GIPHY_API_KEY'),
    tenor: localStorage.getItem('tenor_key') || getEnvVar('TENOR_API_KEY', 'VITE_TENOR_API_KEY', 'REACT_APP_TENOR_API_KEY'),
    openai: localStorage.getItem('openai_key') || ''
  }));

  // Typewriter effect state
  const [placeholder, setPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Typewriter Effect
  useEffect(() => {
    const currentText = DEMO_SCENARIOS[placeholderIndex];
    let timer: ReturnType<typeof setTimeout>;

    const typeSpeed = isDeleting ? 30 : 60;
    const pauseTime = 2000;

    if (isPaused) {
      timer = setTimeout(() => { setIsPaused(false); setIsDeleting(true); }, pauseTime);
    } else if (isDeleting) {
      if (charIndex > 0) {
        timer = setTimeout(() => {
          setPlaceholder(currentText.substring(0, charIndex - 1));
          setCharIndex(prev => prev - 1);
        }, typeSpeed);
      } else {
        setIsDeleting(false);
        setPlaceholderIndex(prev => (prev + 1) % DEMO_SCENARIOS.length);
      }
    } else {
      if (charIndex < currentText.length) {
        timer = setTimeout(() => {
          setPlaceholder(currentText.substring(0, charIndex + 1));
          setCharIndex(prev => prev + 1);
        }, typeSpeed);
      } else {
        setIsPaused(true);
      }
    }
    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, isPaused, placeholderIndex]);

  // Initial Fetch & Settings Check
  useEffect(() => {
    if (apiKeys.giphy) {
      fetchTrendingGifs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKeys.giphy]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleSaveSettings = (newKeys: ApiKeys) => {
    localStorage.setItem('giphy_key', newKeys.giphy);
    localStorage.setItem('tenor_key', newKeys.tenor);
    if (newKeys.openai) localStorage.setItem('openai_key', newKeys.openai);
    setApiKeys(newKeys);
    setShowSettings(false);
    showToast("Settings saved successfully!");
  };

  // Soft Reset Function (Fixes the "Logo Click" error)
  const handleReset = () => {
    setQuery('');
    setGifs([]); // Clearing gifs reveals trendingGifs automatically
    setError('');
    setActiveKeywords('');
    setAiThinking(false);
    setLoading(false);
    // Refresh mascot
    setMascotUrl(MASCOT_IMAGES[Math.floor(Math.random() * MASCOT_IMAGES.length)]);
    
    // Optional: Refresh trending if it was somehow lost, usually not needed but safe
    if (apiKeys.giphy && trendingGifs.length === 0) {
      fetchTrendingGifs();
    }
  };

  const fetchTrendingGifs = async () => {
    if (!apiKeys.giphy) return;
    try {
      const url = `https://api.giphy.com/v1/gifs/trending?api_key=${apiKeys.giphy}&limit=24&rating=g`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.meta.status === 200) {
        const formatted: GifItem[] = data.data.map((item: any) => ({
          id: item.id,
          title: item.title || 'Untitled GIF',
          source_api: 'Giphy',
          images: {
            fixed_height: { url: item.images.fixed_height.url },
            original: { url: item.images.original.url }
          },
          url: item.images.original.url
        }));
        setTrendingGifs(formatted);
      }
    } catch (err) {
      console.error("Failed to load trending", err);
    }
  };

  const searchGifs = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    
    if (!apiKeys.giphy && !apiKeys.tenor) {
      setShowSettings(true);
      showToast("Please add an API Key to search", "warning");
      return;
    }

    setLoading(true);
    setError('');
    setActiveKeywords('');
    setAiThinking(true);

    try {
      // 1. Get Keywords from Gemini (with OpenAI Fallback)
      const searchTerms = await translateQueryToKeywords(query, apiKeys.openai);
      setAiThinking(false);
      setActiveKeywords(searchTerms);

      // 2. Fetch from APIs
      const limit = 32;
      const promises = [];
      
      if (apiKeys.giphy) {
        promises.push(
          fetch(`https://api.giphy.com/v1/gifs/search?api_key=${apiKeys.giphy}&q=${encodeURIComponent(searchTerms)}&limit=${limit}`)
            .then(r => r.json())
            .then(data => ({ source: 'Giphy', data: data.data || [] }))
            .catch(() => ({ source: 'Giphy', data: [] }))
        );
      }
      
      if (apiKeys.tenor) {
        promises.push(
          fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(searchTerms)}&key=${apiKeys.tenor}&limit=${limit}`)
            .then(r => r.json())
            .then(data => ({ source: 'Tenor', data: data.results || [] }))
            .catch(() => ({ source: 'Tenor', data: [] }))
        );
      }

      const results = await Promise.all(promises);
      let giphyResults: GifItem[] = [];
      let tenorResults: GifItem[] = [];

      results.forEach(res => {
        if (res.source === 'Giphy') {
           giphyResults = res.data.map((item: any) => ({
            id: item.id,
            title: item.title,
            source_api: 'Giphy' as const,
            images: {
              fixed_height: { url: item.images.fixed_height.url },
              original: { url: item.images.original.url }
            },
            url: item.images.original.url
           }));
        } else if (res.source === 'Tenor') {
          tenorResults = res.data.map((item: any) => ({
            id: item.id,
            title: item.content_description,
            source_api: 'Tenor' as const,
            images: {
              fixed_height: { url: item.media_formats.tinygif.url },
              original: { url: item.media_formats.gif.url }
            },
            url: item.media_formats.gif.url
          }));
        }
      });

      // Interleave results to ensure variety (Giphy, Tenor, Giphy, Tenor...)
      const combined: GifItem[] = [];
      const maxLength = Math.max(giphyResults.length, tenorResults.length);
      
      for (let i = 0; i < maxLength; i++) {
        if (i < giphyResults.length) combined.push(giphyResults[i]);
        if (i < tenorResults.length) combined.push(tenorResults[i]);
      }

      setGifs(combined);
      if (combined.length === 0) setError("No memes found. Try a different description?");

    } catch (err) {
      setError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setLoading(false);
      setAiThinking(false);
    }
  };

  const handleCopy = async (gif: GifItem) => {
    try {
      await navigator.clipboard.writeText(gif.url);
      setCopyingId(gif.id);
      showToast("Link copied to clipboard!");
      setTimeout(() => setCopyingId(null), 2000);
    } catch (err) {
      showToast("Failed to copy link", "error");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      searchGifs();
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {showSettings && (
        <SettingsModal 
          currentKeys={apiKeys} 
          onSave={handleSaveSettings} 
          onClose={() => setShowSettings(false)} 
        />
      )}

      {/* Sassy ChatBot - Now passing showToast */}
      <ChatBot apiKeys={apiKeys} showToast={showToast} />

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset}>
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                <Sparkles size={20} className="text-white fill-white/20" />
              </div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-slate-300">
                HeyMeme
              </h1>
            </div>
            
            <button 
              onClick={() => setShowSettings(true)} 
              className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all border border-transparent hover:border-slate-700"
              aria-label="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24 md:pt-32 pb-20 px-4 max-w-7xl mx-auto">
        
        {/* Search Section */}
        <div className="max-w-4xl mx-auto mb-8 md:mb-16">
          
          {/* Hero Header: Mascot + Text (Side-by-side) */}
          <div className="flex flex-row items-center justify-center gap-3 md:gap-8 mb-6 md:mb-10">
            {/* Random Mascot Image - Sticker Style */}
            <div className="relative w-16 h-16 md:w-36 md:h-36 shrink-0 group cursor-pointer hover:scale-105 transition-transform duration-300">
              <div className="absolute inset-0 bg-indigo-500/30 rounded-3xl rotate-6 group-hover:rotate-12 transition-transform duration-300"></div>
              <img 
                src={mascotUrl} 
                alt="Mascot"
                onError={(e) => {
                  const target = e.currentTarget;
                  // Prevent infinite loop if fallback also fails
                  if (target.src !== FALLBACK_MASCOT) {
                     target.src = FALLBACK_MASCOT;
                  }
                }}
                referrerPolicy="no-referrer"
                className="relative w-full h-full object-contain rounded-2xl md:rounded-3xl shadow-2xl border-2 md:border-4 border-slate-900 rotate-[-6deg] group-hover:rotate-0 transition-transform duration-300 animate-in zoom-in fade-in fill-mode-both delay-100 duration-700 bg-slate-800/50"
              />
            </div>

            {/* Slogan Text */}
            <h2 className="text-2xl md:text-6xl font-extrabold tracking-tight text-white leading-tight text-left">
              You <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">talk</span>.<br />
              I <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">meme 💩</span>
            </h2>
          </div>
          
          <form onSubmit={searchGifs} className="relative group max-w-2xl mx-auto transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <div className="relative flex items-center">
              <div className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 z-10">
                {aiThinking ? (
                  <Loader2 className="animate-spin text-indigo-400" size={20} />
                ) : (
                  <Search className="group-focus-within:text-indigo-400 transition-colors" size={20} />
                )}
              </div>
              
              <textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full pl-12 pr-20 md:pl-16 md:pr-24 py-4 h-16 md:h-20 bg-slate-900/80 border-2 border-slate-700/50 rounded-2xl text-sm md:text-lg text-white placeholder-slate-500 focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 outline-none backdrop-blur-xl shadow-2xl transition-all resize-none leading-normal flex items-center pt-5"
                style={{ paddingTop: '1.25rem' }} 
              />
              
              {/* Shortened Button */}
              <button 
                type="submit" 
                disabled={loading || aiThinking}
                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 h-12 w-12 md:h-14 md:w-14 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-bold text-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center z-10"
              >
                {loading ? <Loader2 size={24} className="animate-spin" /> : '🤙'}
              </button>
            </div>
          </form>

          {/* AI Status Indicator */}
          <div className="h-6 mt-2 md:mt-4 flex justify-center items-center">
             {activeKeywords && !aiThinking && !loading && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/40 border border-indigo-500/20 animate-in fade-in slide-in-from-top-2 max-w-full overflow-hidden">
                <Terminal size={12} className="text-indigo-400 shrink-0" />
                <span className="text-[10px] md:text-xs font-mono text-slate-400 truncate">
                  Translated: <span className="text-indigo-300 font-semibold">{activeKeywords}</span>
                </span>
              </div>
            )}
             {aiThinking && (
               <div className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-indigo-300 animate-pulse">
                 <Sparkles size={14} /> AI is analyzing emotions...
               </div>
             )}
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-slate-800/50 rounded-xl animate-pulse border border-slate-700/50"></div>
            ))}
          </div>
        ) : (
          <div className="min-h-[400px]">
            {gifs.length === 0 && trendingGifs.length === 0 && !error ? (
              <div className="flex flex-col items-center justify-center text-slate-500 mt-10 md:mt-20">
                <MessageSquareDashed size={48} className="mb-4 opacity-20" />
                <p>Waiting for your vibe check...</p>
              </div>
            ) : null}

            {(gifs.length > 0 ? gifs : trendingGifs).length > 0 && (
               <div className="space-y-4">
                 <div className="flex items-center gap-2 text-xs md:text-sm font-semibold text-slate-400 uppercase tracking-wider pl-1">
                   {gifs.length > 0 ? <Search size={14} /> : <Sparkles size={14} />}
                   {gifs.length > 0 ? 'Search Results' : 'Trending Now'}
                 </div>
                 <GifGrid 
                   gifs={gifs.length > 0 ? gifs : trendingGifs} 
                   onCopy={handleCopy} 
                   copyingId={copyingId} 
                 />
               </div>
            )}

            {error && (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-6">
                  <AlertCircle className="text-red-400" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Oops!</h3>
                <p className="text-slate-400">{error}</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Toast Notification */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <div className={`px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3 backdrop-blur-md border border-white/10 ${
          toast.type === 'error' ? 'bg-red-500/90 text-white' : 
          toast.type === 'warning' ? 'bg-orange-500/90 text-white' : 
          'bg-slate-900/90 text-white'
        }`}>
          {toast.type === 'success' ? <Check size={18} className="text-green-400"/> : <AlertCircle size={18}/>}
          {toast.message}
        </div>
      </div>
    </div>
  );
}