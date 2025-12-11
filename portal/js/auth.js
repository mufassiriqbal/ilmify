/**
 * Ilmify - Authentication System
 * Handles login, signup, and session management
 */

// ============================================
// Configuration
// ============================================
const AUTH_CONFIG = {
    FACULTY_ACCESS_CODE: 'ILMIFY2025',  // Default faculty access code
    SESSION_KEY: 'ilmify_session',
    USERS_KEY: 'ilmify_users',
    LOGIN_ACTIVITY_KEY: 'ilmify_login_activity',
    SESSION_DURATION: 7 * 24 * 60 * 60 * 1000  // 7 days in milliseconds
};

// ============================================
// User Database (LocalStorage)
// ============================================
class UserDB {
    static getUsers() {
        const users = localStorage.getItem(AUTH_CONFIG.USERS_KEY);
        return users ? JSON.parse(users) : [];
    }

    static saveUsers(users) {
        localStorage.setItem(AUTH_CONFIG.USERS_KEY, JSON.stringify(users));
    }

    static findUser(email) {
        const users = this.getUsers();
        return users.find(u => u.email.toLowerCase() === email.toLowerCase());
    }

    static findUserById(id) {
        const users = this.getUsers();
        return users.find(u => u.id === id);
    }

    static createUser(userData) {
        const users = this.getUsers();
        
        // Check if email already exists
        if (this.findUser(userData.email)) {
            throw new Error('Email already registered');
        }

        const newUser = {
            id: 'user_' + Date.now(),
            ...userData,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        this.saveUsers(users);
        return newUser;
    }

    static initDefaultUsers() {
        // Create default admin/faculty user if no users exist
        const users = this.getUsers();
        if (users.length === 0) {
            const defaultUsers = [
                {
                    id: 'admin_001',
                    firstName: 'Admin',
                    lastName: 'User',
                    email: 'admin@ilmify.local',
                    password: 'admin123',
                    role: 'admin',
                    isAdmin: true,
                    department: 'Administration',
                    employeeId: 'ADMIN-001',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'student_001',
                    firstName: 'Demo',
                    lastName: 'Student',
                    email: 'student@ilmify.local',
                    password: 'student123',
                    role: 'student',
                    grade: '9',
                    studentId: 'STU-2025-001',
                    createdAt: new Date().toISOString()
                }
            ];
            this.saveUsers(defaultUsers);
        }
    }
}

// ============================================
// Session Management
// ============================================
class Session {
    static create(user) {
        const session = {
            userId: user.id,
            role: user.role,
            isAdmin: user.isAdmin || false,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            expiresAt: Date.now() + AUTH_CONFIG.SESSION_DURATION
        };
        localStorage.setItem(AUTH_CONFIG.SESSION_KEY, JSON.stringify(session));
        return session;
    }

    static get() {
        const session = localStorage.getItem(AUTH_CONFIG.SESSION_KEY);
        if (!session) return null;

        const parsed = JSON.parse(session);
        
        // Check if session expired
        if (Date.now() > parsed.expiresAt) {
            this.destroy();
            return null;
        }

        return parsed;
    }

    static destroy() {
        localStorage.removeItem(AUTH_CONFIG.SESSION_KEY);
    }

    static isLoggedIn() {
        return this.get() !== null;
    }

    static getUser() {
        const session = this.get();
        if (!session) return null;
        return UserDB.findUserById(session.userId);
    }

    static isFaculty() {
        const session = this.get();
        // Faculty OR Admin can access faculty features (including delete)
        return session && (session.role === 'faculty' || session.isAdmin === true);
    }

    static isStudent() {
        const session = this.get();
        return session && session.role === 'student';
    }

    static isAdmin() {
        const session = this.get();
        return session && session.isAdmin === true;
    }
}

// ============================================
// Login Activity Tracking
// ============================================
class LoginActivity {
    static getActivities() {
        const activities = localStorage.getItem(AUTH_CONFIG.LOGIN_ACTIVITY_KEY);
        return activities ? JSON.parse(activities) : [];
    }

    static saveActivities(activities) {
        localStorage.setItem(AUTH_CONFIG.LOGIN_ACTIVITY_KEY, JSON.stringify(activities));
    }

    static async recordLogin(user) {
        const activities = this.getActivities();
        
        // Get client IP - in a real server environment this would come from backend
        // For local/offline use, we'll detect local network info
        let clientIP = await this.getClientIP();
        
        const activity = {
            id: 'login_' + Date.now(),
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role,
            isAdmin: user.isAdmin || false,
            loginTime: new Date().toISOString(),
            loginTimeFormatted: this.formatDateTime(new Date()),
            ipAddress: clientIP,
            userAgent: navigator.userAgent,
            platform: navigator.platform
        };

        // Keep last 100 activities
        activities.unshift(activity);
        if (activities.length > 100) {
            activities.pop();
        }

        this.saveActivities(activities);
        return activity;
    }

    static async getClientIP() {
        // Try multiple methods to get IP
        try {
            // Method 1: Try public IP service (works if online)
            const response = await fetch('https://api.ipify.org?format=json', { timeout: 3000 });
            if (response.ok) {
                const data = await response.json();
                return data.ip;
            }
        } catch (e) {
            // Ignore - will fall back
        }

        // Method 2: For offline/local - detect local network
        try {
            const rtc = new RTCPeerConnection({ iceServers: [] });
            rtc.createDataChannel('');
            rtc.createOffer().then(offer => rtc.setLocalDescription(offer));
            
            return new Promise(resolve => {
                rtc.onicecandidate = (event) => {
                    if (event && event.candidate && event.candidate.candidate) {
                        const ipMatch = event.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
                        if (ipMatch) {
                            rtc.close();
                            resolve(ipMatch[1]);
                            return;
                        }
                    }
                };
                // Timeout fallback
                setTimeout(() => {
                    rtc.close();
                    resolve('Local Device');
                }, 1000);
            });
        } catch (e) {
            return 'Local Device';
        }
    }

