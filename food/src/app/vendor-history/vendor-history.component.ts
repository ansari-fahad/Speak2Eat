import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface OrderHistory {
  _id: string;
  orderDate: Date;
  total: number;
  status: string;
  items?: any[];
  customerName?: string;
  deliveryAddress?: string;
}

interface Transaction {
  _id: string;
  amount: number;
  status: string;
  requestedAt: Date;
  processedAt?: Date;
  bankAccount?: {
    accountNumber: string;
    accountHolder: string;
  };
}

@Component({
  selector: 'app-vendor-history',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './vendor-history.component.html',
  styleUrl: './vendor-history.component.css'
})
export class VendorHistoryComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  vendorId: string | null = null;
  activeTab: 'orders' | 'transactions' = 'orders';

  // Order History
  orderHistory: OrderHistory[] = [];
  filteredOrders: OrderHistory[] = [];
  orderLoading = false;

  // Transaction History
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  transactionLoading = false;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalOrders = 0;
  totalTransactions = 0;

  // Filters
  orderStatusFilter = 'all';
  transactionStatusFilter = 'all';
  searchText = '';

  // Summary
  totalOrderAmount = 0;
  totalWithdrawn = 0;
  totalPending = 0;

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit() {
    this.vendorId = localStorage.getItem('vendorId') || localStorage.getItem('userId');
    if (!this.vendorId) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadOrderHistory();
    this.loadTransactionHistory();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ======================== TAB TOGGLE ========================

  setActiveTab(tab: 'orders' | 'transactions') {
    this.activeTab = tab;
    this.currentPage = 1;
    this.searchText = '';

    if (tab === 'orders') {
      this.filterOrders();
    } else {
      this.filterTransactions();
    }
  }

  // ======================== ORDER HISTORY ========================

  loadOrderHistory() {
    if (!this.vendorId) return;

    this.orderLoading = true;
    this.http.get(`/api/order/vendor/${this.vendorId}/list`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          let orderList = [];
          if (Array.isArray(response)) {
            orderList = response;
          } else if (response && response.orders) {
            orderList = response.orders;
          } else if (response && response.data) {
            orderList = response.data;
          }

          this.orderHistory = orderList.map((order: any) => {
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

          this.totalOrders = this.orderHistory.length;
          this.calculateOrderStats();
          this.filterOrders();
          this.orderLoading = false;
        },
        error: (error) => {
          console.error('Error loading order history:', error);
          this.orderLoading = false;
        }
      });
  }

  filterOrders() {
    let filtered = this.orderHistory;

    // Filter by status
    if (this.orderStatusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === this.orderStatusFilter);
    }

    // Filter by search text
    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(order =>
        order._id.toLowerCase().includes(search) ||
        order.customerName?.toLowerCase().includes(search) ||
        order.deliveryAddress?.toLowerCase().includes(search)
      );
    }

    this.filteredOrders = filtered;
  }

  calculateOrderStats() {
    this.totalOrderAmount = this.orderHistory.reduce((sum, order) => sum + (order.total || 0), 0);
  }

  // ======================== TRANSACTION HISTORY ========================

  loadTransactionHistory() {
    if (!this.vendorId) return;

    this.transactionLoading = true;
    this.http.get(`/api/withdrawals/vendor/${this.vendorId}/list`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          let txList = [];
          if (Array.isArray(response)) {
            txList = response;
          } else if (response && response.transactions) {
            txList = response.transactions;
          } else if (response && response.data) {
            txList = response.data;
          }

          this.transactions = txList;
          this.totalTransactions = this.transactions.length;
          this.calculateTransactionStats();
          this.filterTransactions();
          this.transactionLoading = false;
        },
        error: (error) => {
          console.error('Error loading transaction history:', error);
          this.transactionLoading = false;
        }
      });
  }

  filterTransactions() {
    let filtered = this.transactions;

    // Filter by status
    if (this.transactionStatusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status === this.transactionStatusFilter);
    }

    // Filter by search text
    if (this.searchText.trim()) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(tx =>
        tx._id.toLowerCase().includes(search) ||
        tx.bankAccount?.accountHolder.toLowerCase().includes(search)
      );
    }

    this.filteredTransactions = filtered;
  }

  calculateTransactionStats() {
    this.totalWithdrawn = this.transactions
      .filter(tx => tx.status === 'Completed')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    this.totalPending = this.transactions
      .filter(tx => tx.status === 'Pending')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }

  // ======================== PAGINATION ========================

  get paginatedOrders() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredOrders.slice(start, start + this.pageSize);
  }

  get paginatedTransactions() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredTransactions.slice(start, start + this.pageSize);
  }

  get totalPages() {
    const data = this.activeTab === 'orders' ? this.filteredOrders : this.filteredTransactions;
    return Math.ceil(data.length / this.pageSize);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // ======================== UTILITIES ========================

  getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      'Delivered': 'badge-success',
      'Completed': 'badge-success',
      'Pending': 'badge-warning',
      'Preparing': 'badge-info',
      'Out for Delivery': 'badge-primary',
      'Failed': 'badge-danger',
      'Cancelled': 'badge-danger'
    };
    return classes[status] || 'badge-secondary';
  }

  formatDate(date: any): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  onSearch() {
    this.currentPage = 1;
    if (this.activeTab === 'orders') {
      this.filterOrders();
    } else {
      this.filterTransactions();
    }
  }

  onStatusFilterChange() {
    this.currentPage = 1;
    if (this.activeTab === 'orders') {
      this.filterOrders();
    } else {
      this.filterTransactions();
    }
  }

  exportToCSV() {
    if (this.activeTab === 'orders') {
      this.exportOrdersCSV();
    } else {
      this.exportTransactionsCSV();
    }
  }

  private exportOrdersCSV() {
    const headers = ['Order ID', 'Date', 'Customer', 'Amount', 'Status'];
    const rows = this.filteredOrders.map(order => [
      order._id,
      this.formatDate(order.orderDate),
      order.customerName || '-',
      order.total,
      order.status
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    this.downloadCSV(csv, 'order-history.csv');
  }

  private exportTransactionsCSV() {
    const headers = ['Transaction ID', 'Amount', 'Status', 'Date', 'Account Holder'];
    const rows = this.filteredTransactions.map(tx => [
      tx._id,
      tx.amount,
      tx.status,
      this.formatDate(tx.requestedAt),
      tx.bankAccount?.accountHolder || '-'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    this.downloadCSV(csv, 'transaction-history.csv');
  }

  private downloadCSV(csv: string, filename: string) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
}


