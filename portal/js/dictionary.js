/**
 * Ilmify Dictionary - Simple & Fast
 * Uses a single compact JSON file for all lookups
 */

(function() {
    'use strict';

    // Urdu translations for common words
    const URDU = {
        education: 'تعلیم', learn: 'سیکھنا', book: 'کتاب', school: 'اسکول',
        teacher: 'استاد', student: 'طالب علم', knowledge: 'علم', science: 'سائنس',
        math: 'ریاضی', history: 'تاریخ', english: 'انگریزی', read: 'پڑھنا',
        write: 'لکھنا', study: 'مطالعہ', class: 'جماعت', exam: 'امتحان',
        water: 'پانی', food: 'کھانا', health: 'صحت', family: 'خاندان',
        home: 'گھر', work: 'کام', time: 'وقت', day: 'دن', night: 'رات',
        good: 'اچھا', bad: 'برا', big: 'بڑا', small: 'چھوٹا', new: 'نیا',
        old: 'پرانا', happy: 'خوش', sad: 'اداس', love: 'محبت', help: 'مدد',
        friend: 'دوست', mother: 'ماں', father: 'باپ', child: 'بچہ',
        world: 'دنیا', country: 'ملک', city: 'شہر', village: 'گاؤں',
        sun: 'سورج', moon: 'چاند', star: 'ستارہ', earth: 'زمین',
        tree: 'درخت', flower: 'پھول', animal: 'جانور', bird: 'پرندہ',
        man: 'آدمی', woman: 'عورت', person: 'شخص', people: 'لوگ',
        question: 'سوال', answer: 'جواب', problem: 'مسئلہ', solution: 'حل',
        computer: 'کمپیوٹر', phone: 'فون', internet: 'انٹرنیٹ',
        money: 'پیسہ', job: 'نوکری', business: 'کاروبار',
        doctor: 'ڈاکٹر', hospital: 'ہسپتال', medicine: 'دوائی',
        Pakistan: 'پاکستان', language: 'زبان', Urdu: 'اردو'
    };

    let words = [];
    let wordMap = new Map();
    let loaded = false;
    let loading = null;

    function getBasePath() {
        return window.location.pathname.includes('/portal/')
            ? 'data/dictionary/dictionary.compact.json'
            : 'portal/data/dictionary/dictionary.compact.json';
    }

    function normalize(str) {
        return (str || '').toLowerCase().trim();
    }

    async function loadDictionary() {
        if (loaded) return true;
        if (loading) return loading;

        loading = (async () => {
            try {
                const response = await fetch(getBasePath());
                if (!response.ok) {
                    console.error('Dictionary load failed:', response.status);
                    return false;
                }
                const data = await response.json();
                
                if (data.words && Array.isArray(data.words)) {
                    words = data.words;
                    // Build lookup map
                    for (const entry of words) {
                        const key = normalize(entry.w);
                        if (!wordMap.has(key)) {
                            wordMap.set(key, entry);
                        }
                    }
                    loaded = true;
                    console.log(`Dictionary loaded: ${words.length} words`);
                    return true;
                }
                return false;
            } catch (err) {
                console.error('Dictionary error:', err);
                return false;
            }
        })();

        return loading;
    }

    function formatEntry(entry) {
        if (!entry) return null;
        
        const word = entry.w || '';
        const part = entry.p || (entry.m && entry.m[0] && entry.m[0].p) || 'noun';
        const meanings = (entry.m || []).map(m => ({
            definition: m.d || '',
            partOfSpeech: m.p || part,
            example: m.e || '',
            synonyms: m.s || []
        }));

        return {
            word: word,
            normalized: normalize(word),
            primaryPart: part,
            primaryDefinition: meanings[0]?.definition || '',
            meanings: meanings,
            synonyms: [...new Set(meanings.flatMap(m => m.synonyms))],
            urdu: URDU[normalize(word)] || null
        };
    }

    function search(query) {
        const q = normalize(query);
        if (!q || !loaded) return [];

        const results = [];
        const seen = new Set();

        // Exact match first
        const exact = wordMap.get(q);
        if (exact) {
            results.push(formatEntry(exact));
            seen.add(q);
        }

        // Prefix matches
        if (results.length < 10) {
            for (const entry of words) {
                const key = normalize(entry.w);
                if (seen.has(key)) continue;
                if (key.startsWith(q)) {
                    results.push(formatEntry(entry));
                    seen.add(key);
                    if (results.length >= 10) break;
                }
            }
        }

        // Contains matches
        if (results.length < 10) {
            for (const entry of words) {
                const key = normalize(entry.w);
                if (seen.has(key)) continue;
                if (key.includes(q)) {
                    results.push(formatEntry(entry));
                    seen.add(key);
                    if (results.length >= 10) break;
                }
            }
        }

        return results;
    }

    function getWordOfTheDay() {
        if (!loaded || words.length === 0) return null;
        
        // Use date to pick a consistent word
        const today = new Date();
        const start = new Date(today.getFullYear(), 0, 1);
        const day = Math.floor((today - start) / 86400000);
        const index = day % words.length;
        
        return formatEntry(words[index]);
    }

    function formatHTML(entry) {
        if (!entry) return '';

        let html = `<div class="dict-entry">
            <div class="dict-word">
                <span class="dict-word-text">${entry.word}</span>
                <span class="dict-word-type">${entry.primaryPart}</span>
            </div>`;

        entry.meanings.slice(0, 3).forEach((m, i) => {
            html += `<div class="dict-meaning-block">
                <div class="dict-definition"><strong>${i + 1}.</strong> ${m.definition}</div>`;
            if (m.example) {
                html += `<div class="dict-example"><strong>Example:</strong> ${m.example}</div>`;
            }
            if (m.synonyms && m.synonyms.length > 0) {
                html += `<div class="dict-synonyms"><strong>Synonyms:</strong> ${m.synonyms.slice(0, 5).join(', ')}</div>`;
            }
            html += `</div>`;
        });

        html += `<div class="dict-urdu"><strong>اردو:</strong> ${entry.urdu || 'ترجمہ دستیاب نہیں'}</div>`;
        html += `</div>`;

        return html;
    }

    // Public API
    window.IlmifyDictionary = {
        ready: loadDictionary,
        search: async function(query) {
            await loadDictionary();
            return search(query);
        },
        getWordOfTheDay: async function() {
            await loadDictionary();
            return getWordOfTheDay();
        },
        formatEntry: formatHTML,
        hasWord: async function(word) {
            await loadDictionary();
            return wordMap.has(normalize(word));
        },
        getRandomWords: async function(count = 5) {
            await loadDictionary();
            if (words.length === 0) return [];
            const result = [];
            const used = new Set();
            while (result.length < count && used.size < words.length) {
                const idx = Math.floor(Math.random() * words.length);
                if (!used.has(idx)) {
                    used.add(idx);
                    result.push(formatEntry(words[idx]));
                }
            }
            return result;
        }
    };

    // Auto-load on page ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadDictionary);
    } else {
        loadDictionary();
    }
})();
