import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, Sparkles, Send, MessageSquare } from 'lucide-react';
import { tenderApi } from '../../lib/api';

interface AISummaryTabProps {
  leadId: number;
}

export function AISummaryTab({ leadId }: AISummaryTabProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const response = await tenderApi.generateSummary(leadId);
      if (response.success && response.data) {
        setAiSummary(response.data.summary || response.data);
      }
    } catch (err) {
      console.error('Error generating summary:', err);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    try {
      const response = await tenderApi.chat(leadId, userMsg, chatMessages);
      if (response.success && response.data) {
        const reply = response.data.reply || response.data.message || response.data;
        setChatMessages(prev => [...prev, { role: 'assistant', content: typeof reply === 'string' ? reply : JSON.stringify(reply) }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* AI Summary Section */}
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> AI Summary
          </h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleGenerateSummary} disabled={generatingSummary}>
              {generatingSummary ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
              {aiSummary ? 'Regenerate' : 'Generate'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowChat(!showChat)}>
              <MessageSquare className="w-3 h-3 mr-1" />
              {showChat ? 'Hide Chat' : 'Chat'}
            </Button>
          </div>
        </div>

        {aiSummary ? (
          <div className="p-4 bg-white border rounded text-sm leading-relaxed whitespace-pre-wrap">
            {aiSummary}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">
            Click "Generate" to create an AI-powered summary of this lead's activities, documents, and status.
          </p>
        )}
      </div>

      {/* Chat Section */}
      {showChat && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b">
            <span className="text-xs font-medium text-gray-600">Ask AI about this lead</span>
          </div>
          <div className="h-64 overflow-y-auto p-3 space-y-2 bg-white">
            {chatMessages.length === 0 && (
              <p className="text-center text-gray-500 text-sm py-8">Ask anything about this lead.</p>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-2.5 rounded-lg text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 p-2 border-t bg-gray-50">
            <Input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
              placeholder="Type a question..."
              className="text-sm h-8"
              disabled={chatLoading}
            />
            <Button size="icon" className="h-8 w-8" onClick={handleChat} disabled={chatLoading || !chatInput.trim()}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
