/**
 * Ilmify - Main JavaScript
 * Education That Reaches You
 */

// Global state
let allResources = [];
let currentCategory = null;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const resourcesGrid = document.getElementById('resourcesGrid');
const resourcesTitle = document.getElementById('resourcesTitle');
const backBtn = document.getElementById('backBtn');
const noResults = document.getElementById('noResults');
const categoryCards = document.querySelectorAll('.category-card');

// Initialize the application
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadMetadata();
    updateCategoryCounts();
    displayResources(allResources);
    setupEventListeners();
}

/**
 * Detect base path based on current page location
 */
function getBasePath() {
    const path = window.location.pathname;
    // If we're in /portal/, metadata is at data/metadata.json and content at ../content/
    // If we're at root /, metadata is at portal/data/metadata.json and content at content/
    if (path.includes('/portal/')) {
        return { metadata: 'data/metadata.json', contentPrefix: '../' };
    } else {
        return { metadata: 'portal/data/metadata.json', contentPrefix: '' };
    }
}

/**
 * Load metadata from JSON file
 */
async function loadMetadata() {
    try {
        const paths = getBasePath();
        const response = await fetch(paths.metadata);
        if (!response.ok) {
            throw new Error('Failed to load metadata');
        }
        allResources = await response.json();
        
        // Fix filepaths based on current location
        allResources = allResources.map(r => ({
            ...r,
            filepath: paths.contentPrefix + r.filepath
        }));
        
        // Filter out deleted resources
        const deletedResources = JSON.parse(localStorage.getItem('ilmify_deleted_resources') || '[]');
        allResources = allResources.filter(r => !deletedResources.includes(r.id));
        
        console.log(`Loaded ${allResources.length} resources from ${paths.metadata}`);
    } catch (error) {
        console.error('Error loading metadata:', error);
        resourcesGrid.innerHTML = `
            <div class="error-message">
                <span class="error-icon">⚠️</span>
                <p>Unable to load resources. Please ensure metadata.json exists.</p>
                <p>وسائل لوڈ نہیں ہو سکے۔ براہ کرم metadata.json چیک کریں۔</p>
            </div>
        `;
    }
}

/**
 * Update category counts in the UI
 */
function updateCategoryCounts() {
    const counts = {
        textbooks: 0,
        videos: 0,
        'health-guides': 0
    };

    allResources.forEach(resource => {
        if (counts.hasOwnProperty(resource.category)) {
            counts[resource.category]++;
        }
    });

    // Update count displays
    Object.keys(counts).forEach(category => {
        const countElement = document.getElementById(`${category}-count`);
        if (countElement) {
            const count = counts[category];
            countElement.textContent = `${count} ${count === 1 ? 'resource' : 'resources'}`;
        }
    });
}

/**
 * Display resources in the grid
 * @param {Array} resources - Array of resource objects to display
 */
function displayResources(resources) {
    resourcesGrid.innerHTML = '';

    if (resources.length === 0) {
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';

    resources.forEach(resource => {
        const card = createResourceCard(resource);
        resourcesGrid.appendChild(card);
    });
}

/**
 * Create a resource card element
 * @param {Object} resource - Resource object
 * @returns {HTMLElement} Resource card element
 */
function createResourceCard(resource) {
    const card = document.createElement('a');
    card.className = 'resource-card';
    card.href = resource.filepath;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    // Determine icon based on format
    let icon = '📄';
    let formatLabel = resource.format.toUpperCase();
    
    if (resource.format === 'pdf') {
        icon = '📕';
    } else if (resource.format === 'mp4' || resource.format === 'video') {
        icon = '🎥';
        formatLabel = 'VIDEO';
    }

    // Determine category label
    const categoryLabels = {
        'textbooks': 'Textbook',
        'videos': 'Video',
        'health-guides': 'Health Guide'
    };
    const categoryLabel = categoryLabels[resource.category] || resource.category;

    // Check if user is faculty for delete button
    const isFaculty = window.IlmifyAuth && window.IlmifyAuth.isFaculty();

    card.dataset.resourceId = resource.id;
    card.dataset.filepath = resource.filepath;
    card.innerHTML = `
        <div class="resource-icon">${icon}</div>
        <div class="resource-info">
            <h4 class="resource-title">${escapeHtml(resource.title)}</h4>
            <div class="resource-meta">
                <span class="resource-format">${formatLabel}</span>
                <span class="resource-category">${categoryLabel}</span>
            </div>
        </div>
        <div class="resource-actions">
            ${isFaculty ? `<button class="action-btn delete-btn" onclick="event.preventDefault(); event.stopPropagation(); openDeleteModal(${resource.id}, '${escapeHtml(resource.title).replace(/'/g, "\\'")}', '${resource.filepath}')" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>` : ''}
            <span class="action-btn download-btn" title="Download">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </span>
        </div>
    `;

    return card;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Filter resources by search term
 * @param {string} searchTerm - Search term
 */
function filterBySearch(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
        // If no search term, show current category or all resources
        if (currentCategory) {
            filterByCategory(currentCategory);
        } else {
            resourcesTitle.textContent = 'All Resources';
            displayResources(allResources);
        }
        return;
    }

    // Split search term into words for better matching
    const searchWords = term.split(/\s+/).filter(w => w.length > 0);
    
    let filtered = allResources.filter(resource => {
        const titleLower = resource.title.toLowerCase();
        const categoryLower = resource.category.toLowerCase();
        const formatLower = resource.format.toLowerCase();
        
        // Check if ALL words match (AND logic for multiple words)
        return searchWords.every(word => 
            titleLower.includes(word) || 
            categoryLower.includes(word) ||
            formatLower.includes(word)
        );
    });

    // If viewing a specific category, filter within that category
    if (currentCategory) {
        filtered = filtered.filter(resource => resource.category === currentCategory);
    }

    resourcesTitle.textContent = `Search: "${searchTerm}" (${filtered.length} results)`;
    displayResources(filtered);
}

/**
 * Filter resources by category
 * @param {string} category - Category name
 */
function filterByCategory(category) {
    currentCategory = category;
    
    const filtered = allResources.filter(resource => resource.category === category);
    
    // Update title
    const categoryTitles = {
        'textbooks': 'School Textbooks - نصابی کتابیں',
        'videos': 'Video Lectures - ویڈیو لیکچرز',
        'health-guides': 'Health Guides - صحت کے رہنما'
    };
    
    resourcesTitle.textContent = categoryTitles[category] || category;
    backBtn.style.display = 'inline-block';
    
    displayResources(filtered);
    
    // Scroll to resources section
    document.getElementById('resourcesSection').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Show all resources (reset category filter)
 */
function showAllResources() {
    currentCategory = null;
    resourcesTitle.textContent = 'All Resources';
    backBtn.style.display = 'none';
    searchInput.value = '';
    displayResources(allResources);
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        filterBySearch(e.target.value);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            filterBySearch(e.target.value);
        }
    });

    searchBtn.addEventListener('click', () => {
        filterBySearch(searchInput.value);
    });

    // Category card clicks
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const category = card.dataset.category;
            filterByCategory(category);
        });
    });

    // Back button
    backBtn.addEventListener('click', showAllResources);
}
