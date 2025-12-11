/**
 * Ilmify - Faculty Features
 * Upload and manage resources (Faculty only)
 */

// ============================================
// Global Variables
// ============================================
let selectedFile = null;
let resourceToDelete = null;

// ============================================
// Upload Modal Functions
// ============================================
function openUploadModal() {
    // Check if user is faculty or admin
    const session = IlmifyAuth.getSession();
    if (!session || (session.role !== 'faculty' && session.role !== 'admin' && !session.isAdmin)) {
        if (typeof showToast === 'function') {
            showToast('Only faculty members can upload resources.', 'error');
        } else {
            alert('Only faculty members can upload resources.');
        }
        return;
    }
    
    const modal = document.getElementById('uploadModal');
    modal.style.display = 'flex';
    modal.classList.add('modal-animate');
    document.body.style.overflow = 'hidden';
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.classList.remove('modal-animate');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        resetUploadForm();
    }, 200);
}

function resetUploadForm() {
    document.getElementById('uploadForm').reset();
    selectedFile = null;
    document.getElementById('fileSelected').style.display = 'none';
    document.getElementById('fileUploadContent').style.display = 'block';
    document.getElementById('uploadError').style.display = 'none';
    document.getElementById('uploadSuccess').style.display = 'none';
}

// ============================================
// File Upload Handling
// ============================================
function setupFileUpload() {
    const fileInput = document.getElementById('resourceFile');
    const uploadArea = document.getElementById('fileUploadArea');
    
    if (!fileInput || !uploadArea) return;

    // Click to select file
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // File selected via input
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
}

function handleFileSelect(file) {
    // Validate file type
    const allowedTypes = ['.pdf', '.mp4', '.webm', '.mkv'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExt)) {
        showUploadError('Invalid file type. Please upload PDF or video files.');
        return;
    }

    // Validate file size (500MB max)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
        showUploadError('File too large. Maximum size is 500MB.');
        return;
    }

    selectedFile = file;
    
    // Update UI
    document.getElementById('fileUploadContent').style.display = 'none';
    document.getElementById('fileSelected').style.display = 'flex';
    document.getElementById('selectedFileName').textContent = file.name;
}

function removeSelectedFile() {
    selectedFile = null;
    document.getElementById('resourceFile').value = '';
    document.getElementById('fileSelected').style.display = 'none';
    document.getElementById('fileUploadContent').style.display = 'block';
}

// ============================================
// Form Submission
// ============================================
function setupUploadForm() {
    const form = document.getElementById('uploadForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate faculty or admin
        const session = IlmifyAuth.getSession();
        if (!session || (session.role !== 'faculty' && session.role !== 'admin' && !session.isAdmin)) {
            showUploadError('Only faculty members can upload resources.');
            return;
        }

        // Validate file selected
        if (!selectedFile) {
            showUploadError('Please select a file to upload.');
            return;
        }

        const title = document.getElementById('resourceTitle').value.trim();
        const category = document.getElementById('resourceCategory').value;
        const description = document.getElementById('resourceDescription').value.trim();

        if (!title || !category) {
            showUploadError('Please fill in all required fields.');
            return;
        }

        // Show loading state
        document.getElementById('uploadBtnText').style.display = 'none';
        document.getElementById('uploadSpinner').style.display = 'inline';
        document.getElementById('uploadError').style.display = 'none';

        try {
            // Upload file to server
            await uploadFile(selectedFile, title, category, description);
            
            // Show success
            document.getElementById('uploadSuccess').style.display = 'flex';
            
            if (typeof showToast === 'function') {
                showToast('Resource uploaded successfully!', 'success');
            }
            
            // Close modal and refresh after 1.5 seconds
            setTimeout(() => {
                closeUploadModal();
                // Reload resources
                if (typeof loadMetadata === 'function') {
                    loadMetadata().then(() => {
                        updateCategoryCounts();
                        displayResources(allResources);
                    });
                } else {
                    location.reload();
                }
            }, 1500);

        } catch (error) {
            showUploadError(error.message);
            if (typeof showToast === 'function') {
                showToast(error.message, 'error');
            }
        } finally {
            document.getElementById('uploadBtnText').style.display = 'inline';
            document.getElementById('uploadSpinner').style.display = 'none';
        }
    });
}

