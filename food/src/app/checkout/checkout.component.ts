import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CartService } from '../services/cart.service';
import { PaymentService } from '../services/payment.service';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';

declare var Razorpay: any;

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  checkoutForm: FormGroup;
  cart: any = null;
  totalPrice: number = 0;
  userId: string | null = '';

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private router: Router,
    private http: HttpClient,
    private paymentService: PaymentService
  ) {
    this.checkoutForm = this.fb.group({
      fullName: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      zip: ['', Validators.required],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      paymentType: ['COD', Validators.required]
    });

    // Get user ID from local storage
    if (typeof localStorage !== 'undefined') {
      this.userId = localStorage.getItem('userId');
      console.log('✓ User ID from localStorage:', this.userId);
    }
  }

  ngOnInit(): void {
    console.log('🔄 Checkout component initialized');
    this.loadCart();
    if (this.userId) {
      this.loadUserDetails();
    }
  }

  loadUserDetails() {
    this.http.get<any>(`http://localhost:3000/api/auth/user/${this.userId}`).subscribe({
      next: (res) => {
        const user = res.user;
        if (user) {
          this.checkoutForm.patchValue({
            fullName: user.name || '',
            phone: user.number || ''
          });
          console.log('✓ User details loaded:', user);
        }
      },
      error: (err) => console.error('Error fetching user details:', err)
    });
  }

  loadCart() {
    console.log('🛒 Loading cart...');
    this.cartService.getCart().subscribe({
      next: (data) => {
        console.log('✓ Cart loaded:', data);
        this.cart = data;
        this.calculateTotal();
      },
      error: (err) => {
        console.error('❌ Error loading cart:', err);
        Swal.fire('Error', 'Could not load cart details', 'error');
      }
    });
  }

  calculateTotal() {
    if (!this.cart || !this.cart.products) {
      this.totalPrice = 0;
      return;
    }
    this.totalPrice = this.cart.products.reduce((acc: number, item: any) => {
      const price = item.productId && item.productId.price ? item.productId.price : 0;
      return acc + (price * item.quantity);
    }, 0);
    console.log('💰 Total price calculated:', this.totalPrice);
  }

  placeOrder() {
    console.log('📦 Place Order clicked');
    console.log('📋 Form valid?', this.checkoutForm.valid);
    console.log('📋 Form errors:', this.checkoutForm.errors);
    
    if (this.checkoutForm.invalid) {
      console.warn('⚠️ Form is invalid');
      this.checkoutForm.markAllAsTouched();
      
      // Show which fields are invalid
      Object.keys(this.checkoutForm.controls).forEach(key => {
        const control = this.checkoutForm.get(key);
        if (control && control.invalid) {
          console.warn(`Field "${key}" is invalid:`, control.errors);
        }
      });
      
      Swal.fire({
        icon: 'warning',
        title: 'Form Incomplete',
        text: 'Please fill all required fields correctly',
        didOpen: () => console.log('Form validation alert shown')
      });
      return;
    }

    console.log('🛒 Checking cart...');
    if (!this.cart || !this.cart.products || this.cart.products.length === 0) {
      console.warn('⚠️ Cart is empty');
      Swal.fire('Empty Cart', 'Your cart is empty', 'warning');
      return;
    }

    console.log('✓ Cart loaded, items:', this.cart.products);
    console.log('✓ Cart has', this.cart.products.length, 'items');

    // Safely extract product and vendor IDs with proper null checks
    const products = this.cart.products
      .filter((p: any) => {
        const hasProduct = p.productId && (p.productId._id || p.productId);
        const hasVendor = p.vendorId && (p.vendorId._id || p.vendorId);
        
        if (!hasProduct || !hasVendor) {
          console.warn('⚠️ Skipping invalid cart item:', p);
          return false;
        }
        return true;
      })
      .map((p: any) => {
        const productId = typeof p.productId === 'string' ? p.productId : p.productId?._id;
        const vendorId = typeof p.vendorId === 'string' ? p.vendorId : p.vendorId?._id;
        
        return {
          productId,
          vendorId,
          quantity: p.quantity
        };
      });

    if (products.length === 0) {
      console.error('❌ No valid products found in cart');
      Swal.fire('Error', 'Cart has no valid products. Please refresh and try again.', 'error');
      return;
    }

    const paymentType = this.checkoutForm.value.paymentType;
    const orderTotal = this.totalPrice + 40 + 4; // Subtotal + Delivery + Platform

    // If payment is Online/Card, process via Razorpay first
    if (paymentType === 'Online' || paymentType === 'Card') {
      this.processOnlinePayment(orderTotal, products);
      return;
    }

    // For COD, proceed directly
    this.createOrder('COD', products);
  }

  processOnlinePayment(orderTotal: number, products: any[]): void {
    // Create Razorpay order
    this.paymentService.createOrder(orderTotal).subscribe({
      next: (response: any) => {
        if (!response.success || !response.order) {
          Swal.fire('Error', 'Failed to initialize payment', 'error');
          return;
        }

        const options = {
          // Always use the key provided by backend (from RAZORPAY_KEY_ID in .env)
          key: response.key,
          amount: response.order.amount,
          currency: response.order.currency,
          name: 'FoodVerse',
          description: 'Order Payment',
          order_id: response.order.id,
          handler: (paymentResponse: any) => {
            this.verifyAndCreateOrder(paymentResponse, products);
          },
          prefill: {
            name: this.checkoutForm.value.fullName || '',
            contact: this.checkoutForm.value.phone || '',
            email: localStorage.getItem('email') || ''
          },
          theme: {
            color: '#667eea'
          },
          modal: {
            ondismiss: () => {
              Swal.fire('Payment Cancelled', 'You cancelled the payment', 'info');
            }
          }
        };

        const razorpay = new Razorpay(options);
        razorpay.open();
      },
      error: (err) => {
        console.error('Error creating payment order:', err);
        Swal.fire('Error', 'Failed to initialize payment gateway', 'error');
      }
    });
  }

  verifyAndCreateOrder(paymentResponse: any, products: any[]): void {
    // Verify payment signature
    this.paymentService.verifyPayment({
      razorpay_order_id: paymentResponse.razorpay_order_id,
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_signature: paymentResponse.razorpay_signature
    }).subscribe({
      next: (verifyRes: any) => {
        if (verifyRes.success) {
          // Payment verified - create order
          this.createOrder('Online', products);
        } else {
          Swal.fire('Payment Failed', 'Payment verification failed', 'error');
        }
      },
      error: (err) => {
        console.error('Payment verification error:', err);
        Swal.fire('Payment Failed', 'Payment verification failed', 'error');
      }
    });
  }

  createOrder(paymentType: string, products: any[]): void {
    const orderData = {
      userId: this.userId,
      products: products,
      // Send SUBTOTAL only. Backend will add Delivery (₹40) + Platform Fee (₹4) exactly once.
      total: this.totalPrice,
      paymentType: paymentType
    };

    console.log('📤 Sending order data:', orderData);
    console.log('🌐 API endpoint: http://localhost:3000/api/order/create');

    // Show loading alert
    Swal.fire({
      title: 'Processing Order',
      html: 'Please wait...',
      didOpen: () => {
        Swal.showLoading();
      },
      allowOutsideClick: false,
      allowEscapeKey: false
    });

    // 1. Add to Order DB
    this.http.post('http://localhost:3000/api/order/create', orderData).subscribe({
      next: (orderRes: any) => {
        console.log('✅ Order created successfully:', orderRes);

        // 2. Add to History DB (Chained)
        this.http.post('http://localhost:3000/api/history/add', orderData).subscribe({
          next: (historyRes) => {
            console.log('✅ History saved successfully:', historyRes);
            
            // 3. Clear Cart
            this.cartService.deleteCart().subscribe({
              next: () => {
                console.log('✅ Cart cleared successfully');
                
                Swal.fire({
                  icon: 'success',
                  title: 'Order Placed Successfully!',
                  html: '<p>Your order has been received.</p><p>The vendor will accept it within 30 seconds.</p>',
                  showConfirmButton: true,
                  confirmButtonText: 'Go to Home'
                }).then(() => {
                  this.router.navigate(['/']);
                });
              },
              error: (err) => {
                console.error('❌ Error clearing cart:', err);
                // Still navigate even if cart clear fails
                this.router.navigate(['/']);
              }
            });
          },
          error: (err) => {
            console.error('❌ Failed to save history:', err);
            console.error('Error details:', err.error, err.status);
            
            // Still clear cart to avoid duplicate orders
            this.cartService.deleteCart().subscribe({
              next: () => {
                Swal.fire({
                  icon: 'warning',
                  title: 'Order Placed',
                  text: 'Order saved but history recording failed. Please refresh the page.',
                  confirmButtonText: 'OK'
                }).then(() => {
                  this.router.navigate(['/']);
                });
              },
              error: () => {
                this.router.navigate(['/']);
              }
            });
          }
        });
      },
      error: (err) => {
        console.error('❌ Order creation failed:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.error);
        
        // Check if vendor is offline
        if (err.error?.message && err.error.message.includes('offline')) {
          Swal.fire({
            icon: 'error',
            title: 'Kitchen is Closed',
            html: `<p>Sorry, the vendor is currently offline.</p><p>Please try again later when the kitchen is open.</p>`,
            confirmButtonText: 'OK'
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Order Failed',
            html: `<p>Failed to place order.</p><p>Error: ${err.error?.message || err.error?.error || 'Unknown error'}</p><p>Please try again.</p>`,
            confirmButtonText: 'OK'
          });
        }
      }
    });
  }
}