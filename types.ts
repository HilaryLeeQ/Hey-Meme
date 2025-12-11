export interface GifImage {
  url: string;
  width?: string;
  height?: string;
}

export interface GifImages {
  fixed_height: GifImage;
  original: GifImage;
}

export interface GifItem {
  id: string;
  title: string;
  source_api: 'Giphy' | 'Tenor';
  images: GifImages;
  url: string;
}

export interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'warning';
}

export interface ApiKeys {
  giphy: string;
  tenor: string;
  openai?: string; // Added for fallback
}

export interface SearchResult {
  gifs: GifItem[];
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  memeUrl?: string; // Optional meme image attached to the message
  isThinking?: boolean;
}