async function uploadFile(file, title, category, description) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('category', category);
        formData.append('description', description);

        const xhr = new XMLHttpRequest();
        
        // Show progress bar
        const progressContainer = document.getElementById('uploadProgress');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        if (progressContainer) {
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';
            progressText.textContent = '0%';
        }

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && progressBar) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percent + '%';
                progressText.textContent = percent + '%';
            }
        });

        xhr.onload = function() {
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        resolve(response);
                    } else {
                        reject(new Error(response.error || 'Upload failed'));
                    }
                } catch (e) {
                    reject(new Error('Invalid server response'));
                }
            } else {
                reject(new Error('Upload failed: ' + xhr.status));
            }
        };

        xhr.onerror = function() {
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
            reject(new Error('Network error during upload'));
        };

        xhr.open('POST', '/upload', true);
        xhr.send(formData);
    });
}

function showUploadError(message) {
    const errorEl = document.getElementById('uploadError');
    document.getElementById('uploadErrorMsg').textContent = message;
    errorEl.style.display = 'flex';
}

// ============================================
// Delete Resource Functions
// ============================================
function openDeleteModal(resourceId, resourceTitle) {
    // Check if user is faculty or admin
    const session = IlmifyAuth.getSession();
    if (!session || (session.role !== 'faculty' && session.role !== 'admin' && !session.isAdmin)) {
        if (typeof showToast === 'function') {
            showToast('Only faculty members can delete resources.', 'error');
        } else {
            alert('Only faculty members can delete resources.');
        }
        return;
    }

    resourceToDelete = resourceId;
    document.getElementById('deleteResourceName').textContent = `"${resourceTitle}"`;
    const modal = document.getElementById('deleteModal');
    modal.style.display = 'flex';
    modal.classList.add('modal-animate');
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.classList.remove('modal-animate');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        resourceToDelete = null;
    }, 200);
}

function setupDeleteConfirmation() {
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    if (!confirmBtn) return;

    confirmBtn.addEventListener('click', () => {
        if (resourceToDelete) {
            deleteResource(resourceToDelete);
        }
    });
}

function deleteResource(resourceId) {
    // Remove from local storage
    let localResources = JSON.parse(localStorage.getItem('ilmify_local_resources') || '[]');
    localResources = localResources.filter(r => r.id !== resourceId);
    localStorage.setItem('ilmify_local_resources', JSON.stringify(localResources));

    // Show instruction to delete actual file
    alert('📝 Resource marked for deletion.\n\nTo complete removal:\n1. Delete the file from the content folder\n2. Run python indexer.py to update');

    closeDeleteModal();
    
    // Refresh display
    if (typeof loadMetadata === 'function') {
        loadMetadata().then(() => {
            updateCategoryCounts();
            displayResources(allResources);
        });
    } else {
        location.reload();
    }
}

// ============================================
// Modify Resource Cards for Faculty
// ============================================
function addFacultyControls() {
    const session = IlmifyAuth.getSession();
    if (!session || session.role !== 'faculty') return;

    // This function is called after resources are displayed
    // It adds delete buttons to resource cards for faculty
    const resourceCards = document.querySelectorAll('.resource-card');
    
    resourceCards.forEach(card => {
        // Check if already has faculty controls
        if (card.querySelector('.faculty-controls')) return;

        const resourceId = card.dataset.resourceId;
        const resourceTitle = card.querySelector('.resource-title')?.textContent;

        if (resourceId && resourceTitle) {
            const controls = document.createElement('div');
            controls.className = 'faculty-controls';
            controls.innerHTML = `
                <button class="delete-resource-btn" onclick="event.preventDefault(); openDeleteModal(${resourceId}, '${resourceTitle.replace(/'/g, "\\'")}')">
                    🗑️
                </button>
            `;
            card.appendChild(controls);
        }
    });
}

// ============================================
// Initialize Faculty Features
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    setupFileUpload();
    setupUploadForm();
    setupDeleteConfirmation();

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    });

    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeUploadModal();
            closeDeleteModal();
        }
    });
});

