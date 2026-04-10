const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'digikhata-secret-key-2024';

// Middleware
app.use(cors());
app.use(express.json());

// Cache static assets for better performance
app.use(express.static(path.join(__dirname), {
    maxAge: '1d', // Cache for 1 day
    setHeaders: (res, path) => {
        if (path.endsWith('.css') || path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        }
    }
}));

// Database setup with optimizations
const db = new sqlite3.Database('./digikhata.db', {
    verbose: console.log,
    // Enable WAL mode for better concurrency
    // This allows multiple readers and one writer
}, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        // Enable WAL mode for better performance
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA synchronous = NORMAL');
        db.run('PRAGMA cache_size = 1000000'); // 1MB cache
        db.run('PRAGMA temp_store = memory');
        initDatabase();
    }
});

// Initialize database tables
function initDatabase() {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        businessName TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        password TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Transactions table
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        date TEXT NOT NULL,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        customerId INTEGER,
        customerName TEXT,
        synced BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id)
    )`);

    // Customers table
    db.run(`CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT,
        picture TEXT,
        balance REAL DEFAULT 0,
        synced BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id)
    )`);

    // Invoices table
    db.run(`CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        customerId INTEGER NOT NULL,
        customerName TEXT NOT NULL,
        date TEXT NOT NULL,
        items TEXT NOT NULL,
        subtotal REAL NOT NULL,
        tax REAL NOT NULL,
        total REAL NOT NULL,
        synced BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id),
        FOREIGN KEY (customerId) REFERENCES customers (id)
    )`);

    // Create indexes for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_userId ON transactions(userId)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_customers_userId ON customers(userId)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_userId ON invoices(userId)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_customerId ON invoices(customerId)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Admin authentication middleware
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Admin access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, admin) => {
        if (err || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Invalid admin token' });
        }
        req.admin = admin;
        next();
    });
}

// Admin credentials (in production, store securely)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123'; // Change this in production

// Routes

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, businessName, email, phone, password } = req.body;

        // Validate input
        if (!firstName || !lastName || !businessName || !email || !phone || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Check if user already exists
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (row) {
                return res.status(400).json({ message: 'User with this email already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user
            db.run(`INSERT INTO users (firstName, lastName, businessName, email, phone, password)
                    VALUES (?, ?, ?, ?, ?, ?)`,
                [firstName, lastName, businessName, email, phone, hashedPassword],
                function(err) {
                    if (err) {
                        return res.status(500).json({ message: 'Error creating user' });
                    }

                    // Generate token
                    const token = jwt.sign(
                        { id: this.lastID, email },
                        JWT_SECRET,
                        { expiresIn: '7d' }
                    );

                    res.status(201).json({
                        message: 'User created successfully',
                        token,
                        user: {
                            id: this.lastID,
                            firstName,
                            lastName,
                            businessName,
                            email,
                            phone
                        }
                    });
                });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }

            if (!user) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Check password
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Generate token
            const token = jwt.sign(
                { id: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    businessName: user.businessName,
                    email: user.email,
                    phone: user.phone
                }
            });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Protected routes

// Get user data
app.get('/api/user', authenticateToken, (req, res) => {
    db.get('SELECT id, firstName, lastName, businessName, email, phone FROM users WHERE id = ?',
        [req.user.id], (err, user) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.json(user);
        });
});

// Transactions routes
app.get('/api/transactions', authenticateToken, (req, res) => {
    db.all('SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC',
        [req.user.id], (err, transactions) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }
            res.json(transactions);
        });
});

app.post('/api/transactions', authenticateToken, (req, res) => {
    const { date, description, amount, type, category, customerId, customerName } = req.body;

    db.run(`INSERT INTO transactions (userId, date, description, amount, type, category, customerId, customerName)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, date, description, amount, type, category, customerId, customerName],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Error creating transaction' });
            }
            res.status(201).json({ id: this.lastID, message: 'Transaction created' });
        });
});

// Customers routes
app.get('/api/customers', authenticateToken, (req, res) => {
    db.all('SELECT * FROM customers WHERE userId = ? ORDER BY name',
        [req.user.id], (err, customers) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }
            res.json(customers);
        });
});

