import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../services/admin.service';
import { AccountService, AccountDetails } from '../services/account.service';
import Swal from 'sweetalert2';

interface PlatformStats {
    totalUsers: number;
    totalVendors: number;
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    activeOrders: number;
    pendingVendors: number;
    monthlyGrowth: number;
    userGrowth: number;
    vendorGrowth: number;
    productGrowth: number;
    revenueGrowth: number;
}

interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    joinDate: Date;
    totalOrders: number;
    totalSpent: number;
    status: 'active' | 'inactive' | 'blocked';
}

interface Vendor {
    id: string;
    name: string;
    email: string;
    businessName: string;
    category: string;
    joinDate: Date;
    totalProducts: number;
    totalOrders: number;
    revenue: number;
    rating: number;
    status: 'active' | 'pending' | 'suspended';
}

interface Product {
    id: string;
    name: string;
    vendorName: string;
    vendor_id?: string;
    category: string;
    price: number;
    stock: number;
    sales: number;
    status: 'active' | 'inactive';
}

interface Order {
    id: string;
    customerName: string;
    vendorName: string;
    items: number;
    total: number;
    status: 'pending' | 'processing' | 'delivered' | 'cancelled';
    orderDate: Date;
}

interface Rider {
    id: string;
    name: string;
    email: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
    status: 'active' | 'inactive';
    profileComplete: boolean;
}