// Export for use in main.js
window.addFacultyControls = addFacultyControls;
window.openUploadModal = openUploadModal;
window.closeUploadModal = closeUploadModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.removeSelectedFile = removeSelectedFile;

// ============================================
// User Management Functions (Admin Only)
// ============================================
let currentUserType = 'student';

function openUserModal() {
    // Check if user is admin
    const session = IlmifyAuth.getSession();
    if (!session || !session.isAdmin) {
        if (typeof showToast === 'function') {
            showToast('Only administrators can manage users.', 'error');
        } else {
            alert('Only administrators can manage users.');
        }
        return;
    }
    
    const modal = document.getElementById('userModal');
    modal.style.display = 'flex';
    modal.classList.add('modal-animate');
    document.body.style.overflow = 'hidden';
    
    currentUserType = 'student';
    switchUserTab('student');
    loadUserList();
    setupAddUserForm();
}

function closeUserModal() {
    const modal = document.getElementById('userModal');
    modal.classList.remove('modal-animate');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }, 200);
    clearAddUserForm();
}

function switchUserTab(type) {
    currentUserType = type;
    
    // Update tabs
    document.querySelectorAll('.user-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.type === type);
    });
    
    // Update form labels
    const isStudent = type === 'student';
    document.getElementById('addUserTitle').textContent = isStudent ? '➕ Add New Student' : '➕ Add New Faculty';
    document.getElementById('userListTitle').textContent = isStudent ? '📋 Registered Students' : '📋 Registered Faculty';
    document.getElementById('addUserBtn').textContent = isStudent ? 'Add Student' : 'Add Faculty';
    document.getElementById('newUserType').value = type;
    
    // Toggle fields
    document.getElementById('gradeField').style.display = isStudent ? 'block' : 'none';
    document.getElementById('departmentField').style.display = isStudent ? 'none' : 'block';
    
    // Refresh list
    loadUserList();
    clearAddUserForm();
}

function clearAddUserForm() {
    const form = document.getElementById('addUserForm');
    if (form) form.reset();
    const msg = document.getElementById('addUserMessage');
    if (msg) msg.style.display = 'none';
    
    // Reset to add mode
    const btn = document.getElementById('addUserBtn');
    if (btn) {
        btn.textContent = currentUserType === 'student' ? 'Add Student' : 'Add Faculty';
        btn.removeAttribute('data-edit-mode');
        btn.removeAttribute('data-edit-email');
    }
    
    const pwdField = document.getElementById('newUserPassword');
    if (pwdField) {
        pwdField.placeholder = 'Minimum 6 characters';
        pwdField.required = true;
    }
}