    static formatDateTime(date) {
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        return date.toLocaleDateString('en-US', options);
    }

    static getRecentActivities(limit = 50) {
        return this.getActivities().slice(0, limit);
    }

    static getActivitiesByUser(userId) {
        return this.getActivities().filter(a => a.userId === userId);
    }

    static clearOldActivities(daysOld = 30) {
        const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
        const activities = this.getActivities().filter(a => {
            return new Date(a.loginTime).getTime() > cutoff;
        });
        this.saveActivities(activities);
    }
}

// ============================================
// Authentication Functions
// ============================================
async function login(email, password) {
    const user = UserDB.findUser(email);
    
    if (!user) {
        throw new Error('User not found');
    }

    if (user.password !== password) {
        throw new Error('Invalid password');
    }

    // Record login activity
    await LoginActivity.recordLogin(user);

    return Session.create(user);
}

function signup(formData) {
    // Validate faculty access code
    if (formData.role === 'faculty') {
        if (formData.facultyCode !== AUTH_CONFIG.FACULTY_ACCESS_CODE) {
            throw new Error('Invalid faculty access code');
        }
    }

    // Create user
    const user = UserDB.createUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        // Role-specific fields
        ...(formData.role === 'student' ? {
            studentId: formData.studentId,
            grade: formData.grade
        } : {
            employeeId: formData.employeeId,
            department: formData.department
        })
    });

    return user;
}

function logout() {
    Session.destroy();
    window.location.href = 'portal/login.html';
}

// ============================================
// UI Functions
// ============================================
function showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    const msgEl = errorEl.querySelector('#errorMessage') || errorEl.querySelector('p');
    if (errorEl && msgEl) {
        msgEl.textContent = message;
        errorEl.style.display = 'flex';
    }
}

function hideError(elementId) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

function showSuccess(elementId) {
    const successEl = document.getElementById(elementId);
    if (successEl) {
        successEl.style.display = 'flex';
    }
}

// ============================================
// Page Initialization
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize default users
    UserDB.initDefaultUsers();

    // Setup role tabs
    setupRoleTabs();

    // Setup login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Setup signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Setup password toggle
    setupPasswordToggle();
});

function setupRoleTabs() {
    const tabs = document.querySelectorAll('.role-tab');
    const roleInput = document.getElementById('userRole');
    const studentFields = document.getElementById('studentFields');
    const facultyFields = document.getElementById('facultyFields');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update role value
            const role = tab.dataset.role;
            if (roleInput) {
                roleInput.value = role;
            }

            // Toggle role-specific fields (signup page)
            if (studentFields && facultyFields) {
                if (role === 'student') {
                    studentFields.style.display = 'block';
                    facultyFields.style.display = 'none';
                } else {
                    studentFields.style.display = 'none';
                    facultyFields.style.display = 'block';
                }
            }
        });
    });
}

function setupPasswordToggle() {
    const toggleBtns = document.querySelectorAll('.toggle-password');
    
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            if (input && input.type === 'password') {
                input.type = 'text';
                btn.textContent = '🙈';
            } else if (input) {
                input.type = 'password';
                btn.textContent = '👁️';
            }
        });
    });
}

function handleLogin(e) {
    e.preventDefault();
    hideError('loginError');

    const form = e.target;
    const email = form.email.value.trim();
    const password = form.password.value;

    // Use async login
    (async () => {
        try {
            await login(email, password);
            // Redirect to main page
            window.location.href = '../index.html';
        } catch (error) {
            showError('loginError', error.message);
        }
    })();
}

function handleSignup(e) {
    e.preventDefault();
    hideError('signupError');

    const form = e.target;
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    // Validate passwords match
    if (password !== confirmPassword) {
        showError('signupError', 'Passwords do not match');
        return;
    }

    // Validate password length
    if (password.length < 6) {
        showError('signupError', 'Password must be at least 6 characters');
        return;
    }

    const formData = {
        firstName: form.firstName.value.trim(),
        lastName: form.lastName.value.trim(),
        email: form.email.value.trim(),
        password: password,
        role: form.role.value,
        // Student fields
        studentId: form.studentId?.value.trim(),
        grade: form.grade?.value,
        // Faculty fields
        employeeId: form.employeeId?.value.trim(),
        department: form.department?.value,
        facultyCode: form.facultyCode?.value.trim()
    };

    try {
        signup(formData);
        showSuccess('signupSuccess');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    } catch (error) {
        showError('signupError', error.message);
    }
}

// ============================================
// Export for use in other scripts
// ============================================
window.IlmifyAuth = {
    Session,
    UserDB,
    LoginActivity,
    login,
    logout,
    signup,
    isLoggedIn: () => Session.isLoggedIn(),
    getUser: () => Session.getUser(),
    getSession: () => Session.get(),
    isFaculty: () => Session.isFaculty(),
    isStudent: () => Session.isStudent(),
    isAdmin: () => Session.isAdmin(),
    getLoginActivities: (limit) => LoginActivity.getRecentActivities(limit)
};
