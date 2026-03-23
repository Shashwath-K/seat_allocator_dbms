import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, CheckCircle, XCircle, Loader, Sparkles } from 'lucide-react';

const AIAllocator = () => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: `👋 Hello! I'm the **AI Allocator**. I can answer questions about the current schedule, batches, rooms, and mentors — or help you **create**, **reallocate**, and **delete** sessions.\n\nTry asking:\n- "Which rooms are empty today?"\n- "Show all sessions"\n- "Allocate batch CS-A to room LAB-01 on 2026-03-25 FN"\n- "Which mentor is free today?"`,
            proposal: null
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingProposal, setPendingProposal] = useState(null);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const sendMessage = () => {
        const text = input.trim();
        if (!text) return;
        setInput('');

        const userMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        fetch('http://127.0.0.1:8000/ai-allocator/chat/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        })
        .then(r => r.json())
        .then(data => {
            const aiMsg = {
                role: 'assistant',
                content: data.reply || data.error || 'No response received.',
                proposal: data.proposal || null,
                requiresConfirmation: data.requires_confirmation || false
            };
            setMessages(prev => [...prev, aiMsg]);
            if (data.requires_confirmation && data.proposal) {
                setPendingProposal(data.proposal);
            }
        })
        .catch(err => {
            setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${err.message}`, proposal: null }]);
        })
        .finally(() => setLoading(false));
    };

    const confirmProposal = () => {
        if (!pendingProposal) return;
        setLoading(true);
        setPendingProposal(null);

        fetch('http://127.0.0.1:8000/ai-allocator/confirm/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proposal: pendingProposal })
        })
        .then(r => r.json())
        .then(data => {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `✅ **Done!** ${data.reply || data.error}`,
                proposal: null
            }]);
        })
        .catch(err => {
            setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Confirmation failed: ${err.message}`, proposal: null }]);
        })
        .finally(() => setLoading(false));
    };

    const rejectProposal = () => {
        setPendingProposal(null);
        setMessages(prev => [...prev, { role: 'assistant', content: '❌ Action cancelled. What else can I help you with?', proposal: null }]);
    };

    const formatContent = (text) => {
        // Simple formatting: bold **, line breaks, code blocks
        return text
            .split('\n')
            .map((line, i) => {
                const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                return <div key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
            });
    };

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
            <header className="page-header" style={{ marginBottom: 16 }}>
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Sparkles size={28} color="var(--primary)" /> AI Allocator
                </h1>
                <p className="page-subtitle">Converse naturally to query or modify the allocation schedule. Write actions require manual confirmation.</p>
            </header>

            {/* Chat window */}
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: '1px solid var(--surface-border)', background: 'rgba(255, 255, 255, 0.4)' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {messages.map((msg, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 14 }}>
                            {msg.role === 'assistant' && (
                                <div style={{ 
                                    width: 40, height: 40, borderRadius: '12px', 
                                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', 
                                    color: '#fff', display: 'flex', alignItems: 'center', 
                                    justifyContent: 'center', flexShrink: 0,
                                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
                                }}>
                                    <Bot size={20} />
                                </div>
                            )}
                            <div style={{
                                maxWidth: '75%',
                                padding: '16px 20px',
                                borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                background: msg.role === 'user' ? 'var(--primary)' : 'white',
                                color: msg.role === 'user' ? '#fff' : 'var(--text-main)',
                                fontSize: '0.9375rem',
                                lineHeight: 1.6,
                                boxShadow: msg.role === 'user' ? '0 4px 15px rgba(79, 70, 229, 0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
                                border: msg.role === 'user' ? 'none' : '1px solid var(--surface-border)'
                            }}>
                                {formatContent(msg.content)}
                                
                                {/* Confirmation Card for write proposals */}
                                {msg.requiresConfirmation && pendingProposal && i === messages.length - 1 && (
                                    <div style={{ marginTop: 16, padding: 16, background: 'rgba(255,255,255,0.6)', borderRadius: 12, border: '1px solid rgba(79, 70, 229, 0.1)', backdropFilter: 'blur(4px)' }}>
                                        <p style={{ margin: '0 0 14px 0', fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Sparkles size={16} style={{ color: 'var(--primary)' }} /> Confirmation Required
                                        </p>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button
                                                onClick={confirmProposal}
                                                className="btn btn-primary"
                                                style={{ padding: '8px 16px', fontSize: '0.8125rem', height: 'auto', background: 'var(--success)', borderColor: 'var(--success)' }}
                                            ><CheckCircle size={14} style={{ marginRight: 6 }} /> Confirm & Execute</button>
                                            <button
                                                onClick={rejectProposal}
                                                className="btn btn-outline"
                                                style={{ padding: '8px 16px', fontSize: '0.8125rem', height: 'auto', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                            ><XCircle size={14} style={{ marginRight: 6 }} /> Cancel</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {msg.role === 'user' && (
                                <div style={{ 
                                    width: 40, height: 40, borderRadius: '12px', 
                                    background: 'white', display: 'flex', alignItems: 'center', 
                                    justifyContent: 'center', flexShrink: 0,
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    border: '1px solid var(--surface-border)'
                                }}>
                                    <User size={20} style={{ color: 'var(--text-muted)' }} />
                                </div>
                            )}
                        </div>
                    ))}

                    {loading && (
                        <div style={{ display: 'flex', gap: 14 }}>
                            <div style={{ 
                                width: 40, height: 40, borderRadius: '12px', 
                                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', 
                                color: '#fff', display: 'flex', alignItems: 'center', 
                                justifyContent: 'center', flexShrink: 0
                            }}>
                                <Bot size={20} />
                            </div>
                            <div style={{ 
                                padding: '16px 20px', 
                                background: 'white', 
                                borderRadius: '20px 20px 20px 4px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 10, 
                                color: 'var(--text-muted)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                border: '1px solid var(--surface-border)'
                            }}>
                                <Loader size={18} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} /> 
                                <span style={{ fontWeight: 500 }}>AI is thinking…</span>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Quick prompts */}
                <div style={{ padding: '8px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                        'Show all sessions',
                        'Which rooms are empty today?',
                        'Which mentor is free today?',
                        'Show all rooms',
                    ].map(prompt => (
                        <button
                            key={prompt}
                            onClick={() => setInput(prompt)}
                            style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 20, background: '#f8fafc', fontSize: '0.78rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >{prompt}</button>
                    ))}
                </div>

                {/* Input bar */}
                <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 12 }}>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Ask anything about the schedule, or request an allocation change…"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        style={{ flex: 1 }}
                        disabled={loading}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={sendMessage}
                        disabled={loading || !input.trim()}
                        style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <Send size={16} /> Send
                    </button>
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default AIAllocator;
