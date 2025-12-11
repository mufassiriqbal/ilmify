/**
 * Ilmify - Advanced AI Assistant
 * Smart chatbot with PDF understanding, dictionary integration & general conversation
 */

(function() {
    'use strict';

    // Knowledge base
    let knowledgeBase = [];
    let resourcesCache = [];
    let isIndexing = false;
    let pdfLoaded = false;
    let indexLoaded = false;

    // Common responses for general chat
    const GENERAL_RESPONSES = {
        greetings: [
            "👋 Hello! I'm your Ilmify learning assistant. How can I help you today?",
            "Hi there! 📚 Ready to learn something new?",
            "Assalam o Alaikum! 🌟 What would you like to know?",
            "Hello! I'm here to help with your studies, health questions, or word definitions!"
        ],
        thanks: [
            "You're welcome! 😊 Happy to help!",
            "خوشی ہوئی! (My pleasure!) Keep learning! 📖",
            "Anytime! Feel free to ask more questions!",
            "Glad I could help! 🌟"
        ],
        goodbye: [
            "Goodbye! Keep learning! 📚",
            "خدا حافظ! Come back anytime!",
            "See you later! Happy studying! 🎓",
            "Bye! Remember: knowledge is power! 💪"
        ],
        howAreYou: [
            "I'm doing great, thank you for asking! 😊 How can I assist you with your studies?",
            "I'm fine! Ready to help you learn. What topic interests you?",
            "All good here! 🌟 Let's explore some knowledge together!"
        ],
        whoAreYou: [
            "I'm Ilmify Assistant! 🤖 I'm here to help students learn by:<br>• Answering questions from textbooks 📚<br>• Explaining health topics 🏥<br>• Defining English words 📖<br>• Having helpful conversations!",
            "I'm your AI study buddy! I can search through educational content, define words, and chat about learning topics. Ask me anything!"
        ],
        aboutUs: [
            `<div class="about-ilmify">
                <h3>🌟 About Ilmify</h3>
                <p><strong>Ilmify</strong> (علمify) - where "Ilm" means knowledge in Urdu/Arabic - is an offline educational platform designed to bring quality education to underserved and rural areas.</p>
                
                <h4>👨‍💻 Founder</h4>
                <p><strong>Mufassir Iqbal</strong> - Final Year Computer Science Student</p>
                <p>Passionate about using technology to bridge the educational gap in Pakistan.</p>
                
                <h4>🎯 Our Vision</h4>
                <p>To make quality education accessible to every student, regardless of their internet connectivity or location.</p>
                
                <h4>🚀 Our Goals</h4>
                <ul>
                    <li>📚 Provide free offline access to textbooks & learning materials</li>
                    <li>🏥 Share essential health & hygiene information</li>
                    <li>🎬 Deliver educational video content without internet</li>
                    <li>🌐 Bridge the digital divide in education</li>
                    <li>💡 Empower students in remote areas</li>
                </ul>
                
                <h4>💫 Why Ilmify?</h4>
                <p>Many students in rural Pakistan lack reliable internet access. Ilmify works completely offline through a local WiFi hotspot, ensuring education reaches everyone!</p>
                
                <p class="about-tagline"><em>"تعلیم جو آپ تک پہنچے" - Education That Reaches You</em></p>
            </div>`
        ],
        jokes: [
            "Why did the student eat his homework? Because his teacher told him it was a piece of cake! 🎂😄",
            "What do you call a sleeping dinosaur? A dino-snore! 🦕😴",
            "Why did the math book look sad? Because it had too many problems! 📐😅",
            "What's a computer's favorite snack? Microchips! 💻🍪"
        ],
        motivational: [
            "\"Education is the most powerful weapon you can use to change the world.\" - Nelson Mandela 🌟",
            "\"The beautiful thing about learning is that no one can take it away from you.\" - B.B. King 📚",
            "Keep going! Every expert was once a beginner. You're doing great! 💪",
            "\"علم حاصل کرو، چاہے چین جانا پڑے\" - Seek knowledge even if you have to go to China! 🎓"
        ],
        unknown: [
            "Hmm, I'm not sure about that. Try asking about:<br>• School subjects (science, math, etc.)<br>• Health topics<br>• Word definitions (say 'define [word]')",
            "I don't have specific info on that, but I can help with textbook questions, health info, or word meanings!",
            "Let me think... I'm better at educational topics. Try asking about a school subject or say 'define' followed by a word!"
        ]
    };

    // Subject-specific knowledge (built-in fallback)
    const SUBJECT_KNOWLEDGE = {
        photosynthesis: "🌱 <strong>Photosynthesis</strong> is the process by which plants make their own food using sunlight, water, and carbon dioxide.<br><br><strong>Formula:</strong> 6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂<br><br>Plants absorb sunlight through chlorophyll in their leaves, take in CO₂ from air and water from soil, then produce glucose (sugar) and release oxygen.",
        
        respiration: "🫁 <strong>Respiration</strong> is the process of breaking down glucose to release energy.<br><br><strong>Formula:</strong> C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + Energy<br><br>It happens in all living cells and is the opposite of photosynthesis!",
        
        "water cycle": "💧 <strong>Water Cycle</strong> (Hydrological Cycle):<br><br>1. <strong>Evaporation</strong> - Sun heats water, turns to vapor<br>2. <strong>Condensation</strong> - Vapor cools, forms clouds<br>3. <strong>Precipitation</strong> - Water falls as rain/snow<br>4. <strong>Collection</strong> - Water gathers in oceans, rivers<br><br>This cycle repeats continuously!",
        
        gravity: "🌍 <strong>Gravity</strong> is a force that pulls objects toward each other.<br><br>• Earth's gravity keeps us on the ground<br>• The Moon's gravity causes tides<br>• Gravity = 9.8 m/s² on Earth<br><br>Newton discovered it when an apple fell on his head! 🍎",
        
        cell: "🔬 <strong>Cell</strong> is the basic unit of life.<br><br><strong>Types:</strong><br>• Plant cells - have cell wall, chloroplasts<br>• Animal cells - no cell wall<br><br><strong>Parts:</strong> Nucleus (brain), Mitochondria (powerhouse), Cell membrane (protection)",
        
        pakistan: "🇵🇰 <strong>Pakistan</strong><br><br>• Capital: Islamabad<br>• Largest city: Karachi<br>• Languages: Urdu (national), English (official)<br>• Founded: August 14, 1947<br>• Founder: Quaid-e-Azam Muhammad Ali Jinnah<br>• National poet: Allama Iqbal",
        
        "math formula": "📐 <strong>Important Math Formulas:</strong><br><br>• Area of circle: πr²<br>• Circumference: 2πr<br>• Pythagorean theorem: a² + b² = c²<br>• Area of triangle: ½ × base × height<br>• Quadratic formula: x = (-b ± √(b²-4ac)) / 2a",
        
        "health tip": "🏥 <strong>Health Tips for Students:</strong><br><br>• Drink 8 glasses of water daily 💧<br>• Sleep 8-9 hours at night 😴<br>• Eat fruits and vegetables 🍎🥬<br>• Exercise 30 minutes daily 🏃<br>• Wash hands frequently 🧼<br>• Take breaks while studying 📚",

        "newton law": "⚡ <strong>Newton's Laws of Motion:</strong><br><br><strong>1st Law (Inertia):</strong> An object stays at rest or in motion unless acted upon by a force.<br><br><strong>2nd Law:</strong> F = ma (Force = Mass × Acceleration)<br><br><strong>3rd Law:</strong> For every action, there is an equal and opposite reaction.",

        atom: "⚛️ <strong>Atom</strong> is the smallest unit of matter.<br><br><strong>Parts:</strong><br>• Protons (+) in nucleus<br>• Neutrons (neutral) in nucleus<br>• Electrons (-) orbit around<br><br>Everything around us is made of atoms!",

        "solar system": "🌌 <strong>Solar System</strong><br><br><strong>Planets (from Sun):</strong><br>1. Mercury 2. Venus 3. Earth 4. Mars<br>5. Jupiter 6. Saturn 7. Uranus 8. Neptune<br><br>🌞 The Sun is a star at the center<br>🌍 Earth is the only planet with life (that we know!)",

        electricity: "⚡ <strong>Electricity</strong> is the flow of electrons.<br><br><strong>Key concepts:</strong><br>• Voltage (V) - electrical pressure<br>• Current (I) - flow of electrons (Amperes)<br>• Resistance (R) - opposition to flow (Ohms)<br><br><strong>Ohm's Law:</strong> V = I × R"
    };

    // Load pre-built knowledge index (primary method - fast!)
    async function loadKnowledgeIndex() {
        if (indexLoaded || isIndexing) return;
        isIndexing = true;

        try {
            // Try loading pre-built index first (created by build_knowledge_index.py)
            const indexPath = window.location.pathname.includes('/portal/') 
                ? 'data/knowledge_index.json' : 'portal/data/knowledge_index.json';
            
            const res = await fetch(indexPath);
            if (res.ok) {
                const index = await res.json();
                knowledgeBase = index.entries || [];
                indexLoaded = true;
                pdfLoaded = true;
                console.log(`✅ Loaded pre-built knowledge index: ${knowledgeBase.length} chunks (v${index.version})`);
                isIndexing = false;
                return true;
            }
        } catch (e) {
            console.log('Pre-built index not found, falling back to PDF extraction');
        }

        // Fallback: build from PDFs if no pre-built index exists
        await buildKnowledgeBaseFromPDFs();
        isIndexing = false;
        return false;
    }

    // PDF.js loading
    async function loadPDFJS() {
        if (window.pdfjsLib) return true;
        return new Promise(resolve => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve(true);
            };
            script.onerror = () => resolve(false);
            document.head.appendChild(script);
        });
    }

    // Extract text from PDF (fallback if no pre-built index)
    async function extractPDFText(pdfUrl, maxPages = 20) {
        try {
            if (!window.pdfjsLib) {
                if (!(await loadPDFJS())) return '';
            }
            const pdf = await window.pdfjsLib.getDocument(pdfUrl).promise;
            const numPages = Math.min(pdf.numPages, maxPages);
            let text = '';
            
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + '\n\n';
            }
            return text;
        } catch (e) {
            console.log('PDF extraction error:', e);
            return '';
        }
    }

    // Fallback: Build knowledge base from PDFs directly (slower, used only if no pre-built index)
    async function buildKnowledgeBaseFromPDFs() {
        if (pdfLoaded) return;

        // Try cache first
        try {
            const cached = localStorage.getItem('ilmify_kb_v4');
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() - data.timestamp < 7200000) { // 2 hour cache
                    knowledgeBase = data.knowledge;
                    pdfLoaded = true;
                    console.log('Loaded cached knowledge:', knowledgeBase.length, 'chunks');
                    return;
                }
            }
        } catch (e) {}

        // Load resources
        try {
            const path = window.location.pathname.includes('/portal/') 
                ? 'data/metadata.json' : 'portal/data/metadata.json';
            const res = await fetch(path);
            if (res.ok) resourcesCache = await res.json();
        } catch (e) {
            return;
        }

        // Process PDFs
        const pdfs = resourcesCache.filter(r => r.format === 'pdf').slice(0, 8);
        
        for (const resource of pdfs) {
            try {
                const prefix = window.location.pathname.includes('/portal/') ? '../' : '';
                const text = await extractPDFText(prefix + resource.filepath, 25);
                
                if (text.length > 200) {
                    const chunks = splitText(text, 600);
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
                console.log('Failed:', resource.title);
            }
        }

        // Cache it
        if (knowledgeBase.length > 0) {
            try {
                localStorage.setItem('ilmify_kb_v4', JSON.stringify({
                    timestamp: Date.now(),
                    knowledge: knowledgeBase
                }));
            } catch (e) {}
        }

        pdfLoaded = true;
        console.log('Built knowledge base from PDFs:', knowledgeBase.length, 'chunks');
    }

    // Legacy function name for compatibility
    async function buildKnowledgeBase() {
        await loadKnowledgeIndex();
    }

    function splitText(text, size) {
        const sentences = text.split(/[.!?।]+/);
        const chunks = [];
        let current = '';

        for (const s of sentences) {
            if ((current + s).length > size && current) {
                chunks.push(current.trim());
                current = s;
            } else {
                current += ' ' + s;
            }
        }
        if (current.trim()) chunks.push(current.trim());
        return chunks;
    }

    function extractKeywords(text) {
        const stop = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','is','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','this','that','these','those','it','its','as','from','can','may','which','who','what','when','where','how','all','each','every','both','few','more','most','other','some','such','no','not','only','same','than','too','very','just','also','into','over','after','before','between','under','above','below','about','there','here']);
        
        return text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !stop.has(w));
    }

    // Search knowledge base (local fallback)
    function searchKnowledge(query, topK = 5) {
        const keywords = extractKeywords(query);
        if (!keywords.length) return [];

        const scored = knowledgeBase.map(item => {
            let score = 0;
            const content = item.content.toLowerCase();
            const title = item.title.toLowerCase();

            for (const kw of keywords) {
                if (item.keywords && item.keywords.includes(kw)) score += 3;
                if (content.includes(kw)) score += 2;
                if (title.includes(kw)) score += 4;
            }

            // Exact phrase bonus
            if (content.includes(query.toLowerCase())) score += 10;

            return { ...item, score };
        });

        return scored.filter(i => i.score > 2).sort((a, b) => b.score - a.score).slice(0, topK);
    }

    // Semantic search using vector embeddings API
    async function semanticSearch(query, topK = 5) {
        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, top_k: topK })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.results && data.results.length > 0) {
                    console.log(`🔍 Semantic search found ${data.results.length} results for: "${query}"`);
                    // Log top result for debugging
                    if (data.results[0]) {
                        console.log(`   Top result: ${data.results[0].title} (score: ${data.results[0].score})`);
                    }
                    return data.results;
                }
            }
        } catch (e) {
            console.log('Semantic search unavailable:', e.message);
        }
        
        // Fallback to local keyword search
        console.log('Using local keyword search as fallback');
        return searchKnowledge(query, topK);
    }

    // Generate answer from context - improved version
    function generateAnswer(query, contexts) {
        if (!contexts.length) return null;

        const queryLower = query.toLowerCase();
        const keywords = extractKeywords(query);
        
        // Combine content from top results
        let combinedContent = '';
        const sources = new Set();
        
        for (const ctx of contexts.slice(0, 3)) {
            if (ctx.content) {
                combinedContent += ' ' + ctx.content;
                sources.add(ctx.title);
            }
        }
        
        // Split into sentences
        const sentences = combinedContent.split(/[.!?।]+/)
            .map(s => s.trim())
            .filter(s => s.length > 20);
        
        // Score sentences by relevance
        const scoredSentences = sentences.map(sentence => {
            const lower = sentence.toLowerCase();
            let score = 0;
            
            // Keyword matches
            for (const kw of keywords) {
                if (lower.includes(kw)) score += 2;
            }
            
            // Exact phrase match
            if (lower.includes(queryLower)) score += 10;
            
            // Question word context (what, how, why, etc.)
            if (/what is|definition|meaning|explain/i.test(queryLower) && 
                /is |are |means |refers to|defined as/i.test(lower)) {
                score += 3;
            }
            
            // Longer sentences with matches are usually more informative
            if (score > 0 && sentence.length > 50) score += 1;
            
            return { sentence, score };
        });
        
        // Get top sentences
        const relevant = scoredSentences
            .filter(s => s.score > 1)
            .sort((a, b) => b.score - a.score)
            .slice(0, 4)
            .map(s => s.sentence);
        
        // Build answer
        let answer = '';
        if (relevant.length > 0) {
            answer = relevant.join('. ').trim();
        } else if (sentences.length > 0) {
            // Use first few sentences as context
            answer = sentences.slice(0, 3).join('. ').trim();
        }

        if (!answer) return null;
        
        // Clean up answer
        answer = answer.replace(/\s+/g, ' ').trim();
        if (!answer.endsWith('.') && !answer.endsWith('!') && !answer.endsWith('?')) {
            answer += '.';
        }

        return {
            text: answer,
            source: Array.from(sources).join(', '),
            category: contexts[0].category,
            score: contexts[0].score
        };
    }

    // Random pick from array
    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // Main response handler
    async function getResponse(input) {
        const lower = input.toLowerCase().trim();
        const words = lower.split(/\s+/);

        // Greetings
        if (/^(hi|hello|hey|salam|assalam|aoa|helo|hii+)/.test(lower)) {
            return pick(GENERAL_RESPONSES.greetings);
        }

        // Thanks
        if (/(thank|shukriya|thanks|thx|thnx|jazak)/i.test(lower)) {
            return pick(GENERAL_RESPONSES.thanks);
        }

        // Goodbye
        if (/(bye|goodbye|khuda hafiz|allah hafiz|see you|later)/i.test(lower)) {
            return pick(GENERAL_RESPONSES.goodbye);
        }

        // How are you
        if (/(how are you|how r u|kaise ho|kaisa hai|whats up|wassup)/i.test(lower)) {
            return pick(GENERAL_RESPONSES.howAreYou);
        }

        // Who are you
        if (/(who are you|what are you|your name|kaun ho|kon ho|tumhara naam)/i.test(lower)) {
            return pick(GENERAL_RESPONSES.whoAreYou);
        }

        // About Ilmify / About Us
        if (/(about ilmify|about us|about you|about this|ilmify kya|founder|vision|goal|mission|who made|who created|developer|mufassir)/i.test(lower)) {
            return pick(GENERAL_RESPONSES.aboutUs);
        }

        // Joke request
        if (/(tell.*joke|funny|make me laugh|joke sunao)/i.test(lower)) {
            return pick(GENERAL_RESPONSES.jokes);
        }

        // Motivation
        if (/(motivat|inspire|encourage|quote|himmat)/i.test(lower)) {
            return pick(GENERAL_RESPONSES.motivational);
        }

        // Help
        if (/^(help|madad|مدد)$/i.test(lower)) {
            return "🤖 <strong>I can help you with:</strong><br><br>" +
                "📚 <strong>Textbook Questions</strong> - Ask about any topic<br>" +
                "🏥 <strong>Health Info</strong> - Health and wellness questions<br>" +
                "📖 <strong>Dictionary</strong> - Say 'define [word]' or 'meaning of [word]'<br>" +
                "💬 <strong>General Chat</strong> - I can also have a conversation!<br><br>" +
                "<em>Try: 'What is photosynthesis?' or 'Define education' or 'Tell me a joke'</em>";
        }

        // Time/Date
        if (/(what time|what.*date|today|aaj)/i.test(lower)) {
            const now = new Date();
            return `🕐 It's ${now.toLocaleTimeString()} on ${now.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
        }

        // Calculator (simple math)
        const mathMatch = lower.match(/(?:what is|calculate|solve|whats)\s*([\d\s+\-*/().]+)/);
        if (mathMatch) {
            try {
                const expr = mathMatch[1].trim();
                if (/^[\d\s+\-*/().]+$/.test(expr)) {
                    const result = eval(expr);
                    return `🔢 ${expr} = <strong>${result}</strong>`;
                }
            } catch (e) {}
        }

        // Dictionary lookup
        if (/(define|meaning|definition|what does.*mean|matlab|معنی)/i.test(lower)) {
            return await handleDictionary(input);
        }

        // Check built-in subject knowledge first (for common topics)
        for (const [key, answer] of Object.entries(SUBJECT_KNOWLEDGE)) {
            if (lower.includes(key)) {
                return answer;
            }
        }

        // Search PDFs using semantic search (vector embeddings)
        console.log(`🔍 Searching for: "${input}"`);
        const contexts = await semanticSearch(input, 8);
        
        if (contexts.length > 0) {
            console.log(`📚 Found ${contexts.length} results from PDFs`);
            const result = generateAnswer(input, contexts);
            
            if (result && result.text.length > 40) {
                const icon = result.category === 'health' || result.category === 'health-guides' ? '🏥' : '📚';
                const scoreText = result.score ? ` (${Math.round(result.score * 100)}% relevant)` : '';
                
                let response = `📖 <strong>From your resources:</strong><br><br>${result.text}`;
                response += `<br><br><em>${icon} Source: ${result.source}${scoreText}</em>`;
                
                return response;
            }
        }

        // Also try local knowledge base search as backup
        if (knowledgeBase.length > 0) {
            const localResults = searchKnowledge(input, 5);
            if (localResults.length > 0) {
                const result = generateAnswer(input, localResults);
                if (result && result.text.length > 40) {
                    const icon = result.category === 'health' || result.category === 'health-guides' ? '🏥' : '📚';
                    return `📖 ${result.text}<br><br><em>${icon} Source: ${result.source}</em>`;
                }
            }
        }

        // Try dictionary as fallback for single words
        if (words.length <= 2 && words[0].length > 2) {
            const dictResult = await handleDictionary(`define ${words[0]}`);
            if (!dictResult.includes("couldn't find")) {
                return dictResult;
            }
        }

        // Resource list
        if (/(show|list|what).*(textbook|resource|book|video|pdf)/i.test(lower)) {
            return formatResources(resourcesCache.slice(0, 6));
        }

        // Specific subjects
        if (/(science|physics|chemistry|biology|math|english|urdu|pakistan|history|geography)/i.test(lower)) {
            const matches = resourcesCache.filter(r => 
                r.title.toLowerCase().includes(lower.match(/(science|physics|chemistry|biology|math|english|urdu|pakistan|history|geography)/i)[0])
            );
            if (matches.length) {
                return `📚 I found these resources about that topic:<br><br>${formatResources(matches.slice(0, 4))}<br><br>Ask me a specific question from these subjects!`;
            }
        }

        // Default fallback with suggestions
        return `${pick(GENERAL_RESPONSES.unknown)}<br><br>💡 <strong>Tip:</strong> Try asking specific questions like:<br>• "What is healthy eating?"<br>• "Explain photosynthesis"<br>• "Define education"`;
    }

    // Dictionary handler
    async function handleDictionary(query) {
        if (!window.IlmifyDictionary) {
            return "📖 Dictionary is loading... Please try again in a moment.";
        }

        let word = query.replace(/(define|meaning|definition|what does|what is|mean|the word|of|matlab|معنی)/gi, '').trim();
        word = word.replace(/[?.,!'"]/g, '').trim();

        if (!word) {
            return "📖 Which word would you like me to define? Say 'define [word]'";
        }

        try {
            const results = await window.IlmifyDictionary.search(word);
            
            if (!results || results.length === 0) {
                return `📖 Sorry, I couldn't find "<strong>${word}</strong>" in the dictionary. Check the spelling or try a different word.`;
            }

            const entry = results[0];
            let html = `📖 <strong>${entry.word}</strong> <em>(${entry.primaryPart})</em><br><br>`;

            entry.meanings.slice(0, 3).forEach((m, i) => {
                html += `<strong>${i + 1}.</strong> ${m.definition}<br>`;
                if (m.example) html += `   <em>Example: "${m.example}"</em><br>`;
                if (m.synonyms && m.synonyms.length) html += `   <em>Synonyms: ${m.synonyms.slice(0, 4).join(', ')}</em><br>`;
                html += '<br>';
            });

            html += `<strong>اردو:</strong> ${entry.urdu || 'ترجمہ دستیاب نہیں'}`;

            if (results.length > 1) {
                html += `<br><br><em>Similar words: ${results.slice(1, 5).map(r => r.word).join(', ')}</em>`;
            }

            return html;
        } catch (e) {
            console.error('Dictionary error:', e);
            return "📖 Dictionary lookup failed. Please try again.";
        }
    }

    // Format resources list
    function formatResources(resources) {
        if (!resources || !resources.length) return "No resources found.";
        
        let html = '';
        resources.forEach(r => {
            const icon = r.category === 'textbooks' ? '📕' : 
                        r.category === 'videos' ? '🎬' : 
                        r.category === 'health' ? '🏥' : '📄';
            html += `${icon} ${r.title}<br>`;
        });
        return html;
    }

    // UI Functions
    function openChatbot() {
        const modal = document.getElementById('chatModal');
        if (modal) {
            modal.style.display = 'flex';
            document.getElementById('chatInput')?.focus();

            const messages = document.getElementById('chatMessages');
            if (messages && messages.children.length === 0) {
                addBotMessage("👋 <strong>Assalam o Alaikum!</strong> I'm your Ilmify Assistant.<br><br>" +
                    "I can help with:<br>" +
                    "📚 Questions from textbooks<br>" +
                    "🏥 Health information<br>" +
                    "📖 English word definitions<br>" +
                    "💬 General conversation<br><br>" +
                    "<em>Try asking something or say 'help' for more info!</em>");
                
                buildKnowledgeBase();
            }
        }
    }

    function closeChatbot() {
        const modal = document.getElementById('chatModal');
        if (modal) modal.style.display = 'none';
    }

    function toggleChatbot() {
        const modal = document.getElementById('chatModal');
        if (modal) {
            modal.style.display === 'flex' ? closeChatbot() : openChatbot();
        }
    }

    function addUserMessage(text) {
        const messages = document.getElementById('chatMessages');
        if (messages) {
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; justify-content: flex-end; margin-bottom: 12px;';
            div.innerHTML = `<div style="background: linear-gradient(135deg, #0A1F44, #1a3a6e); color: white; padding: 10px 16px; border-radius: 18px 18px 4px 18px; max-width: 80%; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${escapeHtml(text)}</div>`;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }
    }

    function addBotMessage(text) {
        const messages = document.getElementById('chatMessages');
        if (messages) {
            const div = document.createElement('div');
            div.style.cssText = 'display: flex; justify-content: flex-start; margin-bottom: 12px; gap: 8px; align-items: flex-start;';
            div.innerHTML = `<span style="font-size: 24px; line-height: 1;">🤖</span><div style="background: white; padding: 12px 16px; border-radius: 18px 18px 18px 4px; max-width: 85%; box-shadow: 0 2px 8px rgba(0,0,0,0.08); line-height: 1.6;">${text}</div>`;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }
    }

    function showTyping() {
        const messages = document.getElementById('chatMessages');
        if (messages) {
            const div = document.createElement('div');
            div.id = 'typingIndicator';
            div.style.cssText = 'display: flex; justify-content: flex-start; margin-bottom: 12px; gap: 8px; align-items: center;';
            div.innerHTML = `<span style="font-size: 24px;">🤖</span><div style="background: white; padding: 12px 16px; border-radius: 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);"><span class="typing-dots">Thinking<span>.</span><span>.</span><span>.</span></span></div>`;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }
    }

    function hideTyping() {
        document.getElementById('typingIndicator')?.remove();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function sendMessage() {
        const input = document.getElementById('chatInput');
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        addUserMessage(text);
        input.value = '';

        showTyping();
        await new Promise(r => setTimeout(r, 300 + Math.random() * 400));

        const response = await getResponse(text);
        
        hideTyping();
        addBotMessage(response);
    }

    function askQuickQuestion(question) {
        const input = document.getElementById('chatInput');
        if (input) {
            input.value = question;
            sendMessage();
        }
    }

    function handleChatKeypress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    // Add typing animation CSS
    const style = document.createElement('style');
    style.textContent = `
        .typing-dots span {
            animation: blink 1.4s infinite;
            animation-fill-mode: both;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink {
            0%, 80%, 100% { opacity: 0; }
            40% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Export functions
    window.openChatbot = openChatbot;
    window.closeChatbot = closeChatbot;
    window.toggleChatbot = toggleChatbot;
    window.sendMessage = sendMessage;
    window.askQuickQuestion = askQuickQuestion;
    window.handleChatKeypress = handleChatKeypress;
    window.sendChatMessage = sendMessage;

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        const path = window.location.pathname.includes('/portal/') 
            ? 'data/metadata.json' : 'portal/data/metadata.json';
        
        fetch(path).then(r => r.json()).then(data => {
            resourcesCache = data;
        }).catch(() => {});

        document.getElementById('chatSendBtn')?.addEventListener('click', sendMessage);
        document.getElementById('chatInput')?.addEventListener('keypress', handleChatKeypress);
    });

})();
