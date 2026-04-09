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
        return text.split('\n').map((line, i) => {
            const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            return <div key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
        });
    };

    const quickPrompts = [
        'Show all sessions',
        'Which rooms are empty today?',
        'Which mentor is free today?',
        'Show all rooms',
    ];

    return (
        <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)' }}>
            <header className="page-header" style={{ marginBottom: 16 }}>
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Sparkles size={24} />
                    AI Query  <span style={{ fontSize: '0.6em', fontWeight: 500, color: 'var(--text-muted)', WebkitTextFillColor: 'var(--text-muted)', background: 'none', marginLeft: 2 }}>(Preview)</span>
                </h1>
                <p className="page-subtitle">Converse naturally to query or modify the allocation schedule. Write actions require manual confirmation.</p>
            </header>

            {/* Chat window */}
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', background: 'var(--surface)' }}>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {messages.map((msg, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 12, alignItems: 'flex-end' }}>

                            {/* AI Avatar */}
                            {msg.role === 'assistant' && (
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                                    color: '#fff', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', flexShrink: 0,
                                    boxShadow: '0 4px 12px rgba(249,115,22,0.3)'
                                }}>
                                    <Bot size={18} />
                                </div>
                            )}

                            {/* Bubble */}
                            <div style={{
                                maxWidth: '72%',
                                padding: '14px 18px',
                                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                background: msg.role === 'user'
                                    ? 'linear-gradient(135deg, var(--primary) 0%, #ea6c00 100%)'
                                    : 'var(--surface-2)',
                                color: msg.role === 'user' ? '#fff' : 'var(--text-sub)',
                                fontSize: '0.9375rem',
                                lineHeight: 1.65,
                                boxShadow: msg.role === 'user'
                                    ? '0 4px 16px rgba(249,115,22,0.25)'
                                    : 'var(--shadow-sm)',
                                border: msg.role === 'user' ? 'none' : '1px solid var(--surface-border)',
                            }}>
                                {formatContent(msg.content)}

                                {/* Confirmation card */}
                                {msg.requiresConfirmation && pendingProposal && i === messages.length - 1 && (
                                    <div style={{
                                        marginTop: 14, padding: 14,
                                        background: 'rgba(249,115,22,0.06)',
                                        borderRadius: 10,
                                        border: '1px solid rgba(249,115,22,0.15)',
                                    }}>
                                        <p style={{ margin: '0 0 12px 0', fontSize: '0.8125rem', color: 'var(--text-main)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
                                            <Sparkles size={14} style={{ color: 'var(--primary)' }} />
                                            Confirmation Required
                                        </p>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                onClick={confirmProposal}
                                                className="btn btn-success"
                                                style={{ padding: '7px 14px', fontSize: '0.8125rem' }}
                                            >
                                                <CheckCircle size={13} /> Confirm & Execute
                                            </button>
                                            <button
                                                onClick={rejectProposal}
                                                className="btn btn-danger"
                                                style={{ padding: '7px 14px', fontSize: '0.8125rem' }}
                                            >
                                                <XCircle size={13} /> Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* User Avatar */}
                            {msg.role === 'user' && (
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: 'var(--surface-2)',
                                    display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', flexShrink: 0,
                                    border: '1px solid var(--surface-border)'
                                }}>
                                    <User size={17} style={{ color: 'var(--text-muted)' }} />
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {loading && (
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                                color: '#fff', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', flexShrink: 0
                            }}>
                                <Bot size={18} />
                            </div>
                            <div style={{
                                padding: '14px 18px',
                                background: 'var(--surface-2)',
                                borderRadius: '18px 18px 18px 4px',
                                display: 'flex', alignItems: 'center', gap: 8,
                                color: 'var(--text-muted)',
                                border: '1px solid var(--surface-border)'
                            }}>
                                <Loader size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
                                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>AI is thinking…</span>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Quick prompts */}
                <div style={{ padding: '10px 20px', borderTop: '1px solid var(--surface-border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {quickPrompts.map(prompt => (
                        <button
                            key={prompt}
                            onClick={() => setInput(prompt)}
                            style={{
                                padding: '5px 12px',
                                border: '1px solid var(--surface-border)',
                                borderRadius: 20, background: 'var(--surface-2)',
                                fontSize: '0.78rem', cursor: 'pointer',
                                color: 'var(--text-muted)', fontFamily: 'inherit',
                                transition: 'var(--transition)'
                            }}
                            onMouseEnter={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.color = 'var(--primary)'; }}
                            onMouseLeave={e => { e.target.style.borderColor = 'var(--surface-border)'; e.target.style.color = 'var(--text-muted)'; }}
                        >
                            {prompt}
                        </button>
                    ))}
                </div>

                {/* Input bar */}
                <div style={{ padding: '14px 20px', borderTop: '1px solid var(--surface-border)', display: 'flex', gap: 10 }}>
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
                        style={{ padding: '10px 18px' }}
                    >
                        <Send size={15} /> Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIAllocator;
