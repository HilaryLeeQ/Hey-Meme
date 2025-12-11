import React from 'react';
import { Check, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { GifItem } from '../types';

interface GifGridProps {
  gifs: GifItem[];
  onCopy: (gif: GifItem) => void;
  copyingId: string | null;
}

export const GifGrid: React.FC<GifGridProps> = ({ gifs, onCopy, copyingId }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {gifs.map((gif) => (
        <div 
          key={gif.id} 
          onClick={() => onCopy(gif)}
          className="group relative rounded-xl overflow-hidden cursor-pointer bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all hover:-translate-y-1 shadow-lg hover:shadow-indigo-500/20"
        >
          {/* Skeleton loader / Background */}
          <div className="absolute inset-0 bg-slate-800 animate-pulse -z-10" />
          
          <img 
            src={gif.images.fixed_height.url} 
            alt={gif.title} 
            loading="lazy"
            className="w-full h-48 object-cover transform transition-transform duration-700 group-hover:scale-110" 
          />
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-indigo-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
            <div className={`p-3 rounded-full transition-all duration-300 ${copyingId === gif.id ? 'bg-green-500 scale-110' : 'bg-white/20 hover:bg-white/40'}`}>
              {copyingId === gif.id ? (
                <Check size={24} className="text-white" />
              ) : (
                <LinkIcon size={24} className="text-white" />
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white px-2 py-1 rounded backdrop-blur-md">
              {copyingId === gif.id ? 'Copied!' : 'Copy Link'}
            </span>
          </div>

          {/* Source Badge */}
          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/50 text-[10px] text-white/80 rounded backdrop-blur-sm border border-white/10 font-medium">
             {gif.source_api}
          </div>
        </div>
      ))}
    </div>
  );
};