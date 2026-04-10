// Admin Panel JavaScript
const API_BASE = 'http://localhost:3000/api';

// Get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('admin_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
}

// Check admin authentication
function checkAdminAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = '../admin-login.html';
        return;
    }

    // Verify admin token with server
    fetch(`${API_BASE}/admin/verify`, {
        headers: getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Invalid admin token');
        }
        return response.json();
    })
    .then(admin => {
        // Load only dashboard stats initially for fast login
        loadDashboardStats();
    })
    .catch(error => {
        console.error('Admin auth check failed:', error);
        localStorage.removeItem('admin_token');
        window.location.href = '../admin-login.html';
    });
}

// Logout function
function logout() {
    localStorage.removeItem('admin_token');
    window.location.href = '../admin-login.html';
}

// Load dashboard statistics
function loadDashboardStats() {
    return Promise.all([
        fetch(`${API_BASE}/admin/stats/users`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/admin/stats/transactions`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/admin/stats/customers`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/admin/stats/invoices`, { headers: getAuthHeaders() })
    ])
    .then(responses => Promise.all(responses.map(r => r.json())))
    .then(([users, transactions, customers, invoices]) => {
        document.getElementById('total-users').textContent = users.count;
        document.getElementById('total-transactions').textContent = transactions.count;
        document.getElementById('total-customers').textContent = customers.count;
        document.getElementById('total-invoices').textContent = invoices.count;
    })
    .catch(error => {
        console.error('Error loading dashboard stats:', error);
    });
}

// Load all users
function loadUsers(page = 1) {
    return fetch(`${API_BASE}/admin/users?page=${page}&limit=50`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(data => {
        displayUsers(data.users);
        // Could add pagination controls here if needed
    });
}

// Display users in table
function displayUsers(users) {
    const container = document.getElementById('users-list');
    container.innerHTML = '';

    if (users.length === 0) {
        container.innerHTML = '<tr><td colspan="7" class="loading">No users found</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.businessName}</td>
            <td>${user.email}</td>
            <td>${user.phone}</td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="action-btn btn-view" onclick="viewUser(${user.id})">View</button>
                <button class="action-btn btn-edit" onclick="editUser(${user.id})">Edit</button>
                <button class="action-btn btn-delete" onclick="deleteUser(${user.id})">Delete</button>
            </td>
        `;
        container.appendChild(row);
    });
}

// Load all transactions
function loadAllTransactions(page = 1) {
    return fetch(`${API_BASE}/admin/transactions?page=${page}&limit=100`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(data => {
        displayAllTransactions(data.transactions);
        populateUserFilter(data.transactions);
    });
}

// Display all transactions
function displayAllTransactions(transactions) {
    const container = document.getElementById('transactions-list');
    container.innerHTML = '';

    if (transactions.length === 0) {
        container.innerHTML = '<tr><td colspan="8" class="loading">No transactions found</td></tr>';
        return;
    }

    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.id}</td>
            <td>${transaction.userName || 'Unknown'}</td>
            <td>${transaction.date}</td>
            <td>${transaction.description}</td>
            <td><span class="status-badge status-${transaction.type}">${transaction.type}</span></td>
            <td>PKR ${transaction.amount.toFixed(2)}</td>
            <td>${transaction.customerName || '-'}</td>
            <td>
                <button class="action-btn btn-view" onclick="viewTransaction(${transaction.id})">View</button>
                <button class="action-btn btn-delete" onclick="deleteTransaction(${transaction.id})">Delete</button>
            </td>
        `;
        container.appendChild(row);
    });
}

// Load all customers
function loadAllCustomers(page = 1) {
    return fetch(`${API_BASE}/admin/customers?page=${page}&limit=100`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(data => {
        displayAllCustomers(data.customers);
    });
}

// Display all customers
function displayAllCustomers(customers) {
    const container = document.getElementById('customers-list');
    container.innerHTML = '';

    if (customers.length === 0) {
        container.innerHTML = '<tr><td colspan="7" class="loading">No customers found</td></tr>';
        return;
    }

    customers.forEach(customer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${customer.id}</td>
            <td>${customer.userName || 'Unknown'}</td>
            <td>${customer.name}</td>
            <td>${customer.phone}</td>
            <td>${customer.email || '-'}</td>
            <td>PKR ${customer.balance.toFixed(2)}</td>
            <td>
                <button class="action-btn btn-view" onclick="viewCustomer(${customer.id})">View</button>
                <button class="action-btn btn-delete" onclick="deleteCustomer(${customer.id})">Delete</button>
            </td>
        `;
        container.appendChild(row);
    });
}