@Component({
    selector: 'app-admin',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './admin.component.html',
    styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
    activeTab: 'dashboard' | 'users' | 'vendors' | 'products' | 'orders' | 'riders' | 'analytics' | 'accounts' = 'dashboard';

    // Platform Statistics
    platformStats: PlatformStats = {
        totalUsers: 0,
        totalVendors: 0,
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        activeOrders: 0,
        pendingVendors: 0,
        monthlyGrowth: 0,
        userGrowth: 0,
        vendorGrowth: 0,
        productGrowth: 0,
        revenueGrowth: 0
    };

    // Account Requests
    accountRequests: AccountDetails[] = [];
    pendingAccounts: AccountDetails[] = [];
    selectedAccount: AccountDetails | null = null;
    rejectionReason: string = '';
    isLoadingAccounts: boolean = false;

    constructor(
        private adminService: AdminService,
        private router: Router,
        private accountService: AccountService
    ) {
        // Initialize user info from localStorage if available
        const user = localStorage.getItem('user');
        if (user) {
            const parsedUser = JSON.parse(user);
            this.userName = parsedUser.name || 'Admin';
            this.userEmail = parsedUser.email || 'Admin@gmail.com';
        }
    }

    // User Info
    userName: string = 'Admin';
    userEmail: string = 'Admin@gmail.com';

    ngOnInit() {
        this.loadDashboardStats();
    }

    loadAccountRequests() {
        this.isLoadingAccounts = true;
        this.accountService.getAllAccountRequests().subscribe({
            next: (accounts) => {
                this.accountRequests = accounts;
                this.pendingAccounts = accounts.filter(a => !a.isVerified && !a.isRejected);
                this.isLoadingAccounts = false;
            },
            error: (err) => {
                console.error('Error loading account requests:', err);
                this.isLoadingAccounts = false;
                Swal.fire('Error', 'Failed to load account requests', 'error');
            }
        });
    }

    approveAccount(account: AccountDetails) {
        const adminId = localStorage.getItem('userId') || '';

        Swal.fire({
            title: 'Approve Account?',
            text: `Approve account details for ${account.accountHolderName}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Approve',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.accountService.approveAccount(account._id!, adminId).subscribe({
                    next: (response) => {
                        Swal.fire('Success', 'Account approved successfully', 'success');
                        this.loadAccountRequests();
                    },
                    error: (err) => {
                        console.error('Error approving account:', err);
                        Swal.fire('Error', err.error?.message || 'Failed to approve account', 'error');
                    }
                });
            }
        });
    }

    rejectAccount(account: AccountDetails) {
        Swal.fire({
            title: 'Reject Account',
            html: `
                <p>Enter rejection reason:</p>
                <textarea id="rejectionReason" class="swal2-textarea" placeholder="Reason for rejection..." style="width: 100%; min-height: 100px; padding: 10px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Reject',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const reason = (document.getElementById('rejectionReason') as HTMLTextAreaElement)?.value;
                if (!reason || reason.trim() === '') {
                    Swal.showValidationMessage('Rejection reason is required');
                    return false;
                }
                return reason;
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const adminId = localStorage.getItem('userId') || '';
                this.accountService.rejectAccount(account._id!, adminId, result.value).subscribe({
                    next: (response) => {
                        Swal.fire('Success', 'Account rejected successfully', 'success');
                        this.loadAccountRequests();
                    },
                    error: (err) => {
                        console.error('Error rejecting account:', err);
                        Swal.fire('Error', err.error?.message || 'Failed to reject account', 'error');
                    }
                });
            }
        });
    }

    loadDashboardStats() {
        this.adminService.getDashboardStats().subscribe({
            next: (response) => {
                if (response.success) {
                    const data = response.data;
                    this.platformStats = {
                        totalUsers: data.totalUsers,
                        totalVendors: data.totalVendors,
                        totalProducts: data.totalProducts,
                        totalOrders: data.totalOrders,
                        totalRevenue: data.totalRevenue,
                        activeOrders: data.activeOrders,
                        pendingVendors: data.pendingVendors,
                        monthlyGrowth: data.orderGrowth, // Using order growth for the generic "Growth Rate" card
                        userGrowth: data.userGrowth,
                        vendorGrowth: data.vendorGrowth,
                        productGrowth: data.productGrowth,
                        revenueGrowth: data.revenueGrowth
                    };
                }
            },
            error: (err) => console.error('Failed to load dashboard stats', err)
        });
    }

    // Revenue Chart Data (Last 7 days)
    revenueData = [
        { day: 'Mon', revenue: 45000 },
        { day: 'Tue', revenue: 52000 },
        { day: 'Wed', revenue: 48000 },
        { day: 'Thu', revenue: 61000 },
        { day: 'Fri', revenue: 73000 },
        { day: 'Sat', revenue: 89000 },
        { day: 'Sun', revenue: 67000 }
    ];

    // Users Data - Initialized to empty, populated via API
    users: User[] = [];

    // Vendors Data - Initialized to empty, populated via API
    vendors: Vendor[] = [];

    // Products Data - Initialized to empty, populated via API
    products: Product[] = [];

    // Riders Data
    riders: Rider[] = [];

    // Modal States
    showUserModal = false;
    showVendorModal = false;
    showProductModal = false;
    showRiderModal = false;
    isEditing = false;
    currentId: string | null = null;

    // Forms
    userForm: any = { name: '', email: '', password: '', phone: '', address: '' };
    vendorForm: any = { name: '', email: '', password: '', phone: '', shopName: '', shopCategory: '' };
    productForm: any = { name: '', category: '', price: 0, stock: 0, image: '', vendor_id: '' };
    riderForm: any = { name: '', email: '', password: '', phone: '', vehicleType: 'bike', vehicleNumber: '' };

    // Orders Data
    orders: Order[] = [
        // Keep hardcoded or implement fetch similar as others if needed. 
        // For now, only User, Vendor, Product requested.
        {
            id: 'ORD001',
            customerName: 'Rahul Sharma',
            vendorName: 'Pizza Hut Express',
            items: 3,
            total: 897,
            status: 'delivered',
            orderDate: new Date('2026-01-07T14:30:00')
        }
    ];

    setActiveTab(tab: 'dashboard' | 'users' | 'vendors' | 'products' | 'orders' | 'riders' | 'analytics' | 'accounts') {
        this.activeTab = tab;
        if (tab === 'users') this.loadUsers();
        if (tab === 'vendors') this.loadVendors();
        if (tab === 'products') this.loadProducts();
        if (tab === 'riders') this.loadRiders();
        // For now, orders use the static demo data defined in the component
        if (tab === 'accounts') {
            this.loadAccountRequests();
        }
    }

    loadRiders() {
        this.adminService.getRiders().subscribe({
            next: (response) => {
                if (response.success) {
                    this.riders = response.data.map((r: any) => ({
                        id: r._id,
                        name: r.name,
                        email: r.email,
                        phone: r.phone,
                        vehicleType: r.vehicleType,
                        vehicleNumber: r.vehicleNumber,
                        status: r.isAvailable ? 'active' : 'inactive', // Mapping isAvailable to status for UI consistency
                        profileComplete: r.profileComplete
                    }));
                }
            },
            error: (err) => console.error('Error loading riders', err)
        });
    }

    loadUsers() {
        this.adminService.getUsers().subscribe({
            next: (response) => {
                if (response.success) {
                    this.users = response.data.map((u: any) => ({
                        id: u._id,
                        name: u.name,
                        email: u.email,
                        phone: u.number,
                        joinDate: new Date(u.createdAt),
                        totalOrders: u.totalOrders,
                        totalSpent: u.totalSpent,
                        status: 'active' // Default as no status field in User schema yet
                    }));
                }
            },
            error: (err) => console.error('Error loading users', err)
        });
    }

    loadVendors() {
        this.adminService.getVendors().subscribe({
            next: (response) => {
                if (response.success) {
                    this.vendors = response.data.map((v: any) => ({
                        id: v._id,
                        name: v.name, // Owner name
                        email: v.email,
                        businessName: v.shopName || v.name,
                        category: v.shopCategory || 'General',
                        joinDate: new Date(v.createdAt),
                        totalProducts: v.totalProducts,
                        totalOrders: v.totalOrders,
                        revenue: v.revenue,
                        rating: v.rating,
                        status: v.status || 'active'
                    }));
                }
            },
            error: (err) => console.error('Error loading vendors', err)
        });
    }

    loadProducts() {
        this.adminService.getProducts().subscribe({
            next: (response) => {
                if (response.success) {
                    this.products = response.data.map((p: any) => ({
                        id: p._id,
                        name: p.name,
                        vendorName: p.vendorName,
                        category: Array.isArray(p.category) ? p.category.join(', ') : p.category,
                        price: p.price,
                        stock: p.stock,
                        sales: p.sales,
                        status: p.status
                    }));
                }
            },
            error: (err) => console.error('Error loading products', err)
        });
    }

    toggleUserStatus(user: User) {
        if (user.status === 'active') {
            user.status = 'blocked';
        } else if (user.status === 'blocked') {
            user.status = 'active';
        } else {
            user.status = 'active';
        }
    }

    approveVendor(vendor: Vendor) {
        vendor.status = 'active';
        this.platformStats.pendingVendors--;
    }

    suspendVendor(vendor: Vendor) {
        if (confirm('Are you sure you want to suspend this vendor?')) {
            vendor.status = 'suspended';
        }
    }

    toggleProductStatus(product: Product) {
        product.status = product.status === 'active' ? 'inactive' : 'active';
    }

    getStatusClass(status: string): string {
        const classes: { [key: string]: string } = {
            'active': 'status-active',
            'inactive': 'status-inactive',
            'blocked': 'status-blocked',
            'pending': 'status-pending',
            'suspended': 'status-suspended',
            'processing': 'status-processing',
            'delivered': 'status-delivered',
            'cancelled': 'status-cancelled'
        };
        return classes[status] || '';
    }

    getMaxRevenue(): number {
        return Math.max(...this.revenueData.map(d => d.revenue));
    }

    getRevenueHeight(revenue: number): number {
        return (revenue / this.getMaxRevenue()) * 100;
    }

    getPendingOrders(): Order[] {
        return this.orders.filter(o => o.status === 'pending');
    }

    getProcessingOrders(): Order[] {
        return this.orders.filter(o => o.status === 'processing');
    }

    getActiveUsers(): User[] {
        return this.users.filter(u => u.status === 'active');
    }

    getPendingVendors(): Vendor[] {
        return this.vendors.filter(v => v.status === 'pending');
    }

    getTopVendors(): Vendor[] {
        return this.vendors
            .filter(v => v.status === 'active')
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
    }

    // --- CRUD OPERATIONS ---

    // USER
    openUserModal(user?: User) {
        this.isEditing = !!user;
        this.currentId = user ? user.id : null;
        this.userForm = user ? { ...user, password: '' } : { name: '', email: '', password: '', phone: '', address: '' };
        this.showUserModal = true;
    }

    closeUserModal() {
        this.showUserModal = false;
        this.userForm = {};
    }

    saveUser() {
        if (this.isEditing && this.currentId) {
            this.adminService.updateUser(this.currentId, this.userForm).subscribe({
                next: () => {
                    Swal.fire('Success', 'User updated', 'success');
                    this.closeUserModal();
                    this.loadUsers();
                },
                error: (err) => Swal.fire('Error', err.error.message, 'error')
            });
        } else {
            this.adminService.createUser(this.userForm).subscribe({
                next: () => {
                    Swal.fire('Success', 'User created', 'success');
                    this.closeUserModal();
                    this.loadUsers();
                },
                error: (err) => Swal.fire('Error', err.error.message, 'error')
            });
        }
    }

    deleteUser(id: string) {
        if (confirm('Delete this user?')) {
            this.adminService.deleteUser(id).subscribe({
                next: () => {
                    Swal.fire('Deleted', 'User deleted', 'success');
                    this.loadUsers();
                },
                error: (err) => Swal.fire('Error', err.error.message, 'error')
            });
        }
    }

    // VENDOR
    openVendorModal(vendor?: Vendor) {
        this.isEditing = !!vendor;
        this.currentId = vendor ? vendor.id : null;
        this.vendorForm = vendor ? { ...vendor, password: '' } : { name: '', email: '', password: '', phone: '', shopName: '', shopCategory: '' };
        this.showVendorModal = true;
    }

    closeVendorModal() {
        this.showVendorModal = false;
        this.vendorForm = {};
    }

    saveVendor() {
        const payload = { ...this.vendorForm };
        if (this.isEditing && this.currentId) {
            this.adminService.updateVendor(this.currentId, payload).subscribe({
                next: () => {
                    Swal.fire('Success', 'Vendor updated', 'success');
                    this.closeVendorModal();
                    this.loadVendors();
                },
                error: (err) => Swal.fire('Error', err.error.message, 'error')
            });
        } else {
            this.adminService.createVendor(payload).subscribe({
                next: () => {
                    Swal.fire('Success', 'Vendor created', 'success');
                    this.closeVendorModal();
                    this.loadVendors();
                },
                error: (err) => Swal.fire('Error', err.error.message, 'error')
            });
        }
    }

    deleteVendor(id: string) {
        if (confirm('Delete this vendor?')) {
            this.adminService.deleteVendor(id).subscribe({
                next: () => {
                    Swal.fire('Deleted', 'Vendor deleted', 'success');
                    this.loadVendors();
                },
                error: (err) => Swal.fire('Error', err.error.message, 'error')
            });
        }
    }

    // RIDER
    openRiderModal(rider?: Rider) {
        this.isEditing = !!rider;
        this.currentId = rider ? rider.id : null;
        this.riderForm = rider ? { ...rider, password: '' } : { name: '', email: '', password: '', phone: '', vehicleType: 'bike', vehicleNumber: '' };
        this.showRiderModal = true;
    }

    closeRiderModal() {
        this.showRiderModal = false;
        this.riderForm = {};
    }

    saveRider() {
        if (this.isEditing && this.currentId) {
            this.adminService.updateRider(this.currentId, this.riderForm).subscribe({
                next: () => {
                    Swal.fire('Success', 'Rider updated', 'success');
                    this.closeRiderModal();
                    this.loadRiders();
                },
                error: (err) => Swal.fire('Error', err.error.message, 'error')
            });
        } else {
            this.adminService.createRider(this.riderForm).subscribe({
                next: () => {
                    Swal.fire('Success', 'Rider created', 'success');
                    this.closeRiderModal();
                    this.loadRiders();
                },
                error: (err) => Swal.fire('Error', err.error.message, 'error')
            });
        }
    }

    deleteRider(id: string) {
        if (confirm('Delete this rider?')) {
            this.adminService.deleteRider(id).subscribe({
                next: () => {
                    Swal.fire('Deleted', 'Rider deleted', 'success');
                    this.loadRiders();
                },
                error: (err) => Swal.fire('Error', err.error.message, 'error')
            });
        }
    }

    // PRODUCT
    openProductModal(product?: Product) {
        this.isEditing = !!product;
        this.currentId = product ? product.id : null;
        // For products we might need vendor_id if editing, or user selects it
        this.productForm = product ? { ...product } : { name: '', category: '', price: 0, stock: 0, image: '', vendor_id: '' };
        this.showProductModal = true;
    }

    closeProductModal() {
        this.showProductModal = false;
        this.productForm = {};
    }

    saveProduct() {
        if (this.isEditing && this.currentId) {
            this.adminService.updateProduct(this.currentId, this.productForm).subscribe({
                next: () => {
                    Swal.fire('Success', 'Product updated', 'success');
                    this.closeProductModal();
                    this.loadProducts();
                },
                error: (err) => Swal.fire('Error', err.error.message, 'error')
            });
        } else {
            this.adminService.createProduct(this.productForm).subscribe({
                next: () => {
                    Swal.fire('Success', 'Product created', 'success');
                    this.closeProductModal();
                    this.loadProducts();
                },
                error: (err) => Swal.fire('Error', err.error.message, 'error')
            });
        }
    }

    deleteProduct(id: string) {
        if (confirm('Delete this product?')) {
            this.adminService.deleteProduct(id).subscribe({
                next: () => {
                    Swal.fire('Deleted', 'Product deleted', 'success');
                    this.loadProducts();
                },
                error: (err) => Swal.fire('Error', err.error.message, 'error')
            });
        }
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            this.router.navigate(['/']); // Or /login if you prefer
        }
    }
}
