import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X, Send, Loader2, Minimize2, Bot, ChevronLeft, Users, Copy, Check } from 'lucide-react';
import { createChatSession, PERSONAS, Persona } from '../services/geminiService';
import { ChatMessage, ApiKeys } from '../types';

interface ChatBotProps {
  apiKeys: ApiKeys;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

// Helper to convert image URL to Base64 for Gemini
const urlToGenerativePart = async (url: string): Promise<{ inlineData: { data: string; mimeType: string } } | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const blob = await response.blob();
    
    // If it's a GIF, convert the first frame to JPEG using a Canvas
    if (blob.type === 'image/gif') {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(blob);
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Canvas context failed'));
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          const base64Data = dataURL.split(',')[1];
          URL.revokeObjectURL(objectUrl);
          
          resolve({
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg'
            }
          });
        };
        
        img.onerror = (e) => {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
        };
        
        img.src = objectUrl;
      });
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: blob.type
          }
        });
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return null;
  }
};

export const ChatBot: React.FC<ChatBotProps> = ({ apiKeys, showToast }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [activePersona, setActivePersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [usingBackup, setUsingBackup] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  
  const chatSessionRef = useRef<any>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectPersona = (persona: Persona) => {
    setActivePersona(persona);
    setMessages([{
      id: 'welcome',
      role: 'model',
      text: persona.welcome
    }]);
    chatSessionRef.current = createChatSession(persona.systemInstruction);
  };

  const backToMenu = () => {
    setActivePersona(null);
    setMessages([]);
    setInput('');
  };

  useEffect(() => {
    if (isOpen && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [messages, isOpen, isTyping, activePersona]);

  useEffect(() => {
    if (window.innerWidth < 768 && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const searchMemeForChat = async (keywords: string): Promise<string | undefined> => {
    if (!apiKeys.giphy) return undefined;
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/random?api_key=${apiKeys.giphy}&tag=${encodeURIComponent(keywords)}&rating=g`);
      const data = await res.json();
      return data.data?.images?.fixed_height?.url;
    } catch (e) {
      return undefined;
    }
  };

  const handleCopyMeme = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyingId(id);
      showToast("Link copied to clipboard!");
      setTimeout(() => setCopyingId(null), 2000);
    } catch (err) {
      showToast("Failed to copy", "error");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping || !activePersona) return;

    const userText = input.trim();
    setInput('');
    setIsTyping(true);
    setUsingBackup(false);

    // URL/Image detection
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const match = userText.match(urlRegex);
    const foundUrl = match ? match[0] : undefined;
    
    let userMemeUrl: string | undefined = undefined;
    if (foundUrl) {
      const isImage = /\.(gif|jpg|jpeg|png|webp)($|\?|#)/i.test(foundUrl) || 
                      foundUrl.includes('giphy.com') || 
                      foundUrl.includes('tenor.com');
      if (isImage) userMemeUrl = foundUrl;
    }

    const newMessage: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: userText,
      memeUrl: userMemeUrl 
    };
    
    setMessages(prev => [...prev, newMessage]);

    try {
      const chat = chatSessionRef.current;
      let promptToSend: any = userText;

      if (userMemeUrl) {
        const imagePart = await urlToGenerativePart(userMemeUrl);
        if (imagePart) {
          promptToSend = [
            { text: `(使用者傳了一張梗圖，請看圖回應): ${userText}` },
            imagePart
          ];
        } else {
          promptToSend = `(User sent an image URL: ${userText}, but I failed to download the visual data. Do not guess what is in the image. Just reply generally or ask what the meme is about.)`;
        }
      }

      // 1. Try Google Gemini Primary
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: activePersona.systemInstruction,
          message: userText
        })
      });

      const data = await res.json();
      const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "……我腦袋空白了";

      processResponse(text);


    } catch (err: any) {
      console.warn("Gemini Chat Error:", err);
      
      // 2. FAILOVER TO OPENAI
      if (apiKeys.openai && activePersona) {
         try {
           setUsingBackup(true); 
           
           const historyPayload = messages
             .filter(m => !m.text.includes('API Error'))
             .map(m => ({
               role: m.role === 'model' ? 'assistant' : 'user',
               content: m.role === 'user' && m.memeUrl 
                  ? `[User sent an image: ${m.memeUrl}] ${m.text}` 
                  : m.text 
             }))
             .slice(-10);

           const finalMessages = [
             { role: "system", content: activePersona.systemInstruction },
             ...historyPayload,
             { role: "user", content: userMemeUrl ? `[User sent an image: ${userMemeUrl}] ${userText}` : userText }
           ];

           const openaiPayload: any = {
             model: "gpt-4o-mini",
             messages: finalMessages,
             temperature: 0.9
           };

           const cleanOpenAiKey = apiKeys.openai.trim();

           const res = await fetch('https://api.openai.com/v1/chat/completions', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${cleanOpenAiKey}`
             },
             body: JSON.stringify(openaiPayload)
           });
           
           if (!res.ok) {
             const errorData = await res.json().catch(() => ({}));
             const errorMsg = errorData.error?.message || `Status ${res.status}`;
             throw new Error(`OpenAI Backup Failed: ${errorMsg}`);
           }

           const data = await res.json();
           const backupText = data.choices[0]?.message?.content || "System Error";
           
           processResponse(backupText);
           return; 

         } catch (backupErr: any) {
            console.error("Backup also failed", backupErr);
            handleError(backupErr); 
            return;
         }
      }

      handleError(err);
    } finally {
      setIsTyping(false);
    }
  };

  const processResponse = async (rawText: string = "") => {
    let botText = rawText;
    let memeUrl = undefined;
    let keywords = "";

    // Regex improvement:
    // 1. [MEME: keywords] - Standard
    // 2. [IMAGE: keywords] - Common variation
    // 3. ![keywords] - Markdown style (the Grandma bug)
    // 4. ![keywords](url) - Full markdown style (just capture keywords)
    const memeRegex = /\[(?:MEME|IMAGE):\s*([^\]]+)\]|!\[([^\]]+)\](?:\([^)]*\))?/i;
    
    const match = rawText.match(memeRegex);

    if (match) {
      // match[1] for MEME/IMAGE tag, match[2] for markdown alt text
      keywords = match[1] || match[2]; 
      
      // Remove the entire tag from the displayed text
      botText = rawText.replace(match[0], '').trim();
      
      if (keywords) {
         keywords = keywords.trim();
         memeUrl = await searchMemeForChat(keywords);
      }
    }

    setMessages(prev => [...prev, { 
      id: (Date.now() + 1).toString(), 
      role: 'model', 
      text: botText,
      memeUrl: memeUrl
    }]);
  };

  const handleError = (err: any) => {
    let errorMessage = '壞掉了啦... (API Error)';
    const msg = (err.message || JSON.stringify(err)).toLowerCase();
    
    if (msg.includes('openai') || msg.includes('gpt')) {
       errorMessage = `💀 備援失敗: ${err.message.replace('OpenAI Backup Failed:', '')}`;
    }
    else if (msg.includes('429') || msg.includes('resource_exhausted')) {
      errorMessage = '😵‍💫 聊太嗨了，大腦過熱中... (Gemini 額度滿了，請檢查設定中的備援 Key)';
    } else if (msg.includes('400')) {
       errorMessage = '🤔 圖片格式怪怪的，我看不太懂...';
    }

    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      role: 'model', 
      text: errorMessage
    }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[90] animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-[100] p-4 rounded-full shadow-2xl transition-all duration-300 transform border border-white/10
          right-4 bottom-4
          md:bottom-auto md:top-24 md:right-6
          hover:scale-110 active:scale-95
          ${isOpen ? 'bg-slate-800 text-slate-400 rotate-90 scale-90' : 'bg-gradient-to-r from-pink-500 to-orange-400 text-white rotate-0'}`}
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-500 border border-white"></span>
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`
            fixed z-[100] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden transition-all animate-in fade-in duration-300
            inset-x-0 bottom-0 h-[85dvh] rounded-t-3xl slide-in-from-bottom-10
            md:inset-auto md:top-24 md:right-24 md:w-80 md:h-[500px] md:max-h-[70vh] md:rounded-3xl md:slide-in-from-right-4
          `}
             style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
          
          {/* Header */}
          <div className="flex-none p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between select-none" onClick={() => window.innerWidth < 768 && setIsOpen(false)}>
            <div className="flex items-center gap-3">
              {activePersona ? (
                 <>
                   <button 
                     onClick={(e) => { e.stopPropagation(); backToMenu(); }}
                     className="p-1 -ml-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors"
                   >
                     <ChevronLeft size={20} />
                   </button>
                   <div className="relative">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${activePersona.colorFrom} ${activePersona.colorTo} flex items-center justify-center text-lg shadow-inner`}>
                        {activePersona.avatar}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-2 h-2 border-2 border-slate-800 rounded-full animate-pulse ${usingBackup ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                   </div>
                   <div>
                     <h3 className="font-bold text-white flex items-center gap-2 text-sm md:text-base">
                       {activePersona.name}
                     </h3>
                     <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase flex items-center gap-1">
                       {usingBackup ? <><Bot size={10} className="text-orange-400"/> Backup Mode</> : activePersona.description}
                     </p>
                   </div>
                 </>
              ) : (
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-indigo-400" />
                  <h3 className="font-bold text-white text-base">Select Persona</h3>
                </div>
              )}
            </div>
            
            <button 
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
              className="hidden md:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
            >
              <Minimize2 size={16} />
            </button>
            <div className="md:hidden w-10 h-1 bg-slate-600 rounded-full absolute top-2 left-1/2 -translate-x-1/2 opacity-50"></div>
          </div>

          {/* Content Area */}
          {!activePersona ? (
            /* Persona Selection Menu */
            <div className="flex-1 p-6 overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-pink-200">
                Choose your vibe ✨
              </h2>
              <div className="space-y-3">
                {PERSONAS.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => selectPersona(p)}
                    className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 rounded-2xl p-4 flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                  >
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${p.colorFrom} ${p.colorTo} flex items-center justify-center text-2xl shadow-lg group-hover:shadow-indigo-500/30`}>
                      {p.avatar}
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors">{p.name}</h3>
                      <p className="text-xs text-slate-400">{p.description}</p>
                    </div>
                    <ChevronLeft size={16} className="rotate-180 text-slate-600 group-hover:text-indigo-400" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active Chat View */
            <div 
              ref={messagesContainerRef}
              className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
            >
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    
                    {(!msg.memeUrl || msg.text !== msg.memeUrl) && (
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-slate-800 text-slate-300 rounded-bl-none border border-slate-700'
                      }`}>
                        {msg.text}
                      </div>
                    )}

                    {msg.memeUrl && (
                      <div className={`relative group mt-1 rounded-xl overflow-hidden border border-slate-700 shadow-lg w-full max-w-[200px] ${msg.role === 'user' ? 'border-indigo-500/30' : ''}`}>
                        <img src={msg.memeUrl} alt="Meme" className="w-full h-auto object-cover" />
                        
                        {/* Copy Overlay Button */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <button 
                             onClick={() => msg.memeUrl && handleCopyMeme(msg.memeUrl, msg.id)}
                             className="bg-white/20 backdrop-blur-md p-2 rounded-full hover:bg-white/40 transition-colors text-white"
                             title="Copy Image Link"
                           >
                              {copyingId === msg.id ? <Check size={20} /> : <Copy size={20} />}
                           </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                   <div className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-2xl rounded-bl-none flex items-center gap-1">
                     <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                     <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                     <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                   </div>
                </div>
              )}
            </div>
          )}

          {/* Input Area (Only visible when activePersona is selected) */}
          {activePersona && (
            <div className="flex-none p-3 bg-slate-900 border-t border-slate-800 pb-8 md:pb-3">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Reply to ${activePersona.name}...`}
                  className="w-full bg-slate-800 text-white rounded-full pl-4 pr-10 py-2.5 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 border border-slate-700 placeholder-slate-600 shadow-inner transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="absolute right-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white disabled:opacity-50 disabled:bg-slate-700 transition-all shadow-md active:scale-95"
                >
                  {isTyping ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>,
    document.body
  );
};
