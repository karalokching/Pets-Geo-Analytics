import React, { useState, useRef, useEffect } from 'react';
import { generateLocationInsights } from '../services/gemini';
import { SalesRecord, ChatMessage, DistrictStat } from '../types';

interface GeminiExplorerProps {
  records: SalesRecord[];
  districtStats: DistrictStat[];
}

const GeminiExplorer: React.FC<GeminiExplorerProps> = ({ records, districtStats }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello! I am your Location Intelligence Assistant powered by Gemini 2.5 and Google Maps. I have access to your full customer address list. \n\nYou can ask me:\n- "Where is the highest spending customer located?"\n- "What kind of building is at the address for order MM560092?"\n- "Which district has the most high-value customers?"'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log("Geolocation permission denied or error:", error);
        }
      );
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Construct a CSV representation of the data to pass to the model.
      // Gemini 2.5 Flash has a large context window, so passing ~1000 rows is fine.
      // We prioritize passing the Raw Data so the model can answer "Where does customer X live?".
      
      const csvHeader = "ID,PLU,Amount,Address,District,Date";
      const csvRows = records.map(r => 
        `${r.id},${r.plu},${r.amount},"${r.address}",${r.district},${r.date}`
      ).join('\n');
      
      // Limit context if it becomes absolutely massive (e.g. > 1MB of text), 
      // but for ~1000 records it is well within limits.
      // The provided file is small enough to pass entirely.
      const contextData = `
        Current Dataset (CSV Format):
        ${csvHeader}
        ${csvRows}
      `;

      const response = await generateLocationInsights(userMsg.text, contextData, userLocation);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text,
        groundingLinks: response.links
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Sorry, I encountered an error connecting to the AI service. Please ensure your API Key is valid and try again.'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
      <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-white font-semibold flex items-center">
          <i className="fas fa-map-marked-alt text-blue-400 mr-2"></i>
          Maps Grounding Explorer
        </h3>
        <div className="flex items-center space-x-2">
            {userLocation && (
                <span className="text-xs text-emerald-400 flex items-center" title="Using your location for better search results">
                    <i className="fas fa-location-arrow mr-1"></i> Loc On
                </span>
            )}
            <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded border border-blue-800">
            Gemini 2.5 Flash
            </span>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-md ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none' 
                : 'bg-slate-700 text-slate-200 rounded-bl-none border border-slate-600'
            }`}>
              <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{msg.text}</div>
              
              {/* Render Grounding Links */}
              {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-600/50">
                  <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide flex items-center">
                    <i className="fas fa-map-pin text-red-500 mr-1.5"></i>
                    Google Maps Sources
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {msg.groundingLinks.map((link, idx) => (
                      <a 
                        key={idx}
                        href={link.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-xs bg-slate-800 hover:bg-slate-900 text-blue-300 border border-slate-600 hover:border-blue-500 px-3 py-2 rounded-lg transition-all group"
                      >
                        <i className="fas fa-external-link-alt mr-2 text-slate-500 group-hover:text-blue-400"></i>
                        <span className="truncate">{link.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-slate-700 rounded-2xl rounded-bl-none p-4 flex items-center space-x-2 border border-slate-600">
               <i className="fas fa-satellite-dish text-slate-400 animate-spin mr-2"></i>
               <span className="text-slate-400 text-sm">Consulting Google Maps...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-700">
        <div className="relative group">
          <input
            type="text"
            className="w-full bg-slate-800 text-white rounded-full pl-5 pr-12 py-3 border border-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-slate-500 transition-all shadow-inner"
            placeholder="Ask about specific customers, addresses, or districts..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="absolute right-2 top-1.5 bg-blue-600 hover:bg-blue-500 text-white w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/50"
          >
            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-location-arrow'}`}></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeminiExplorer;