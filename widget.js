/**
 * Gulp Chat Widget
 * 
 * A modern, embeddable chat widget that connects to the Gulp API.
 * Features: Chat history, session management, markdown rendering, dark mode support.
 * 
 * Usage:
 * <script src="widget.js" data-token="YOUR_TOKEN" data-api-url="http://localhost:8000" async></script>
 */

(function() {
    'use strict';

    // ============================================================================
    // Configuration & State
    // ============================================================================
    let config = {
        token: null,
        apiUrl: 'http://localhost:8000',
        isOpen: false,
        isLoading: false,
        sessionId: null,
        messages: []
    };

    // Generate or retrieve session ID
    function getSessionId() {
        const storageKey = 'gulp_widget_session';
        let sessionId = localStorage.getItem(storageKey);
        if (!sessionId) {
            sessionId = 'widget_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(storageKey, sessionId);
        }
        return sessionId;
    }

    // Load chat history from localStorage
    function loadChatHistory() {
        const storageKey = `gulp_widget_messages_${config.sessionId}`;
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                config.messages = JSON.parse(saved);
                return true;
            }
        } catch (e) {
            console.warn('Failed to load chat history:', e);
        }
        return false;
    }

    // Save chat history to localStorage
    function saveChatHistory() {
        const storageKey = `gulp_widget_messages_${config.sessionId}`;
        try {
            localStorage.setItem(storageKey, JSON.stringify(config.messages));
        } catch (e) {
            console.warn('Failed to save chat history:', e);
        }
    }

    // ============================================================================
    // Theme & Dark Mode Detection
    // ============================================================================
    function detectDarkMode() {
        // Check if document has dark class
        if (document.documentElement.classList.contains('dark')) {
            return true;
        }
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return true;
        }
        // Check localStorage
        const theme = localStorage.getItem('theme');
        if (theme === 'dark') {
            return true;
        }
        return false;
    }

    function getThemeColors(isDark) {
        if (isDark) {
            return {
                background: 'oklch(0.147 0.004 49.25)', // --background (dark)
                foreground: 'oklch(0.985 0.001 106.423)', // --foreground (dark)
                card: 'oklch(0.216 0.006 56.043)', // --card (dark)
                cardForeground: 'oklch(0.985 0.001 106.423)',
                primary: 'oklch(0.923 0.003 48.717)', // --primary (dark)
                primaryForeground: 'oklch(0.216 0.006 56.043)',
                muted: 'oklch(0.268 0.007 34.298)', // --muted (dark)
                mutedForeground: 'oklch(0.709 0.01 56.259)',
                border: 'oklch(1 0 0 / 10%)', // --border (dark)
                input: 'oklch(1 0 0 / 15%)',
                radius: '0.625rem'
            };
        } else {
            return {
                background: 'oklch(1 0 0)', // --background (light)
                foreground: 'oklch(0.147 0.004 49.25)', // --foreground (light)
                card: 'oklch(1 0 0)', // --card (light)
                cardForeground: 'oklch(0.147 0.004 49.25)',
                primary: 'oklch(0.216 0.006 56.043)', // --primary (light)
                primaryForeground: 'oklch(0.985 0.001 106.423)',
                muted: 'oklch(0.97 0.001 106.424)', // --muted (light)
                mutedForeground: 'oklch(0.553 0.013 58.071)',
                border: 'oklch(0.923 0.003 48.717)', // --border (light)
                input: 'oklch(0.923 0.003 48.717)',
                radius: '0.625rem'
            };
        }
    }

    // ============================================================================
    // Markdown Renderer (Lightweight)
    // ============================================================================
    function renderMarkdown(text) {
        if (!text) return '';
        
        let html = text;
        
        // Escape HTML first
        html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Code blocks (```code```)
        html = html.replace(/```([\s\S]*?)```/g, function(match, code) {
            return '<pre><code>' + code.trim() + '</code></pre>';
        });
        
        // Inline code (`code`)
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Bold (**text** or __text__)
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
        
        // Italic (*text* or _text_)
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
        
        // Links [text](url)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        
        // Line breaks
        html = html.replace(/\n/g, '<br>');
        
        // Lists (unordered)
        html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
        
        // Wrap consecutive <li> in <ul>
        html = html.replace(/(<li>.*<\/li>\n?)+/g, function(match) {
            return '<ul>' + match + '</ul>';
        });
        
        // Lists (ordered)
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
        
        // Paragraphs (text between double line breaks)
        html = html.split('<br><br>').map(para => {
            para = para.trim();
            if (para && !para.match(/^<(ul|ol|pre|h[1-6])/)) {
                return '<p>' + para + '</p>';
            }
            return para;
        }).join('');
        
        return html;
    }

    // ============================================================================
    // Initialize Configuration
    // ============================================================================
    function initConfig() {
        const script = document.currentScript || document.querySelector('script[src*="widget.js"]');
        if (script) {
            config.token = script.getAttribute('data-token');
            config.apiUrl = script.getAttribute('data-api-url') || config.apiUrl;
        }

        // Fallback: try to get from window.gulpWidgetConfig
        if (window.gulpWidgetConfig) {
            config.token = window.gulpWidgetConfig.token || config.token;
            config.apiUrl = window.gulpWidgetConfig.apiUrl || config.apiUrl;
        }

        if (!config.token) {
            console.error('Gulp Widget: Token is required. Set data-token attribute on script tag.');
            return false;
        }

        // Initialize session
        config.sessionId = getSessionId();
        loadChatHistory();

        return true;
    }

    // ============================================================================
    // Create Widget HTML
    // ============================================================================
    function createWidgetHTML() {
        const isDark = detectDarkMode();
        const colors = getThemeColors(isDark);
        
        // Inject CSS with theme variables
        const styleId = 'gulp-widget-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                #gulp-widget-container * {
                    box-sizing: border-box;
                }
                
                #gulp-widget-container {
                    --gulp-bg: ${colors.background};
                    --gulp-fg: ${colors.foreground};
                    --gulp-card: ${colors.card};
                    --gulp-card-fg: ${colors.cardForeground};
                    --gulp-primary: ${colors.primary};
                    --gulp-primary-fg: ${colors.primaryForeground};
                    --gulp-muted: ${colors.muted};
                    --gulp-muted-fg: ${colors.mutedForeground};
                    --gulp-border: ${colors.border};
                    --gulp-input: ${colors.input};
                    --gulp-radius: ${colors.radius};
                }
                
                #gulp-widget-container {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                }
                
                #gulp-widget-window {
                    display: none;
                    width: 400px;
                    max-width: calc(100vw - 40px);
                    height: 600px;
                    max-height: calc(100vh - 100px);
                    background: var(--gulp-card);
                    color: var(--gulp-card-fg);
                    border-radius: var(--gulp-radius);
                    border: 1px solid var(--gulp-border);
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    flex-direction: column;
                    overflow: hidden;
                    animation: slideUp 0.3s ease-out;
                }
                
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                #gulp-widget-header {
                    background: var(--gulp-primary);
                    color: var(--gulp-primary-fg);
                    padding: 16px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--gulp-border);
                }
                
                #gulp-widget-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                    letter-spacing: -0.01em;
                }
                
                #gulp-widget-close {
                    background: transparent;
                    border: none;
                    color: var(--gulp-primary-fg);
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                    opacity: 0.8;
                }
                
                #gulp-widget-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                    opacity: 1;
                }
                
                #gulp-widget-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    background: var(--gulp-bg);
                    scroll-behavior: smooth;
                }
                
                #gulp-widget-messages::-webkit-scrollbar {
                    width: 6px;
                }
                
                #gulp-widget-messages::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                #gulp-widget-messages::-webkit-scrollbar-thumb {
                    background: var(--gulp-border);
                    border-radius: 3px;
                }
                
                #gulp-widget-messages::-webkit-scrollbar-thumb:hover {
                    background: var(--gulp-muted-fg);
                }
                
                .gulp-message {
                    margin-bottom: 16px;
                    display: flex;
                    animation: fadeIn 0.3s ease-out;
                }
                
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .gulp-message-user {
                    justify-content: flex-end;
                }
                
                .gulp-message-assistant {
                    justify-content: flex-start;
                }
                
                .gulp-message-bubble {
                    max-width: 80%;
                    padding: 12px 16px;
                    border-radius: var(--gulp-radius);
                    word-wrap: break-word;
                    font-size: 14px;
                    line-height: 1.6;
                    position: relative;
                }
                
                .gulp-message-user .gulp-message-bubble {
                    background: var(--gulp-primary);
                    color: var(--gulp-primary-fg);
                    border-bottom-right-radius: 4px;
                }
                
                .gulp-message-assistant .gulp-message-bubble {
                    background: var(--gulp-muted);
                    color: var(--gulp-muted-fg);
                    border: 1px solid var(--gulp-border);
                    border-bottom-left-radius: 4px;
                }
                
                .gulp-message-bubble p {
                    margin: 0 0 8px 0;
                }
                
                .gulp-message-bubble p:last-child {
                    margin-bottom: 0;
                }
                
                .gulp-message-bubble code {
                    background: var(--gulp-card);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.9em;
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                }
                
                .gulp-message-bubble pre {
                    background: var(--gulp-card);
                    padding: 12px;
                    border-radius: var(--gulp-radius);
                    overflow-x: auto;
                    margin: 8px 0;
                    border: 1px solid var(--gulp-border);
                }
                
                .gulp-message-bubble pre code {
                    background: transparent;
                    padding: 0;
                }
                
                .gulp-message-bubble ul, .gulp-message-bubble ol {
                    margin: 8px 0;
                    padding-left: 24px;
                }
                
                .gulp-message-bubble li {
                    margin: 4px 0;
                }
                
                .gulp-message-bubble a {
                    color: var(--gulp-primary);
                    text-decoration: underline;
                }
                
                .gulp-message-bubble strong {
                    font-weight: 600;
                }
                
                .gulp-message-bubble em {
                    font-style: italic;
                }
                
                .gulp-empty-state {
                    text-align: center;
                    color: var(--gulp-muted-fg);
                    font-size: 14px;
                    padding: 40px 20px;
                }
                
                #gulp-widget-input-area {
                    border-top: 1px solid var(--gulp-border);
                    padding: 16px;
                    background: var(--gulp-card);
                }
                
                #gulp-widget-input-wrapper {
                    display: flex;
                    gap: 8px;
                    align-items: flex-end;
                }
                
                #gulp-widget-input {
                    flex: 1;
                    padding: 12px 16px;
                    border: 1px solid var(--gulp-input);
                    border-radius: var(--gulp-radius);
                    font-size: 14px;
                    background: var(--gulp-bg);
                    color: var(--gulp-fg);
                    outline: none;
                    transition: border-color 0.2s;
                    font-family: inherit;
                }
                
                #gulp-widget-input:focus {
                    border-color: var(--gulp-primary);
                    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
                }
                
                #gulp-widget-input::placeholder {
                    color: var(--gulp-muted-fg);
                }
                
                #gulp-widget-send {
                    padding: 12px 20px;
                    background: var(--gulp-primary);
                    color: var(--gulp-primary-fg);
                    border: none;
                    border-radius: var(--gulp-radius);
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                    transition: opacity 0.2s, transform 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 80px;
                }
                
                #gulp-widget-send:hover:not(:disabled) {
                    opacity: 0.9;
                    transform: translateY(-1px);
                }
                
                #gulp-widget-send:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                #gulp-widget-loading {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    padding: 12px 16px;
                    background: var(--gulp-muted);
                    border: 1px solid var(--gulp-border);
                    border-radius: var(--gulp-radius);
                    color: var(--gulp-muted-fg);
                    font-size: 14px;
                }
                
                .gulp-loading-dots {
                    display: flex;
                    gap: 4px;
                }
                
                .gulp-loading-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--gulp-primary);
                    animation: bounce 1.4s infinite ease-in-out both;
                }
                
                .gulp-loading-dot:nth-child(1) {
                    animation-delay: -0.32s;
                }
                
                .gulp-loading-dot:nth-child(2) {
                    animation-delay: -0.16s;
                }
                
                @keyframes bounce {
                    0%, 80%, 100% {
                        transform: scale(0);
                    }
                    40% {
                        transform: scale(1);
                    }
                }
                
                #gulp-widget-button {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: var(--gulp-primary);
                    color: var(--gulp-primary-fg);
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
                    transition: transform 0.2s, box-shadow 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                #gulp-widget-button:hover {
                    transform: scale(1.05);
                    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2), 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                
                #gulp-widget-button:active {
                    transform: scale(0.95);
                }
            `;
            document.head.appendChild(style);
        }

        return `
            <div id="gulp-widget-container">
                <div id="gulp-widget-window">
                    <div id="gulp-widget-header">
                        <h3>Chat Assistant</h3>
                        <button id="gulp-widget-close" aria-label="Close chat">×</button>
                    </div>
                    <div id="gulp-widget-messages"></div>
                    <div id="gulp-widget-input-area">
                        <div id="gulp-widget-input-wrapper">
                            <input 
                                type="text" 
                                id="gulp-widget-input" 
                                placeholder="Type your message..."
                                aria-label="Message input"
                            />
                            <button id="gulp-widget-send" aria-label="Send message">Send</button>
                        </div>
                    </div>
                </div>
                <button id="gulp-widget-button" aria-label="Open chat">💬</button>
            </div>
        `;
    }

    // ============================================================================
    // Message Management
    // ============================================================================
    function addMessage(text, isUser = false, timestamp = null, skipSave = false) {
        const messagesContainer = document.getElementById('gulp-widget-messages');
        if (!messagesContainer) return;

        // Remove empty state if present
        const emptyState = messagesContainer.querySelector('.gulp-empty-state');
        if (emptyState) {
            emptyState.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `gulp-message ${isUser ? 'gulp-message-user' : 'gulp-message-assistant'}`;
        
        const bubble = document.createElement('div');
        bubble.className = 'gulp-message-bubble';
        
        if (isUser) {
            bubble.textContent = text;
        } else {
            bubble.innerHTML = renderMarkdown(text);
        }
        
        messageDiv.appendChild(bubble);
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Save to history (skip when rendering from history)
        if (!skipSave) {
            config.messages.push({
                text: text,
                isUser: isUser,
                timestamp: timestamp || new Date().toISOString()
            });
            saveChatHistory();
        }
    }

    function renderMessages() {
        const messagesContainer = document.getElementById('gulp-widget-messages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = '';

        if (config.messages.length === 0) {
            messagesContainer.innerHTML = '<div class="gulp-empty-state">Ask me anything! 👋</div>';
            return;
        }

        config.messages.forEach(msg => {
            addMessage(msg.text, msg.isUser, msg.timestamp, true); // skipSave = true
        });
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function showLoading() {
        const messagesContainer = document.getElementById('gulp-widget-messages');
        if (!messagesContainer) return;

        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'gulp-widget-loading';
        loadingDiv.innerHTML = `
            <div class="gulp-loading-dots">
                <div class="gulp-loading-dot"></div>
                <div class="gulp-loading-dot"></div>
                <div class="gulp-loading-dot"></div>
            </div>
            <span>Thinking...</span>
        `;
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function hideLoading() {
        const loadingDiv = document.getElementById('gulp-widget-loading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    // ============================================================================
    // API Communication
    // ============================================================================
    async function sendQuery(queryText) {
        if (config.isLoading || !queryText.trim()) {
            return;
        }

        config.isLoading = true;
        showLoading();

        try {
            // Get last 5 messages from chat history
            // Exclude the last message if it's the current user message (since it's already in query_text)
            let messagesToSend = config.messages.slice(-5);
            if (messagesToSend.length > 0 && 
                messagesToSend[messagesToSend.length - 1].isUser && 
                messagesToSend[messagesToSend.length - 1].text === queryText) {
                // Remove the last message (current user query) since it's redundant
                messagesToSend = messagesToSend.slice(0, -1);
            }
            
            const chatHistory = messagesToSend.map(msg => ({
                text: msg.text,
                isUser: msg.isUser,
                timestamp: msg.timestamp
            }));

            const response = await fetch(`${config.apiUrl}/api/v1/widget/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.token}`
                },
                body: JSON.stringify({
                    query_text: queryText,
                    session_id: config.sessionId,
                    page_url: window.location.href,
                    chat_history: chatHistory.length > 0 ? chatHistory : null
                })
            });

            hideLoading();

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status === 'success' && data.data && data.data.answer) {
                addMessage(data.data.answer, false);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            hideLoading();
            console.error('Gulp Widget Error:', error);
            addMessage('Sorry, I encountered an error. Please try again.', false);
        } finally {
            config.isLoading = false;
        }
    }

    // ============================================================================
    // Initialize Widget
    // ============================================================================
    function initWidget() {
        if (!initConfig()) {
            return;
        }

        // Inject widget HTML
        const widgetHTML = createWidgetHTML();
        document.body.insertAdjacentHTML('beforeend', widgetHTML);

        // Get elements
        const button = document.getElementById('gulp-widget-button');
        const window = document.getElementById('gulp-widget-window');
        const closeBtn = document.getElementById('gulp-widget-close');
        const input = document.getElementById('gulp-widget-input');
        const sendBtn = document.getElementById('gulp-widget-send');

        // Render existing messages
        renderMessages();

        // Toggle window
        function toggleWindow() {
            config.isOpen = !config.isOpen;
            window.style.display = config.isOpen ? 'flex' : 'none';
            button.style.display = config.isOpen ? 'none' : 'flex';
            if (config.isOpen) {
                input.focus();
            }
        }

        // Event listeners
        button.addEventListener('click', toggleWindow);
        closeBtn.addEventListener('click', toggleWindow);

        sendBtn.addEventListener('click', () => {
            const query = input.value.trim();
            if (query) {
                addMessage(query, true);
                input.value = '';
                sendQuery(query);
            }
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
    } else {
        initWidget();
    }
})();
