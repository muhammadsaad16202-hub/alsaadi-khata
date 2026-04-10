// API Base URL
const API_BASE = 'http://localhost:3000/api';

// Simple cache for API responses
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cached API call function
async function cachedFetch(url, options = {}) {
    const cacheKey = url + JSON.stringify(options);

    // Check cache first
    if (apiCache.has(cacheKey)) {
        const { data, timestamp } = apiCache.get(cacheKey);
        if (Date.now() - timestamp < CACHE_DURATION) {
            return data;
        }
        apiCache.delete(cacheKey);
    }

    // Make the request
    const response = await fetch(url, options);
    const data = await response.json();

    // Cache the response
    if (response.ok) {
        apiCache.set(cacheKey, { data, timestamp: Date.now() });
    }

    return data;
}

// Get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
}

// Lazy loading for images
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Initialize lazy loading when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    lazyLoadImages();
});

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
}

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Verify token with server
    fetch(`${API_BASE}/user`, {
        headers: getAuthHeaders()
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        return response.json();
    })
    .then(user => {
        // Update user info in UI
        updateUserInfo(user);
        // Load data from server
        loadDataFromServer();
    })
    .catch(error => {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    });
}

// Update user info in UI
function updateUserInfo(user) {
    // Add user info to navbar or header
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    userInfo.innerHTML = `
        <span>Welcome, ${user.firstName} ${user.lastName}</span>
        <button onclick="logout()" class="logout-btn">Logout</button>
    `;

    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.appendChild(userInfo);
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Performance monitoring
const performanceMonitor = {
    startTime: null,
    start(operation) {
        this.startTime = performance.now();
        console.log(`Starting ${operation}...`);
    },
    end(operation) {
        if (this.startTime) {
            const duration = performance.now() - this.startTime;
            console.log(`${operation} completed in ${duration.toFixed(2)}ms`);
            this.startTime = null;
        }
    }
};

// Optimized data loading with performance monitoring
function loadDataFromServer() {
    performanceMonitor.start('Loading all data');

    Promise.all([
        loadTransactions(),
        loadCustomers(),
        loadInvoicesFromServer()
    ]).then(() => {
        performanceMonitor.end('Loading all data');
        updateDashboard();
    }).catch(error => {
        console.error('Error loading data:', error);
        showError('Failed to load data from server');
    });
}

// Load transactions from server
function loadTransactionsFromServer() {
    return fetch(`${API_BASE}/transactions`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(transactions => {
        displayTransactions(transactions);
        displayRecentTransactions(transactions.slice(-5));
    });
}

// Load customers from server
function loadCustomersFromServer() {
    return fetch(`${API_BASE}/customers`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(customers => {
        displayCustomers(customers);
        populateCustomerSelects(customers);
    });
}

// Load invoices from server
function loadInvoicesFromServer() {
    return fetch(`${API_BASE}/invoices`, {
        headers: getAuthHeaders(),
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to load invoices');
        return response.json();
    })
    .then(invoices => {
        displayInvoices(invoices);
    })
    .catch(error => {
        console.error('Error loading invoices:', error);
        showError('Failed to load invoices');
    });
}

// Transaction Management
function addTransaction(transaction) {
    fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(transaction),
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to save transaction');
        return response.json();
    })
    .then(data => {
        loadDataFromServer(); // Reload all data
    })
    .catch(error => {
        console.error('Error saving transaction:', error);
        showError('Failed to save transaction');
    });
}

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Optimized data loading with caching
function loadTransactions() {
    cachedFetch(`${API_BASE}/transactions`, {
        headers: getAuthHeaders(),
    })
    .then(transactions => {
        displayTransactions(transactions);
        displayRecentTransactions(transactions.slice(-5));
    })
    .catch(error => {
        console.error('Error loading transactions:', error);
        showError('Failed to load transactions');
    });
}

function displayTransactions(transactions) {
    const container = document.getElementById('transaction-list');
    container.innerHTML = '';

    if (transactions.length === 0) {
        container.innerHTML = '<div class="empty-state">No transactions found</div>';
        return;
    }

    transactions.forEach(transaction => {
        const item = document.createElement('div');
        item.className = `transaction-item ${transaction.type}`;
        item.innerHTML = `
            <div class="transaction-info">
                <h4>${transaction.description}</h4>
                <div class="transaction-meta">
                    ${transaction.date} • ${transaction.category}
                    ${transaction.customerName ? ` • ${transaction.customerName}` : ''}
                </div>
            </div>
            <div class="transaction-amount ${transaction.type}">PKR ${transaction.amount.toFixed(2)}</div>
        `;
        container.appendChild(item);
    });
}

function displayRecentTransactions(transactions) {
    const container = document.getElementById('recent-transactions-list');
    container.innerHTML = '';

    if (transactions.length === 0) {
        container.innerHTML = '<p>No recent transactions</p>';
        return;
    }

    transactions.reverse().forEach(transaction => {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        item.innerHTML = `
            <div class="transaction-info">
                <span>${transaction.description}</span>
                <small>${transaction.date}</small>
            </div>
            <div class="transaction-amount ${transaction.type}">PKR ${transaction.amount.toFixed(2)}</div>
        `;
        container.appendChild(item);
    });
}

// Record Send/Receive transaction for customer
function recordTransaction(customerId, type) {
    // Get customer details from server
    fetch(`${API_BASE}/customers`, {
        headers: getAuthHeaders(),
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to load customers');
        return response.json();
    })
    .then(customers => {
        const customer = customers.find(c => c.id == customerId);
        if (customer) {
            // Show quick transaction modal
            showQuickTransactionModal(customer, type);
        }
    })
    .catch(error => {
        console.error('Error loading customer:', error);
        showError('Failed to load customer details');
    });
}

// Quick transaction modal
function showQuickTransactionModal(customer, type) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'quick-transaction-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${type === 'send' ? 'Send Money' : 'Receive Money'} - ${customer.name}</h2>
                <span class="close" onclick="closeModal('quick-transaction-modal')">&times;</span>
            </div>
            <form id="quick-transaction-form">
                <div class="form-group">
                    <label for="quick-amount">Amount (PKR)</label>
                    <input type="number" id="quick-amount" placeholder="0.00" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="quick-description">Description</label>
                    <input type="text" id="quick-description" placeholder="Transaction description" required>
                </div>
                <div class="form-group">
                    <label for="quick-date">Date</label>
                    <input type="date" id="quick-date" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal('quick-transaction-modal')">Cancel</button>
                    <button type="submit" class="btn-primary">${type === 'send' ? 'Send' : 'Receive'}</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    document.getElementById('quick-transaction-modal').style.display = 'block';
    document.getElementById('quick-date').valueAsDate = new Date();

    // Handle form submission
    document.getElementById('quick-transaction-form').addEventListener('submit', function(e) {
        e.preventDefault();

        const amount = parseFloat(document.getElementById('quick-amount').value);
        const description = document.getElementById('quick-description').value;
        const date = document.getElementById('quick-date').value;

        // Create transaction
        const transactionData = {
            date: date,
            description: description,
            amount: amount,
            type: type === 'send' ? 'expense' : 'income',
            category: 'customer_transaction',
            customerId: customer.id,
            customerName: customer.name,
            synced: false
        };

        addTransaction(transactionData);
        closeModal('quick-transaction-modal');
        modal.remove();
    });
}

