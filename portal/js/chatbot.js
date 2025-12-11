/**
 * Ilmify - Advanced AI Assistant v2.0
 * Smart chatbot with PDF understanding, dictionary integration, quiz, & conversation
 * Enhanced with better UI, voice input, history, and smarter responses
 */

(function() {
    'use strict';

    // State management
    let knowledgeBase = [];
    let resourcesCache = [];
    let isIndexing = false;
    let pdfLoaded = false;
    let indexLoaded = false;
    let conversationHistory = [];
    let isListening = false;
    let recognition = null;
    let currentMode = 'chat'; // chat, quiz, dictionary
    let userName = localStorage.getItem('ilmify_userName') || '';

    // Get user name from auth
    function getUserName() {
        try {
            const user = JSON.parse(localStorage.getItem('ilmify_user') || '{}');
            return user.name || user.username || '';
        } catch { return ''; }
    }

    // Conversation context for smarter replies
    const context = {
        lastTopic: null,
        questionsAsked: 0,
        lastSubject: null,
        mood: 'neutral'
    };

    // Enhanced responses with more variety and personality
    const GENERAL_RESPONSES = {
        greetings: [
            () => `👋 ${getTimeGreeting()}! I'm your Ilmify assistant. What would you like to learn today?`,
            () => `Assalam o Alaikum${getUserName() ? ', ' + getUserName() : ''}! 🌟 Ready to explore knowledge together?`,
            () => `Hi there! 📚 I'm excited to help you learn. Ask me anything!`,
            () => `Hello! 🎓 Welcome to Ilmify. What subject interests you today?`
        ],
        thanks: [
            "You're welcome! 😊 That's what I'm here for!",
            "خوشی ہوئی! Keep asking questions - curiosity is the key to knowledge! 📖",
            "Anytime! Learning is a journey, and I'm happy to be your guide! 🌟",
            "Glad I could help! Remember, every question brings you closer to wisdom! 💡",
            "My pleasure! The joy of teaching is in your success! 🎓"
        ],
        goodbye: [
            "Goodbye! Keep that curiosity alive! 📚 See you soon!",
            "خدا حافظ! Remember: علم نور ہے (Knowledge is light)! ✨",
            "Take care! Come back whenever you need help studying! 🎓",
            "Bye for now! Keep learning, keep growing! 💪",
            "Allah Hafiz! May your learning journey be blessed! 🌙"
        ],
        howAreYou: [
            () => `I'm doing great! ${getRandomEmoji()} Ready to help you ace your studies. What's on your mind?`,
            "I'm wonderful, thank you for asking! 😊 More importantly, how can I help YOU today?",
            "Feeling energized and ready to learn! 🚀 What topic shall we explore?",
            "All systems go! 🤖 I've been waiting to help someone learn something amazing!"
        ],
        whoAreYou: [
            `<div class="bot-card">
                <div class="bot-card-header">🤖 Meet Your AI Study Buddy!</div>
                <div class="bot-card-content">
                    <p>I'm <strong>Ilmify Assistant</strong> - your personal AI tutor designed for Pakistani students!</p>
                    <div class="bot-features">
                        <div class="feature-item">📚 <span>Answer questions from your textbooks</span></div>
                        <div class="feature-item">🏥 <span>Explain health & hygiene topics</span></div>
                        <div class="feature-item">📖 <span>Define English words with Urdu meanings</span></div>
                        <div class="feature-item">🎯 <span>Help you practice with quizzes</span></div>
                        <div class="feature-item">💬 <span>Chat about any learning topic</span></div>
                    </div>
                    <p class="bot-tagline">I work <strong>100% offline</strong> - no internet needed!</p>
                </div>
            </div>`
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
            "What's a computer's favorite snack? Microchips! 💻🍪",
            "Why was the chemistry book so sad? Because it had too many problems to solve! ⚗️😂",
            "Teacher: Why is your homework in your father's handwriting? Student: I used his pen, Sir! ✏️😆",
            "What did zero say to eight? Nice belt! 8️⃣😄",
            "Why don't scientists trust atoms? Because they make up everything! ⚛️🤣"
        ],
        motivational: [
            "\"پڑھو گے لکھو گے بنو گے نواب، کھیلو گے کودو گے ہوگے خراب\" 📚💪",
            "\"Education is the most powerful weapon you can use to change the world.\" - Nelson Mandela 🌟",
            "\"The beautiful thing about learning is that no one can take it away from you.\" - B.B. King 📚",
            "Keep going! Every expert was once a beginner. You're doing great! 💪",
            "\"علم حاصل کرو، چاہے چین جانا پڑے\" - Seek knowledge even if you have to go to China! 🎓",
            "\"جو تھوڑا پڑھے وہ بھی بڑا بنے\" - Even little learning can make you great! ✨",
            "Believe in yourself! The only limit is the one you set for yourself! 🚀",
            "Small progress is still progress. Keep learning every day! 📖"
        ],
        encouragement: [
            "Great question! You're thinking like a true scholar! 🌟",
            "I love your curiosity! That's the mark of a great student! 💡",
            "Excellent! Keep asking questions like this! 📚",
            "You're on the right track! Never stop exploring! 🎯"
        ],
        unknown: [
            `Hmm, I'm not sure about that specific topic. But here's what I CAN help with:
                <div class="suggestion-chips">
                    <button onclick="askQuickQuestion('What subjects do you cover?')">📚 Subjects</button>
                    <button onclick="askQuickQuestion('Define education')">📖 Dictionary</button>
                    <button onclick="askQuickQuestion('Health tips for students')">🏥 Health</button>
                    <button onclick="askQuickQuestion('Tell me a joke')">😄 Fun</button>
                </div>`,
            "I don't have specific info on that, but I'm constantly learning! Try asking about your school subjects, health, or word definitions! 📚",
            "That's beyond my current knowledge, but let's try something I know well! What subject are you studying in school? 🎓"
        ]
    };

    // Helper functions
    function getTimeGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        if (hour < 21) return 'Good evening';
        return 'Hello night owl';
    }

    function getRandomEmoji() {
        const emojis = ['😊', '🌟', '✨', '💫', '🎯', '📚', '🎓', '💡', '🚀', '✌️'];
        return emojis[Math.floor(Math.random() * emojis.length)];
    }

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

        electricity: "⚡ <strong>Electricity</strong> is the flow of electrons.<br><br><strong>Key concepts:</strong><br>• Voltage (V) - electrical pressure<br>• Current (I) - flow of electrons (Amperes)<br>• Resistance (R) - opposition to flow (Ohms)<br><br><strong>Ohm's Law:</strong> V = I × R",

        // Additional knowledge
        "digestive system": "🍽️ <strong>Digestive System</strong> breaks down food into nutrients.<br><br><strong>Parts:</strong><br>1. Mouth - chewing & saliva<br>2. Esophagus - food pipe<br>3. Stomach - acids break food<br>4. Small intestine - absorbs nutrients<br>5. Large intestine - absorbs water<br><br>Digestion takes about 24-72 hours!",

        "blood cells": "🩸 <strong>Blood Cells</strong><br><br><strong>Types:</strong><br>• <strong>Red Blood Cells (RBCs)</strong> - carry oxygen, give blood red color<br>• <strong>White Blood Cells (WBCs)</strong> - fight infections<br>• <strong>Platelets</strong> - help blood clot<br><br>Your body has about 5 liters of blood!",

        ecosystem: "🌳 <strong>Ecosystem</strong> is a community of living things interacting with their environment.<br><br><strong>Components:</strong><br>• <strong>Biotic:</strong> Plants, animals, bacteria<br>• <strong>Abiotic:</strong> Water, sunlight, soil, air<br><br><strong>Food Chain:</strong> Sun → Plants → Herbivores → Carnivores → Decomposers",

        "periodic table": "⚗️ <strong>Periodic Table</strong> organizes all chemical elements.<br><br><strong>Key elements:</strong><br>• H (Hydrogen) - lightest element<br>• O (Oxygen) - we breathe it<br>• C (Carbon) - basis of life<br>• Fe (Iron) - in our blood<br>• Au (Gold) - precious metal<br><br>There are 118 known elements!",

        quran: "📖 <strong>The Holy Quran</strong><br><br>• Divine book of Islam<br>• Revealed to Prophet Muhammad ﷺ<br>• 114 Surahs (chapters)<br>• First Surah: Al-Fatiha<br>• Longest Surah: Al-Baqarah<br>• Language: Arabic<br>• Revealed over 23 years",

        prayer: "🕌 <strong>Five Daily Prayers (Namaz)</strong><br><br>1. <strong>Fajr</strong> - Before sunrise (2 Farz)<br>2. <strong>Zuhr</strong> - Afternoon (4 Farz)<br>3. <strong>Asr</strong> - Late afternoon (4 Farz)<br>4. <strong>Maghrib</strong> - After sunset (3 Farz)<br>5. <strong>Isha</strong> - Night (4 Farz)<br><br>Total: 17 Farz Rakats daily",

        "allama iqbal": "🌟 <strong>Allama Muhammad Iqbal</strong> (1877-1938)<br><br>• National Poet of Pakistan<br>• Known as 'Shair-e-Mashriq' (Poet of the East)<br>• Philosopher & politician<br>• Envisioned a separate Muslim state<br>• Famous works: Bang-e-Dra, Bal-e-Jibril<br>• November 9 is Iqbal Day 🇵🇰",

        "quaid e azam": "🇵🇰 <strong>Quaid-e-Azam Muhammad Ali Jinnah</strong> (1876-1948)<br><br>• Founder of Pakistan<br>• First Governor-General<br>• Title: Quaid-e-Azam (Great Leader)<br>• Famous quote: \"Unity, Faith, Discipline\"<br>• December 25 is Quaid Day<br>• Born in Karachi<br>• Lawyer by profession",

        "human body": "🧬 <strong>Human Body Facts</strong><br><br>• 206 bones in adult body<br>• 650+ muscles<br>• Heart beats ~100,000 times/day<br>• Brain has ~86 billion neurons<br>• Skin is the largest organ<br>• Blood travels 19,000 km daily<br>• We breathe ~20,000 times/day"
    };

    // Mini quiz questions for interactive learning
    const QUIZ_QUESTIONS = {
        science: [
            { q: "What is the process by which plants make food?", a: "Photosynthesis", hint: "Uses sunlight" },
            { q: "What is the chemical formula for water?", a: "H2O", hint: "H and O" },
            { q: "What planet is known as the Red Planet?", a: "Mars", hint: "4th from sun" },
            { q: "What is the powerhouse of the cell?", a: "Mitochondria", hint: "Produces energy" }
        ],
        math: [
            { q: "What is 15% of 200?", a: "30", hint: "15/100 × 200" },
            { q: "What is the square root of 144?", a: "12", hint: "12 × 12" },
            { q: "What is the value of π (pi) up to 2 decimal places?", a: "3.14", hint: "Circle constant" },
            { q: "What is the next prime number after 7?", a: "11", hint: "8,9,10 are not prime" }
        ],
        pakistan: [
            { q: "What is the capital of Pakistan?", a: "Islamabad", hint: "Not Karachi" },
            { q: "Who is the national poet of Pakistan?", a: "Allama Iqbal", hint: "Shair-e-Mashriq" },
            { q: "When did Pakistan gain independence?", a: "1947", hint: "August 14" },
            { q: "What is the national language of Pakistan?", a: "Urdu", hint: "Not English" }
        ],
        islamic: [
            { q: "How many Surahs are in the Quran?", a: "114", hint: "More than 100" },
            { q: "What is the first Surah of the Quran?", a: "Al-Fatiha", hint: "The Opening" },
            { q: "How many times do Muslims pray daily?", a: "5", hint: "Fajr to Isha" },
            { q: "What month do Muslims fast in?", a: "Ramadan", hint: "9th Islamic month" }
        ]
    };

    let currentQuizQuestion = null;

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

    // Random pick from array (handles functions too)
    function pick(arr) {
        const item = arr[Math.floor(Math.random() * arr.length)];
        return typeof item === 'function' ? item() : item;
    }

    // Start a mini quiz
    function startMiniQuiz(subject = null) {
        const subjects = Object.keys(QUIZ_QUESTIONS);
        const chosenSubject = subject || subjects[Math.floor(Math.random() * subjects.length)];
        const questions = QUIZ_QUESTIONS[chosenSubject];
        const question = questions[Math.floor(Math.random() * questions.length)];
        
        currentQuizQuestion = { ...question, subject: chosenSubject };
        
        return `<div class="quiz-card">
            <div class="quiz-header">🎯 Quick Quiz - ${chosenSubject.charAt(0).toUpperCase() + chosenSubject.slice(1)}</div>
            <div class="quiz-question">${question.q}</div>
            <div class="quiz-hint">💡 Hint: ${question.hint}</div>
            <div class="quiz-actions">
                <button onclick="askQuickQuestion('I give up')" class="quiz-btn secondary">Show Answer</button>
                <button onclick="askQuickQuestion('Another question')" class="quiz-btn">Next Question</button>
            </div>
            <p class="quiz-instruction">Type your answer below!</p>
        </div>`;
    }

    // Check quiz answer
    function checkQuizAnswer(userAnswer) {
        if (!currentQuizQuestion) return null;
        
        const correct = currentQuizQuestion.a.toLowerCase();
        const answer = userAnswer.toLowerCase().trim();
        
        const isCorrect = answer === correct || 
                         answer.includes(correct) || 
                         correct.includes(answer);
        
        const result = isCorrect 
            ? `<div class="quiz-result correct">
                    ✅ <strong>Correct!</strong> Well done! 🎉
                    <p>The answer is: <strong>${currentQuizQuestion.a}</strong></p>
                </div>`
            : `<div class="quiz-result incorrect">
                    ❌ Not quite! The correct answer is: <strong>${currentQuizQuestion.a}</strong>
                    <p>Don't worry, learning from mistakes makes us stronger! 💪</p>
                </div>`;
        
        currentQuizQuestion = null;
        return result + `<div class="quiz-continue">
            <button onclick="askQuickQuestion('Quiz me again')" class="quiz-btn">Another Question? 🎯</button>
        </div>`;
    }

    // Main response handler - Enhanced
    async function getResponse(input) {
        const lower = input.toLowerCase().trim();
        const words = lower.split(/\s+/);
        
        // Track conversation
        conversationHistory.push({ role: 'user', content: input, time: Date.now() });
        context.questionsAsked++;

        // Check if answering a quiz
        if (currentQuizQuestion) {
            if (/(give up|show answer|i don'?t know|skip)/i.test(lower)) {
                const answer = currentQuizQuestion.a;
                currentQuizQuestion = null;
                return `<div class="quiz-result">📝 The answer was: <strong>${answer}</strong><br><br>No worries! Learning is a journey. 
                    <button onclick="askQuickQuestion('Quiz me again')" class="quiz-btn">Try Another? 🎯</button></div>`;
            }
            if (/(another|next|new).*(question|quiz)/i.test(lower)) {
                return startMiniQuiz();
            }
            const result = checkQuizAnswer(input);
            if (result) return result;
        }

        // Quiz request
        if (/(quiz|test|question).*(me|start|play)|let'?s play/i.test(lower)) {
            let subject = null;
            if (/science|physics|chemistry|biology/i.test(lower)) subject = 'science';
            else if (/math|maths|calculation/i.test(lower)) subject = 'math';
            else if (/pakistan|pak studies/i.test(lower)) subject = 'pakistan';
            else if (/islam|islamic|quran|namaz/i.test(lower)) subject = 'islamic';
            return startMiniQuiz(subject);
        }

        // Greetings
        if (/^(hi+|hello|hey|salam|assalam|aoa|helo)\b/.test(lower)) {
            return pick(GENERAL_RESPONSES.greetings);
        }

        // Thanks
        if (/(thank|shukriya|thanks|thx|thnx|jazak|meherbani)/i.test(lower)) {
            return pick(GENERAL_RESPONSES.thanks);
        }

        // Goodbye
        if (/(bye|goodbye|khuda hafiz|allah hafiz|see you|later|alvida)/i.test(lower)) {
            return pick(GENERAL_RESPONSES.goodbye);
        }

        // How are you
        if (/(how are you|how r u|kaise ho|kaisa hai|whats up|wassup|kya haal)/i.test(lower)) {
            return pick(GENERAL_RESPONSES.howAreYou);
        }

        // Who are you
        if (/(who are you|what are you|your name|kaun ho|kon ho|tumhara naam|apka naam)/i.test(lower)) {
            return pick(GENERAL_RESPONSES.whoAreYou);
        }

        // About Ilmify / About Us
        if (/(about ilmify|about us|about you|about this|ilmify kya|founder|vision|goal|mission|who made|who created|developer|mufassir)/i.test(lower)) {
            return pick(GENERAL_RESPONSES.aboutUs);
        }

        // Joke request
        if (/(tell.*joke|funny|make me laugh|joke sunao|mazaq|hansi)/i.test(lower)) {
            return pick(GENERAL_RESPONSES.jokes);
        }

        // Motivation
        if (/(motivat|inspire|encourage|quote|himmat|hausla)/i.test(lower)) {
            return pick(GENERAL_RESPONSES.motivational);
        }

        // Help - Enhanced
        if (/^(help|madad|مدد|kya kar sakte)$/i.test(lower)) {
            return `<div class="help-card">
                <h4>🤖 How Can I Help You?</h4>
                <div class="help-grid">
                    <div class="help-item" onclick="askQuickQuestion('What is photosynthesis?')">
                        <span class="help-icon">📚</span>
                        <span class="help-text">Textbook Questions</span>
                    </div>
                    <div class="help-item" onclick="askQuickQuestion('Define knowledge')">
                        <span class="help-icon">📖</span>
                        <span class="help-text">Dictionary</span>
                    </div>
                    <div class="help-item" onclick="askQuickQuestion('Health tips')">
                        <span class="help-icon">🏥</span>
                        <span class="help-text">Health Info</span>
                    </div>
                    <div class="help-item" onclick="askQuickQuestion('Quiz me')">
                        <span class="help-icon">🎯</span>
                        <span class="help-text">Quick Quiz</span>
                    </div>
                    <div class="help-item" onclick="askQuickQuestion('About Pakistan')">
                        <span class="help-icon">🇵🇰</span>
                        <span class="help-text">Pak Studies</span>
                    </div>
                    <div class="help-item" onclick="askQuickQuestion('Tell me a joke')">
                        <span class="help-icon">😄</span>
                        <span class="help-text">Fun & Jokes</span>
                    </div>
                </div>
                <p class="help-tip">💡 Just type any question naturally!</p>
            </div>`;
        }

        // Time/Date
        if (/(what time|what.*date|today|aaj|waqt|tarikh)/i.test(lower)) {
            const now = new Date();
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const urduDays = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];
            return `🕐 <strong>Time:</strong> ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    <br>📅 <strong>Date:</strong> ${now.toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    <br>🌙 <strong>آج:</strong> ${urduDays[now.getDay()]}`;
        }

        // Calculator (simple math)
        const mathMatch = lower.match(/(?:what is|calculate|solve|whats|compute)\s*([\d\s+\-*/().]+)/);
        if (mathMatch) {
            try {
                const expr = mathMatch[1].trim();
                if (/^[\d\s+\-*/().]+$/.test(expr)) {
                    const result = eval(expr);
                    return `🔢 <strong>Calculation:</strong><br>${expr} = <strong class="highlight">${result}</strong>`;
                }
            } catch (e) {}
        }

        // Dictionary lookup
        if (/(define|meaning|definition|what does.*mean|matlab|معنی|lafz)/i.test(lower)) {
            return await handleDictionary(input);
        }

        // Check built-in subject knowledge first (for common topics)
        for (const [key, answer] of Object.entries(SUBJECT_KNOWLEDGE)) {
            if (lower.includes(key)) {
                context.lastTopic = key;
                // Add encouragement randomly
                const encourage = Math.random() > 0.7 ? `<br><br>${pick(GENERAL_RESPONSES.encouragement)}` : '';
                return answer + encourage;
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
                const scoreText = result.score ? ` (${Math.round(result.score * 100)}% match)` : '';
                
                let response = `<div class="source-card">
                    <div class="source-header">${icon} From Your Resources</div>
                    <div class="source-content">${result.text}</div>
                    <div class="source-footer">📑 ${result.source}${scoreText}</div>
                </div>`;
                
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
                    return `<div class="source-card">
                        <div class="source-header">${icon} Found Information</div>
                        <div class="source-content">${result.text}</div>
                        <div class="source-footer">📑 ${result.source}</div>
                    </div>`;
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

    // UI Functions - Enhanced
    function openChatbot() {
        const modal = document.getElementById('chatModal');
        const fab = document.getElementById('chatbotFab');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
            fab?.classList.add('active');
            document.getElementById('chatInput')?.focus();

            const messages = document.getElementById('chatMessages');
            if (messages && messages.children.length === 0) {
                const greeting = getTimeGreeting();
                const name = getUserName();
                addBotMessage(`<div class="welcome-message">
                    <div class="welcome-header">👋 ${greeting}${name ? ', ' + name : ''}!</div>
                    <p>I'm your <strong>Ilmify Assistant</strong> - here to help you learn!</p>
                    <div class="welcome-features">
                        <span>📚 Textbooks</span>
                        <span>📖 Dictionary</span>
                        <span>🏥 Health</span>
                        <span>🎯 Quizzes</span>
                    </div>
                    <p class="welcome-tip">💡 Type anything or tap a button below!</p>
                </div>`);
                
                buildKnowledgeBase();
            }
        }
    }

    function closeChatbot() {
        const modal = document.getElementById('chatModal');
        const fab = document.getElementById('chatbotFab');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            fab?.classList.remove('active');
        }
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
            div.className = 'chat-message user-message';
            div.innerHTML = `
                <div class="message-content">${escapeHtml(text)}</div>
                <div class="message-avatar">👤</div>
            `;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
        }
    }

    function addBotMessage(text) {
        const messages = document.getElementById('chatMessages');
        if (messages) {
            const div = document.createElement('div');
            div.className = 'chat-message bot-message';
            div.innerHTML = `
                <div class="message-avatar">🤖</div>
                <div class="message-content">${text}</div>
            `;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
            
            // Track response
            conversationHistory.push({ role: 'assistant', content: text, time: Date.now() });
        }
    }

    function showTyping() {
        const messages = document.getElementById('chatMessages');
        if (messages) {
            const div = document.createElement('div');
            div.id = 'typingIndicator';
            div.className = 'chat-message bot-message typing';
            div.innerHTML = `
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            `;
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
        
        // Variable delay for more natural feel
        const delay = 400 + Math.random() * 600;
        await new Promise(r => setTimeout(r, delay));

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

    // Voice input (if supported)
    function initVoiceInput() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            
            recognition.onresult = (event) => {
                const text = event.results[0][0].transcript;
                const input = document.getElementById('chatInput');
                if (input) {
                    input.value = text;
                    sendMessage();
                }
            };
            
            recognition.onend = () => {
                isListening = false;
                document.getElementById('voiceBtn')?.classList.remove('listening');
            };
        }
    }

    function toggleVoiceInput() {
        if (!recognition) {
            addBotMessage("🎤 Voice input is not supported in your browser. Please type your question instead.");
            return;
        }
        
        if (isListening) {
            recognition.stop();
            isListening = false;
        } else {
            recognition.start();
            isListening = true;
            document.getElementById('voiceBtn')?.classList.add('listening');
            addBotMessage("🎤 Listening... Speak now!");
        }
    }

    // Clear chat history
    function clearChat() {
        const messages = document.getElementById('chatMessages');
        if (messages) {
            messages.innerHTML = '';
            conversationHistory = [];
            currentQuizQuestion = null;
            openChatbot(); // Show welcome again
        }
    }

    // Add enhanced CSS styles
    const style = document.createElement('style');
    style.textContent = `
        /* Typing Indicator */
        .typing-indicator {
            display: flex;
            gap: 4px;
            padding: 4px 0;
        }
        .typing-indicator span {
            width: 8px;
            height: 8px;
            background: #0A1F44;
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out;
        }
        .typing-indicator span:nth-child(1) { animation-delay: 0s; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1); opacity: 1; }
        }
        
        /* Welcome Message */
        .welcome-message { text-align: center; }
        .welcome-header { font-size: 1.3rem; font-weight: 600; color: #0A1F44; margin-bottom: 8px; }
        .welcome-features { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 12px 0; }
        .welcome-features span { background: #f0f4f8; padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; }
        .welcome-tip { color: #666; font-size: 0.85rem; margin-top: 8px; }
        
        /* Quiz Cards */
        .quiz-card { background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 12px; padding: 16px; }
        .quiz-header { font-weight: 600; color: #0A1F44; font-size: 1rem; margin-bottom: 12px; }
        .quiz-question { font-size: 1.05rem; color: #333; margin-bottom: 10px; line-height: 1.5; }
        .quiz-hint { color: #666; font-size: 0.85rem; margin-bottom: 12px; }
        .quiz-actions { display: flex; gap: 8px; margin-bottom: 10px; }
        .quiz-btn { padding: 8px 16px; border: none; border-radius: 20px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
        .quiz-btn:not(.secondary) { background: #F7B500; color: #0A1F44; }
        .quiz-btn.secondary { background: #e9ecef; color: #333; }
        .quiz-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .quiz-instruction { color: #888; font-size: 0.8rem; margin: 0; }
        .quiz-result { padding: 12px; border-radius: 10px; margin-bottom: 10px; }
        .quiz-result.correct { background: #d4edda; color: #155724; }
        .quiz-result.incorrect { background: #f8d7da; color: #721c24; }
        .quiz-continue { margin-top: 10px; }
        
        /* Help Card */
        .help-card h4 { margin: 0 0 12px 0; color: #0A1F44; }
        .help-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
        .help-item { display: flex; align-items: center; gap: 8px; padding: 10px; background: #f8f9fa; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .help-item:hover { background: #F7B500; transform: translateX(4px); }
        .help-icon { font-size: 1.2rem; }
        .help-text { font-size: 0.85rem; }
        .help-tip { color: #666; font-size: 0.8rem; margin-top: 12px; text-align: center; }
        
        /* Source Card */
        .source-card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .source-header { background: linear-gradient(135deg, #0A1F44, #152d5c); color: #F7B500; padding: 10px 14px; font-weight: 600; font-size: 0.9rem; }
        .source-content { padding: 14px; line-height: 1.6; }
        .source-footer { padding: 10px 14px; background: #f8f9fa; color: #666; font-size: 0.8rem; border-top: 1px solid #eee; }
        
        /* Bot Card */
        .bot-card { background: #fff; border-radius: 12px; overflow: hidden; }
        .bot-card-header { background: linear-gradient(135deg, #F7B500, #ffcc33); color: #0A1F44; padding: 12px; font-weight: 600; text-align: center; }
        .bot-card-content { padding: 14px; }
        .bot-features { margin: 12px 0; }
        .feature-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
        .feature-item:last-child { border-bottom: none; }
        .bot-tagline { text-align: center; color: #F7B500; font-weight: 500; margin-top: 10px; background: #0A1F44; padding: 10px; border-radius: 8px; }
        
        /* Suggestion Chips */
        .suggestion-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .suggestion-chips button { padding: 8px 14px; border: 1px solid #ddd; border-radius: 20px; background: #fff; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
        .suggestion-chips button:hover { background: #F7B500; border-color: #F7B500; }
        
        /* Highlight */
        .highlight { color: #F7B500; background: #0A1F44; padding: 2px 8px; border-radius: 4px; }
        
        /* Voice Button */
        #voiceBtn.listening { background: #e74c3c; animation: pulse 1s infinite; }
        
        /* Enhanced Message Animations */
        .chat-message {
            animation: messageSlideIn 0.3s ease-out;
        }
        @keyframes messageSlideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
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
    window.clearChat = clearChat;
    window.toggleVoiceInput = toggleVoiceInput;

    // Initialize
    document.addEventListener('DOMContentLoaded', function() {
        const path = window.location.pathname.includes('/portal/') 
            ? 'data/metadata.json' : 'portal/data/metadata.json';
        
        fetch(path).then(r => r.json()).then(data => {
            resourcesCache = data;
        }).catch(() => {});

        document.getElementById('chatSendBtn')?.addEventListener('click', sendMessage);
        document.getElementById('chatInput')?.addEventListener('keypress', handleChatKeypress);
        
        // Initialize voice input if available
        initVoiceInput();
        
        // Preload knowledge base in background
        setTimeout(() => loadKnowledgeIndex(), 2000);
    });

})();
