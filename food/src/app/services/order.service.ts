import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface OrderItem {
  productId: string;
  vendorId: string;
  quantity: number;
  productName?: string;
  price?: number;
}

export interface Order {
  _id?: string;
  id?: string;
  userId: string;
  products: OrderItem[];
  total: number;
  paymentType: string;
  orderDate: Date;
  status: string;
  customerName?: string;
  deliveryAddress?: string;
  items?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = '/api/order';

  constructor(private http: HttpClient) { }

  // Get orders by vendor ID
  getOrdersByVendor(vendorId: string): Observable<Order[]> {
    return this.http.get<any>(`${this.apiUrl}/vendor/${vendorId}`).pipe(
      map((response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || response?.orders || [];
      })
    );
  }

  // Get orders by vendor ID with formatted data (shows only item prices for vendor)
  getOrdersByVendorFormatted(vendorId: string): Observable<Order[]> {
    return this.http.get<any>(`${this.apiUrl}/vendor/${vendorId}/formatted`).pipe(
      map((response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || response?.orders || [];
      })
    );
  }

  // Get orders by user ID
  getOrdersByUser(userId: string): Observable<Order[]> {
    return this.http.get<any>(`${this.apiUrl}/user/${userId}`).pipe(
      map((response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || response?.orders || [];
      })
    );
  }

  // Create new order
  createOrder(orderData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, orderData);
  }

  // Update order status
  updateOrderStatus(orderId: string, status: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${orderId}/status`, { status });
  }

  // Accept order
  acceptOrder(orderId: string): Observable<any> {
    return this.updateOrderStatus(orderId, 'Confirmed');
  }

  // Reject order
  rejectOrder(orderId: string): Observable<any> {
    return this.updateOrderStatus(orderId, 'Cancelled');
  }

  // Get single order
  getOrderById(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${orderId}`);
  }

  // Mark order as ready for pickup
  markOrderReady(orderId: string, vendorId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${orderId}/ready`, { vendorId });
  }

  // Get all orders ready for pickup
  getReadyOrders(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ready/all`);
  }

  // Assign rider to order
  assignRiderToOrder(orderId: string, riderId: string, vendorId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${orderId}/assign-rider`, { riderId, vendorId });
  }

  // Get order with vendor & user locations
  getOrderLocations(orderId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${orderId}/locations`);
  }
}