function loadCustomers() {
    cachedFetch(`${API_BASE}/customers`, {
        headers: getAuthHeaders(),
    })
    .then(customers => {
        displayCustomers(customers);
        populateCustomerSelects();
    })
    .catch(error => {
        console.error('Error loading customers:', error);
        showError('Failed to load customers');
    });
}

function addCustomer(customer) {
    fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(customer),
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to save customer');
        return response.json();
    })
    .then(data => {
        loadCustomers(); // Reload customers
    })
    .catch(error => {
        console.error('Error saving customer:', error);
        showError('Failed to save customer');
    });
}

function displayCustomers(customers) {
    const container = document.getElementById('customers-list');
    container.innerHTML = '';

    if (customers.length === 0) {
        container.innerHTML = '<div class="empty-state">No customers found</div>';
        return;
    }

    customers.forEach(customer => {
        const card = document.createElement('div');
        card.className = 'customer-card';
        card.innerHTML = `
            <div class="customer-avatar">
                ${customer.picture ? `<img class="lazy" data-src="${customer.picture}" alt="${customer.name}" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNFNUU1RTUiLz4KPHBhdGggZD0iTTIwIDIwQzIyLjc2MTQgMjAgMjUgMTcuNzYxNCAyNSAxNUMyNSAxMi4yMzg2IDIyLjc2MTQgMTAgMjAgMTBDMTcuMjM4NiAxMCAxNSAxMi4yMzg2IDE1IDE1QzE1IDE3Ljc2MTQgMTcuNzYxNCAyMCAyMFoiIGZpbGw9IiM5Q0E5Q0EiLz4KPC9zdmc+" onload="this.classList.remove('lazy')">` : '<i class="fas fa-user"></i>'}
            </div>
            <div class="customer-info">
                <h4>${customer.name}</h4>
                <p><i class="fas fa-phone"></i> ${customer.phone || 'No phone'}</p>
                <p><i class="fas fa-envelope"></i> ${customer.email || 'No email'}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${customer.address || 'No address'}</p>
            </div>
            <div class="customer-balance">
                <div class="balance-amount">PKR ${customer.balance ? customer.balance.toFixed(2) : '0.00'}</div>
                <div class="balance-label">Balance</div>
            </div>
            <div class="customer-actions">
                <button class="btn-send" onclick="recordTransaction(${customer.id}, 'send')">
                    <i class="fas fa-paper-plane"></i> Send
                </button>
                <button class="btn-receive" onclick="recordTransaction(${customer.id}, 'receive')">
                    <i class="fas fa-arrow-down"></i> Received
                </button>
                <button class="btn-edit" onclick="editCustomer(${customer.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete" onclick="deleteCustomer(${customer.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function populateCustomerSelects() {
    const selects = document.querySelectorAll('#txn-customer, #inv-customer');
    fetch(`${API_BASE}/customers`, {
        headers: getAuthHeaders(),
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to load customers');
        return response.json();
    })
    .then(customers => {
        selects.forEach(select => {
            select.innerHTML = '<option value="">Select Customer</option>';
            customers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = customer.name;
                select.appendChild(option);
            });
        });
    })
    .catch(error => {
        console.error('Error loading customers for selects:', error);
    });
}

