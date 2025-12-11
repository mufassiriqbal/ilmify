/**
 * Ilmify - RAG Chatbot
 * Retrieval-Augmented Generation for answering questions from PDFs
 */

// Knowledge base cache
let knowledgeBase = [];
let resourcesCache = [];
let isIndexing = false;

// PDF.js worker (loaded from CDN for offline use, will be cached)
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Load PDF.js library
async function loadPDFJS() {
    if (window.pdfjsLib) return true;
    
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = PDFJS_CDN;
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
            resolve(true);
        };
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
}

// Extract text from PDF
async function extractPDFText(pdfUrl, maxPages = 10) {
    try {
        if (!window.pdfjsLib) {
            const loaded = await loadPDFJS();
            if (!loaded) return '';
        }
        
        const pdf = await window.pdfjsLib.getDocument(pdfUrl).promise;
        const numPages = Math.min(pdf.numPages, maxPages);
        let fullText = '';
        
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }
        
        return fullText;
    } catch (e) {
        console.log('PDF extraction failed:', e);
        return '';
    }
}

// Build knowledge base from resources
async function buildKnowledgeBase() {
    if (isIndexing) return;
    isIndexing = true;
    
    // Check localStorage cache first
    const cached = localStorage.getItem('ilmify_knowledge_v2');
    if (cached) {
        try {
            const data = JSON.parse(cached);
            // Check if cache is less than 1 hour old
            if (Date.now() - data.timestamp < 3600000) {
                knowledgeBase = data.knowledge;
                isIndexing = false;
                return;
            }
        } catch (e) {}
    }
    
    // Load resources metadata
    try {
        const path = window.location.pathname.includes('/portal/') 
            ? 'data/metadata.json' 
            : 'portal/data/metadata.json';
        const response = await fetch(path);
        if (response.ok) {
            resourcesCache = await response.json();
        }
    } catch (e) {
        isIndexing = false;
        return;
    }
    
    // Extract text from PDFs (textbooks and health guides)
    const pdfResources = resourcesCache.filter(r => 
        r.format === 'pdf' && (r.category === 'textbooks' || r.category === 'health')
    );
    
    for (const resource of pdfResources.slice(0, 5)) { // Limit to 5 PDFs
        try {
            const prefix = window.location.pathname.includes('/portal/') ? '../' : '';
            const pdfUrl = prefix + resource.filepath;
            const text = await extractPDFText(pdfUrl, 15);
            
            if (text.length > 100) {
                // Split into chunks for better retrieval
                const chunks = splitIntoChunks(text, 500);
                chunks.forEach((chunk, idx) => {
                    knowledgeBase.push({
                        id: `${resource.id}_${idx}`,
                        title: resource.title,
                        category: resource.category,
                        content: chunk,
                        keywords: extractKeywords(chunk)
                    });
                });
            }
        } catch (e) {
            console.log('Failed to process:', resource.title);
        }
    }
    
    // Cache knowledge base
    if (knowledgeBase.length > 0) {
        localStorage.setItem('ilmify_knowledge_v2', JSON.stringify({
            timestamp: Date.now(),
            knowledge: knowledgeBase
        }));
    }
    
    isIndexing = false;
}

// Split text into chunks
function splitIntoChunks(text, chunkSize) {
    const sentences = text.split(/[.!?]+/);
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += ' ' + sentence;
        }
    }
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}

// Extract keywords from text
function extractKeywords(text) {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those', 'it', 'its', 'as', 'from', 'can', 'may', 'which', 'who', 'what', 'when', 'where', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'same', 'than', 'too', 'very'];
    
    return text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));
}

// Search knowledge base using TF-IDF-like scoring
function searchKnowledge(query, topK = 3) {
    const queryKeywords = extractKeywords(query);
    if (queryKeywords.length === 0) return [];
    
    const scored = knowledgeBase.map(item => {
        let score = 0;
        const contentLower = item.content.toLowerCase();
        
        // Keyword matching
        for (const keyword of queryKeywords) {
            if (item.keywords.includes(keyword)) score += 2;
            if (contentLower.includes(keyword)) score += 1;
            // Exact phrase bonus
            if (contentLower.includes(query.toLowerCase())) score += 5;
        }
        
        // Title matching bonus
        const titleLower = item.title.toLowerCase();
        for (const keyword of queryKeywords) {
            if (titleLower.includes(keyword)) score += 3;
        }
        
        return { ...item, score };
    });
    
    return scored
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}

// Generate answer from retrieved context
function generateAnswer(query, contexts) {
    if (contexts.length === 0) return null;
    
    const topContext = contexts[0];
    let answer = '';
    
    // Find relevant sentences
    const sentences = topContext.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const queryWords = extractKeywords(query);
    
    const relevantSentences = sentences.filter(sentence => {
        const lower = sentence.toLowerCase();
        return queryWords.some(word => lower.includes(word));
    }).slice(0, 3);
    
    if (relevantSentences.length > 0) {
        answer = relevantSentences.join('. ').trim();
        if (!answer.endsWith('.')) answer += '.';
    } else {
        // Use first few sentences as context
        answer = sentences.slice(0, 2).join('. ').trim();
        if (!answer.endsWith('.')) answer += '.';
    }
    
    return {
        answer: answer,
        source: topContext.title,
        category: topContext.category
    };
}

