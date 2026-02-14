import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink], // Add RouterLink
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.css']
})
export class OrderHistoryComponent implements OnInit {
  orders: any[] = [];
  loading: boolean = true;
  userRole: string = ''; // 'user' or 'vendor'
  userId: string | null = null;
  readonly defaultDeliveryCharge = 40;
  readonly defaultPlatformFee = 4;

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit(): void {
    if (typeof localStorage !== 'undefined') {
      this.userId = localStorage.getItem('userId');
      this.userRole = localStorage.getItem('role') || 'user'; // Assume user if not set, or you have logic

      // Basic check: if ID is not there, redirect login
      if (!this.userId) {
        this.router.navigate(['/login']);
        return;
      }

      this.fetchOrders();
    }
  }

  fetchOrders() {
    this.loading = true;
    let url = '';

    // Determine API based on role
    // Check role from localStorage or check if user is accessing vendor dashboard
    const role = localStorage.getItem('role');
    const vendorId = localStorage.getItem('vendorId');

    // If role is vendor or vendorId exists, fetch vendor orders
    if (role === 'vendor' || vendorId) {
      const vId = vendorId || this.userId;
      url = `http://localhost:3000/api/order/vendor/${vId}`;
      this.userRole = 'vendor';
    } else {
      // It's a regular user
      url = `http://localhost:3000/api/order/user/${this.userId}`;
      this.userRole = 'user';
    }

    console.log(`🔍 Fetching orders for ${this.userRole}:`, url);

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        console.log(`✅ Loaded ${data.length} orders`);

        // Format orders properly for display
        this.orders = data.map((order: any) => {
          // Format order data
          const formattedOrder = {
            _id: order._id,
            id: order._id?.slice(-6) || 'N/A',
            orderDate: order.orderDate ? new Date(order.orderDate) : new Date(),
            status: order.status || 'Pending',
            total: order.total || 0,
            deliveryCharge: order.deliveryCharge,
            platformFee: order.platformFee,
            paymentType: order.paymentType || 'COD',
            products: order.products || [],
            // User info (for vendor view)
            userId: order.userId || null,
            customerName: order.userId?.name || 'Unknown Customer',
            customerEmail: order.userId?.email || '',
            customerPhone: order.userId?.number || '',
            deliveryAddress: order.userId?.address || 'No address provided',
            // Vendor info (for user view)
            vendorName: order.products?.[0]?.vendorId?.shopName || 'Unknown Vendor',
            // Additional fields
            acceptedAt: order.acceptedAt ? new Date(order.acceptedAt) : null,
            preparationDeadline: order.preparationDeadline ? new Date(order.preparationDeadline) : null,
            deliveredAt: order.deliveredAt ? new Date(order.deliveredAt) : null,
            lateFeeApplied: order.lateFeeApplied || false,
            lateFeeAmount: order.lateFeeAmount || 0
          };

          return formattedOrder;
        });

        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error loading orders:', err);
        this.orders = [];
        this.loading = false;
      }
    });
  }

  getImageUrl(imagePath: string): string {
    if (!imagePath) return 'assets/placeholder-food.jpg';
    if (imagePath.startsWith('http')) return imagePath;
    let cleanPath = imagePath.replace(/\\/g, '/');
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    if (cleanPath.includes('products/')) cleanPath = cleanPath.replace('products/', '');
    if (!cleanPath.startsWith('uploads/')) cleanPath = `uploads/${cleanPath}`;
    return `http://localhost:3000/${cleanPath}`;
  }

  getItemsSubtotal(order: any): number {
    const items = Array.isArray(order?.products) ? order.products : [];
    return items.reduce((sum: number, item: any) => {
      const price = item?.productId?.price || 0;
      const qty = item?.quantity || 0;
      return sum + price * qty;
    }, 0);
  }

  getDeliveryCharge(order: any): number {
    const v = order?.deliveryCharge;
    return typeof v === 'number' ? v : this.defaultDeliveryCharge;
  }

  getPlatformFee(order: any): number {
    const v = order?.platformFee;
    return typeof v === 'number' ? v : this.defaultPlatformFee;
  }

  getDisplayTotal(order: any): number {
    // Always compute for display to avoid showing old double-fee totals
    return this.getItemsSubtotal(order) + this.getDeliveryCharge(order) + this.getPlatformFee(order);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('lastActivity');
    this.router.navigate(['/']);
  }
}
