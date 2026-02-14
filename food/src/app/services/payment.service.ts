import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = 'https://speak2-eatbackend.vercel.app/api/payment';

  constructor(private http: HttpClient) { }

  // Create Razorpay order for checkout
  createOrder(amount: number, receipt?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/create-order`, {
      amount,
      currency: 'INR',
      receipt: receipt || `receipt_${Date.now()}`
    });
  }

  // Verify payment signature
  verifyPayment(paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify`, paymentData);
  }

  // Transfer to vendor (for withdrawals)
  transferToVendor(vendorId: string, amount: number, accountId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/transfer`, {
      vendorId,
      amount,
      accountId
    });
  }
}
