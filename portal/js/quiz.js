/**
 * Ilmify - Quiz & Practice Module
 * Random questions for students to practice and test their knowledge
 */

(function() {
    'use strict';

    const QUIZ_PROGRESS_KEY = 'ilmify_quiz_progress';
    const QUIZ_HISTORY_KEY = 'ilmify_quiz_history';

    // Question bank organized by subject and difficulty
    const questionBank = {
        science: {
            easy: [
                { q: "What is the center of our solar system?", options: ["Earth", "Sun", "Moon", "Mars"], answer: 1, explanation: "The Sun is at the center of our solar system." },
                { q: "What gas do plants absorb from the air?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], answer: 2, explanation: "Plants absorb carbon dioxide for photosynthesis." },
                { q: "How many legs does a spider have?", options: ["6", "8", "10", "4"], answer: 1, explanation: "Spiders are arachnids and have 8 legs." },
                { q: "What is H2O commonly known as?", options: ["Salt", "Sugar", "Water", "Acid"], answer: 2, explanation: "H2O is the chemical formula for water." },
                { q: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], answer: 1, explanation: "Mars appears red due to iron oxide on its surface." },
                { q: "What do we call a scientist who studies weather?", options: ["Biologist", "Meteorologist", "Geologist", "Astronomer"], answer: 1, explanation: "A meteorologist studies weather patterns." },
                { q: "Which organ pumps blood in our body?", options: ["Brain", "Lungs", "Heart", "Liver"], answer: 2, explanation: "The heart pumps blood throughout the body." },
                { q: "What is the boiling point of water?", options: ["50°C", "100°C", "150°C", "200°C"], answer: 1, explanation: "Water boils at 100°C (212°F) at sea level." }
            ],
            medium: [
                { q: "What is the chemical symbol for Gold?", options: ["Go", "Gd", "Au", "Ag"], answer: 2, explanation: "Au comes from the Latin word 'Aurum'." },
                { q: "Which layer of Earth's atmosphere contains the ozone layer?", options: ["Troposphere", "Stratosphere", "Mesosphere", "Thermosphere"], answer: 1, explanation: "The ozone layer is in the stratosphere." },
                { q: "What type of energy does the Sun primarily provide?", options: ["Nuclear", "Solar/Radiant", "Chemical", "Mechanical"], answer: 1, explanation: "The Sun provides solar/radiant energy through radiation." },
                { q: "What is the smallest unit of matter?", options: ["Molecule", "Atom", "Cell", "Electron"], answer: 1, explanation: "An atom is the smallest unit of matter that retains chemical properties." },
                { q: "Which blood cells fight infections?", options: ["Red blood cells", "Platelets", "White blood cells", "Plasma"], answer: 2, explanation: "White blood cells are part of the immune system." },
                { q: "What force keeps planets in orbit around the Sun?", options: ["Magnetic force", "Gravity", "Friction", "Tension"], answer: 1, explanation: "Gravity keeps planets orbiting the Sun." }
            ],
            hard: [
                { q: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi body"], answer: 2, explanation: "Mitochondria produce ATP, the cell's energy currency." },
                { q: "What is the speed of light approximately?", options: ["300,000 m/s", "300,000 km/s", "30,000 km/s", "3,000,000 km/s"], answer: 1, explanation: "Light travels at approximately 300,000 km/s in vacuum." },
                { q: "Which element has atomic number 6?", options: ["Nitrogen", "Carbon", "Oxygen", "Boron"], answer: 1, explanation: "Carbon has 6 protons, giving it atomic number 6." },
                { q: "What is the process by which plants make food?", options: ["Respiration", "Digestion", "Photosynthesis", "Fermentation"], answer: 2, explanation: "Photosynthesis converts CO2 and water into glucose using sunlight." }
            ]
        },
        math: {
            easy: [
                { q: "What is 15 + 27?", options: ["42", "52", "32", "40"], answer: 0, explanation: "15 + 27 = 42" },
                { q: "What is 8 × 7?", options: ["54", "56", "48", "64"], answer: 1, explanation: "8 × 7 = 56" },
                { q: "What is 100 ÷ 4?", options: ["20", "25", "30", "15"], answer: 1, explanation: "100 ÷ 4 = 25" },
                { q: "What is the square of 9?", options: ["18", "72", "81", "90"], answer: 2, explanation: "9 × 9 = 81" },
                { q: "What is 50% of 80?", options: ["30", "40", "50", "60"], answer: 1, explanation: "50% of 80 = 0.5 × 80 = 40" },
                { q: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], answer: 1, explanation: "A hexagon has 6 sides." },
                { q: "What is the value of π (pi) approximately?", options: ["2.14", "3.14", "4.14", "3.41"], answer: 1, explanation: "π ≈ 3.14159..." },
                { q: "What is 144 ÷ 12?", options: ["10", "11", "12", "14"], answer: 2, explanation: "144 ÷ 12 = 12" }
            ],
            medium: [
                { q: "What is 15% of 200?", options: ["15", "30", "45", "25"], answer: 1, explanation: "15% of 200 = 0.15 × 200 = 30" },
                { q: "Solve: 2x + 6 = 14. What is x?", options: ["2", "3", "4", "5"], answer: 2, explanation: "2x = 14 - 6 = 8, so x = 4" },
                { q: "What is the area of a rectangle with length 8 and width 5?", options: ["13", "26", "40", "80"], answer: 2, explanation: "Area = length × width = 8 × 5 = 40" },
                { q: "What is √144?", options: ["10", "11", "12", "14"], answer: 2, explanation: "√144 = 12 because 12 × 12 = 144" },
                { q: "If a = 3 and b = 4, what is a² + b²?", options: ["7", "12", "25", "49"], answer: 2, explanation: "a² + b² = 9 + 16 = 25" },
                { q: "What is the perimeter of a square with side 7?", options: ["14", "21", "28", "49"], answer: 2, explanation: "Perimeter = 4 × side = 4 × 7 = 28" }
            ],
            hard: [
                { q: "What is the value of 2³ × 3²?", options: ["36", "54", "72", "48"], answer: 2, explanation: "2³ × 3² = 8 × 9 = 72" },
                { q: "Solve: 3x - 7 = 2x + 5. What is x?", options: ["10", "11", "12", "13"], answer: 2, explanation: "3x - 2x = 5 + 7, so x = 12" },
                { q: "What is the volume of a cube with side 5?", options: ["25", "75", "125", "150"], answer: 2, explanation: "Volume = side³ = 5³ = 125" },
                { q: "If sin 30° = 0.5, what is sin 150°?", options: ["0.5", "-0.5", "0.866", "-0.866"], answer: 0, explanation: "sin 150° = sin(180° - 30°) = sin 30° = 0.5" }
            ]
        },
        english: {
            easy: [
                { q: "What is the plural of 'child'?", options: ["Childs", "Childes", "Children", "Childern"], answer: 2, explanation: "'Child' has an irregular plural: 'children'." },
                { q: "Which word is a verb?", options: ["Beautiful", "Quickly", "Running", "Blue"], answer: 2, explanation: "'Running' is a verb (action word)." },
                { q: "What is the opposite of 'happy'?", options: ["Glad", "Sad", "Excited", "Angry"], answer: 1, explanation: "The opposite of happy is sad." },
                { q: "Choose the correct spelling:", options: ["Beutiful", "Beautiful", "Beautifull", "Beuatiful"], answer: 1, explanation: "The correct spelling is 'beautiful'." },
                { q: "What type of word is 'slowly'?", options: ["Noun", "Verb", "Adjective", "Adverb"], answer: 3, explanation: "'Slowly' is an adverb describing how something is done." },
                { q: "Which sentence is correct?", options: ["She don't like pizza", "She doesn't like pizza", "She not like pizza", "She no like pizza"], answer: 1, explanation: "With 'she', we use 'doesn't' for negation." },
                { q: "What is the past tense of 'go'?", options: ["Goed", "Gone", "Went", "Going"], answer: 2, explanation: "'Go' is an irregular verb; past tense is 'went'." }
            ],
            medium: [
                { q: "Which word is a conjunction?", options: ["However", "Beautiful", "Quickly", "Dance"], answer: 0, explanation: "'However' is a conjunction connecting ideas." },
                { q: "What is a synonym for 'enormous'?", options: ["Tiny", "Huge", "Average", "Small"], answer: 1, explanation: "Enormous and huge both mean very large." },
                { q: "Identify the pronoun: 'She gave them the book.'", options: ["She, them", "Gave, book", "The, book", "She, gave"], answer: 0, explanation: "'She' and 'them' are pronouns." },
                { q: "What is the comparative form of 'good'?", options: ["Gooder", "More good", "Better", "Best"], answer: 2, explanation: "'Good' has an irregular comparative: 'better'." },
                { q: "Which is a complex sentence?", options: ["I ran.", "I ran and jumped.", "Although I was tired, I ran.", "Run!"], answer: 2, explanation: "It has an independent and dependent clause." }
            ],
            hard: [
                { q: "What literary device is: 'The wind whispered secrets'?", options: ["Simile", "Metaphor", "Personification", "Alliteration"], answer: 2, explanation: "Personification gives human qualities to non-human things." },
                { q: "What is the subjunctive mood used for?", options: ["Commands", "Questions", "Hypotheticals/wishes", "Past events"], answer: 2, explanation: "Subjunctive expresses wishes, demands, or hypothetical situations." },
                { q: "Identify the gerund: 'Swimming is fun.'", options: ["Is", "Fun", "Swimming", "None"], answer: 2, explanation: "'Swimming' is a gerund (verb form used as noun)." }
            ]
        },
        islamicStudies: {
            easy: [
                { q: "How many pillars of Islam are there?", options: ["3", "4", "5", "6"], answer: 2, explanation: "There are 5 pillars of Islam." },
                { q: "What is the first pillar of Islam?", options: ["Salah", "Zakat", "Shahada", "Hajj"], answer: 2, explanation: "Shahada (declaration of faith) is the first pillar." },
                { q: "How many times a day do Muslims pray?", options: ["3", "4", "5", "7"], answer: 2, explanation: "Muslims pray 5 times daily." },
                { q: "What is the holy book of Islam?", options: ["Bible", "Torah", "Quran", "Vedas"], answer: 2, explanation: "The Quran is the holy book of Islam." },
                { q: "In which month do Muslims fast?", options: ["Shaban", "Ramadan", "Muharram", "Rajab"], answer: 1, explanation: "Muslims fast during the month of Ramadan." },
                { q: "What is the direction Muslims face during prayer?", options: ["East", "West", "Towards Qibla/Kaaba", "North"], answer: 2, explanation: "Muslims face the Kaaba in Mecca (Qibla direction)." },
                { q: "What is Zakat?", options: ["Prayer", "Fasting", "Charity", "Pilgrimage"], answer: 2, explanation: "Zakat is obligatory charity (2.5% of savings)." }
            ],
            medium: [
                { q: "How many surahs are in the Quran?", options: ["100", "114", "120", "150"], answer: 1, explanation: "The Quran has 114 surahs (chapters)." },
                { q: "Which surah is known as the 'Heart of Quran'?", options: ["Al-Fatiha", "Al-Baqarah", "Yasin", "Al-Ikhlas"], answer: 2, explanation: "Surah Yasin is called the 'Heart of the Quran'." },
                { q: "What is the first word revealed in the Quran?", options: ["Allah", "Iqra (Read)", "Bismillah", "Alhamdulillah"], answer: 1, explanation: "'Iqra' (Read) was the first word revealed to Prophet Muhammad (PBUH)." },
                { q: "How many years did it take for the Quran to be revealed?", options: ["10 years", "15 years", "23 years", "30 years"], answer: 2, explanation: "The Quran was revealed over approximately 23 years." },
                { q: "What is Hajj?", options: ["Daily prayer", "Monthly charity", "Annual pilgrimage", "Weekly gathering"], answer: 2, explanation: "Hajj is the annual pilgrimage to Mecca." }
            ],
            hard: [
                { q: "In which cave did Prophet Muhammad (PBUH) receive the first revelation?", options: ["Cave of Thawr", "Cave of Hira", "Cave of Uhud", "Cave of Badr"], answer: 1, explanation: "The first revelation came in Cave Hira on Mount Nur." },
                { q: "What is the longest surah in the Quran?", options: ["Al-Fatiha", "Al-Baqarah", "Al-Imran", "An-Nisa"], answer: 1, explanation: "Surah Al-Baqarah is the longest with 286 verses." },
                { q: "Which Prophet is mentioned most in the Quran?", options: ["Prophet Ibrahim", "Prophet Isa", "Prophet Musa", "Prophet Muhammad"], answer: 2, explanation: "Prophet Musa (Moses) is mentioned most frequently." }
            ]
        },
        pakistanStudies: {
            easy: [
                { q: "When did Pakistan gain independence?", options: ["1945", "1946", "1947", "1948"], answer: 2, explanation: "Pakistan became independent on August 14, 1947." },
                { q: "Who is the founder of Pakistan?", options: ["Allama Iqbal", "Liaquat Ali Khan", "Quaid-e-Azam", "Sir Syed Ahmad Khan"], answer: 2, explanation: "Quaid-e-Azam Muhammad Ali Jinnah founded Pakistan." },
                { q: "What is the national language of Pakistan?", options: ["English", "Punjabi", "Urdu", "Sindhi"], answer: 2, explanation: "Urdu is the national language of Pakistan." },
                { q: "What is the capital of Pakistan?", options: ["Karachi", "Lahore", "Islamabad", "Rawalpindi"], answer: 2, explanation: "Islamabad is the capital of Pakistan." },
                { q: "What is the national flower of Pakistan?", options: ["Rose", "Sunflower", "Jasmine", "Tulip"], answer: 2, explanation: "Jasmine (Chambeli) is Pakistan's national flower." },
                { q: "What is Pakistan's national sport?", options: ["Cricket", "Football", "Hockey", "Kabaddi"], answer: 2, explanation: "Hockey is the national sport of Pakistan." }
            ],
            medium: [
                { q: "Who wrote Pakistan's national anthem?", options: ["Allama Iqbal", "Hafeez Jalandhari", "Faiz Ahmad Faiz", "Ahmed Faraz"], answer: 1, explanation: "Hafeez Jalandhari wrote the national anthem lyrics." },
                { q: "Which river is the longest in Pakistan?", options: ["Jhelum", "Chenab", "Ravi", "Indus"], answer: 3, explanation: "The Indus River is the longest river in Pakistan." },
                { q: "When was the Lahore Resolution passed?", options: ["1938", "1939", "1940", "1941"], answer: 2, explanation: "The Lahore Resolution was passed on March 23, 1940." },
                { q: "Which mountain is the highest in Pakistan?", options: ["Nanga Parbat", "K2", "Broad Peak", "Tirich Mir"], answer: 1, explanation: "K2 (8,611m) is the highest peak in Pakistan." },
                { q: "How many provinces does Pakistan have?", options: ["3", "4", "5", "6"], answer: 1, explanation: "Pakistan has 4 provinces: Punjab, Sindh, KPK, and Balochistan." }
            ],
            hard: [
                { q: "Who was Pakistan's first Prime Minister?", options: ["Quaid-e-Azam", "Liaquat Ali Khan", "Khawaja Nazimuddin", "Muhammad Ali Bogra"], answer: 1, explanation: "Liaquat Ali Khan was Pakistan's first Prime Minister." },
                { q: "When was Pakistan's first constitution adopted?", options: ["1947", "1952", "1956", "1962"], answer: 2, explanation: "Pakistan's first constitution was adopted in 1956." },
                { q: "Which ancient civilization flourished in Pakistan?", options: ["Egyptian", "Mesopotamian", "Indus Valley", "Greek"], answer: 2, explanation: "The Indus Valley Civilization (Mohenjo-daro, Harappa)." }
            ]
        },
        generalKnowledge: {
            easy: [
                { q: "How many continents are there?", options: ["5", "6", "7", "8"], answer: 2, explanation: "There are 7 continents on Earth." },
                { q: "What is the largest ocean?", options: ["Atlantic", "Indian", "Pacific", "Arctic"], answer: 2, explanation: "The Pacific Ocean is the largest." },
                { q: "How many days are in a leap year?", options: ["364", "365", "366", "367"], answer: 2, explanation: "A leap year has 366 days." },
                { q: "What is the largest mammal?", options: ["Elephant", "Giraffe", "Blue Whale", "Hippo"], answer: 2, explanation: "The Blue Whale is the largest mammal." },
                { q: "Which country has the largest population?", options: ["USA", "India", "China", "Russia"], answer: 2, explanation: "China has the largest population." },
                { q: "How many colors are in a rainbow?", options: ["5", "6", "7", "8"], answer: 2, explanation: "A rainbow has 7 colors: ROYGBIV." }
            ],
            medium: [
                { q: "What is the hardest natural substance?", options: ["Gold", "Iron", "Diamond", "Platinum"], answer: 2, explanation: "Diamond is the hardest natural substance." },
                { q: "Which is the smallest country in the world?", options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], answer: 1, explanation: "Vatican City is the smallest country." },
                { q: "What year did World War II end?", options: ["1943", "1944", "1945", "1946"], answer: 2, explanation: "World War II ended in 1945." },
                { q: "What is the currency of Japan?", options: ["Yuan", "Won", "Yen", "Ringgit"], answer: 2, explanation: "The Japanese currency is the Yen." }
            ]
        }
    };

    // Current quiz state
    let currentQuiz = {
        questions: [],
        currentIndex: 0,
        score: 0,
        answers: [],
        subject: null,
        difficulty: null,
        startTime: null
    };

    // Initialize quiz module
    function init() {
        renderQuizSection();
        loadQuizHistory();
    }

    // Render the main quiz section
    function renderQuizSection() {
        const container = document.getElementById('quizSection');
        if (!container) return;

        container.innerHTML = `
            <div class="quiz-section-header">
                <h2 class="section-title">🎯 Practice Quiz</h2>
                <p class="section-subtitle">سوالات کی مشق کریں</p>
            </div>
            
            <div class="quiz-start-panel" id="quizStartPanel">
                <div class="quiz-intro">
                    <div class="quiz-intro-icon">🧠</div>
                    <h3>Test Your Knowledge!</h3>
                    <p>Select a subject and difficulty to start practicing</p>
                </div>
                
                <div class="quiz-options">
                    <div class="quiz-option-group">
                        <label>📚 Subject / مضمون</label>
                        <select id="quizSubject" class="quiz-select">
                            <option value="">Select Subject</option>
                            <option value="science">🔬 Science / سائنس</option>
                            <option value="math">📐 Mathematics / ریاضی</option>
                            <option value="english">📝 English / انگریزی</option>
                            <option value="islamicStudies">🕌 Islamic Studies / اسلامیات</option>
                            <option value="pakistanStudies">🇵🇰 Pakistan Studies / مطالعہ پاکستان</option>
                            <option value="generalKnowledge">🌍 General Knowledge / عمومی معلومات</option>
                        </select>
                    </div>
                    
                    <div class="quiz-option-group">
                        <label>📊 Difficulty / مشکل</label>
                        <select id="quizDifficulty" class="quiz-select">
                            <option value="">Select Difficulty</option>
                            <option value="easy">🟢 Easy / آسان</option>
                            <option value="medium">🟡 Medium / درمیانہ</option>
                            <option value="hard">🔴 Hard / مشکل</option>
                            <option value="mixed">🎲 Mixed / ملا جلا</option>
                        </select>
                    </div>
                    
                    <div class="quiz-option-group">
                        <label>🔢 Questions / سوالات</label>
                        <select id="quizCount" class="quiz-select">
                            <option value="5">5 Questions</option>
                            <option value="10" selected>10 Questions</option>
                            <option value="15">15 Questions</option>
                            <option value="20">20 Questions</option>
                        </select>
                    </div>
                </div>
                
                <button class="quiz-start-btn" onclick="IlmifyQuiz.startQuiz()">
                    🚀 Start Quiz
                </button>
                
                <div class="quiz-stats-mini" id="quizStatsMini">
                    <div class="stat-item">
                        <span class="stat-value" id="totalQuizzesTaken">0</span>
                        <span class="stat-label">Quizzes Taken</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="averageScore">0%</span>
                        <span class="stat-label">Average Score</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value" id="bestStreak">0</span>
                        <span class="stat-label">Best Streak</span>
                    </div>
                </div>
            </div>
            
            <div class="quiz-play-panel" id="quizPlayPanel" style="display: none;">
                <div class="quiz-header">
                    <div class="quiz-progress-info">
                        <span id="quizQuestionNum">Question 1/10</span>
                        <span id="quizSubjectBadge" class="quiz-badge">Science</span>
                    </div>
                    <div class="quiz-score-live">
                        <span>Score: </span>
                        <span id="quizScoreLive">0</span>
                    </div>
                </div>
                
                <div class="quiz-progress-bar">
                    <div class="quiz-progress-fill" id="quizProgressFill"></div>
                </div>
                
                <div class="quiz-question-card" id="quizQuestionCard">
                    <div class="question-text" id="questionText"></div>
                    <div class="question-options" id="questionOptions"></div>
                </div>
                
                <div class="quiz-feedback" id="quizFeedback" style="display: none;">
                    <div class="feedback-icon" id="feedbackIcon"></div>
                    <div class="feedback-text" id="feedbackText"></div>
                    <div class="feedback-explanation" id="feedbackExplanation"></div>
                </div>
                
                <div class="quiz-actions">
                    <button class="quiz-btn quiz-btn-secondary" onclick="IlmifyQuiz.quitQuiz()">❌ Quit</button>
                    <button class="quiz-btn quiz-btn-primary" id="quizNextBtn" onclick="IlmifyQuiz.nextQuestion()" style="display: none;">
                        Next Question ➡️
                    </button>
                </div>
            </div>
            
            <div class="quiz-results-panel" id="quizResultsPanel" style="display: none;">
                <div class="results-header">
                    <div class="results-icon" id="resultsIcon">🎉</div>
                    <h3 id="resultsTitle">Quiz Complete!</h3>
                </div>
                
                <div class="results-score-circle">
                    <svg viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#e0e0e0" stroke-width="8"/>
                        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--primary-color)" stroke-width="8" 
                            stroke-dasharray="283" stroke-dashoffset="283" id="scoreCircle" 
                            transform="rotate(-90 50 50)"/>
                    </svg>
                    <div class="score-text">
                        <span id="finalScore">0</span>
                        <span class="score-max">/<span id="totalQuestions">10</span></span>
                    </div>
                </div>
                
                <div class="results-percentage" id="resultsPercentage">0%</div>
                <div class="results-message" id="resultsMessage"></div>
                
                <div class="results-breakdown">
                    <div class="breakdown-item correct">
                        <span class="breakdown-icon">✅</span>
                        <span class="breakdown-count" id="correctCount">0</span>
                        <span class="breakdown-label">Correct</span>
                    </div>
                    <div class="breakdown-item wrong">
                        <span class="breakdown-icon">❌</span>
                        <span class="breakdown-count" id="wrongCount">0</span>
                        <span class="breakdown-label">Wrong</span>
                    </div>
                    <div class="breakdown-item time">
                        <span class="breakdown-icon">⏱️</span>
                        <span class="breakdown-count" id="timeTaken">0s</span>
                        <span class="breakdown-label">Time</span>
                    </div>
                </div>
                
                <div class="results-actions">
                    <button class="quiz-btn quiz-btn-secondary" onclick="IlmifyQuiz.reviewAnswers()">📋 Review Answers</button>
                    <button class="quiz-btn quiz-btn-primary" onclick="IlmifyQuiz.restartQuiz()">🔄 Try Again</button>
                    <button class="quiz-btn quiz-btn-outline" onclick="IlmifyQuiz.backToStart()">🏠 New Quiz</button>
                </div>
            </div>
            
            <div class="quiz-review-panel" id="quizReviewPanel" style="display: none;">
                <div class="review-header">
                    <h3>📋 Answer Review</h3>
                    <button class="quiz-btn quiz-btn-outline" onclick="IlmifyQuiz.backToResults()">← Back to Results</button>
                </div>
                <div class="review-list" id="reviewList"></div>
            </div>
        `;

        updateQuizStats();
    }

    // Start a new quiz
    function startQuiz() {
        const subject = document.getElementById('quizSubject').value;
        const difficulty = document.getElementById('quizDifficulty').value;
        const count = parseInt(document.getElementById('quizCount').value);

        if (!subject) {
            showToast('Please select a subject', 'error');
            return;
        }
        if (!difficulty) {
            showToast('Please select a difficulty', 'error');
            return;
        }

        // Get questions
        const questions = getRandomQuestions(subject, difficulty, count);
        
        if (questions.length === 0) {
            showToast('No questions available for this selection', 'error');
            return;
        }

        // Initialize quiz state
        currentQuiz = {
            questions: questions,
            currentIndex: 0,
            score: 0,
            answers: [],
            subject: subject,
            difficulty: difficulty,
            startTime: Date.now()
        };

        // Update UI
        document.getElementById('quizStartPanel').style.display = 'none';
        document.getElementById('quizPlayPanel').style.display = 'block';
        document.getElementById('quizResultsPanel').style.display = 'none';
        document.getElementById('quizReviewPanel').style.display = 'none';

        // Set subject badge
        const subjectNames = {
            science: '🔬 Science',
            math: '📐 Math',
            english: '📝 English',
            islamicStudies: '🕌 Islamic',
            pakistanStudies: '🇵🇰 Pak Studies',
            generalKnowledge: '🌍 GK'
        };
        document.getElementById('quizSubjectBadge').textContent = subjectNames[subject] || subject;

        showQuestion();
    }

    // Get random questions based on selection
    function getRandomQuestions(subject, difficulty, count) {
        let pool = [];
        const subjectQuestions = questionBank[subject];
        
        if (!subjectQuestions) return [];

        if (difficulty === 'mixed') {
            // Get from all difficulties
            if (subjectQuestions.easy) pool = pool.concat(subjectQuestions.easy);
            if (subjectQuestions.medium) pool = pool.concat(subjectQuestions.medium);
            if (subjectQuestions.hard) pool = pool.concat(subjectQuestions.hard);
        } else {
            pool = subjectQuestions[difficulty] || [];
        }

        // Shuffle and take required count
        const shuffled = shuffleArray([...pool]);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    // Shuffle array (Fisher-Yates)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Show current question
    function showQuestion() {
        const question = currentQuiz.questions[currentQuiz.currentIndex];
        const total = currentQuiz.questions.length;

        // Update progress
        document.getElementById('quizQuestionNum').textContent = `Question ${currentQuiz.currentIndex + 1}/${total}`;
        document.getElementById('quizScoreLive').textContent = currentQuiz.score;
        
        const progressPercent = ((currentQuiz.currentIndex) / total) * 100;
        document.getElementById('quizProgressFill').style.width = progressPercent + '%';

        // Show question
        document.getElementById('questionText').textContent = question.q;

        // Show options
        const optionsHtml = question.options.map((opt, idx) => `
            <button class="quiz-option" onclick="IlmifyQuiz.selectAnswer(${idx})" data-index="${idx}">
                <span class="option-letter">${String.fromCharCode(65 + idx)}</span>
                <span class="option-text">${opt}</span>
            </button>
        `).join('');
        
        document.getElementById('questionOptions').innerHTML = optionsHtml;

        // Hide feedback and next button
        document.getElementById('quizFeedback').style.display = 'none';
        document.getElementById('quizNextBtn').style.display = 'none';
    }

    // Handle answer selection
    function selectAnswer(index) {
        const question = currentQuiz.questions[currentQuiz.currentIndex];
        const isCorrect = index === question.answer;

        // Record answer
        currentQuiz.answers.push({
            question: question.q,
            selected: index,
            correct: question.answer,
            isCorrect: isCorrect
        });

        if (isCorrect) {
            currentQuiz.score++;
        }

        // Disable all options
        const options = document.querySelectorAll('.quiz-option');
        options.forEach((opt, idx) => {
            opt.disabled = true;
            opt.onclick = null;
            
            if (idx === question.answer) {
                opt.classList.add('correct');
            } else if (idx === index && !isCorrect) {
                opt.classList.add('wrong');
            }
        });

        // Show feedback
        const feedback = document.getElementById('quizFeedback');
        const feedbackIcon = document.getElementById('feedbackIcon');
        const feedbackText = document.getElementById('feedbackText');
        const feedbackExplanation = document.getElementById('feedbackExplanation');

        if (isCorrect) {
            feedbackIcon.textContent = '✅';
            feedbackText.textContent = 'Correct! Well done!';
            feedback.className = 'quiz-feedback correct';
        } else {
            feedbackIcon.textContent = '❌';
            feedbackText.textContent = `Wrong! The correct answer was: ${question.options[question.answer]}`;
            feedback.className = 'quiz-feedback wrong';
        }
        
        feedbackExplanation.textContent = question.explanation || '';
        feedback.style.display = 'block';

        // Update live score
        document.getElementById('quizScoreLive').textContent = currentQuiz.score;

        // Show next button or finish
        const nextBtn = document.getElementById('quizNextBtn');
        if (currentQuiz.currentIndex < currentQuiz.questions.length - 1) {
            nextBtn.textContent = 'Next Question ➡️';
        } else {
            nextBtn.textContent = 'See Results 🏆';
        }
        nextBtn.style.display = 'block';
    }

    // Go to next question
    function nextQuestion() {
        if (currentQuiz.currentIndex < currentQuiz.questions.length - 1) {
            currentQuiz.currentIndex++;
            showQuestion();
        } else {
            showResults();
        }
    }

    // Show quiz results
    function showResults() {
        const total = currentQuiz.questions.length;
        const score = currentQuiz.score;
        const percentage = Math.round((score / total) * 100);
        const timeTaken = Math.round((Date.now() - currentQuiz.startTime) / 1000);

        // Hide play panel, show results
        document.getElementById('quizPlayPanel').style.display = 'none';
        document.getElementById('quizResultsPanel').style.display = 'block';

        // Update results UI
        document.getElementById('finalScore').textContent = score;
        document.getElementById('totalQuestions').textContent = total;
        document.getElementById('resultsPercentage').textContent = percentage + '%';
        document.getElementById('correctCount').textContent = score;
        document.getElementById('wrongCount').textContent = total - score;
        document.getElementById('timeTaken').textContent = formatTime(timeTaken);

        // Animate score circle
        const circumference = 283; // 2 * PI * 45
        const offset = circumference - (percentage / 100) * circumference;
        setTimeout(() => {
            document.getElementById('scoreCircle').style.strokeDashoffset = offset;
        }, 100);

        // Set message based on score
        let icon, title, message;
        if (percentage >= 90) {
            icon = '🏆';
            title = 'Excellent!';
            message = 'Outstanding performance! You\'re a star!';
        } else if (percentage >= 70) {
            icon = '🎉';
            title = 'Great Job!';
            message = 'Well done! Keep up the good work!';
        } else if (percentage >= 50) {
            icon = '👍';
            title = 'Good Effort!';
            message = 'Not bad! A little more practice will help!';
        } else {
            icon = '💪';
            title = 'Keep Trying!';
            message = 'Don\'t give up! Practice makes perfect!';
        }

        document.getElementById('resultsIcon').textContent = icon;
        document.getElementById('resultsTitle').textContent = title;
        document.getElementById('resultsMessage').textContent = message;

        // Save to history
        saveQuizHistory(percentage, timeTaken);
    }

    // Format time in mm:ss
    function formatTime(seconds) {
        if (seconds < 60) return seconds + 's';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    }

    // Review answers
    function reviewAnswers() {
        document.getElementById('quizResultsPanel').style.display = 'none';
        document.getElementById('quizReviewPanel').style.display = 'block';

        const reviewList = document.getElementById('reviewList');
        reviewList.innerHTML = currentQuiz.answers.map((ans, idx) => {
            const question = currentQuiz.questions[idx];
            return `
                <div class="review-item ${ans.isCorrect ? 'correct' : 'wrong'}">
                    <div class="review-item-header">
                        <span class="review-num">Q${idx + 1}</span>
                        <span class="review-status">${ans.isCorrect ? '✅ Correct' : '❌ Wrong'}</span>
                    </div>
                    <div class="review-question">${question.q}</div>
                    <div class="review-answers">
                        <div class="review-your-answer ${ans.isCorrect ? 'correct' : 'wrong'}">
                            Your answer: <strong>${question.options[ans.selected]}</strong>
                        </div>
                        ${!ans.isCorrect ? `
                            <div class="review-correct-answer">
                                Correct answer: <strong>${question.options[question.answer]}</strong>
                            </div>
                        ` : ''}
                    </div>
                    <div class="review-explanation">${question.explanation || ''}</div>
                </div>
            `;
        }).join('');
    }

    // Back to results
    function backToResults() {
        document.getElementById('quizReviewPanel').style.display = 'none';
        document.getElementById('quizResultsPanel').style.display = 'block';
    }

    // Restart same quiz
    function restartQuiz() {
        currentQuiz.currentIndex = 0;
        currentQuiz.score = 0;
        currentQuiz.answers = [];
        currentQuiz.startTime = Date.now();
        currentQuiz.questions = shuffleArray([...currentQuiz.questions]);

        document.getElementById('quizResultsPanel').style.display = 'none';
        document.getElementById('quizPlayPanel').style.display = 'block';

        showQuestion();
    }

    // Back to start
    function backToStart() {
        document.getElementById('quizResultsPanel').style.display = 'none';
        document.getElementById('quizReviewPanel').style.display = 'none';
        document.getElementById('quizPlayPanel').style.display = 'none';
        document.getElementById('quizStartPanel').style.display = 'block';

        // Reset score circle
        document.getElementById('scoreCircle').style.strokeDashoffset = 283;
    }

    // Quit quiz
    function quitQuiz() {
        if (confirm('Are you sure you want to quit? Your progress will be lost.')) {
            backToStart();
        }
    }

    // Save quiz history
    function saveQuizHistory(percentage, timeTaken) {
        try {
            const history = JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY) || '[]');
            history.push({
                subject: currentQuiz.subject,
                difficulty: currentQuiz.difficulty,
                score: currentQuiz.score,
                total: currentQuiz.questions.length,
                percentage: percentage,
                time: timeTaken,
                date: new Date().toISOString()
            });
            
            // Keep last 50 entries
            if (history.length > 50) {
                history.shift();
            }
            
            localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(history));
            updateQuizStats();
        } catch (e) {
            console.error('Error saving quiz history:', e);
        }
    }

    // Load and display quiz stats
    function loadQuizHistory() {
        updateQuizStats();
    }

    function updateQuizStats() {
        try {
            const history = JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY) || '[]');
            
            const totalQuizzes = history.length;
            const avgScore = totalQuizzes > 0 
                ? Math.round(history.reduce((sum, q) => sum + q.percentage, 0) / totalQuizzes)
                : 0;
            
            // Calculate best streak (consecutive scores >= 70%)
            let bestStreak = 0;
            let currentStreak = 0;
            history.forEach(q => {
                if (q.percentage >= 70) {
                    currentStreak++;
                    bestStreak = Math.max(bestStreak, currentStreak);
                } else {
                    currentStreak = 0;
                }
            });

            document.getElementById('totalQuizzesTaken').textContent = totalQuizzes;
            document.getElementById('averageScore').textContent = avgScore + '%';
            document.getElementById('bestStreak').textContent = bestStreak;
        } catch (e) {
            console.error('Error updating quiz stats:', e);
        }
    }

    // Show toast notification
    function showToast(message, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
        } else {
            alert(message);
        }
    }

    // Expose public API
    window.IlmifyQuiz = {
        init,
        startQuiz,
        selectAnswer,
        nextQuestion,
        reviewAnswers,
        backToResults,
        restartQuiz,
        backToStart,
        quitQuiz
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
