// Authentication JavaScript
const API_BASE = 'http://localhost:3000/api';

// Utility functions
function showSpinner(buttonId, textId) {
    const spinner = document.getElementById(buttonId);
    const text = document.getElementById(textId);
    spinner.style.display = 'block';
    text.textContent = 'Please wait...';

    const button = text.closest('button');
    if (button) {
        button.disabled = true;
    }
}

function hideSpinner(buttonId, textId, originalText) {
    const spinner = document.getElementById(buttonId);
    const text = document.getElementById(textId);
    spinner.style.display = 'none';
    text.textContent = originalText;

    const button = text.closest('button');
    if (button) {
        button.disabled = false;
    }
}

function showError(message, elementId = 'error-message') {
    const errorDiv = document.getElementById(elementId);
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.display = 'block';

    const form = document.querySelector('.auth-form');
    form.parentNode.insertBefore(successDiv, form.nextSibling);

    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Navigation functions
function showSignup() {
    window.location.href = 'signup.html';
}

function showLogin() {
    window.location.href = 'login.html';
}

// Check if user is already logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token && window.location.pathname.includes('index.html')) {
        // User is logged in and on main page, stay here
        return;
    } else if (token && !window.location.pathname.includes('index.html')) {
        // User is logged in but not on main page, redirect to main
        window.location.href = 'index.html';
    } else if (!token && window.location.pathname.includes('index.html')) {
        // User is not logged in but on main page, redirect to login
        window.location.href = 'login.html';
    }
    // If not logged in and on login/signup pages, stay here
}

// Login functionality
async function login(email, password, remember) {
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // Store token
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            if (remember) {
                localStorage.setItem('remember', 'true');
            }

            // Redirect to main app
            window.location.href = 'index.html';
        } else {
            throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
        throw error;
    }
}

// Signup functionality
async function signup(userData) {
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        const data = await response.json();

        if (response.ok) {
            showSuccess('Account created successfully! Please sign in.');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            throw new Error(data.message || 'Registration failed');
        }
    } catch (error) {
        throw error;
    }
}

// Logout functionality
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('remember');
    window.location.href = 'login.html';
}

// Get auth headers for API calls
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const remember = document.getElementById('remember').checked;

            showSpinner('login-spinner', 'login-text');

            try {
                await login(email, password, remember);
            } catch (error) {
                hideSpinner('login-spinner', 'login-text', 'Sign In');
                showError(error.message);
            }
        });
    }

    // Signup form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (password !== confirmPassword) {
                showError('Passwords do not match', 'signup-error-message');
                return;
            }

            const userData = {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                businessName: document.getElementById('businessName').value,
                email: document.getElementById('signup-email').value,
                phone: document.getElementById('signup-phone').value,
                password: password,
            };

            showSpinner('signup-spinner', 'signup-text');

            try {
                await signup(userData);
                hideSpinner('signup-spinner', 'signup-text', 'Create Account');
            } catch (error) {
                hideSpinner('signup-spinner', 'signup-text', 'Create Account');
                showError(error.message, 'signup-error-message');
            }
        });
    }

    // Check authentication status
    checkAuth();
});