app.post('/api/customers', authenticateToken, (req, res) => {
    const { name, phone, email, address, picture, balance } = req.body;

    db.run(`INSERT INTO customers (userId, name, phone, email, address, picture, balance)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, name, phone, email, address, picture, balance || 0],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Error creating customer' });
            }
            res.status(201).json({ id: this.lastID, message: 'Customer created' });
        });
});

app.put('/api/customers/:id', authenticateToken, (req, res) => {
    const { name, phone, email, address, picture, balance } = req.body;
    const customerId = req.params.id;

    db.run(`UPDATE customers SET name = ?, phone = ?, email = ?, address = ?, picture = ?, balance = ?
            WHERE id = ? AND userId = ?`,
        [name, phone, email, address, picture, balance, customerId, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Error updating customer' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ message: 'Customer not found' });
            }
            res.json({ message: 'Customer updated' });
        });
});

// Invoices routes
app.get('/api/invoices', authenticateToken, (req, res) => {
    db.all('SELECT * FROM invoices WHERE userId = ? ORDER BY date DESC',
        [req.user.id], (err, invoices) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }
            res.json(invoices);
        });
});

app.post('/api/invoices', authenticateToken, (req, res) => {
    const { customerId, customerName, date, items, subtotal, tax, total } = req.body;

    db.run(`INSERT INTO invoices (userId, customerId, customerName, date, items, subtotal, tax, total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, customerId, customerName, date, JSON.stringify(items), subtotal, tax, total],
        function(err) {
            if (err) {
                return res.status(500).json({ message: 'Error creating invoice' });
            }
            res.status(201).json({ id: this.lastID, message: 'Invoice created' });
        });
});

