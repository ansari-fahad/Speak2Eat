import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../services/product.service';
import { OrderService } from '../services/order.service';
import { CategoryService, Category } from '../services/category.service';
import { PaymentService } from '../services/payment.service';
import { AccountService, AccountDetails } from '../services/account.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Product {
    _id?: string;
    id?: string;
    vendor_id?: string;
    name: string;
    category?: string;
    category_id?: string[];
    price: number;
    image: string;
    description: string;
    stock: number;
    status?: 'active' | 'inactive';
    ingredients?: string[];
    createdAt?: Date;
}

interface Order {
    _id?: string;
    id?: string;
    userId?: {
        _id?: string;
        name?: string;
        email?: string;
        number?: string;
        address?: string;
    };
    products?: any[];
    total: number;
    paymentType?: string;
    orderDate: Date;
    status: 'Pending' | 'Confirmed' | 'Preparing' | 'Ready for Pickup' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
    customerName?: string;
    deliveryAddress?: string;
    items?: any[];
    acceptanceTimer?: number;
    acceptedAt?: Date;
    preparationDeadline?: Date;
    lateFeeDeducted?: boolean;
}

interface ModalDialog {
    type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    title: string;
    message: string;
    isOpen: boolean;
    confirmAction?: () => void;
    cancelAction?: () => void;
}

interface WalletTransaction {
    _id?: string;
    vendorId?: string;
    type: 'credit' | 'debit' | 'withdrawal' | 'deposit';
    amount: number;
    description: string;
    date: Date;
    orderId?: string;
}
interface Vendor {
    id: string;
    name: string;
    email: string;
    shopName: string;
    shopIdentificationNumber: string;
    address: string;
    phone: string;
}

@Component({
    selector: 'app-vendor',
    standalone: true,
    imports: [CommonModule, FormsModule, HttpClientModule, RouterLink],
    templateUrl: './vendor.component.html',
    styleUrl: './vendor.component.css'
})
export class VendorComponent implements OnInit, OnDestroy {
    // Vendor Component for managing orders and products
    private destroy$ = new Subject<void>();
    private orderCheckInterval: any;
    private preparationTimers: { [key: string]: any } = {};

    // Modal System
    modal: ModalDialog = {
        type: 'info',
        title: '',
        message: '',
        isOpen: false
    };
    price: number = 0;
    // Online/Offline Status
    vendorOnline: boolean = false;

    // Wallet/Pocket System
    activeTab: 'dashboard' | 'products' | 'orders' | 'add-product' | 'profile' | 'profileUpdate' | 'product-details' | 'wallet' | 'vendor-history' = 'dashboard';
    walletBalance: number = 0;
    totalEarnings: number = 0;
    availableIncome: number = 0; // Income available to withdraw (after 2% commission)
    walletTransactions: WalletTransaction[] = [];
    withdrawAmount: number = 0;
    depositAmount: number = 0;
    minWithdrawAmount: number = 100;
    walletLoading: boolean = false;

    // Vendor History - Orders & Transactions
    historyActiveTab: 'orders' | 'transactions' = 'orders';
    allOrders: any[] = [];
    allTransactions: any[] = [];
    filteredOrders: any[] = [];
    filteredTransactions: any[] = [];
    paginatedOrders: any[] = [];
    paginatedTransactions: any[] = [];
    orderLoading: boolean = false;
    transactionLoading: boolean = false;
    orderStatusFilter: string = 'all';
    transactionStatusFilter: string = 'all';
    historySearchText: string = '';
    currentPage: number = 1;
    totalPages: number = 1;
    itemsPerPage: number = 10;
    totalOrders: number = 0;
    totalOrderAmount: number = 0;
    totalTransactions: number = 0;
    totalWithdrawn: number = 0;
    totalPending: number = 0;

    // Order Timer
    showOrderTimer = false;
    orderTimerValue = 30;
    timerOrder: Order | null = null;

    // Preparation Timer
    showPreparationTimer = false;
    preparationTimerValue = 1800; // 30 minutes in seconds
    preparationTimerOrder: Order | null = null;
    isEditingProfile = false;
    showAddProductModal = false;
    showOrderDetailsModal = false;
    selectedOrder: Order | null = null;
    isAddingProduct = false;
    addProductError = '';
    addProductSuccess = '';

    // Product Editing
    isEditingProduct: boolean = false;
    isUpdatingProduct: boolean = false;
    updateProductError: string = '';
    updateProductSuccess: string = '';
    editableProduct: any = null;
    editProductImagePreview: string = '';
    editProductImageFile: File | null = null;

    product: any = {
        _id: '',
        name: '',
        description: '',
        image: '',
        price: '',
        stock: '',
        ingredients: []
    };
    vendor: any = {
        _id: '',
        shopName: 'My Shop',
        shopDescription: 'My Shop Description',
        shopAddress: 'Shop Address',
        shopContactNumber: '+1-000-000-0000',
        shopidentificationNumber: 'SHOP-001'
    };

    selectedProduct: Product | null = null;

    loadingVendor: boolean = false;
    loadingProducts: boolean = false;
    currentVendorId: string | null = null; // Track current vendor ID to detect vendor switch
    @ViewChild('orderSound') orderSound?: ElementRef<HTMLAudioElement>;

    constructor(
        private router: Router,
        private http: HttpClient,
        private productService: ProductService,
        private orderService: OrderService,
        private categoryService: CategoryService,
        private paymentService: PaymentService,
        private accountService: AccountService
    ) {
        // Don't load data in constructor - wait for ngOnInit to ensure proper initialization
    }

    ngOnInit() {
        // Check if vendor ID has changed (handles vendor switch/login)
        const vendorId = localStorage.getItem('userId');

        if (vendorId !== this.currentVendorId) {
            // Vendor changed - clear old data and reload
            this.currentVendorId = vendorId;
            this.products = [];
            this.orders = [];
            this.vendorOnline = false;

            // Reload vendor data when component initializes (handles vendor switch)
            this.loadVendorData();
        } else if (vendorId) {
            // Same vendor - just reload data
            this.loadVendorData();
        }

        // Load orders when component initializes
        this.loadVendorOrders();
        this.loadWalletData();
        this.loadCategories();

        // Auto-refresh removed - orders will only refresh when component loads or manually
    }

    loadCategories() {
        this.categoryService.getAllCategories().subscribe({
            next: (data) => {
                this.categories = data;
                console.log('âœ“ Categories loaded:', this.categories);
            },
            error: (error) => {
                console.error('âœ— Error loading categories:', error);
            }
        });
    }

    getCategoryName(categoryId: string | string[] | undefined): string {
        if (!categoryId) return 'N/A';

        let targetId: string;

        if (Array.isArray(categoryId)) {
            if (categoryId.length === 0) return 'N/A';
            targetId = categoryId[0];
        } else {
            targetId = categoryId;
        }

        // Find category by ID
        const category = this.categories.find(c => c._id === targetId || c.name === targetId);
        return category ? category.name : targetId;
    }

