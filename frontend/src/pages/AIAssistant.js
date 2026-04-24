import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Trash2, FileText, AlertTriangle, Shield, BookOpen } from 'lucide-react';
import { aiAPI } from '../services/api';

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m your AI Compliance Assistant. I can help you with:\n\n- Understanding regulations (GDPR, CCPA, HIPAA, SOX, etc.)\n- Compliance best practices\n- Risk assessment guidance\n- Policy development\n- Incident response\n- Audit preparation\n\nHow can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const conversationHistory = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await aiAPI.chat(userMessage, conversationHistory);
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please check your OpenRouter API key in the .env file and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([{ role: 'assistant', content: 'Chat cleared. How can I help you with compliance today?' }]);
  };

  const quickPrompts = [
    { icon: FileText, text: 'Explain GDPR requirements', prompt: 'Can you explain the key requirements of GDPR and what organizations need to do to comply?' },
    { icon: AlertTriangle, text: 'Risk assessment help', prompt: 'How do I conduct a comprehensive risk assessment for compliance?' },
    { icon: Shield, text: 'Data breach response', prompt: 'What are the steps to respond to a data breach under GDPR?' },
    { icon: BookOpen, text: 'Policy template', prompt: 'Can you help me draft a data protection policy for my organization?' }
  ];

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Compliance Assistant</h1>
          <p className="page-subtitle">Get instant answers to your compliance questions</p>
        </div>
        <button className="btn btn-secondary" onClick={handleClearChat}>
          <Trash2 size={18} /> Clear Chat
        </button>
      </div>

      {/* Quick Prompts */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {quickPrompts.map((item, index) => (
          <button
            key={index}
            className="btn btn-outline"
            onClick={() => handleQuickPrompt(item.prompt)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <item.icon size={16} />
            {item.text}
          </button>
        ))}
      </div>

      <div className="card" style={{ height: 'calc(100vh - 300px)', display: 'flex', flexDirection: 'column' }}>
        {/* Messages */}
        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {messages.map((message, index) => (
            <div key={index} className={`chat-message ${message.role}`}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: message.role === 'user' ? '#3b82f6' : '#10b981',
                  color: 'white',
                  flexShrink: 0
                }}>
                  {message.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className="chat-bubble" style={{
                  background: message.role === 'user' ? '#3b82f6' : '#f3f4f6',
                  color: message.role === 'user' ? 'white' : '#1a1a2e',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  maxWidth: '80%',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.5'
                }}>
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-message assistant">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#10b981',
                  color: 'white'
                }}>
                  <Bot size={18} />
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6b7280', animation: 'pulse 1s infinite' }}></span>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6b7280', animation: 'pulse 1s infinite 0.2s' }}></span>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6b7280', animation: 'pulse 1s infinite 0.4s' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '16px', display: 'flex', gap: '12px' }}>
          <textarea
            className="form-input"
            placeholder="Ask me anything about compliance..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            style={{ flex: 1, minHeight: '50px', maxHeight: '150px', resize: 'vertical' }}
            disabled={loading}
          />
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{ alignSelf: 'flex-end' }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default AIAssistant;