// Get smart response with RAG
function getSmartResponse(input) {
    const lower = input.toLowerCase();
    
    // Greetings
    if (lower.match(/^(hi|hello|hey|assalam|salam)/)) {
        return "👋 Hello! I can help you find information from textbooks and health guides. Ask me any question!";
    }
    
    // Thanks
    if (lower.match(/(thank|shukriya|thanks)/)) {
        return "You're welcome! 😊 Happy learning!";
    }
    
    // Goodbye  
    if (lower.match(/(bye|goodbye|khuda hafiz)/)) {
        return "Goodbye! Come back anytime! 📚";
    }
    
    // Help
    if (lower.match(/^help$/i)) {
        return "I can answer questions from:<br><br>📚 <strong>Textbooks</strong> - Ask about any topic<br>🏥 <strong>Health Guides</strong> - Ask health questions<br><br>Example: 'What is photosynthesis?' or 'How to stay healthy?'";
    }
    
    // List resources
    if (lower.match(/(show|list|what).*(textbook|resource|video)/)) {
        return formatResourceList(resourcesCache.slice(0, 5));
    }
    
    // Try RAG search
    const contexts = searchKnowledge(input);
    if (contexts.length > 0) {
        const result = generateAnswer(input, contexts);
        if (result && result.answer.length > 20) {
            const icon = result.category === 'health' ? '🏥' : '📚';
            return `${result.answer}<br><br><em>${icon} Source: ${result.source}</em>`;
        }
    }
    
    // Fallback: search resources by title
    const matchedResources = resourcesCache.filter(r => {
        const titleLower = r.title.toLowerCase();
        return extractKeywords(input).some(kw => titleLower.includes(kw));
    });
    
    if (matchedResources.length > 0) {
        return formatResourceList(matchedResources.slice(0, 3)) + 
               "<br><br><em>Try asking a specific question about these resources!</em>";
    }
    
    // Default
    return "I couldn't find specific information about that. Try asking:<br>• Questions from textbooks<br>• Health-related questions<br>• 'Show textbooks' to see available resources";
}

// Format resource list
function formatResourceList(resources) {
    if (!resources || resources.length === 0) return "No resources found.";
    
    let html = `<strong>Found ${resources.length} resource(s):</strong><br><br>`;
    resources.forEach(r => {
        const icon = r.category === 'textbooks' ? '📚' : 
                     r.category === 'videos' ? '🎬' : 
                     r.category === 'health' ? '🏥' : '📄';
        html += `${icon} ${r.title}<br>`;
    });
    return html;
}

// Open chatbot
function openChatbot() {
    const modal = document.getElementById('chatModal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('chatInput')?.focus();
        
        const messages = document.getElementById('chatMessages');
        if (messages && messages.children.length === 0) {
            addBotMessage("👋 Hello! I'm Ilmify Assistant with RAG.<br><br>I can answer questions from your textbooks and health guides. Try asking something!");
            
            // Start building knowledge base in background
            buildKnowledgeBase();
        }
    }
}

// Close chatbot
function closeChatbot() {
    const modal = document.getElementById('chatModal');
    if (modal) modal.style.display = 'none';
}

// Toggle chatbot
function toggleChatbot() {
    const modal = document.getElementById('chatModal');
    if (modal) {
        modal.style.display === 'flex' ? closeChatbot() : openChatbot();
    }
}

// Add user message
function addUserMessage(text) {
    const messages = document.getElementById('chatMessages');
    if (messages) {
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; justify-content: flex-end; margin-bottom: 12px;';
        div.innerHTML = `<div style="background: #0A1F44; color: white; padding: 10px 14px; border-radius: 18px 18px 4px 18px; max-width: 80%;">${escapeHtml(text)}</div>`;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }
}

// Add bot message
function addBotMessage(text) {
    const messages = document.getElementById('chatMessages');
    if (messages) {
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; justify-content: flex-start; margin-bottom: 12px; gap: 8px;';
        div.innerHTML = `<span style="font-size: 20px;">🤖</span><div style="background: white; padding: 10px 14px; border-radius: 18px 18px 18px 4px; max-width: 80%; box-shadow: 0 1px 2px rgba(0,0,0,0.1); line-height: 1.5;">${text}</div>`;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }
}

// Show typing indicator
function showTyping() {
    const messages = document.getElementById('chatMessages');
    if (messages) {
        const div = document.createElement('div');
        div.id = 'typingIndicator';
        div.style.cssText = 'display: flex; justify-content: flex-start; margin-bottom: 12px; gap: 8px;';
        div.innerHTML = `<span style="font-size: 20px;">🤖</span><div style="background: white; padding: 10px 14px; border-radius: 18px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);"><em>Searching...</em></div>`;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }
}

function hideTyping() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Send message
async function sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    
    const text = input.value.trim();
    if (!text) return;
    
    addUserMessage(text);
    input.value = '';
    
    showTyping();
    
    // Small delay for UX
    await new Promise(r => setTimeout(r, 500));
    
    const response = getSmartResponse(text);
    
    hideTyping();
    addBotMessage(response);
}

// Quick question
function askQuickQuestion(question) {
    const input = document.getElementById('chatInput');
    if (input) {
        input.value = question;
        sendMessage();
    }
}

// Handle Enter key
function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
}

// Export to window
window.openChatbot = openChatbot;
window.closeChatbot = closeChatbot;
window.toggleChatbot = toggleChatbot;
window.sendMessage = sendMessage;
window.askQuickQuestion = askQuickQuestion;
window.handleChatKeypress = handleChatKeypress;
window.sendChatMessage = sendMessage;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Pre-load resources metadata
    const path = window.location.pathname.includes('/portal/') 
        ? 'data/metadata.json' 
        : 'portal/data/metadata.json';
    fetch(path).then(r => r.json()).then(data => {
        resourcesCache = data;
    }).catch(() => {});
    
    const sendBtn = document.getElementById('chatSendBtn');
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    
    const chatInput = document.getElementById('chatInput');
    if (chatInput) chatInput.addEventListener('keypress', handleChatKeypress);
});
