/**
 * Ilmify - Courses Module
 * Handles course creation, management, and student progress tracking
 * With ownership control: Faculty can only manage their own courses, Admin can manage all
 */

(function() {
    'use strict';

    // Course storage keys
    const COURSES_KEY = 'ilmify_courses';
    const PROGRESS_KEY = 'ilmify_course_progress';

    // Sample courses data structure
    let coursesData = [];
    let currentCourse = null;
    let currentLesson = null;
    let filteredCourses = []; // For search/filter functionality

    // Check if current user can manage a course
    function canManageCourse(course) {
        const session = window.IlmifyAuth?.getSession();
        if (!session) return false;
        
        // Admin can manage all courses
        if (session.isAdmin) return true;
        
        // Faculty can only manage their own courses
        if (session.role === 'faculty' || session.role === 'admin') {
            // Check if the course was created by this user
            const userId = session.userId || session.email || session.name;
            return course.createdBy === userId || course.instructor === session.name;
        }
        
        return false;
    }

    // Get current user ID for ownership tracking
    function getCurrentUserId() {
        const session = window.IlmifyAuth?.getSession();
        if (!session) return null;
        return session.userId || session.email || session.name;
    }

    // Initialize courses module
    async function init() {
        await loadCourses();
        
        // Check if we're on the courses page or main page
        const isCoursesPage = window.location.pathname.includes('courses.html');
        
        if (isCoursesPage) {
            renderCoursesPage();
        } else {
            renderCoursesSection();
        }
        
        setupEventListeners();
    }

    // Load courses from server (with localStorage fallback)
    async function loadCourses() {
        try {
            // Try to load from server first
            const response = await fetch('/api/courses');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.courses && data.courses.length > 0) {
                    coursesData = data.courses;
                    // Also update localStorage as cache
                    localStorage.setItem(COURSES_KEY, JSON.stringify(coursesData));
                    filteredCourses = [...coursesData];
                    console.log('Courses loaded from server:', coursesData.length);
                    return;
                }
            }
        } catch (e) {
            console.log('Server unavailable, using localStorage');
        }
        
        // Fallback to localStorage
        try {
            const saved = localStorage.getItem(COURSES_KEY);
            if (saved) {
                coursesData = JSON.parse(saved);
                // Migrate old courses to have createdBy field
                coursesData = coursesData.map(course => {
                    if (!course.createdBy) {
                        course.createdBy = course.instructor || 'system';
                    }
                    return course;
                });
            } else {
                // Initialize with sample courses
                coursesData = getSampleCourses();
                saveCourses();
            }
            filteredCourses = [...coursesData];
        } catch (e) {
            console.error('Error loading courses:', e);
            coursesData = getSampleCourses();
            filteredCourses = [...coursesData];
        }
    }

    // Save courses to server and localStorage
    async function saveCourses() {
        try {
            // Save to localStorage first (always works)
            localStorage.setItem(COURSES_KEY, JSON.stringify(coursesData));
            
            // Then try to sync to server
            const response = await fetch('/api/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courses: coursesData })
            });
            
            if (response.ok) {
                console.log('Courses synced to server');
            }
        } catch (e) {
            console.log('Server sync failed, saved to localStorage only');
        }
    }

    // Get sample courses
    function getSampleCourses() {
        return [
            {
                id: 'course_1',
                title: 'Introduction to Science',
                titleUrdu: 'سائنس کا تعارف',
                description: 'Learn the basics of science including physics, chemistry, and biology fundamentals.',
                thumbnail: '🔬',
                category: 'Science',
                instructor: 'Dr. Ahmed Khan',
                createdBy: 'system', // System-created sample course
                createdAt: Date.now(),
                lessons: [
                    {
                        id: 'lesson_1_1',
                        title: 'What is Science?',
                        type: 'text',
                        content: `<h3>What is Science?</h3>
                        <p>Science is a systematic way of learning about the natural world through observation and experimentation.</p>
                        <h4>Key Points:</h4>
                        <ul>
                            <li><strong>Observation:</strong> Carefully watching and recording what happens</li>
                            <li><strong>Hypothesis:</strong> Making an educated guess about why something happens</li>
                            <li><strong>Experiment:</strong> Testing your hypothesis</li>
                            <li><strong>Conclusion:</strong> Analyzing results and drawing conclusions</li>
                        </ul>
                        <p>Science helps us understand everything from tiny atoms to vast galaxies!</p>`,
                        duration: 5
                    },
                    {
                        id: 'lesson_1_2',
                        title: 'The Scientific Method',
                        type: 'text',
                        content: `<h3>The Scientific Method</h3>
                        <p>The scientific method is a step-by-step process scientists use to answer questions:</p>
                        <ol>
                            <li><strong>Ask a Question</strong> - What do you want to know?</li>
                            <li><strong>Do Background Research</strong> - What do others know?</li>
                            <li><strong>Construct a Hypothesis</strong> - What do you think will happen?</li>
                            <li><strong>Test with an Experiment</strong> - Does it work?</li>
                            <li><strong>Analyze Data</strong> - What did you find?</li>
                            <li><strong>Draw Conclusions</strong> - Was your hypothesis correct?</li>
                            <li><strong>Communicate Results</strong> - Share what you learned!</li>
                        </ol>`,
                        duration: 8
                    }
                ]
            },
            {
                id: 'course_2',
                title: 'Healthy Living Basics',
                titleUrdu: 'صحت مند زندگی',
                description: 'Essential health and hygiene practices for students and families.',
                thumbnail: '🏥',
                category: 'Health',
                instructor: 'Dr. Fatima Ali',
                createdBy: 'system', // System-created sample course
                createdAt: Date.now(),
                lessons: [
                    {
                        id: 'lesson_2_1',
                        title: 'Personal Hygiene',
                        type: 'text',
                        content: `<h3>Personal Hygiene / ذاتی صفائی</h3>
                        <p>Good hygiene keeps you healthy and prevents diseases.</p>
                        <h4>Daily Hygiene Habits:</h4>
                        <ul>
                            <li>🧼 <strong>Wash hands</strong> with soap for 20 seconds</li>
                            <li>🪥 <strong>Brush teeth</strong> twice daily</li>
                            <li>🚿 <strong>Bathe regularly</strong> to stay clean</li>
                            <li>👕 <strong>Wear clean clothes</strong> every day</li>
                            <li>💅 <strong>Keep nails trimmed</strong> and clean</li>
                        </ul>
                        <p><em>ہاتھ دھونا بیماریوں سے بچنے کا سب سے آسان طریقہ ہے!</em></p>`,
                        duration: 6
                    },
                    {
                        id: 'lesson_2_2',
                        title: 'Healthy Eating',
                        type: 'text',
                        content: `<h3>Healthy Eating / صحت بخش خوراک</h3>
                        <p>A balanced diet gives your body the nutrients it needs.</p>
                        <h4>Food Groups:</h4>
                        <ul>
                            <li>🍎 <strong>Fruits & Vegetables:</strong> Vitamins and minerals</li>
                            <li>🍞 <strong>Grains:</strong> Energy from carbohydrates</li>
                            <li>🥛 <strong>Dairy:</strong> Calcium for strong bones</li>
                            <li>🍗 <strong>Protein:</strong> Meat, eggs, beans for muscle</li>
                            <li>💧 <strong>Water:</strong> 8 glasses daily!</li>
                        </ul>
                        <p><strong>Tip:</strong> Eat more fruits and vegetables, less sugar and fried foods.</p>`,
                        duration: 7
                    }
                ]
            }
        ];
    }

    // Get user progress
    function getProgress() {
        try {
            const saved = localStorage.getItem(PROGRESS_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    }

    // Save user progress
    function saveProgress(progress) {
        try {
            localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
        } catch (e) {
            console.error('Error saving progress:', e);
        }
    }

    // Mark lesson as complete
    function markLessonComplete(courseId, lessonId) {
        const progress = getProgress();
        if (!progress[courseId]) {
            progress[courseId] = { completedLessons: [], startedAt: Date.now() };
        }
        if (!progress[courseId].completedLessons.includes(lessonId)) {
            progress[courseId].completedLessons.push(lessonId);
            progress[courseId].lastAccessedAt = Date.now();
        }
        saveProgress(progress);
        updateProgressUI(courseId);
    }

    // Get course progress percentage
    function getCourseProgress(courseId) {
        const course = coursesData.find(c => c.id === courseId);
        if (!course || !course.lessons.length) return 0;
        
        const progress = getProgress();
        const courseProgress = progress[courseId];
        if (!courseProgress) return 0;
        
        return Math.round((courseProgress.completedLessons.length / course.lessons.length) * 100);
    }

    // Render courses section in main page (summary view)
    function renderCoursesSection() {
        const container = document.getElementById('coursesContainer');
        if (!container) return;

        const session = window.IlmifyAuth?.getSession();
        const isFacultyOrAdmin = session && (session.role === 'faculty' || session.role === 'admin' || session.isAdmin);

        // Show only first 4 courses as preview
        const previewCourses = coursesData.slice(0, 4);

        let html = `
            <div class="courses-header">
                <h2 class="section-title">📚 Courses / کورسز</h2>
                <a href="courses.html" class="btn btn-secondary view-all-btn">View All Courses →</a>
            </div>
            <div class="courses-grid">
        `;

        if (coursesData.length === 0) {
            html += `
                <div class="no-courses">
                    <span>📭</span>
                    <p>No courses available yet.</p>
                    <p><a href="courses.html">Go to Courses</a> to create one!</p>
                </div>
            `;
        } else {
            previewCourses.forEach(course => {
                const progress = getCourseProgress(course.id);
                const lessonsCount = course.lessons?.length || 0;
                const userCanManage = canManageCourse(course);
                
                html += `
                    <div class="course-card" onclick="window.location.href='courses.html'">
                        <div class="course-thumbnail">${course.thumbnail || '📖'}</div>
                        <div class="course-info">
                            <h3 class="course-title">${course.title}</h3>
                            <p class="course-title-urdu">${course.titleUrdu || ''}</p>
                            <p class="course-meta">
                                <span>📚 ${lessonsCount} Lessons</span>
                                <span>👨‍🏫 ${course.instructor || 'Ilmify'}</span>
                            </p>
                            <div class="course-progress">
                                <div class="progress-bar-mini">
                                    <div class="progress-fill-mini" style="width: ${progress}%"></div>
                                </div>
                                <span class="progress-text-mini">${progress}% Complete</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            // Show "more courses" indicator if there are more
            if (coursesData.length > 4) {
                html += `
                    <div class="course-card more-courses-card" onclick="window.location.href='courses.html'">
                        <div class="more-courses-content">
                            <span class="more-icon">➕</span>
                            <p>${coursesData.length - 4} more courses</p>
                            <small>Click to view all</small>
                        </div>
                    </div>
                `;
            }
        }

        html += '</div>';
        container.innerHTML = html;
    }

    // Render full courses page
    function renderCoursesPage() {
        renderFilteredCourses(filteredCourses);
        updateCoursesCount(filteredCourses.length);
    }

    // Filter and render courses
    function filterAndRenderCourses(searchTerm = '', category = 'all') {
        filteredCourses = coursesData.filter(course => {
            const matchesSearch = !searchTerm || 
                course.title.toLowerCase().includes(searchTerm) ||
                (course.titleUrdu && course.titleUrdu.includes(searchTerm)) ||
                (course.description && course.description.toLowerCase().includes(searchTerm)) ||
                (course.instructor && course.instructor.toLowerCase().includes(searchTerm));
            
            const matchesCategory = category === 'all' || course.category === category;
            
            return matchesSearch && matchesCategory;
        });
        
        renderFilteredCourses(filteredCourses);
        updateCoursesCount(filteredCourses.length);
    }

    // Render filtered courses on courses page
    function renderFilteredCourses(courses) {
        const container = document.getElementById('coursesGridPage');
        const noResults = document.getElementById('noCoursesFound');
        
        if (!container) return;

        if (courses.length === 0) {
            container.innerHTML = '';
            if (noResults) noResults.style.display = 'block';
            return;
        }
        
        if (noResults) noResults.style.display = 'none';

        const session = window.IlmifyAuth?.getSession();
        const isFacultyOrAdmin = session && (session.role === 'faculty' || session.role === 'admin' || session.isAdmin);

        let html = '';
        courses.forEach(course => {
            const progress = getCourseProgress(course.id);
            const lessonsCount = course.lessons?.length || 0;
            const userCanManage = canManageCourse(course);
            
            html += `
                <div class="course-card-page" onclick="IlmifyCourses.openCourse('${course.id}')">
                    <div class="course-card-header">
                        <div class="course-thumbnail-large">${course.thumbnail || '📖'}</div>
                        <span class="course-category-badge">${course.category || 'Other'}</span>
                    </div>
                    <div class="course-card-body">
                        <h3 class="course-title">${course.title}</h3>
                        <p class="course-title-urdu">${course.titleUrdu || ''}</p>
                        <p class="course-description">${course.description || 'No description available.'}</p>
                        <div class="course-meta">
                            <span>📚 ${lessonsCount} Lessons</span>
                            <span>👨‍🏫 ${course.instructor || 'Ilmify'}</span>
                        </div>
                        <div class="course-progress">
                            <div class="progress-bar-mini">
                                <div class="progress-fill-mini" style="width: ${progress}%"></div>
                            </div>
                            <span class="progress-text-mini">${progress}% Complete</span>
                        </div>
                    </div>
                    ${userCanManage ? `
                        <div class="course-actions-page">
                            <button class="btn-icon-new btn-edit" onclick="event.stopPropagation(); IlmifyCourses.editCourse('${course.id}')" title="Edit Course">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                                Edit
                            </button>
                            <button class="btn-icon-new btn-delete" onclick="event.stopPropagation(); IlmifyCourses.deleteCourse('${course.id}')" title="Delete Course">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    <line x1="10" y1="11" x2="10" y2="17"/>
                                    <line x1="14" y1="11" x2="14" y2="17"/>
                                </svg>
                                Delete
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Update courses count display
    function updateCoursesCount(count) {
        const countDisplay = document.getElementById('coursesCountDisplay');
        if (countDisplay) {
            countDisplay.textContent = `${count} Course${count !== 1 ? 's' : ''} Available`;
        }
    }

    // Open course viewer (fullscreen)
    function openCourse(courseId) {
        currentCourse = coursesData.find(c => c.id === courseId);
        if (!currentCourse) return;

        const viewer = document.getElementById('courseViewerModal');
        if (!viewer) return;

        // Hide main content and show fullscreen course viewer
        document.body.style.overflow = 'hidden';
        viewer.style.display = 'flex';
        
        // Reset current lesson
        currentLesson = null;
        
        renderCourseViewer();
    }

    // Render course viewer
    function renderCourseViewer() {
        if (!currentCourse) return;

        const progress = getProgress();
        const courseProgress = progress[currentCourse.id] || { completedLessons: [] };

        // Update header title
        const header = document.getElementById('courseViewerTitle');
        if (header) {
            header.textContent = currentCourse.title;
        }

        // Render sidebar with lessons
        const sidebar = document.getElementById('courseLessonsList');
        if (sidebar) {
            let sidebarHtml = '';
            currentCourse.lessons.forEach((lesson, index) => {
                const isCompleted = courseProgress.completedLessons.includes(lesson.id);
                const isActive = currentLesson?.id === lesson.id;
                
                sidebarHtml += `
                    <div class="lesson-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" 
                         onclick="IlmifyCourses.selectLesson('${lesson.id}')">
                        <span class="lesson-number">${index + 1}</span>
                        <span class="lesson-title">${lesson.title}</span>
                        <span class="lesson-status">${isCompleted ? '✅' : (lesson.type === 'video' ? '🎬' : '📄')}</span>
                    </div>
                `;
            });
            sidebar.innerHTML = sidebarHtml;
        }

        // Update progress bar
        updateProgressUI(currentCourse.id);

        // Select first lesson if none selected
        if (!currentLesson && currentCourse.lessons.length > 0) {
            selectLesson(currentCourse.lessons[0].id);
        }
    }

    // Toggle lessons sidebar
    function toggleSidebar() {
        const sidebar = document.getElementById('lessonsSidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    }

    // Select a lesson
    function selectLesson(lessonId) {
        if (!currentCourse) return;
        
        currentLesson = currentCourse.lessons.find(l => l.id === lessonId);
        if (!currentLesson) return;

        // Update sidebar active state
        document.querySelectorAll('.lesson-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`.lesson-item[onclick*="${lessonId}"]`)?.classList.add('active');

        // Close sidebar on mobile after selection
        const sidebar = document.getElementById('lessonsSidebar');
        if (sidebar && window.innerWidth < 768) {
            sidebar.classList.remove('open');
        }

        // Render lesson content
        renderLessonContent();
    }

    // Render lesson content (fullscreen version)
    function renderLessonContent() {
        const contentArea = document.getElementById('lessonContent');
        if (!contentArea || !currentLesson) return;

        const progress = getProgress();
        const courseProgress = progress[currentCourse.id] || { completedLessons: [] };
        const isCompleted = courseProgress.completedLessons.includes(currentLesson.id);

        // Find current lesson index for navigation state
        const currentIndex = currentCourse.lessons.findIndex(l => l.id === currentLesson.id);
        const isFirst = currentIndex === 0;
        const isLast = currentIndex === currentCourse.lessons.length - 1;

        let html = `
            <div class="lesson-fullscreen-content">
                <div class="lesson-header-fullscreen">
                    <span class="lesson-counter">Lesson ${currentIndex + 1} of ${currentCourse.lessons.length}</span>
                    <h2 class="lesson-title-fullscreen">${currentLesson.title}</h2>
                    <span class="lesson-type-badge ${currentLesson.type}">${currentLesson.type === 'video' ? '🎬 Video Lesson' : '📄 Reading'}</span>
                </div>
        `;

        if (currentLesson.type === 'video' && currentLesson.videoUrl) {
            // Check if it's a YouTube URL
            const youtubeMatch = currentLesson.videoUrl.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
            
            if (youtubeMatch) {
                html += `
                    <div class="video-container-fullscreen">
                        <iframe 
                            src="https://www.youtube.com/embed/${youtubeMatch[1]}?rel=0" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                        </iframe>
                    </div>
                `;
            } else {
                html += `
                    <div class="video-container-fullscreen">
                        <video id="lessonVideo" controls onended="IlmifyCourses.onVideoComplete()">
                            <source src="${currentLesson.videoUrl}" type="video/mp4">
                            Your browser does not support video playback.
                        </video>
                    </div>
                `;
            }
        }

        if (currentLesson.content) {
            html += `<div class="lesson-text-content-fullscreen">${currentLesson.content}</div>`;
        }

        html += `</div>`;

        contentArea.innerHTML = html;

        // Update navigation buttons state
        updateNavigationState(isFirst, isLast, isCompleted);

        // Setup video tracking if video lesson
        if (currentLesson.type === 'video' && !currentLesson.videoUrl?.includes('youtube')) {
            setupVideoTracking();
        }
    }

    // Update navigation button states
    function updateNavigationState(isFirst, isLast, isCompleted) {
        const prevBtn = document.getElementById('prevLessonBtn');
        const nextBtn = document.getElementById('nextLessonBtn');
        const completeBtn = document.getElementById('completeLessonBtn');
        const completeBtnText = document.getElementById('completeBtnText');

        if (prevBtn) {
            prevBtn.disabled = isFirst;
            prevBtn.classList.toggle('disabled', isFirst);
        }
        
        if (nextBtn) {
            nextBtn.disabled = isLast;
            nextBtn.classList.toggle('disabled', isLast);
        }
        
        if (completeBtn && completeBtnText) {
            if (isCompleted) {
                completeBtn.classList.add('completed');
                completeBtnText.textContent = 'Completed ✓';
            } else {
                completeBtn.classList.remove('completed');
                completeBtnText.textContent = 'Complete';
            }
        }
    }

    // Setup video progress tracking
    function setupVideoTracking() {
        const video = document.getElementById('lessonVideo');
        const progressBar = document.getElementById('videoProgressBar');
        
        if (video && progressBar) {
            video.addEventListener('timeupdate', () => {
                const percent = (video.currentTime / video.duration) * 100;
                progressBar.style.width = `${percent}%`;
                
                // Auto-complete at 90% watched
                if (percent >= 90) {
                    markLessonComplete(currentCourse.id, currentLesson.id);
                }
            });
        }
    }

    // On video complete
    function onVideoComplete() {
        if (currentCourse && currentLesson) {
            markLessonComplete(currentCourse.id, currentLesson.id);
            showToast('🎉 Lesson completed!');
        }
    }

    // Mark current lesson complete
    function markComplete() {
        if (currentCourse && currentLesson) {
            markLessonComplete(currentCourse.id, currentLesson.id);
            renderLessonContent();
            renderCourseViewer();
            showToast('✅ Lesson marked as complete!');
        }
    }

    // Navigate to previous lesson
    function previousLesson() {
        if (!currentCourse || !currentLesson) return;
        const currentIndex = currentCourse.lessons.findIndex(l => l.id === currentLesson.id);
        if (currentIndex > 0) {
            selectLesson(currentCourse.lessons[currentIndex - 1].id);
        }
    }

    // Navigate to next lesson
    function nextLesson() {
        if (!currentCourse || !currentLesson) return;
        const currentIndex = currentCourse.lessons.findIndex(l => l.id === currentLesson.id);
        if (currentIndex < currentCourse.lessons.length - 1) {
            selectLesson(currentCourse.lessons[currentIndex + 1].id);
        }
    }

    // Update progress UI
    function updateProgressUI(courseId) {
        const progress = getCourseProgress(courseId);
        const progressBar = document.getElementById('courseProgressBar');
        const progressText = document.getElementById('courseProgressText');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        if (progressText) {
            progressText.textContent = `${progress}% Complete`;
        }
    }

    // Close course viewer
    function closeCourseViewer() {
        const viewer = document.getElementById('courseViewerModal');
        if (viewer) {
            viewer.style.display = 'none';
            document.body.style.overflow = '';
            
            // Close sidebar if open
            const sidebar = document.getElementById('lessonsSidebar');
            if (sidebar) {
                sidebar.classList.remove('open');
            }
        }
        currentCourse = null;
        currentLesson = null;
        
        // Re-render courses to show updated progress
        renderCoursesSection();
    }

    // Open create course modal
    function openCreateModal(courseId = null) {
        const modal = document.getElementById('courseCreateModal');
        if (!modal) return;

        const form = document.getElementById('courseForm');
        const title = document.getElementById('courseModalTitle');
        
        // Initialize temp lessons
        tempLessons = [];
        
        if (courseId) {
            // Edit mode
            const course = coursesData.find(c => c.id === courseId);
            if (course) {
                if (title) title.textContent = '✏️ Edit Course';
                document.getElementById('courseId').value = courseId;
                document.getElementById('courseTitle').value = course.title;
                document.getElementById('courseDescription').value = course.description || '';
                document.getElementById('courseCategory').value = course.category || 'Other';
                document.getElementById('courseThumbnail').value = course.thumbnail || '📚';
                form.dataset.editId = courseId;
                
                // Load existing lessons
                tempLessons = [...(course.lessons || [])];
                renderLessonsEditor();
            }
        } else {
            // Create mode
            if (title) title.textContent = '➕ Create New Course';
            document.getElementById('courseId').value = '';
            form.reset();
            document.getElementById('courseThumbnail').value = '📚';
            delete form.dataset.editId;
            tempLessons = [];
            renderLessonsEditor();
        }

        modal.style.display = 'flex';
    }

    // Temporary lessons storage for form
    let tempLessons = [];

    // Render lessons editor
    function renderLessonsEditor() {
        const container = document.getElementById('lessonsListEditor');
        if (!container) return;

        if (tempLessons.length === 0) {
            container.innerHTML = '<p class="no-lessons-msg">No lessons yet. Click "Add Lesson" to add one.</p>';
            return;
        }

        let html = '';
        tempLessons.forEach((lesson, index) => {
            html += `
                <div class="lesson-editor-item" data-index="${index}">
                    <div class="lesson-editor-info">
                        <span class="lesson-number">${index + 1}</span>
                        <span class="lesson-type-icon">${lesson.type === 'video' ? '🎬' : '📝'}</span>
                        <span class="lesson-title">${lesson.title}</span>
                    </div>
                    <div class="lesson-editor-actions">
                        <button type="button" class="btn-icon" onclick="IlmifyCourses.editLesson(${index})" title="Edit">✏️</button>
                        <button type="button" class="btn-icon btn-danger" onclick="IlmifyCourses.removeLesson(${index})" title="Remove">🗑️</button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Add lesson modal
    function addLessonModal() {
        const modal = document.getElementById('lessonEditModal');
        if (!modal) return;

        document.getElementById('lessonModalTitle').textContent = '➕ Add Lesson';
        document.getElementById('lessonId').value = '';
        document.getElementById('lessonTitle').value = '';
        document.getElementById('lessonTypeInput').value = 'text';
        const contentInput = document.getElementById('lessonContentInput') || document.getElementById('lessonContent');
        if (contentInput) contentInput.value = '';
        document.getElementById('lessonVideoUrl').value = '';
        document.getElementById('lessonDuration').value = 10;
        delete document.getElementById('lessonEditForm').dataset.editIndex;
        
        toggleLessonType('text');
        modal.style.display = 'flex';
    }

    // Toggle lesson type fields
    function toggleLessonType(type) {
        const textGroup = document.getElementById('lessonTextGroup');
        const videoGroup = document.getElementById('lessonVideoGroup');
        
        if (textGroup) textGroup.style.display = type === 'text' ? 'block' : 'none';
        if (videoGroup) videoGroup.style.display = type === 'video' ? 'block' : 'none';
    }

    // Save lesson (from modal)
    function saveLesson() {
        const form = document.getElementById('lessonEditForm');
        const title = document.getElementById('lessonTitle').value.trim();
        const type = document.getElementById('lessonTypeInput').value;
        const contentInput = document.getElementById('lessonContentInput') || document.getElementById('lessonContent');
        const content = contentInput ? contentInput.value : '';
        const videoUrl = document.getElementById('lessonVideoUrl').value.trim();
        const duration = parseInt(document.getElementById('lessonDuration').value) || 10;

        if (!title) {
            alert('Please enter a lesson title');
            return;
        }

        const editIndex = form.dataset.editIndex;
        const lessonId = editIndex !== undefined ? tempLessons[parseInt(editIndex)]?.id : ('lesson_' + Date.now());

        const lesson = {
            id: lessonId,
            title,
            type,
            content: type === 'text' ? content : '',
            videoUrl: type === 'video' ? videoUrl : '',
            duration
        };

        if (editIndex !== undefined) {
            tempLessons[parseInt(editIndex)] = lesson;
        } else {
            tempLessons.push(lesson);
        }

        renderLessonsEditor();
        closeLessonEditModal();
    }

    // Edit lesson
    function editLesson(index) {
        const lesson = tempLessons[index];
        if (!lesson) return;

        const modal = document.getElementById('lessonEditModal');
        if (!modal) return;

        document.getElementById('lessonModalTitle').textContent = '✏️ Edit Lesson';
        document.getElementById('lessonId').value = lesson.id || '';
        document.getElementById('lessonTitle').value = lesson.title;
        document.getElementById('lessonTypeInput').value = lesson.type || 'text';
        const contentInput = document.getElementById('lessonContentInput') || document.getElementById('lessonContent');
        if (contentInput) contentInput.value = lesson.content || '';
        document.getElementById('lessonVideoUrl').value = lesson.videoUrl || '';
        document.getElementById('lessonDuration').value = lesson.duration || 10;
        document.getElementById('lessonEditForm').dataset.editIndex = index;
        
        toggleLessonType(lesson.type || 'text');
        modal.style.display = 'flex';
    }

    // Remove lesson
    function removeLesson(index) {
        if (confirm('Are you sure you want to remove this lesson?')) {
            tempLessons.splice(index, 1);
            renderLessonsEditor();
        }
    }

    // Close lesson edit modal
    function closeLessonEditModal() {
        const modal = document.getElementById('lessonEditModal');
        if (modal) modal.style.display = 'none';
    }

    // Save course
    function saveCourse(event) {
        event.preventDefault();
        
        const form = document.getElementById('courseForm');
        const title = document.getElementById('courseTitle').value.trim();
        const description = document.getElementById('courseDescription').value.trim();
        const category = document.getElementById('courseCategory').value.trim();
        const thumbnail = document.getElementById('courseThumbnail').value.trim() || '📚';

        if (!title) {
            alert('Please enter a course title');
            return;
        }

        const editId = form.dataset.editId;
        const session = window.IlmifyAuth?.getSession();
        const instructor = session?.name || 'Ilmify';
        
        if (editId) {
            // Update existing course
            const index = coursesData.findIndex(c => c.id === editId);
            if (index !== -1) {
                // Check permission before updating
                if (!canManageCourse(coursesData[index])) {
                    showToast('❌ You can only edit your own courses');
                    return;
                }
                
                coursesData[index] = {
                    ...coursesData[index],
                    title,
                    description,
                    category,
                    thumbnail,
                    lessons: tempLessons,
                    updatedAt: Date.now()
                };
            }
        } else {
            // Create new course
            const session = window.IlmifyAuth?.getSession();
            const userId = getCurrentUserId();
            const newCourse = {
                id: 'course_' + Date.now(),
                title,
                description,
                category,
                instructor: session?.name || 'Ilmify',
                createdBy: userId, // Track who created this course
                thumbnail,
                lessons: tempLessons,
                createdAt: Date.now()
            };
            coursesData.push(newCourse);
            filteredCourses.push(newCourse);
        }

        saveCourses();
        closeCourseCreateModal();
        
        // Re-render based on which page we're on
        const isCoursesPage = window.location.pathname.includes('courses.html');
        if (isCoursesPage) {
            renderCoursesPage();
        } else {
            renderCoursesSection();
        }
        
        showToast(editId ? '✅ Course updated!' : '✅ Course created!');
    }

    // Edit course
    function editCourse(courseId) {
        const course = coursesData.find(c => c.id === courseId);
        if (!course) {
            showToast('❌ Course not found');
            return;
        }
        
        // Check permission
        if (!canManageCourse(course)) {
            showToast('❌ You can only edit your own courses');
            return;
        }
        
        tempLessons = [...(course.lessons || [])];
        openCreateModal(courseId);
    }

    // Delete course
    function deleteCourse(courseId) {
        const course = coursesData.find(c => c.id === courseId);
        if (!course) {
            showToast('❌ Course not found');
            return;
        }
        
        // Check permission
        if (!canManageCourse(course)) {
            showToast('❌ You can only delete your own courses');
            return;
        }
        
        if (confirm('Are you sure you want to delete this course? This cannot be undone.')) {
            coursesData = coursesData.filter(c => c.id !== courseId);
            filteredCourses = filteredCourses.filter(c => c.id !== courseId);
            saveCourses();
            
            // Re-render based on which page we're on
            const isCoursesPage = window.location.pathname.includes('courses.html');
            if (isCoursesPage) {
                renderCoursesPage();
            } else {
                renderCoursesSection();
            }
            
            showToast('🗑️ Course deleted');
        }
    }

    // Close course create modal
    function closeCourseCreateModal() {
        const modal = document.getElementById('courseCreateModal');
        if (modal) modal.style.display = 'none';
        tempLessons = [];
    }

    // Show toast notification
    function showToast(message) {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Setup event listeners
    function setupEventListeners() {
        // Lesson type change
        const typeSelect = document.getElementById('lessonTypeInput');
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => toggleLessonType(e.target.value));
        }
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('lessonsSidebar');
            const toggleBtn = document.querySelector('.toggle-sidebar-btn');
            if (sidebar && sidebar.classList.contains('open') && 
                !sidebar.contains(e.target) && !toggleBtn?.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });
    }

    // Public API
    window.IlmifyCourses = {
        init,
        openCourse,
        selectLesson,
        markComplete,
        previousLesson,
        nextLesson,
        onVideoComplete,
        closeCourseViewer,
        toggleSidebar,
        openCreateModal,
        editCourse,
        deleteCourse,
        saveCourse,
        closeCourseCreateModal,
        addLessonModal,
        editLesson,
        removeLesson,
        saveLesson,
        closeLessonEditModal,
        toggleLessonType,
        renderCoursesSection,
        renderCoursesPage,
        filterAndRenderCourses,
        canManageCourse
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
