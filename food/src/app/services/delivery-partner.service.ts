import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

/**
 * DELIVERY PARTNER SERVICE
 * Handles API calls and socket communication for delivery partners
 */

export interface DeliveryPartner {
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  vehicleType: 'bike' | 'scooter' | 'car' | 'bicycle';
  vehicleNumber?: string;
  isOnline: boolean;
  isAvailable: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  currentOrderId?: string;
  totalEarnings: number;
  totalDeliveries: number;
  averageRating: number;
}

export interface DeliveryOrder {
  _id: string;
  userId: any;
  products: any[];
  total: number;
  status: string;
  customerAddress: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeliveryPartnerService {
  private apiUrl = 'http://localhost:3000/api/delivery-partner';
  private socketUrl = 'http://localhost:3000';
  private socket: Socket | null = null;

  constructor(public http: HttpClient) {}

  // ======================== SOCKET.IO SETUP ========================

  initializeSocket(partnerId: string): Socket {
    if (!this.socket) {
      this.socket = io(this.socketUrl, {
        auth: {
          partnerId
        }
      });
    }
    return this.socket;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnectSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // ======================== DELIVERY PARTNER API CALLS ========================

  // Get delivery partner profile
  getDeliveryPartnerProfile(id: string): Observable<DeliveryPartner> {
    return this.http.get<DeliveryPartner>(`${this.apiUrl}/${id}`);
  }

  // Create delivery partner account
  createDeliveryPartner(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, data);
  }

  // Update delivery partner profile
  updateDeliveryPartner(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  // Toggle online/offline status
  toggleOnlineStatus(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/online-status`, {});
  }

  // Update location
  updateLocation(id: string, latitude: number, longitude: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/location`, {
      latitude,
      longitude
    });
  }

  // Get current location
  getLocation(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/location`);
  }

  // Get nearby available delivery partners
  getNearbyPartners(latitude: number, longitude: number, radius: number = 5): Observable<any> {
    return this.http.get(`${this.apiUrl}/nearby/search`, {
      params: {
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radius.toString()
      }
    });
  }

  // ======================== ORDER MANAGEMENT ========================

  // Get pending order for delivery partner
  getPendingOrder(partnerId: string): Observable<DeliveryOrder> {
    return this.http.get<DeliveryOrder>(`${this.apiUrl}/${partnerId}/pending-orders`);
  }

  // Accept order
  acceptOrder(partnerId: string, orderId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${partnerId}/orders/${orderId}/accept`, {});
  }

  // Reject order
  rejectOrder(partnerId: string, orderId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${partnerId}/orders/${orderId}/reject`, {});
  }

  // Mark order as delivered
  markOrderDelivered(partnerId: string, orderId: string, rating?: number, notes?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${partnerId}/orders/${orderId}/deliver`, {
      rating,
      notes
    });
  }

  // ======================== EARNINGS ========================

  // Get earnings summary
  getEarningsSummary(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/earnings`);
  }

  // ======================== SOCKET.IO EVENTS ========================

  // Emit: Delivery partner comes online
  goOnline(partnerId: string, latitude: number, longitude: number): void {
    this.socket?.emit('delivery-partner-online', {
      partnerId,
      latitude,
      longitude
    });
  }

  // Emit: Send location update
  updateLocationSocket(partnerId: string, orderId: string, latitude: number, longitude: number): void {
    this.socket?.emit('delivery-partner-location-update', {
      partnerId,
      orderId,
      latitude,
      longitude
    });
  }

  // Emit: Accept order
  acceptOrderSocket(partnerId: string, orderId: string): void {
    this.socket?.emit('delivery-partner-accept-order', {
      partnerId,
      orderId
    });
  }

  // Emit: Mark picked up
  markPickedUpSocket(partnerId: string, orderId: string, location: any): void {
    this.socket?.emit('delivery-partner-picked-up', {
      partnerId,
      orderId,
      location
    });
  }

  // Emit: Deliver order
  deliverOrderSocket(partnerId: string, orderId: string, photo?: string, notes?: string): void {
    this.socket?.emit('delivery-partner-delivered', {
      partnerId,
      orderId,
      photo,
      notes
    });
  }

  // Listen: Delivery location update
  onDeliveryLocationUpdate(callback: (data: any) => void): void {
    this.socket?.on('delivery-location-update', callback);
  }

  // Listen: New order available
  onNewOrderAvailable(callback: (data: any) => void): void {
    this.socket?.on('new-order-available', callback);
  }

  // Listen: Order accepted by user
  onOrderAccepted(callback: (data: any) => void): void {
    this.socket?.on('delivery-partner-accepted', callback);
  }

  // Listen: Delivery complete
  onDeliveryComplete(callback: (data: any) => void): void {
    this.socket?.on('delivery-complete', callback);
  }

  // Listen: Error notification
  onDeliveryError(callback: (data: any) => void): void {
    this.socket?.on('delivery-error-notification', callback);
  }

  // Listen: Food ready alert
  onFoodReady(callback: (data: any) => void): void {
    this.socket?.on('food-ready-alert', callback);
  }

  // Listen: Rider acknowledged
  onRiderAcknowledged(callback: (data: any) => void): void {
    this.socket?.on('rider-acknowledged', callback);
  }

  // Emit: Acknowledge food ready
  acknowledgeFoodReady(partnerId: string, orderId: string): void {
    this.socket?.emit('acknowledge-food-ready', {
      partnerId,
      orderId
    });
  }

  // ======================== PROFILE MANAGEMENT ========================

  /**
   * Update delivery information (collected after signup)
   */
  updateDeliveryInformation(partnerId: string, deliveryInfo: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${partnerId}/delivery-info`, deliveryInfo);
  }

  // Get available orders ready for pickup
  getAvailableOrders(): Observable<any> {
    return this.http.get<any>(`http://localhost:3000/api/order/ready/all`);
  }

  // Claim order as rider
  claimOrder(orderId: string, riderId: string, vendorId: string): Observable<any> {
    return this.http.put<any>(`http://localhost:3000/api/order/${orderId}/assign-rider`, {
      riderId,
      vendorId
    });
  }

  // Get all orders for a delivery partner
  getAllOrders(partnerId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${partnerId}/orders`);
  }
}