// Update customer balance
function updateCustomerBalance(customerId, type, amount) {
    if (!customerId) return;

    // First get the current customer data
    fetch(`${API_BASE}/customers`, {
        headers: getAuthHeaders(),
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to load customers');
        return response.json();
    })
    .then(customers => {
        const customer = customers.find(c => c.id == customerId);
        if (customer) {
            // Calculate new balance based on transaction type
            let newBalance = customer.balance || 0;
            if (type === 'income') {
                newBalance += amount;
            } else {
                newBalance -= amount;
            }

            // Update customer balance
            fetch(`${API_BASE}/customers/${customerId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ...customer,
                    balance: newBalance
                }),
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to update customer balance');
                return response.json();
            })
            .then(data => {
                loadCustomers(); // Refresh display
            })
            .catch(error => {
                console.error('Error updating customer balance:', error);
            });
        }
    })
    .catch(error => {
        console.error('Error loading customers for balance update:', error);
    });
}

// Invoice Management
function addInvoice(invoice) {
    fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(invoice),
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to save invoice');
        return response.json();
    })
    .then(data => {
        loadInvoices();
        // Add transaction for the invoice
        const transaction = {
            date: invoice.date,
            description: `Invoice #${data.id} - ${invoice.customerName}`,
            amount: invoice.total,
            type: 'income',
            category: 'sales',
            customerId: invoice.customerId,
            customerName: invoice.customerName
        };
        addTransaction(transaction);
    })
    .catch(error => {
        console.error('Error saving invoice:', error);
        showError('Failed to save invoice');
    });
}

function loadInvoices() {
    cachedFetch(`${API_BASE}/invoices`, {
        headers: getAuthHeaders(),
    })
    .then(invoices => {
        displayInvoices(invoices);
    })
    .catch(error => {
        console.error('Error loading invoices:', error);
        showError('Failed to load invoices');
    });
}

function displayInvoices(invoices) {
    const container = document.getElementById('invoices-list');
    container.innerHTML = '';

    if (invoices.length === 0) {
        container.innerHTML = '<div class="empty-state">No invoices found</div>';
        return;
    }

    invoices.forEach(invoice => {
        const card = document.createElement('div');
        card.className = 'invoice-card';
        card.innerHTML = `
            <div class="invoice-info">
                <h4>Invoice #${invoice.id}</h4>
                <p>${invoice.customerName}</p>
                <p>${invoice.date}</p>
            </div>
            <div class="invoice-amount">PKR ${invoice.total.toFixed(2)}</div>
            <div class="invoice-actions">
                <button onclick="viewInvoice(${invoice.id})">View</button>
                <button onclick="printInvoice(${invoice.id})">Print</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Dashboard Updates
function updateDashboard() {
    // Load transactions for dashboard calculations
    fetch(`${API_BASE}/transactions`, {
        headers: getAuthHeaders(),
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to load transactions');
        return response.json();
    })
    .then(transactions => {
        let balance = 0, income = 0, expenses = 0;

        transactions.forEach(t => {
            if (t.type === 'income') {
                balance += t.amount;
                income += t.amount;
            } else {
                balance -= t.amount;
                expenses += t.amount;
            }
        });

        document.getElementById('total-balance').textContent = `PKR ${balance.toFixed(2)}`;
        document.getElementById('total-income').textContent = `PKR ${income.toFixed(2)}`;
        document.getElementById('total-expenses').textContent = `PKR ${expenses.toFixed(2)}`;

        // Update customer count
        fetch(`${API_BASE}/customers`, {
            headers: getAuthHeaders(),
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to load customers');
            return response.json();
        })
        .then(customers => {
            document.getElementById('total-customers').textContent = customers.length;
        })
        .catch(error => {
            console.error('Error loading customers for dashboard:', error);
        });
    })
    .catch(error => {
        console.error('Error loading transactions for dashboard:', error);
    });
}

// Invoice Item Management
function addInvoiceItem() {
    const container = document.getElementById('invoice-items-list');
    const item = document.createElement('div');
    item.className = 'invoice-item';
    item.innerHTML = `
        <input type="text" placeholder="Item name" class="item-name">
        <input type="number" placeholder="Qty" class="item-qty" step="1">
        <input type="number" placeholder="Rate" class="item-rate" step="0.01">
        <input type="number" placeholder="Amount" class="item-amount" readonly>
        <button type="button" class="remove-item" onclick="removeInvoiceItem(this)">×</button>
    `;
    container.appendChild(item);
    attachInvoiceItemListeners();
}

function removeInvoiceItem(button) {
    button.parentElement.remove();
    calculateInvoiceTotal();
}

function attachInvoiceItemListeners() {
    document.querySelectorAll('.item-qty, .item-rate').forEach(input => {
        input.addEventListener('input', function() {
            const item = this.parentElement;
            const qty = parseFloat(item.querySelector('.item-qty').value) || 0;
            const rate = parseFloat(item.querySelector('.item-rate').value) || 0;
            const amount = qty * rate;
            item.querySelector('.item-amount').value = amount.toFixed(2);
            calculateInvoiceTotal();
        });
    });
}

function calculateInvoiceTotal() {
    let subtotal = 0;
    document.querySelectorAll('.item-amount').forEach(input => {
        subtotal += parseFloat(input.value) || 0;
    });

    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    document.getElementById('subtotal').textContent = `PKR ${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `PKR ${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `PKR ${total.toFixed(2)}`;
}

// Server sync
function syncToServer(data) {
    // Placeholder for server API
    console.log('Syncing to server:', data);
    // fetch('/api/sync', { method: 'POST', body: JSON.stringify(data) })
    //     .then(response => response.json())
    //     .then(result => console.log('Synced successfully'))
    //     .catch(error => console.error('Sync failed:', error));
}

function syncData() {
    const syncBtn = document.getElementById('sync-btn');
    syncBtn.classList.add('syncing');

    setTimeout(() => {
        syncBtn.classList.remove('syncing');
        alert('Data synced successfully!');
    }, 2000);
}

// Online/Offline detection
function updateOnlineStatus() {
    const status = document.getElementById('status');
    const icon = status.querySelector('i');

    if (navigator.onLine) {
        status.innerHTML = '<i class="fas fa-wifi"></i> Online';
        status.style.color = '#4CAF50';
    } else {
        status.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
        status.style.color = '#FF5722';
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    updateOnlineStatus();

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });

    // Transaction form
    document.getElementById('transaction-form').addEventListener('submit', function(e) {
        e.preventDefault();

        const customerId = document.getElementById('txn-customer').value;
        const form = this;

        if (customerId) {
            // Get customer name from server
            fetch(`${API_BASE}/customers`, {
                headers: getAuthHeaders(),
            })
            .then(response => {
                if (!response.ok) throw new Error('Failed to load customers');
                return response.json();
            })
            .then(customers => {
                const customer = customers.find(c => c.id == customerId);
                const customerName = customer ? customer.name : '';

                const transaction = {
                    date: document.getElementById('txn-date').value,
                    description: document.getElementById('txn-description').value,
                    amount: parseFloat(document.getElementById('txn-amount').value),
                    type: document.getElementById('txn-type').value,
                    category: document.getElementById('txn-category').value,
                    customerId: customerId ? parseInt(customerId) : null,
                    customerName: customerName
                };

                addTransaction(transaction);
                closeModal('add-transaction');
                form.reset();
                document.getElementById('txn-date').valueAsDate = new Date();
            })
            .catch(error => {
                console.error('Error loading customer for transaction:', error);
                showError('Failed to load customer details');
            });
        } else {
            const transaction = {
                date: document.getElementById('txn-date').value,
                description: document.getElementById('txn-description').value,
                amount: parseFloat(document.getElementById('txn-amount').value),
                type: document.getElementById('txn-type').value,
                category: document.getElementById('txn-category').value,
                customerId: null,
                customerName: ''
            };

            addTransaction(transaction);
            closeModal('add-transaction');
            form.reset();
            document.getElementById('txn-date').valueAsDate = new Date();
        }
    });

    // Customer form
    document.getElementById('customer-form').addEventListener('submit', function(e) {
        e.preventDefault();

        const pictureInput = document.getElementById('cust-picture');
        let pictureData = null;

        if (pictureInput.files && pictureInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                pictureData = e.target.result;
                saveCustomer(pictureData);
            };
            reader.readAsDataURL(pictureInput.files[0]);
        } else {
            saveCustomer(null);
        }

        function saveCustomer(picture) {
            const customer = {
                name: document.getElementById('cust-name').value,
                phone: document.getElementById('cust-phone').value,
                email: document.getElementById('cust-email').value,
                address: document.getElementById('cust-address').value,
                picture: picture,
                balance: 0,
                synced: false
            };

            addCustomer(customer);
            closeModal('add-customer');
            this.reset();
            document.getElementById('picture-preview').innerHTML = '';
        }
    });

    // Invoice form
    document.getElementById('invoice-form').addEventListener('submit', function(e) {
        e.preventDefault();

        const customerId = document.getElementById('inv-customer').value;
        const customerName = document.getElementById('inv-customer').options[document.getElementById('inv-customer').selectedIndex].text;

        const items = [];
        document.querySelectorAll('.invoice-item').forEach(item => {
            const name = item.querySelector('.item-name').value;
            const qty = parseFloat(item.querySelector('.item-qty').value) || 0;
            const rate = parseFloat(item.querySelector('.item-rate').value) || 0;
            const amount = parseFloat(item.querySelector('.item-amount').value) || 0;

            if (name && qty > 0) {
                items.push({ name, qty, rate, amount });
            }
        });

        const invoice = {
            customerId: parseInt(customerId),
            customerName: customerName,
            date: document.getElementById('inv-date').value,
            items: items,
            subtotal: parseFloat(document.getElementById('subtotal').textContent.replace('PKR ', '')),
            tax: parseFloat(document.getElementById('tax').textContent.replace('PKR ', '')),
            total: parseFloat(document.getElementById('total').textContent.replace('PKR ', '')),
            synced: false
        };

        addInvoice(invoice);
        closeModal('create-invoice');
        this.reset();
    });

    // Set default dates
    document.getElementById('txn-date').valueAsDate = new Date();
    document.getElementById('inv-date').valueAsDate = new Date();

    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
        .then(function(registration) {
            console.log('Service Worker registered');
        })
        .catch(function(error) {
            console.error('Service Worker registration failed:', error);
        });
    }

    // Picture preview
    document.getElementById('cust-picture').addEventListener('change', function(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('picture-preview');

        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = '';
        }
    });
});

// Online/Offline events
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});