    ngOnDestroy() {
        // Clean up interval on component destroy (if it exists)
        if (this.orderCheckInterval) {
            clearInterval(this.orderCheckInterval);
        }
        // Clean up all preparation timers
        Object.values(this.preparationTimers).forEach(timer => {
            clearInterval(timer);
        });
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadVendorData() {
        const vendorId = localStorage.getItem('userId');
        console.log('ðŸ” Loading vendor data with ID:', vendorId);

        if (vendorId) {
            this.loadingVendor = true;
            this.vendor._id = vendorId;
            this.http.get(`/api/vendor/${vendorId}`).subscribe({
                next: (response: any) => {
                    this.vendor = response;
                    this.loadingVendor = false;
                    console.log('âœ“ Vendor data loaded from server:', this.vendor);
                    this.loadVendorProducts();
                    this.loadVendorOnlineStatus(); // Load online status from database
                },
                error: (error) => {
                    this.loadingVendor = false;
                    console.error('âœ— Error loading vendor from server:', error);
                    console.warn('âš ï¸ Using local vendor data with ID from localStorage:', vendorId);
                    // Keep the local ID even if API fails
                    this.vendor._id = vendorId;
                    this.loadVendorProducts();
                    this.loadVendorOnlineStatus(); // Still try to load status
                }
            });
        } else {
            console.warn('âš ï¸ No vendor ID found in localStorage - user may not be logged in');
            this.showModal('warning', 'Not Logged In', 'You are not logged in. Please log in to update your profile.');
        }
    }

    // ======================== MODAL DIALOG SYSTEM ========================
    showModal(type: 'success' | 'error' | 'warning' | 'info' | 'confirm', title: string, message: string, onConfirm?: () => void, onCancel?: () => void) {
        this.modal = {
            type,
            title,
            message,
            isOpen: true,
            confirmAction: onConfirm,
            cancelAction: onCancel
        };
    }

    closeModal() {
        this.modal.isOpen = false;
    }

    confirmModal() {
        if (this.modal.confirmAction) {
            this.modal.confirmAction();
        }
        this.closeModal();
    }

    cancelModal() {
        if (this.modal.cancelAction) {
            this.modal.cancelAction();
        }
        this.closeModal();
    }

    // ======================== ONLINE/OFFLINE STATUS ========================
    toggleVendorStatus() {
        const vendorId = localStorage.getItem('userId');
        if (!vendorId) {
            this.showModal('error', 'Error', 'Vendor ID not found');
            return;
        }

        // Toggle status in database
        this.http.post(`/api/vendor/${vendorId}/status/toggle`, {})
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    console.log('âœ“ Vendor status updated:', response);
                    this.vendorOnline = response.vendor?.isOnline || !this.vendorOnline;
                    localStorage.setItem('vendorOnline', this.vendorOnline.toString());

                    const status = this.vendorOnline ? 'Online' : 'Offline';
                    const message = this.vendorOnline
                        ? 'You are now online and ready to accept orders!'
                        : 'You are now offline. Customers cannot place orders.';

                    this.showModal('info', `You are ${status}`, message);
                },
                error: (error) => {
                    console.error('âŒ Error toggling vendor status:', error);
                    this.showModal('error', 'Error', 'Failed to update status. Please try again.');
                }
            });
    }

    loadVendorOnlineStatus() {
        const vendorId = localStorage.getItem('userId');
        if (!vendorId) {
            return;
        }

        // Load vendor status from database
        this.http.get(`/api/vendor/${vendorId}/status`)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    console.log('âœ“ Vendor status loaded:', response);
                    this.vendorOnline = response.isOnline || false;
                    localStorage.setItem('vendorOnline', this.vendorOnline.toString());
                },
                error: (error) => {
                    console.error('âŒ Error loading vendor status:', error);
                    // Fallback to localStorage if API fails
                    this.vendorOnline = localStorage.getItem('vendorOnline') === 'true';
                }
            });
    }

    // ======================== WALLET/POCKET SYSTEM ========================
    loadWalletData() {
        const vendorId = localStorage.getItem('userId');
        if (!vendorId) return;

        this.walletLoading = true;

        // Fetch wallet data from database
        this.http.get(`/api/vendor/${vendorId}/wallet/balance`)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    // totalEarnings = total income from all completed orders (cash + online)
                    this.totalEarnings = response.totalEarnings || response.totalIncome || 0;

                    // walletBalance = for backward compatibility
                    this.walletBalance = response.walletBalance || 0;

                    // availableBalance = totalEarnings - totalWithdrawn (what can be withdrawn)
                    // This allows both cash + online income to be withdrawn
                    this.availableIncome = response.availableBalance || 0;

                    console.log(`ðŸ’° Wallet loaded:`, {
                        totalIncome: this.totalEarnings,
                        availableBalance: this.availableIncome
                    });

                    this.loadWalletTransactions();
                    this.walletLoading = false;
                },
                error: (error) => {
                    // Fallback to localStorage if API fails
                    this.walletBalance = parseFloat(localStorage.getItem(`wallet_${vendorId}`) || '0');
                    this.totalEarnings = this.walletBalance;
                    this.availableIncome = this.walletBalance;
                    this.loadWalletTransactions();
                    this.walletLoading = false;
                }
            });
    }

    loadWalletTransactions() {
        const vendorId = localStorage.getItem('userId');
        if (!vendorId) return;

        // TODO: Replace with actual API call
        const transactionsData = localStorage.getItem(`transactions_${vendorId}`);
        if (transactionsData) {
            this.walletTransactions = JSON.parse(transactionsData);
        }
    }

    saveWalletData(vendorId: string) {
        localStorage.setItem(`wallet_${vendorId}`, this.walletBalance.toString());
        localStorage.setItem(`transactions_${vendorId}`, JSON.stringify(this.walletTransactions));
    }

    requestWithdrawal() {
        const vendorId = localStorage.getItem('userId');
        if (!vendorId) {
            this.showModal('error', 'Error', 'Vendor ID not found');
            return;
        }

        console.log('ðŸ’° Withdrawal Request Debug:');
        console.log(`   withdrawAmount: â‚¹${this.withdrawAmount}`);
        console.log(`   availableIncome: â‚¹${this.availableIncome}`);
        console.log(`   totalEarnings: â‚¹${this.totalEarnings}`);
        console.log(`   walletBalance: â‚¹${this.walletBalance}`);

        if (this.withdrawAmount <= 0) {
            this.showModal('error', 'Invalid Amount', 'Please enter a valid amount');
            return;
        }

        if (this.withdrawAmount < this.minWithdrawAmount) {
            this.showModal('error', 'Minimum Amount', `Minimum withdrawal amount is â‚¹${this.minWithdrawAmount}`);
            return;
        }

        // Check available balance (totalEarnings - totalWithdrawn, includes cash + online)
        if (this.withdrawAmount > this.availableIncome) {
            this.showModal('error', 'Insufficient Balance',
                `Available balance is â‚¹${this.availableIncome.toFixed(2)}. You have already withdrawn some amount.`);
            return;
        }

        // Check if account details exist
        this.accountService.getAccountDetails(vendorId, 'vendor').subscribe({
            next: (account: AccountDetails) => {
                if (!account || !account.accountNumber) {
                    this.showModal('error', 'Account Details Required',
                        'Please add your bank account details before withdrawing. Go to Account Details page.');
                    this.router.navigate(['/account']);
                    return;
                }

                const feePercentage = 0.02;
                const feeAmount = this.withdrawAmount * feePercentage;
                const transferAmount = this.withdrawAmount - feeAmount; // Amount after fee deducted
                const totalDeduction = this.withdrawAmount; // Only the amount requested is deducted

                const onConfirm = () => {
                    // Call backend withdrawal API
                    this.http.post(`/api/vendor/${vendorId}/wallet/withdraw`, {
                        amount: this.withdrawAmount
                    }).pipe(takeUntil(this.destroy$)).subscribe({
                        next: (response: any) => {
                            console.log('âœ… Withdrawal successful:', response);
                            // Update balances from server response so values persist after refresh
                            if (response && typeof response.availableBalance === 'number') {
                                this.availableIncome = response.availableBalance;
                            }
                            if (response && typeof response.remainingWalletBalance === 'number') {
                                this.walletBalance = response.remainingWalletBalance;
                            }

                            const transaction: WalletTransaction = {
                                type: 'withdrawal',
                                amount: totalDeduction,
                                description: `Withdrawal - â‚¹${transferAmount.toFixed(2)} transferred to bank (Fee: â‚¹${feeAmount.toFixed(2)})`,
                                date: new Date()
                            };
                            this.walletTransactions.unshift(transaction);
                            this.saveWalletData(vendorId);

                            // Reload wallet data from backend to keep UI in sync
                            this.loadWalletData();

                            this.withdrawAmount = 0;
                            this.showModal('success', 'Withdrawal Processed',
                                `âœ“ Withdrawal Successful!\n\nAmount Transferred: â‚¹${transferAmount.toFixed(2)}\nPlatform Fee (2%): â‚¹${feeAmount.toFixed(2)}\nTotal Deducted: â‚¹${totalDeduction.toFixed(2)}`);
                        },
                        error: (error) => {
                            console.error('âŒ Withdrawal error:', error);
                            console.log('Error response:', error.error);
                            const errorMsg = error.error?.message || 'Failed to process withdrawal. Please try again.';
                            this.showModal('error', 'Withdrawal Failed', errorMsg);
                        }
                    });
                };

                this.showModal('confirm', 'Confirm Withdrawal',
                    `Withdrawal Amount: â‚¹${this.withdrawAmount}\nPlatform Fee (2%): -â‚¹${feeAmount.toFixed(2)}\nAmount to Bank: â‚¹${transferAmount.toFixed(2)}\n\nRemaining Balance: â‚¹${(this.availableIncome - totalDeduction).toFixed(2)}\n\nProceed?`,
                    onConfirm
                );
            },
            error: (err: any) => {
                if (err.status === 404) {
                    this.showModal('error', 'Account Details Required',
                        'Please add your bank account details before withdrawing.');
                    this.router.navigate(['/account']);
                } else {
                    this.showModal('error', 'Error', 'Failed to verify account details');
                }
            }
        });
    }

    addFundsToWallet() {
        const vendorId = localStorage.getItem('userId');
        if (!vendorId) {
            this.showModal('error', 'Error', 'Vendor ID not found');
            return;
        }

        if (this.depositAmount <= 0) {
            this.showModal('error', 'Invalid Amount', 'Please enter a valid amount');
            return;
        }

        const onConfirm = () => {
            this.walletBalance += this.depositAmount;
            const transaction: WalletTransaction = {
                type: 'deposit',
                amount: this.depositAmount,
                description: `Funds added to wallet`,
                date: new Date()
            };
            this.walletTransactions.unshift(transaction);
            this.saveWalletData(vendorId);
            this.depositAmount = 0;
            this.showModal('success', 'Funds Added', `â‚¹${transaction.amount} has been added to your wallet.`);
        };

        this.showModal('confirm', 'Add Funds',
            `Add â‚¹${this.depositAmount} to your wallet? (Simulated - in production this would integrate with payment gateway)`,
            onConfirm
        );
    }

    loadVendorProducts() {
        this.loadingProducts = true;

        const vendorId = localStorage.getItem('userId');
        if (!vendorId) {
            console.warn('âš ï¸ No vendor ID found - cannot load products');
            this.loadingProducts = false;
            return;
        }

        // Fetch ONLY this vendor's products
        console.log('ðŸ“¦ Fetching products for vendor:', vendorId);

        this.productService.getProductsByVendor(vendorId).subscribe({
            next: (response: any) => {
                console.log('ðŸ“¦ Raw API Response:', response);

                // Handle response - could be array or object with data property
                let productList = [];
                if (Array.isArray(response)) {
                    productList = response;
                } else if (response && response.products && Array.isArray(response.products)) {
                    productList = response.products;
                } else if (response && response.data && Array.isArray(response.data)) {
                    productList = response.data;
                }

                this.products = productList.length > 0 ? productList : [];
                this.stats.totalProducts = this.products.length;
                this.loadingProducts = false;

                console.log('âœ… Successfully loaded', this.products.length, 'products for vendor');
                console.log('âœ“ Vendor products loaded:', this.products);
            },
            error: (error) => {
                console.error('âŒ Error loading products:', error);
                console.error('Error Details:', error.error, error.status);
                this.products = [];
                this.stats.totalProducts = 0;
                this.loadingProducts = false;
            }
        });
    }

    loadVendorOrders() {
        const vendorId = localStorage.getItem('userId');
        if (!vendorId) {
            console.warn('âš ï¸ No vendor ID found - cannot load orders');
            return;
        }

        this.loadingOrders = true;
        // Use formatted endpoint to get orders with vendor-specific calculations
        // This shows only item prices, NOT delivery/platform fees
        this.orderService.getOrdersByVendorFormatted(vendorId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    let orderList = [];

                    if (Array.isArray(response)) {
                        orderList = response;
                    } else if (response && response.orders && Array.isArray(response.orders)) {
                        orderList = response.orders;
                    } else if (response && response.data && Array.isArray(response.data)) {
                        orderList = response.data;
                    }

                    // Format orders to display correctly
                    const formattedOrders = orderList.map((order: any) => {
                        const customerName = order.userId?.name || 'Unknown Customer';
                        const deliveryAddress = order.userId?.address || 'No address provided';

                        // Calculate items from products and populate additional fields
                        const items = order.products?.map((product: any) => ({
                            productName: product.productId?.name || 'Unknown Product',
                            quantity: product.quantity,
                            price: product.productId?.price || 0
                        })) || [];

                        return {
                            _id: order._id,
                            id: order._id,
                            customerName,
                            deliveryAddress,
                            items,
                            // Show vendor's item total, NOT the order total (which includes fees)
                            total: order.vendorItemTotal || order.total,
                            vendorItemTotal: order.vendorItemTotal,
                            vendorIncome: order.vendorIncome,
                            vendorCommission: order.vendorCommission,
                            status: order.status,
                            orderDate: new Date(order.orderDate),
                            paymentType: order.paymentType,
                            products: order.products,
                            acceptedAt: order.acceptedAt ? new Date(order.acceptedAt) : undefined,
                            preparationDeadline: order.preparationDeadline ? new Date(order.preparationDeadline) : undefined,
                            lateFeeDeducted: order.lateFeeDeducted || false
                        };
                    });

                    // Check for new pending orders and show alert
                    const previousPendingOrders = this.orders.filter((o: Order) => o.status === 'Pending');
                    const newPendingOrders = formattedOrders.filter((o: Order) => o.status === 'Pending');

                    // Show timer for any newly added pending orders
                    newPendingOrders.forEach((newOrder: Order) => {
                        const isNew = !previousPendingOrders.find(old => old._id === newOrder._id);
                        if (isNew) {
                            this.showOrderAcceptanceTimer(newOrder);
                        }
                    });

                    this.orders = formattedOrders;

                    // Restore preparation timers for orders with active deadlines
                    // Use the deadline from database (formattedOrders), not from memory
                    formattedOrders.forEach((order: Order) => {
                        if ((order.status === 'Confirmed' || order.status === 'Preparing')) {
                            if (order.preparationDeadline) {
                                const remaining = new Date(order.preparationDeadline).getTime() - Date.now();
                                if (remaining > 0) {
                                    const timerKey = `prep_${order._id}`;
                                    // Only start timer if it doesn't already exist
                                    if (!this.preparationTimers[timerKey]) {
                                        // Use the deadline from database, don't modify it
                                        this.startPreparationTimer(order);
                                    }
                                }
                            }
                        }
                    });

                    // Update stats first to calculate totalRevenue
                    this.updateOrderStats();

                    // Sync totalEarnings with totalRevenue to ensure consistency
                    if (this.stats.totalRevenue > 0) {
                        // If totalEarnings from DB is less than calculated revenue, use revenue
                        if (this.totalEarnings < this.stats.totalRevenue) {
                            this.totalEarnings = this.stats.totalRevenue;
                            // Recalculate availableIncome after updating totalEarnings
                            this.availableIncome = Math.round((this.totalEarnings * 0.98) * 100) / 100;
                        }
                    }

                    this.loadingOrders = false;
                },
                error: (error) => {
                    console.error('âŒ Error loading orders:', error);
                    this.orders = [];
                    this.loadingOrders = false;
                }
            });
    }

    showOrderAcceptanceTimer(order: Order) {
        this.playNewOrderAlertSound();
        this.timerOrder = order;
        this.orderTimerValue = 30;
        this.showOrderTimer = true;

        // Decrement timer every second
        const timerInterval = setInterval(() => {
            this.orderTimerValue--;

            if (this.orderTimerValue <= 0) {
                clearInterval(timerInterval);
                this.showOrderTimer = false;
                // Auto-reject if no action taken
                this.showModal('error', 'Order Expired', `Order ${order.id} has expired and has been auto-rejected.`);
                this.rejectOrder(order);
            }
        }, 1000);
    }

    private playNewOrderAlertSound() {
        try {
            const audioEl = this.orderSound?.nativeElement;
            if (audioEl) {
                // restart from beginning each time
                audioEl.currentTime = 0;
                audioEl.play().catch(() => { /* ignore autoplay errors */ });
            }
        } catch {
            // ignore audio errors
        }
    }

    // ======================== 30-MINUTE PREPARATION TIMER WITH LATE FEE ========================
    startPreparationTimer(order: Order) {
        if (!order._id) return;

        const vendorId = localStorage.getItem('userId');
        const lateFeePercentage = 10; // 10% late fee

        // Use existing deadline from database if available, otherwise create new one
        let deadline: Date;
        if (order.preparationDeadline) {
            deadline = new Date(order.preparationDeadline);
        } else {
            // Create new deadline (30 minutes from now)
            deadline = new Date(Date.now() + 30 * 60 * 1000);
            order.acceptedAt = new Date();
            order.preparationDeadline = deadline;
        }

        // Store timer data for this order
        const timerKey = `prep_${order._id}`;

        // If timer already exists, don't create a new one
        if (this.preparationTimers[timerKey]) {
            return;
        }

        // Calculate remaining time from deadline
        let timeRemaining = deadline.getTime() - Date.now();

        // If time already expired, don't start timer
        if (timeRemaining <= 0) {
            return;
        }

        const preparationInterval = setInterval(() => {
            timeRemaining -= 1000;

            // Update order's preparation deadline (for display purposes)
            order.preparationDeadline = new Date(Date.now() + Math.max(0, timeRemaining));

            // Check if time is up
            if (timeRemaining <= 0) {
                clearInterval(preparationInterval);
                delete this.preparationTimers[timerKey];

                // Time is up - deduct late fee if order still not delivered
                if (order.status === 'Confirmed' || order.status === 'Preparing') {
                    const lateFee = Math.round((order.total * lateFeePercentage) / 100 * 100) / 100;
                    order.lateFeeDeducted = true;

                    // Deduct from wallet
                    this.walletBalance -= lateFee;
                    const vendorId = localStorage.getItem('userId');
                    if (vendorId) {
                        this.saveWalletData(vendorId);
                    }

                    const transaction: WalletTransaction = {
                        type: 'debit',
                        amount: lateFee,
                        description: `Late fee deducted for Order #${order.id}`,
                        date: new Date(),
                        orderId: order._id
                    };
                    this.walletTransactions.unshift(transaction);

                    this.showModal('warning', 'Late Fee Deducted',
                        `Order #${order.id} exceeded 30-minute preparation time.\n\nLate Fee (10%): â‚¹${lateFee} has been deducted from your wallet.`);
                }
            }
        }, 1000);

        this.preparationTimers[timerKey] = preparationInterval;
    }

    closePreparationTimer() {
        // Close the modal but keep timer running in background
        this.showPreparationTimer = false;
        // Timer continues running in background via preparationTimers object
    }

    getPreparationTimerMinutes(): number {
        return Math.floor(this.preparationTimerValue / 60);
    }

    getPreparationTimerSeconds(): number {
        return this.preparationTimerValue % 60;
    }

    getTimeRemaining(order: Order): string {
        if (!order.preparationDeadline) return 'N/A';
        const remaining = new Date(order.preparationDeadline).getTime() - Date.now();
        if (remaining <= 0) return 'Time expired';
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    updateOrderStats() {
        this.stats.pendingOrders = this.orders.filter(o => o.status === 'Pending').length;
        this.stats.activeOrders = this.orders.filter(o => o.status === 'Confirmed' || o.status === 'Preparing').length;

        // Calculate total revenue from delivered orders
        // Note: This is used for UI display. The actual value comes from database totalEarnings
        // totalEarnings includes ALL payments (cash + online) after 2% platform commission
        const deliveredOrdersTotal = this.orders
            .filter(o => o.status === 'Delivered')
            .reduce((sum, o) => sum + (o.total || 0), 0);

        // Use totalEarnings from database (which is the source of truth for all earnings)
        // totalEarnings = cash payments + online payments (both after 2% commission)
        // This should be displayed on dashboard as "Total Income"
        if (this.totalEarnings > 0) {
            this.stats.totalRevenue = this.totalEarnings;
        } else {
            // Fallback to calculated value if totalEarnings is not available
            this.stats.totalRevenue = deliveredOrdersTotal;
        }
    }

    /**
 * Converts relative image paths to full URLs
 * Backend returns paths like: /uploads/filename.jpg
 * Browser needs: /uploads/filename.jpg
 */
    getImageUrl(imagePath: string | undefined): string {
        if (!imagePath) {
            return 'assets/placeholder.jpg';
        }

        // If it's already a full URL (http://, https://, data:), return as-is
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
            return imagePath;
        }

        // Normalize slashes (fix Windows paths)
        let cleanPath = imagePath.replace(/\\/g, '/');

        // Remove leading slash if present
        if (cleanPath.startsWith('/')) {
            cleanPath = cleanPath.substring(1);
        }

        // Remove 'products/' prefix if present (legacy)
        if (cleanPath.includes('products/')) {
            cleanPath = cleanPath.replace('products/', '');
        }

        // Ensure it starts with uploads/
        if (!cleanPath.startsWith('uploads/')) {
            cleanPath = `uploads/${cleanPath}`;
        }

        // Return absolute path which will be handled by proxy/rewrite
        return `/${cleanPath}`;
    }

    // New Product Form
    newProduct = {
        name: '',
        category: '',
        price: 0,
        image: null as File | null,
        imagePreview: '',
        description: '',
        stock: 0,
        ingredients: ''
    };

    categories: Category[] = [];

    // Vendor Stats
    stats = {
        totalProducts: 24,
        activeOrders: 12,
        totalRevenue: 45680,
        pendingOrders: 5
    };

    // Products List
    products: Product[] = [];

    // Orders List - Will be fetched from database
    orders: Order[] = [];
    loadingOrders: boolean = false;

    setActiveTab(tab: 'dashboard' | 'products' | 'orders' | 'add-product' | 'profile' | 'profileUpdate' | 'wallet' | 'vendor-history') {
        this.activeTab = tab;
        this.addProductError = '';
        this.addProductSuccess = '';
        // Load vendor history data when tab is switched to vendor-history
        if (tab === 'vendor-history') {
            this.loadVendorHistory();
        }
    }

    onImageSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.newProduct.image = file;

            // Create image preview
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.newProduct.imagePreview = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    addProduct() {
        this.addProductError = '';
        this.addProductSuccess = '';

        // Validation
        if (!this.newProduct.name || this.newProduct.name.trim() === '') {
            this.addProductError = 'Product name is required';
            return;
        }
        if (this.newProduct.price <= 0) {
            this.addProductError = 'Valid price is required';
            return;
        }
        if (this.newProduct.stock < 0) {
            this.addProductError = 'Stock must be 0 or more';
            return;
        }
        if (!this.newProduct.image) {
            this.addProductError = 'Product image is required';
            return;
        }
        if (!this.vendor._id) {
            this.addProductError = 'Vendor ID not found. Please refresh the page.';
            return;
        }

        this.isAddingProduct = true;

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('vendor_id', this.vendor._id);
        formData.append('name', this.newProduct.name);
        formData.append('category_id', this.newProduct.category);
        formData.append('price', this.newProduct.price.toString());
        formData.append('stock', this.newProduct.stock.toString());
        formData.append('description', this.newProduct.description);
        if (this.newProduct.ingredients && this.newProduct.ingredients.trim()) {
            formData.append('ingredients', this.newProduct.ingredients);
        }
        if (this.newProduct.image) {
            formData.append('image', this.newProduct.image);
        }

        this.productService.createProduct(formData).subscribe({
            next: (response: any) => {
                this.isAddingProduct = false;
                this.addProductSuccess = 'âœ“ Product added successfully!';
                console.log('âœ“ Product added:', response);

                // Add to local products list
                const newProduct: Product = {
                    _id: response.product._id,
                    name: response.product.name,
                    category: this.newProduct.category,
                    price: response.product.price,
                    image: response.product.image,
                    description: response.product.description,
                    stock: response.product.stock,
                    status: 'active',
                    vendor_id: response.product.vendor_id,
                    category_id: response.product.category_id,
                    ingredients: response.product.ingredients
                };
                this.products.push(newProduct);
                this.stats.totalProducts++;

                // Reset form
                setTimeout(() => {
                    this.newProduct = {
                        name: '',
                        category: '',
                        price: 0,
                        image: null,
                        imagePreview: '',
                        description: '',
                        stock: 0,
                        ingredients: ''
                    };
                    this.addProductSuccess = '';
                    this.activeTab = 'products';
                }, 1500);
            },
            error: (error: any) => {
                this.isAddingProduct = false;
                console.error('âœ— Error adding product:', error);
                const errorMsg = error.error?.message || error.message || 'Failed to add product. Please try again.';
                this.addProductError = errorMsg;
            }
        });
    }

    toggleProductStatus(product: Product) {
        product.status = product.status === 'active' ? 'inactive' : 'active';
    }

    deleteProduct(productId: string | undefined) {
        if (!productId) {
            this.showModal('error', 'Error', 'Product ID not found');
            return;
        }

        const onConfirm = () => {
            // Call the API to delete from database
            this.productService.deleteProduct(productId).subscribe({
                next: (response: any) => {
                    console.log('âœ“ Product deleted successfully:', response);

                    // Remove from local products list
                    this.products = this.products.filter(
                        p => p._id !== productId && p.id !== productId
                    );
                    this.stats.totalProducts--;

                    this.showModal('success', 'Success', 'Product deleted successfully!');
                },
                error: (error: any) => {
                    console.error('âŒ Error deleting product:', error);
                    const errorMsg = error.error?.message || error.message || 'Failed to delete product. Please try again.';
                    this.showModal('error', 'Error', `Failed to delete product:\n${errorMsg}`);
                }
            });
        };

        this.showModal('confirm', 'Delete Product',
            'Are you sure you want to delete this product? This action cannot be undone.',
            onConfirm
        );
    }

    viewProductDetails(product: Product) {
        this.selectedProduct = product;
        this.activeTab = 'product-details' as any;
    }

    closeProductDetails() {
        this.selectedProduct = null;
        this.activeTab = 'products';
    }

    viewOrderDetails(order: Order) {
        this.selectedOrder = order;
        this.showOrderDetailsModal = true;

        // If this order has an active preparation timer, show it
        if (order.status === 'Confirmed' || order.status === 'Preparing') {
            const timerKey = `prep_${order._id}`;
            if (this.preparationTimers[timerKey] && order.preparationDeadline) {
                // Restore timer display for this order
                this.preparationTimerOrder = order;
                const remaining = new Date(order.preparationDeadline).getTime() - Date.now();
                if (remaining > 0) {
                    this.preparationTimerValue = Math.floor(remaining / 1000);
                    this.showPreparationTimer = true;
                }
            }
        }
    }

    closeOrderDetailsModal() {
        this.showOrderDetailsModal = false;
        this.selectedOrder = null;
    }

    acceptOrder(order: Order) {
        if (!order._id) {
            this.showModal('error', 'Error', 'Order ID not found');
            return;
        }

        this.orderService.acceptOrder(order._id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    console.log('âœ“ Order accepted:', response);
                    order.status = 'Confirmed';
                    this.showOrderTimer = false;

                    // Start 30-minute preparation timer
                    this.startPreparationTimer(order);

                    this.updateOrderStats();
                    this.showModal('success', 'Order Accepted', `Order #${order.id} has been accepted. You have 30 minutes to prepare!`);
                },
                error: (error) => {
                    console.error('âŒ Error accepting order:', error);
                    this.showModal('error', 'Error', 'Failed to accept order. Please try again.');
                }
            });
    }

    rejectOrder(order: Order) {
        if (!order._id) {
            this.showModal('error', 'Error', 'Order ID not found');
            return;
        }

        const onConfirm = () => {
            this.orderService.rejectOrder(order._id || '')
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (response: any) => {
                        console.log('âœ“ Order rejected:', response);
                        order.status = 'Cancelled';
                        this.showOrderTimer = false;
                        this.updateOrderStats();
                        this.showModal('info', 'Order Rejected', `Order #${order.id} has been rejected.`);
                    },
                    error: (error) => {
                        console.error('âŒ Error rejecting order:', error);
                        this.showModal('error', 'Error', 'Failed to reject order. Please try again.');
                    }
                });
        };

        this.showModal('confirm', 'Confirm Rejection',
            `Are you sure you want to reject Order #${order.id}?`,
            onConfirm
        );
    }

    completeOrder(order: Order) {
        if (!order._id) {
            this.showModal('error', 'Error', 'Order ID not found');
            return;
        }

        this.orderService.updateOrderStatus(order._id, 'Delivered')
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    console.log('âœ“ Order completed:', response);
                    order.status = 'Delivered';

                    // Stop preparation timer
                    const timerKey = `prep_${order._id}`;
                    if (this.preparationTimers[timerKey]) {
                        clearInterval(this.preparationTimers[timerKey]);
                        delete this.preparationTimers[timerKey];
                    }

                    // Hide preparation timer modal if this order was being displayed
                    if (this.preparationTimerOrder && this.preparationTimerOrder._id === order._id) {
                        this.showPreparationTimer = false;
                        this.preparationTimerOrder = null;
                    }

                    // Close order details modal if open
                    if (this.selectedOrder && this.selectedOrder._id === order._id) {
                        this.closeOrderDetailsModal();
                    }

                    this.updateOrderStats();
                    this.showModal('success', 'Order Completed', `Order #${order.id} has been marked as delivered!`);
                },
                error: (error) => {
                    console.error('âŒ Error completing order:', error);
                    this.showModal('error', 'Error', 'Failed to complete order. Please try again.');
                }
            });
    }

    markOrderReady(order: Order) {
        if (!order._id) {
            this.showModal('error', 'Error', 'Order ID not found');
            return;
        }

        const vendorId = localStorage.getItem('userId');
        if (!vendorId) {
            this.showModal('error', 'Error', 'Vendor ID not found');
            return;
        }

        this.orderService.markOrderReady(order._id, vendorId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    console.log('âœ“ Order marked as ready:', response);
                    order.status = 'Ready for Pickup';

                    // Stop preparation timer
                    const timerKey = `prep_${order._id}`;
                    if (this.preparationTimers[timerKey]) {
                        clearInterval(this.preparationTimers[timerKey]);
                        delete this.preparationTimers[timerKey];
                    }

                    this.updateOrderStats();
                    this.showModal('success', 'Order Ready', `Order #${order.id} is ready! A rider will pick it up soon.`);
                },
                error: (error) => {
                    console.error('âŒ Error marking order ready:', error);
                    this.showModal('error', 'Error', 'Failed to mark order as ready. Please try again.');
                }
            });
    }

    getStatusClass(status: string): string {
        const classes: { [key: string]: string } = {
            'pending': 'status-pending',
            'accepted': 'status-accepted',
            'rejected': 'status-rejected',
            'completed': 'status-completed',
            'active': 'status-active',
            'inactive': 'status-inactive'
        };
        return classes[status] || '';
    }

    getPendingOrders(): Order[] {
        return this.orders.filter(o => o.status === 'Pending');
    }

    getAcceptedOrders(): Order[] {
        return this.orders.filter(o => o.status === 'Confirmed' || o.status === 'Preparing');
    }

    getOrdersWithActiveTimers(): Order[] {
        return this.orders.filter(o => {
            // Show timer for all Confirmed or Preparing orders
            if (o.status !== 'Confirmed' && o.status !== 'Preparing') return false;

            // If no deadline exists, create one (30 minutes from acceptance or now)
            if (!o.preparationDeadline) {
                if (o.acceptedAt) {
                    o.preparationDeadline = new Date(new Date(o.acceptedAt).getTime() + 30 * 60 * 1000);
                } else {
                    o.preparationDeadline = new Date(Date.now() + 30 * 60 * 1000);
                    o.acceptedAt = new Date();
                }
                // Start timer for this order
                const timerKey = `prep_${o._id}`;
                if (!this.preparationTimers[timerKey]) {
                    this.startPreparationTimer(o);
                }
            }

            const remaining = new Date(o.preparationDeadline).getTime() - Date.now();
            return remaining > 0;
        });
    }

    getTimerMinutes(order: Order): number {
        if (!order.preparationDeadline) return 0;
        const remaining = new Date(order.preparationDeadline).getTime() - Date.now();
        if (remaining <= 0) return 0;
        return Math.floor(remaining / 60000);
    }

    getTimerSeconds(order: Order): number {
        if (!order.preparationDeadline) return 0;
        const remaining = new Date(order.preparationDeadline).getTime() - Date.now();
        if (remaining <= 0) return 0;
        return Math.floor((remaining % 60000) / 1000);
    }

    getAllOrders(): Order[] {
        return this.orders;
    }
    isLoggedIn(): boolean {
        console.log('Checking login status');
        return !!localStorage.getItem('token');  // returns true or false
    }

    getUserName(): string {
        return localStorage.getItem('name') || '';
    }
    viewProfile() {
        this.activeTab = 'profile';
    }
    updateProfile() {
        if (!this.vendor._id) {
            this.showModal('error', 'ERROR', 'No vendor ID available. Please log in again.');
            console.error('Cannot update: vendor._id is empty');
            return;
        }

        const updatedVendor = {
            shopName: this.vendor.shopName,
            shopDescription: this.vendor.shopDescription,
            shopAddress: this.vendor.shopAddress,
            shopContactNumber: this.vendor.shopContactNumber,
            shopidentificationNumber: this.vendor.shopidentificationNumber
        };

        console.log("ðŸ”„ Updating vendor with ID:", this.vendor._id);
        console.log("ðŸ“¦ Update payload:", updatedVendor);

        this.http.put(`/api/vendor/${this.vendor._id}`, updatedVendor)
            .subscribe({
                next: (response: any) => {
                    console.log('âœ“ Profile updated successfully:', response);
                    this.showModal('success', 'Profile Updated', 'Your profile has been updated successfully!');
                    this.isEditingProfile = false;
                    this.activeTab = 'profile';
                },
                error: (error) => {
                    console.error('âœ— Error updating profile:', error);
                    console.error('HTTP Status:', error.status);
                    console.error('Error Response:', error.error);
                    const errorMsg = error.error?.message || error.error?.error || 'Please try again.';
                    this.showModal('error', 'Update Failed', `Failed to update profile:\n${errorMsg}`);
                }
            });
    }

    startEditProduct() {
        if (!this.selectedProduct) {
            this.showModal('error', 'Error', 'No product selected');
            return;
        }

        // Determine category ID for the form
        let initialCategoryId = '';

        // Priority 1: Use existing category_id if available
        if (this.selectedProduct.category_id && this.selectedProduct.category_id.length > 0) {
            initialCategoryId = this.selectedProduct.category_id[0];
        }
        // Priority 2: If we have a name but no ID, try to find the ID from loaded categories
        else if (this.selectedProduct.category) {
            const matchedCat = this.categories.find(c => c.name.toLowerCase() === (this.selectedProduct?.category || '').toLowerCase());
            if (matchedCat && matchedCat._id) {
                initialCategoryId = matchedCat._id;
            } else {
                initialCategoryId = this.selectedProduct.category;
            }
        }

        // Create a copy of the product for editing
        this.editableProduct = {
            _id: this.selectedProduct._id,
            name: this.selectedProduct.name,
            category: initialCategoryId,
            price: this.selectedProduct.price,
            stock: this.selectedProduct.stock,
            description: this.selectedProduct.description,
            ingredients: this.selectedProduct.ingredients ? this.selectedProduct.ingredients.join(', ') : ''
        };
        this.editProductImagePreview = this.getImageUrl(this.selectedProduct.image || '');
        this.editProductImageFile = null;
        this.isEditingProduct = true;
        this.updateProductError = '';
        this.updateProductSuccess = '';
    }

    cancelEditProduct() {
        this.isEditingProduct = false;
        this.editableProduct = null;
        this.editProductImagePreview = '';
        this.editProductImageFile = null;
        this.updateProductError = '';
        this.updateProductSuccess = '';
    }

    onEditProductImageSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.editProductImageFile = file;

            // Create image preview
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.editProductImagePreview = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    updateProduct() {
        if (!this.editableProduct || !this.selectedProduct) {
            this.showModal('error', 'Error', 'Product data not found');
        }

        this.updateProductError = '';
        this.updateProductSuccess = '';

        // Validation
        if (!this.editableProduct.name || this.editableProduct.name.trim() === '') {
            this.updateProductError = 'Product name is required';
            return;
        }
        if (this.editableProduct.price <= 0) {
            this.updateProductError = 'Valid price is required';
            return;
        }
        if (this.editableProduct.stock < 0) {
            this.updateProductError = 'Stock must be 0 or more';
            return;
        }

        this.isUpdatingProduct = true;

        // Create FormData
        const formData = new FormData();
        formData.append('name', this.editableProduct.name);
        formData.append('category_id', this.editableProduct.category);
        formData.append('price', this.editableProduct.price.toString());
        formData.append('stock', this.editableProduct.stock.toString());
        formData.append('description', this.editableProduct.description || '');

        if (this.editableProduct.ingredients && this.editableProduct.ingredients.trim()) {
            formData.append('ingredients', this.editableProduct.ingredients);
        }

        if (this.editProductImageFile) {
            formData.append('image', this.editProductImageFile);
        }

        const productId = this.selectedProduct?._id || this.selectedProduct?.id;

        if (!productId) {
            this.showModal('error', 'Error', 'Product ID not found');
            return;
        }

        this.productService.updateProduct(productId as string, formData).subscribe({
            next: (response: any) => {
                this.isUpdatingProduct = false;
                this.updateProductSuccess = 'âœ“ Product updated successfully!';
                console.log('âœ“ Product updated:', response);

                // Update the product in the local list
                const index = this.products.findIndex(p => p._id === productId || p.id === productId);
                if (index !== -1) {
                    this.products[index] = {
                        ...this.products[index],
                        ...response.product
                    };
                    this.selectedProduct = this.products[index];
                }

                setTimeout(() => {
                    this.isEditingProduct = false;
                    this.updateProductSuccess = '';
                }, 1500);
            },
            error: (error: any) => {
                this.isUpdatingProduct = false;
                console.error('âœ— Error updating product:', error);
                const errorMsg = error.error?.message || error.message || 'Failed to update product. Please try again.';
                this.updateProductError = errorMsg;
            }
        });
    }

    startEditProfile() {
        this.isEditingProfile = true;
        this.activeTab = 'profileUpdate';
    }

    cancelEditProfile() {
        this.isEditingProfile = false;
        this.activeTab = 'profile';
    }

    // ============ VENDOR HISTORY METHODS ============
    loadVendorHistory() {
        const vendorId = localStorage.getItem('userId');
        if (!vendorId) {
            console.error('No vendor ID found');
            return;
        }

        // Load orders history
        this.loadOrderHistory(vendorId);
        // Load transaction history
        this.loadTransactionHistory(vendorId);
    }

    loadOrderHistory(vendorId: string) {
        this.orderLoading = true;
        this.http.get(`/api/order/vendor/${vendorId}/list`)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    try {
                        // Handle different response formats
                        let orderList = [];
                        if (Array.isArray(response)) {
                            orderList = response;
                        } else if (response && Array.isArray(response.orders)) {
                            orderList = response.orders;
                        } else if (response && response.data && Array.isArray(response.data)) {
                            orderList = response.data;
                        }

                        // Map and format orders for history display
                        this.allOrders = orderList.map((order: any) => {
                            let addressStr = 'No address';
                            if (order.userId?.address) {
                                const addr = order.userId.address;
                                const street = addr.street && addr.street.trim() ? addr.street : '';
                                const city = addr.city && addr.city.trim() ? addr.city : '';
                                const state = addr.state && addr.state.trim() ? addr.state : '';
                                addressStr = `${street} ${city} ${state}`.trim() || 'No address';
                            } else if (order.deliveryAddress) {
                                addressStr = order.deliveryAddress;
                            }

                            return {
                                ...order,
                                customerName: order.customerName || order.userId?.name || 'Unknown',
                                deliveryAddress: addressStr
                            };
                        });

                        this.totalOrders = this.allOrders.length;
                        this.totalOrderAmount = this.allOrders.reduce((sum, order) => sum + (order.total || 0), 0);
                        this.filterOrders();
                        this.orderLoading = false;
                        console.log('âœ“ Orders loaded:', this.allOrders.length, 'items');
                    } catch (error) {
                        console.error('âœ— Error processing orders:', error);
                        this.orderLoading = false;
                        this.showModal('error', 'Error Processing Orders', 'Failed to process order data. Please try again.');
                    }
                },
                error: (error) => {
                    console.error('âœ— Error loading orders:', error);
                    this.orderLoading = false;
                    this.showModal('error', 'Error Loading Orders', 'Failed to load order history. Please try again.');
                }
            });
    }

    loadTransactionHistory(vendorId: string) {
        this.transactionLoading = true;
        // Use the new simple endpoint that returns just the array
        this.http.get(`/api/withdrawals/vendor/${vendorId}/list`)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    try {
                        console.log('Transactions API Response:', response);

                        // Handle response - should be array directly
                        if (Array.isArray(response)) {
                            this.allTransactions = response;
                        } else if (response && Array.isArray(response.transactions)) {
                            this.allTransactions = response.transactions;
                        } else {
                            this.allTransactions = [];
                        }

                        this.totalTransactions = this.allTransactions.length;
                        this.totalWithdrawn = this.allTransactions
                            .filter(t => t && t.status === 'Completed')
                            .reduce((sum, t) => sum + (t.amount || 0), 0);
                        this.totalPending = this.allTransactions
                            .filter(t => t && t.status === 'Pending')
                            .reduce((sum, t) => sum + (t.amount || 0), 0);
                        this.filterTransactions();
                        this.transactionLoading = false;
                        console.log('âœ“ Transactions loaded:', this.allTransactions.length, 'items');
                    } catch (error) {
                        console.error('âœ— Error processing transactions:', error);
                        this.transactionLoading = false;
                        this.showModal('error', 'Error Processing Transactions', 'Failed to process transaction data. Please try again.');
                    }
                },
                error: (error) => {
                    console.error('âœ— Error loading transactions:', error);
                    this.transactionLoading = false;
                    this.showModal('error', 'Error Loading Transactions', 'Failed to load transaction history. Please try again.');
                }
            });
    }

    setHistoryTab(tab: 'orders' | 'transactions') {
        this.historyActiveTab = tab;
        this.currentPage = 1;
        this.paginateData();
    }

    filterOrders() {
        try {
            let filtered = Array.isArray(this.allOrders) ? [...this.allOrders] : [];

            // Filter by status
            if (this.orderStatusFilter && this.orderStatusFilter !== 'all') {
                filtered = filtered.filter(order => order && order.status === this.orderStatusFilter);
            }

            // Filter by search text
            if (this.historySearchText) {
                const search = this.historySearchText.toLowerCase();
                filtered = filtered.filter(order => {
                    if (!order) return false;
                    return (order._id && order._id.toLowerCase().includes(search)) ||
                        (order.customerName && order.customerName.toLowerCase().includes(search)) ||
                        (order.deliveryAddress && order.deliveryAddress.toLowerCase().includes(search));
                });
            }

            this.filteredOrders = filtered;
            this.currentPage = 1;
            this.paginateData();
        } catch (error) {
            console.error('Error filtering orders:', error);
            this.filteredOrders = [];
        }
    }

    filterTransactions() {
        try {
            let filtered = Array.isArray(this.allTransactions) ? [...this.allTransactions] : [];

            // Filter by status
            if (this.transactionStatusFilter && this.transactionStatusFilter !== 'all') {
                filtered = filtered.filter(transaction => transaction && transaction.status === this.transactionStatusFilter);
            }

            // Filter by search text
            if (this.historySearchText) {
                const search = this.historySearchText.toLowerCase();
                filtered = filtered.filter(transaction => {
                    if (!transaction) return false;
                    return (transaction._id && transaction._id.toLowerCase().includes(search)) ||
                        (transaction.bankAccount?.accountHolder && transaction.bankAccount.accountHolder.toLowerCase().includes(search));
                });
            }

            this.filteredTransactions = filtered;
            this.currentPage = 1;
            this.paginateData();
        } catch (error) {
            console.error('Error filtering transactions:', error);
            this.filteredTransactions = [];
        }
    }

    onHistorySearch() {
        if (this.historyActiveTab === 'orders') {
            this.filterOrders();
        } else {
            this.filterTransactions();
        }
    }

    onHistoryStatusFilterChange() {
        if (this.historyActiveTab === 'orders') {
            this.filterOrders();
        } else {
            this.filterTransactions();
        }
    }

    paginateData() {
        const startIdx = (this.currentPage - 1) * this.itemsPerPage;
        const endIdx = startIdx + this.itemsPerPage;

        // Paginate Orders
        const orderData = this.filteredOrders || [];
        this.paginatedOrders = orderData.slice(startIdx, endIdx);

        // Paginate Transactions
        const txData = this.filteredTransactions || [];
        this.paginatedTransactions = txData.slice(startIdx, endIdx);

        // Update total pages based on current active tab's data
        const currentData = this.historyActiveTab === 'orders' ? orderData : txData;
        this.totalPages = Math.ceil(currentData.length / this.itemsPerPage) || 1;
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.paginateData();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.paginateData();
        }
    }

    formatDate(date: any): string {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    getStatusBadgeClass(status: string): string {
        const statusMap: { [key: string]: string } = {
            'Pending': 'badge-warning',
            'Confirmed': 'badge-info',
            'Preparing': 'badge-primary',
            'Ready for Pickup': 'badge-success',
            'Out for Delivery': 'badge-primary',
            'Delivered': 'badge-success',
            'Cancelled': 'badge-danger',
            'Completed': 'badge-success',
            'Failed': 'badge-danger'
        };
        return statusMap[status] || 'badge-secondary';
    }

    exportToCSV() {
        const data = this.historyActiveTab === 'orders'
            ? this.paginatedOrders.map(order => ({
                'Order ID': order._id?.slice(0, 8),
                'Date': this.formatDate(order.orderDate),
                'Customer': order.customerName,
                'Amount': `â‚¹${order.total}`,
                'Status': order.status,
                'Address': order.deliveryAddress
            }))
            : this.paginatedTransactions.map(t => ({
                'Transaction ID': t._id?.slice(0, 8),
                'Amount': `â‚¹${t.amount}`,
                'Status': t.status,
                'Requested': this.formatDate(t.requestedAt),
                'Processed': this.formatDate(t.processedAt),
                'Account Holder': t.bankAccount?.accountHolder
            }));

        const headers = Object.keys(data[0] || {});
        let csv = headers.join(',') + '\n';
        data.forEach(row => {
            csv += headers.map(h => row[h as keyof typeof row]).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.historyActiveTab}-history-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('name');
        localStorage.removeItem('userId');
        this.router.navigate(['/login']);
    }
}

