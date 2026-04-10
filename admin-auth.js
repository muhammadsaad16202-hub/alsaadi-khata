// Admin Authentication JavaScript
const API_BASE = 'http://localhost:3000/api';

// Admin login form handler
document.getElementById('admin-login-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;

    showSpinner('login-spinner', 'login-text');

    // Admin login request
    fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            password: password,
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Invalid credentials');
        }
        return response.json();
    })
    .then(data => {
        // Store admin token
        localStorage.setItem('admin_token', data.token);

        // Redirect to admin panel
        window.location.href = 'admin/index.html';
    })
    .catch(error => {
        console.error('Login error:', error);
        hideSpinner('login-spinner', 'login-text');
        showError('Invalid admin credentials');
    });
});

// Utility functions
function showSpinner(spinnerId, textId) {
    document.getElementById(spinnerId).style.display = 'block';
    document.getElementById(textId).textContent = 'Please wait...';
    document.getElementById(textId).previousElementSibling.disabled = true;
}

function hideSpinner(spinnerId, textId) {
    document.getElementById(spinnerId).style.display = 'none';
    document.getElementById(textId).textContent = 'Login';
    document.getElementById(textId).previousElementSibling.disabled = false;
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Check if already logged in
function checkAdminAuth() {
    const token = localStorage.getItem('admin_token');
    if (token) {
        // Verify token
        fetch(`${API_BASE}/admin/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        })
        .then(response => {
            if (response.ok) {
                // Already logged in, redirect to admin panel
                window.location.href = 'admin/index.html';
            }
        })
        .catch(error => {
            // Token invalid, stay on login page
            localStorage.removeItem('admin_token');
        });
    }
}

// Check auth on page load
document.addEventListener('DOMContentLoaded', checkAdminAuth);