function loadUserList() {
    const userListEl = document.getElementById('userList');
    if (!userListEl) return;

    const users = IlmifyAuth.UserDB.getUsers();
    const filteredUsers = users.filter(u => {
        if (currentUserType === 'student') return u.role === 'student';
        return u.role === 'faculty' || u.role === 'admin';
    });

    if (filteredUsers.length === 0) {
        const typeLabel = currentUserType === 'student' ? 'students' : 'faculty members';
        userListEl.innerHTML = `
            <div class="no-users">
                <p>📚 No ${typeLabel} registered yet.</p>
                <p>Add ${typeLabel} using the form above.</p>
            </div>
        `;
        return;
    }

    userListEl.innerHTML = filteredUsers.map(user => {
        const icon = user.isAdmin ? '👑' : (user.role === 'student' ? '🎓' : '👨‍🏫');
        const badge = user.isAdmin ? '<span class="admin-tag">Admin</span>' : '';
        const subInfo = user.role === 'student' && user.grade ? `Class ${user.grade}` : (user.department || '');
        
        // Don't allow editing/deleting self or other admins (unless you're the main admin)
        const session = IlmifyAuth.getSession();
        const canModify = session.email !== user.email && !user.isAdmin;
        
        return `
            <div class="user-card" data-email="${user.email}">
                <div class="user-card-info">
                    <div class="user-card-avatar">${icon}</div>
                    <div class="user-card-details">
                        <div class="user-card-name">${user.firstName} ${user.lastName} ${badge}</div>
                        <div class="user-card-email">${user.email}</div>
                        ${subInfo ? `<div class="user-card-sub">${subInfo}</div>` : ''}
                    </div>
                </div>
                ${canModify ? `
                <div class="user-card-actions">
                    <button class="user-action-btn edit-btn" onclick="editUser('${user.email}')" title="Edit">✏️</button>
                    <button class="user-action-btn delete-btn" onclick="confirmDeleteUser('${user.email}', '${user.firstName} ${user.lastName}')" title="Delete">🗑️</button>
                </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function setupAddUserForm() {
    const form = document.getElementById('addUserForm');
    if (!form) return;

    form.onsubmit = function(e) {
        e.preventDefault();
        
        const btn = document.getElementById('addUserBtn');
        if (btn.dataset.editMode === 'true') {
            updateUser(btn.dataset.editEmail);
            return;
        }
        
        const firstName = document.getElementById('newUserFirstName').value.trim();
        const lastName = document.getElementById('newUserLastName').value.trim();
        const email = document.getElementById('newUserEmail').value.trim();
        const password = document.getElementById('newUserPassword').value;
        const grade = document.getElementById('newUserGrade').value;
        const department = document.getElementById('newUserDepartment').value;
        const type = document.getElementById('newUserType').value;

        if (!firstName || !lastName || !email || !password) {
            showUserMessage('Please fill in all required fields.', 'error');
            return;
        }

        if (password.length < 6) {
            showUserMessage('Password must be at least 6 characters.', 'error');
            return;
        }

        const users = IlmifyAuth.UserDB.getUsers();
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            showUserMessage('A user with this email already exists.', 'error');
            return;
        }

        const newUser = {
            id: 'user_' + Date.now(),
            firstName,
            lastName,
            email,
            password,
            role: type === 'student' ? 'student' : 'faculty',
            isAdmin: false,
            ...(type === 'student' ? { grade: grade || null } : { department: department || null }),
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        IlmifyAuth.UserDB.saveUsers(users);

        const typeLabel = type === 'student' ? 'Student' : 'Faculty member';
        showUserMessage(`✅ ${typeLabel} "${firstName} ${lastName}" added successfully!`, 'success');
        
        clearAddUserForm();
        loadUserList();
    };
}

function showUserMessage(message, type) {
    const msgEl = document.getElementById('addUserMessage');
    msgEl.textContent = message;
    msgEl.className = `add-user-message ${type}`;
    msgEl.style.display = 'block';
    
    setTimeout(() => {
        msgEl.style.display = 'none';
    }, 3000);
}

function editUser(email) {
    const users = IlmifyAuth.UserDB.getUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) {
        showUserMessage('User not found.', 'error');
        return;
    }

    document.getElementById('newUserFirstName').value = user.firstName;
    document.getElementById('newUserLastName').value = user.lastName;
    document.getElementById('newUserEmail').value = user.email;
    document.getElementById('newUserGrade').value = user.grade || '';
    document.getElementById('newUserDepartment').value = user.department || '';
    document.getElementById('newUserPassword').value = '';
    document.getElementById('newUserPassword').placeholder = 'Leave blank to keep current';
    document.getElementById('newUserPassword').required = false;

    const btn = document.getElementById('addUserBtn');
    btn.textContent = currentUserType === 'student' ? 'Update Student' : 'Update Faculty';
    btn.dataset.editMode = 'true';
    btn.dataset.editEmail = email;

    document.getElementById('addUserForm').scrollIntoView({ behavior: 'smooth' });
}

function updateUser(originalEmail) {
    const firstName = document.getElementById('newUserFirstName').value.trim();
    const lastName = document.getElementById('newUserLastName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const grade = document.getElementById('newUserGrade').value;
    const department = document.getElementById('newUserDepartment').value;

    if (!firstName || !lastName || !email) {
        showUserMessage('Please fill in all required fields.', 'error');
        return;
    }

    const users = IlmifyAuth.UserDB.getUsers();
    const userIndex = users.findIndex(u => u.email === originalEmail);
    
    if (userIndex === -1) {
        showUserMessage('User not found.', 'error');
        return;
    }

    if (email !== originalEmail && users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        showUserMessage('A user with this email already exists.', 'error');
        return;
    }

    users[userIndex].firstName = firstName;
    users[userIndex].lastName = lastName;
    users[userIndex].email = email;
    
    if (currentUserType === 'student') {
        users[userIndex].grade = grade || null;
    } else {
        users[userIndex].department = department || null;
    }
    
    if (password && password.length >= 6) {
        users[userIndex].password = password;
    }

    IlmifyAuth.UserDB.saveUsers(users);

    showUserMessage(`✅ User "${firstName} ${lastName}" updated!`, 'success');
    clearAddUserForm();
    loadUserList();
}

function confirmDeleteUser(email, name) {
    if (confirm(`⚠️ Are you sure you want to delete "${name}"?\n\nThis action cannot be undone.`)) {
        deleteUser(email);
    }
}

function deleteUser(email) {
    let users = IlmifyAuth.UserDB.getUsers();
    const userToDelete = users.find(u => u.email === email);
    
    if (!userToDelete) {
        showUserMessage('User not found.', 'error');
        return;
    }

    if (userToDelete.isAdmin) {
        showUserMessage('Cannot delete admin users.', 'error');
        return;
    }

    users = users.filter(u => u.email !== email);
    IlmifyAuth.UserDB.saveUsers(users);

    showUserMessage(`✅ User deleted successfully.`, 'success');
    loadUserList();
}

// Export user management functions
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.switchUserTab = switchUserTab;
window.editUser = editUser;
window.confirmDeleteUser = confirmDeleteUser;

// ============================================
// Login Activity Panel (Admin Only)
// ============================================
function openLoginActivityModal() {
    const session = IlmifyAuth.getSession();
    if (!session || !session.isAdmin) {
        showToast('Only administrators can view login activity.', 'error');
        return;
    }
    
    const modal = document.getElementById('loginActivityModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('modal-animate');
        document.body.style.overflow = 'hidden';
        loadLoginActivity();
    }
}

function closeLoginActivityModal() {
    const modal = document.getElementById('loginActivityModal');
    if (modal) {
        modal.classList.remove('modal-animate');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }, 200);
    }
}

function loadLoginActivity() {
    const listContainer = document.getElementById('loginActivityList');
    if (!listContainer) return;
    
    const activities = IlmifyAuth.getLoginActivities(50);
    
    if (activities.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <span>📭</span>
                <p>No login activity recorded yet.</p>
            </div>
        `;
        return;
    }
    
    listContainer.innerHTML = activities.map(activity => {
        const initials = activity.userName.split(' ').map(n => n[0]).join('').toUpperCase();
        const roleClass = activity.isAdmin ? 'admin' : activity.role;
        const roleLabel = activity.isAdmin ? 'Admin' : activity.role.charAt(0).toUpperCase() + activity.role.slice(1);
        
        return `
            <div class="login-entry">
                <div class="login-entry-avatar">${initials}</div>
                <div class="login-entry-info">
                    <div class="login-entry-name">${escapeHtmlFaculty(activity.userName)}</div>
                    <div class="login-entry-email">${escapeHtmlFaculty(activity.email)}</div>
                    <div class="login-entry-meta">
                        <span class="login-entry-time">🕐 ${activity.loginTimeFormatted}</span>
                        <span class="login-entry-ip">🌐 ${activity.ipAddress}</span>
                    </div>
                </div>
                <span class="login-entry-role ${roleClass}">${roleLabel}</span>
            </div>
        `;
    }).join('');
}

function escapeHtmlFaculty(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function clearLoginActivity() {
    if (confirm('⚠️ Are you sure you want to clear all login activity?\n\nThis action cannot be undone.')) {
        localStorage.removeItem('ilmify_login_activity');
        loadLoginActivity();
        showToast('Login activity cleared.', 'success');
    }
}

// Export login activity functions
window.openLoginActivityModal = openLoginActivityModal;
window.closeLoginActivityModal = closeLoginActivityModal;
window.clearLoginActivity = clearLoginActivity;