// Sync endpoint for offline data
app.post('/api/sync', authenticateToken, (req, res) => {
    const { transactions, customers, invoices } = req.body;

    // This is a simplified sync - in production you'd want proper conflict resolution
    let completed = 0;
    const total = (transactions?.length || 0) + (customers?.length || 0) + (invoices?.length || 0);

    if (total === 0) {
        return res.json({ message: 'No data to sync' });
    }

    function checkComplete() {
        completed++;
        if (completed === total) {
            res.json({ message: 'Data synced successfully' });
        }
    }

    // Sync transactions
    if (transactions && transactions.length > 0) {
        transactions.forEach(txn => {
            db.run(`INSERT OR REPLACE INTO transactions
                    (id, userId, date, description, amount, type, category, customerId, customerName, synced)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [txn.id, req.user.id, txn.date, txn.description, txn.amount, txn.type,
                 txn.category, txn.customerId, txn.customerName, 1],
                checkComplete);
        });
    }

    // Sync customers
    if (customers && customers.length > 0) {
        customers.forEach(cust => {
            db.run(`INSERT OR REPLACE INTO customers
                    (id, userId, name, phone, email, address, picture, balance, synced)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [cust.id, req.user.id, cust.name, cust.phone, cust.email, cust.address,
                 cust.picture, cust.balance, 1],
                checkComplete);
        });
    }

    // Sync invoices
    if (invoices && invoices.length > 0) {
        invoices.forEach(inv => {
            db.run(`INSERT OR REPLACE INTO invoices
                    (id, userId, customerId, customerName, date, items, subtotal, tax, total, synced)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [inv.id, req.user.id, inv.customerId, inv.customerName, inv.date,
                 JSON.stringify(inv.items), inv.subtotal, inv.tax, inv.total, 1],
                checkComplete);
        });
    }
});

// Serve login page as default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Admin routes
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ role: 'admin', username: username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, message: 'Admin login successful' });
    } else {
        res.status(401).json({ message: 'Invalid admin credentials' });
    }
});

app.get('/api/admin/verify', authenticateAdmin, (req, res) => {
    res.json({ role: 'admin', username: req.admin.username });
});

// Admin user management
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // Default 50 users per page
    const offset = (page - 1) * limit;

    // Get total count
    db.get('SELECT COUNT(*) as total FROM users', [], (err, countResult) => {
        if (err) return res.status(500).json({ message: 'Database error' });

        // Get paginated users
        db.all('SELECT id, firstName, lastName, businessName, email, phone, createdAt FROM users ORDER BY createdAt DESC LIMIT ? OFFSET ?',
            [limit, offset], (err, users) => {
                if (err) return res.status(500).json({ message: 'Database error' });

                res.json({
                    users: users,
                    total: countResult.total,
                    page: page,
                    limit: limit,
                    totalPages: Math.ceil(countResult.total / limit)
                });
            });
    });
});

app.get('/api/admin/users/:id', authenticateAdmin, (req, res) => {
    const userId = req.params.id;
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    });
});

app.delete('/api/admin/users/:id', authenticateAdmin, (req, res) => {
    const userId = req.params.id;

    // Delete user's data in sequence
    db.run('DELETE FROM transactions WHERE userId = ?', [userId], (err) => {
        if (err) return res.status(500).json({ message: 'Error deleting transactions' });

        db.run('DELETE FROM customers WHERE userId = ?', [userId], (err) => {
            if (err) return res.status(500).json({ message: 'Error deleting customers' });

            db.run('DELETE FROM invoices WHERE userId = ?', [userId], (err) => {
                if (err) return res.status(500).json({ message: 'Error deleting invoices' });

                db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
                    if (err) return res.status(500).json({ message: 'Error deleting user' });
                    res.json({ message: 'User and all data deleted' });
                });
            });
        });
    });
});

// Admin transaction management
app.get('/api/admin/transactions', authenticateAdmin, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Default 100 transactions per page
    const offset = (page - 1) * limit;

    // Get total count
    db.get('SELECT COUNT(*) as total FROM transactions', [], (err, countResult) => {
        if (err) return res.status(500).json({ message: 'Database error' });

        // Get paginated transactions
        const query = `
            SELECT t.*, u.firstName || ' ' || u.lastName as userName
            FROM transactions t
            LEFT JOIN users u ON t.userId = u.id
            ORDER BY t.date DESC LIMIT ? OFFSET ?
        `;
        db.all(query, [limit, offset], (err, transactions) => {
            if (err) return res.status(500).json({ message: 'Database error' });

            res.json({
                transactions: transactions,
                total: countResult.total,
                page: page,
                limit: limit,
                totalPages: Math.ceil(countResult.total / limit)
            });
        });
    });
});

app.delete('/api/admin/transactions/:id', authenticateAdmin, (req, res) => {
    const transactionId = req.params.id;
    db.run('DELETE FROM transactions WHERE id = ?', [transactionId], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Error deleting transaction' });
        }
        res.json({ message: 'Transaction deleted' });
    });
});

// Admin customer management
app.get('/api/admin/customers', authenticateAdmin, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100; // Default 100 customers per page
    const offset = (page - 1) * limit;

    // Get total count
    db.get('SELECT COUNT(*) as total FROM customers', [], (err, countResult) => {
        if (err) return res.status(500).json({ message: 'Database error' });

        // Get paginated customers
        const query = `
            SELECT c.*, u.firstName || ' ' || u.lastName as userName
            FROM customers c
            LEFT JOIN users u ON c.userId = u.id
            ORDER BY c.name LIMIT ? OFFSET ?
        `;
        db.all(query, [limit, offset], (err, customers) => {
            if (err) return res.status(500).json({ message: 'Database error' });

            res.json({
                customers: customers,
                total: countResult.total,
                page: page,
                limit: limit,
                totalPages: Math.ceil(countResult.total / limit)
            });
        });
    });
});

app.delete('/api/admin/customers/:id', authenticateAdmin, (req, res) => {
    const customerId = req.params.id;
    db.run('DELETE FROM customers WHERE id = ?', [customerId], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Error deleting customer' });
        }
        res.json({ message: 'Customer deleted' });
    });
});

// Admin invoice management
app.get('/api/admin/invoices', authenticateAdmin, (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // Default 50 invoices per page
    const offset = (page - 1) * limit;

    // Get total count
    db.get('SELECT COUNT(*) as total FROM invoices', [], (err, countResult) => {
        if (err) return res.status(500).json({ message: 'Database error' });

        // Get paginated invoices
        const query = `
            SELECT i.*, u.firstName || ' ' || u.lastName as userName
            FROM invoices i
            LEFT JOIN users u ON i.userId = u.id
            ORDER BY i.date DESC LIMIT ? OFFSET ?
        `;
        db.all(query, [limit, offset], (err, invoices) => {
            if (err) return res.status(500).json({ message: 'Database error' });

            res.json({
                invoices: invoices,
                total: countResult.total,
                page: page,
                limit: limit,
                totalPages: Math.ceil(countResult.total / limit)
            });
        });
    });
});

app.delete('/api/admin/invoices/:id', authenticateAdmin, (req, res) => {
    const invoiceId = req.params.id;
    db.run('DELETE FROM invoices WHERE id = ?', [invoiceId], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Error deleting invoice' });
        }
        res.json({ message: 'Invoice deleted' });
    });
});

// Admin statistics
app.get('/api/admin/stats/users', authenticateAdmin, (req, res) => {
    db.get('SELECT COUNT(*) as count FROM users', [], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(result);
    });
});

app.get('/api/admin/stats/transactions', authenticateAdmin, (req, res) => {
    db.get('SELECT COUNT(*) as count FROM transactions', [], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(result);
    });
});

app.get('/api/admin/stats/customers', authenticateAdmin, (req, res) => {
    db.get('SELECT COUNT(*) as count FROM customers', [], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(result);
    });
});

app.get('/api/admin/stats/invoices', authenticateAdmin, (req, res) => {
    db.get('SELECT COUNT(*) as count FROM invoices', [], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(result);
    });
});

// Admin reports
app.get('/api/admin/reports/revenue', authenticateAdmin, (req, res) => {
    const query = `
        SELECT strftime('%Y-%m', date) as month,
               SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
               SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
        FROM transactions
        GROUP BY strftime('%Y-%m', date)
        ORDER BY month DESC
    `;
    db.all(query, [], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

app.get('/api/admin/reports/users', authenticateAdmin, (req, res) => {
    const query = `
        SELECT strftime('%Y-%m', createdAt) as month, COUNT(*) as newUsers
        FROM users
        GROUP BY strftime('%Y-%m', createdAt)
        ORDER BY month DESC
    `;
    db.all(query, [], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

app.get('/api/admin/reports/transactions', authenticateAdmin, (req, res) => {
    const query = `
        SELECT type, COUNT(*) as count, SUM(amount) as total
        FROM transactions
        GROUP BY type
    `;
    db.all(query, [], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Al Saadi Khata server running on http://localhost:${PORT}`);
});