// Load all invoices
function loadAllInvoices(page = 1) {
    return fetch(`${API_BASE}/admin/invoices?page=${page}&limit=50`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(data => {
        displayAllInvoices(data.invoices);
    });
}

// Display all invoices
function displayAllInvoices(invoices) {
    const container = document.getElementById('invoices-list');
    container.innerHTML = '';

    if (invoices.length === 0) {
        container.innerHTML = '<tr><td colspan="7" class="loading">No invoices found</td></tr>';
        return;
    }

    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${invoice.id}</td>
            <td>${invoice.userName || 'Unknown'}</td>
            <td>${invoice.customerName}</td>
            <td>${invoice.date}</td>
            <td>PKR ${invoice.total.toFixed(2)}</td>
            <td><span class="status-badge status-active">Active</span></td>
            <td>
                <button class="action-btn btn-view" onclick="viewInvoice(${invoice.id})">View</button>
                <button class="action-btn btn-delete" onclick="deleteInvoice(${invoice.id})">Delete</button>
            </td>
        `;
        container.appendChild(row);
    });
}

// Populate user filter dropdown
function populateUserFilter(transactions) {
    const userFilter = document.getElementById('filter-user');
    const users = [...new Set(transactions.map(t => t.userId))];

    users.forEach(userId => {
        const userName = transactions.find(t => t.userId === userId)?.userName || `User ${userId}`;
        const option = document.createElement('option');
        option.value = userId;
        option.textContent = userName;
        userFilter.appendChild(option);
    });
}

// View user details
function viewUser(userId) {
    fetch(`${API_BASE}/admin/users/${userId}`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(user => {
        const details = document.getElementById('user-details');
        details.innerHTML = `
            <div class="user-info">
                <h3>${user.firstName} ${user.lastName}</h3>
                <p><strong>Business:</strong> ${user.businessName}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Phone:</strong> ${user.phone}</p>
                <p><strong>Joined:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
        `;
        document.getElementById('user-modal-title').textContent = 'User Details';
        showModal('user-modal');
    });
}

// Delete user
function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user? This will delete all their data.')) {
        fetch(`${API_BASE}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        })
        .then(response => {
            if (response.ok) {
                loadUsers();
                loadDashboardStats();
            } else {
                showError('Failed to delete user');
            }
        });
    }
}

// Delete transaction
function deleteTransaction(transactionId) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        fetch(`${API_BASE}/admin/transactions/${transactionId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        })
        .then(response => {
            if (response.ok) {
                loadAllTransactions();
                loadDashboardStats();
            } else {
                showError('Failed to delete transaction');
            }
        });
    }
}

// Delete customer
function deleteCustomer(customerId) {
    if (confirm('Are you sure you want to delete this customer?')) {
        fetch(`${API_BASE}/admin/customers/${customerId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        })
        .then(response => {
            if (response.ok) {
                loadAllCustomers();
                loadDashboardStats();
            } else {
                showError('Failed to delete customer');
            }
        });
    }
}

// Delete invoice
function deleteInvoice(invoiceId) {
    if (confirm('Are you sure you want to delete this invoice?')) {
        fetch(`${API_BASE}/admin/invoices/${invoiceId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        })
        .then(response => {
            if (response.ok) {
                loadAllInvoices();
                loadDashboardStats();
            } else {
                showError('Failed to delete invoice');
            }
        });
    }
}

// Generate reports
function generateRevenueReport() {
    fetch(`${API_BASE}/admin/reports/revenue`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(data => {
        displayReport('Revenue Report', data);
    });
}

function generateUserReport() {
    fetch(`${API_BASE}/admin/reports/users`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(data => {
        displayReport('User Activity Report', data);
    });
}

function generateTransactionReport() {
    fetch(`${API_BASE}/admin/reports/transactions`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(data => {
        displayReport('Transaction Summary Report', data);
    });
}

function displayReport(title, data) {
    const output = document.getElementById('report-output');
    output.innerHTML = `
        <h3>${title}</h3>
        <pre>${JSON.stringify(data, null, 2)}</pre>
    `;
}

// Modal functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show section
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionId) {
            link.classList.add('active');
        }
    });

    // Load data for the section if not already loaded
    loadSectionData(sectionId);
}

// Load data for specific section on demand
function loadSectionData(sectionId) {
    // Show loading indicator
    const section = document.getElementById(sectionId);
    const tableContainer = section.querySelector('.table-container');
    if (tableContainer) {
        const tbody = tableContainer.querySelector('tbody');
        if (tbody && (!tbody.hasChildNodes() || tbody.innerHTML.trim() === '')) {
            tbody.innerHTML = '<tr><td colspan="10" class="loading"><div class="spinner"></div> Loading data...</td></tr>';
        }
    }

    switch(sectionId) {
        case 'users':
            loadUsers();
            break;
        case 'transactions':
            loadAllTransactions();
            break;
        case 'customers':
            loadAllCustomers();
            break;
        case 'invoices':
            loadAllInvoices();
            break;
    }
}

// Show error message
function showError(message) {
    alert('Error: ' + message);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });

    // Filters
    document.getElementById('filter-user').addEventListener('change', filterTransactions);
    document.getElementById('filter-type').addEventListener('change', filterTransactions);
    document.getElementById('filter-date').addEventListener('change', filterTransactions);
});

// Filter transactions
function filterTransactions() {
    const userFilter = document.getElementById('filter-user').value;
    const typeFilter = document.getElementById('filter-type').value;
    const dateFilter = document.getElementById('filter-date').value;

    const rows = document.querySelectorAll('#transactions-list tr');

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 8) return; // Skip if not enough cells

        const userName = cells[1].textContent.toLowerCase();
        const type = cells[4].textContent.toLowerCase();
        const date = cells[2].textContent;

        let show = true;

        if (userFilter && !userName.includes(userFilter.toLowerCase())) {
            show = false;
        }

        if (typeFilter && !type.includes(typeFilter)) {
            show = false;
        }

        if (dateFilter && date !== dateFilter) {
            show = false;
        }

        row.style.display = show ? '' : 'none';
    });
}

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});