# Admin Panel Documentation

## Overview
The Al Saadi Khata Admin Panel provides comprehensive management capabilities for the entire system. Admins can monitor, manage, and analyze all users, transactions, customers, and invoices across the platform.

## Access
- **URL**: `http://localhost:3000/admin-login.html`
- **Default Credentials**:
  - Username: `admin`
  - Password: `admin123`

⚠️ **Important**: Change the default admin password in production!

## Features

### Dashboard
- **System Statistics**: View total users, transactions, customers, and invoices
- **Real-time Metrics**: Live counts of all system entities
- **Quick Overview**: Instant system health check

### User Management
- **View All Users**: Complete list of registered users with details
- **User Details**: Business information, contact details, registration date
- **User Deletion**: Remove users and all associated data (transactions, customers, invoices)
- **User Analytics**: Track user registration patterns

### Transaction Management
- **All Transactions**: View every transaction across all users
- **Advanced Filtering**: Filter by user, type (income/expense), and date
- **Transaction Details**: Complete transaction information
- **Bulk Operations**: Delete transactions as needed

### Customer Management
- **Global Customer View**: All customers from all users
- **Customer Details**: Contact information and balance tracking
- **Cross-user Analysis**: Understand customer distribution
- **Data Cleanup**: Remove customer records

### Invoice Management
- **System-wide Invoices**: All invoices from all users
- **Invoice Tracking**: Monitor invoice creation and status
- **Financial Overview**: Total invoiced amounts
- **Invoice Management**: View and delete invoices

### Reports
- **Revenue Reports**: Monthly income vs expense analysis
- **User Activity**: User registration trends over time
- **Transaction Summary**: Comprehensive transaction statistics
- **Export Ready**: JSON format for further analysis

## Security
- **JWT Authentication**: Secure token-based admin access
- **Role-based Access**: Admin-specific permissions
- **Session Management**: Automatic logout on token expiry
- **Protected Routes**: All admin endpoints require authentication

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `GET /api/admin/verify` - Verify admin token

### User Management
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get specific user
- `DELETE /api/admin/users/:id` - Delete user and all data

### Data Management
- `GET /api/admin/transactions` - Get all transactions
- `DELETE /api/admin/transactions/:id` - Delete transaction
- `GET /api/admin/customers` - Get all customers
- `DELETE /api/admin/customers/:id` - Delete customer
- `GET /api/admin/invoices` - Get all invoices
- `DELETE /api/admin/invoices/:id` - Delete invoice

### Statistics
- `GET /api/admin/stats/users` - User count
- `GET /api/admin/stats/transactions` - Transaction count
- `GET /api/admin/stats/customers` - Customer count
- `GET /api/admin/stats/invoices` - Invoice count

### Reports
- `GET /api/admin/reports/revenue` - Revenue analysis
- `GET /api/admin/reports/users` - User activity
- `GET /api/admin/reports/transactions` - Transaction summary

## Usage Instructions

1. **Login**: Access the admin panel via the login page
2. **Navigate**: Use the sidebar to switch between different management sections
3. **Monitor**: Check the dashboard for system overview
4. **Manage**: Use the respective sections to view and manage data
5. **Reports**: Generate and analyze system reports
6. **Security**: Always log out when finished

## Production Considerations

- **Change Default Credentials**: Update admin username and password
- **Environment Variables**: Store credentials securely
- **HTTPS**: Enable SSL in production
- **Rate Limiting**: Implement request rate limiting
- **Logging**: Add comprehensive audit logging
- **Backup**: Regular database backups

## File Structure
```
admin/
├── index.html      # Main admin dashboard
├── admin.css       # Admin panel styling
├── admin.js        # Admin panel functionality
admin-login.html    # Admin login page
admin-auth.js       # Admin authentication
```