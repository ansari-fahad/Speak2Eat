import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { DeliveryPartnerService } from '../services/delivery-partner.service';
import { VoiceNavigationService } from '../services/voice-navigation.service';
import { VoiceButtonComponent } from '../voice-button/voice-button.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import mapboxgl from 'mapbox-gl';

declare var google: any;

interface DeliveryOrder {
  _id: string;
  customerName?: string;
  deliveryAddress?: string | any;
  vendorAddress?: string | any;
  items?: any[];
  total?: number;
  status?: string;
  location?: { latitude: number; longitude: number } | any;
  userId?: {
    name?: string;
    address?: string | { street?: string; city?: string; state?: string; postalCode?: string; country?: string };
    number?: string;
    email?: string;
  };
  products?: any[];
  deliveredAt?: Date | string;
  orderDate?: Date | string;
  vendorPhone?: string;
  customerPhone?: string;
  vendorLocation?: { latitude?: number; longitude?: number } | any;
  customerLocation?: { latitude?: number; longitude?: number } | any;
}

interface ModalDialog {
  type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  title: string;
  message: string;
  isOpen: boolean;
  confirmAction?: () => void;
}

interface FoodReadyAlert {
  isOpen: boolean;
  order?: DeliveryOrder;
}

@Component({
  selector: 'app-delivery-partner',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, VoiceButtonComponent],
  templateUrl: './delivery-partner.component.html',
  styleUrl: './delivery-partner.component.css'
})
export class DeliveryPartnerComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  private destroy$ = new Subject<void>();
  private locationWatchId: number | null = null;
  private map: any;
  private partnerMarker: any;
  private deliveryMarker: any;
  private directionsService: any;
  private directionsRenderer: any;
  private voiceCommandListener: any;

  // Component State
  partnerId: string | null = null;
  isOnline: boolean = false;
  isAvailable: boolean = true;
  profileComplete: boolean = false;  // NEW: Track if rider completed profile

  // Current Location
  currentLocation = { latitude: 0, longitude: 0 };
  currentAddress: string = '';

  // Delivery Information (collected after signup)
  deliveryInfo = {
    vehicleType: '',
    vehicleNumber: '',
    licenseNumber: '',
    aadharNumber: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankHolderName: ''
  };

  // Orders
  pendingOrder: DeliveryOrder | null = null;
  orderHistory: DeliveryOrder[] = [];
  availableOrders: DeliveryOrder[] = [];
  showOrderDetails = false;
  showAvailableOrdersList = false;
  orderClaimed: boolean = false;
  orderPickedUp: boolean = false;
  claimTimeRemaining: number = 0;
  claimTimeString: string = '';
  claimTimer: any = null;

  // Food Ready Alert
  foodReadyAlert: FoodReadyAlert = {
    isOpen: false
  };
  selectedOrderForClaim: DeliveryOrder | null = null;

  // Earnings
  totalEarnings: number = 0;
  totalDeliveries: number = 0;
  averageRating: number = 5;
  walletBalance: number = 0;

  // UI State
  activeTab: 'dashboard' | 'orders' | 'earnings' | 'profile' | 'complete-profile' = 'dashboard';
  modal: ModalDialog = {
    type: 'info',
    title: '',
    message: '',
    isOpen: false
  };
  loading: boolean = false;

  constructor(
    private deliveryService: DeliveryPartnerService,
    private router: Router,
    public http: HttpClient,
    private cdr: ChangeDetectorRef,
    private voiceNavService: VoiceNavigationService
  ) { }

  ngOnInit() {
    this.partnerId = localStorage.getItem('userId');
    if (!this.partnerId) {
      this.router.navigate(['/login']);
      return;
    }

    // Initialize service
    this.loadProfile();
    this.initializeMap();
    this.startLocationTracking();

    // Setup voice command listener
    this.setupVoiceCommandListener();
  }

  ngOnDestroy() {
    this.stopLocationTracking();
    this.deliveryService.disconnectSocket();
    if (this.claimTimer) {
      clearInterval(this.claimTimer);
    }
    // Remove voice command listener
    if (this.voiceCommandListener) {
      window.removeEventListener('voiceDeliveryCommand', this.voiceCommandListener);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ======================== VOICE NAVIGATION ========================

  setupVoiceCommandListener() {
    this.voiceCommandListener = (event: any) => {
      const action = event.detail?.action;
      console.log('🎤 Voice command received:', action);

      switch (action) {
        case 'openMap':
          if (this.pendingOrder) {
            if (this.orderPickedUp) {
              this.openCustomerMap();
            } else {
              this.openVendorMap();
            }
          } else {
            this.showModal('info', 'No Active Order', 'You need an active order to open the map');
          }
          break;

        case 'goOnline':
          if (!this.isOnline) {
            this.toggleOnlineStatus();
          } else {
            this.showModal('info', 'Already Online', 'You are already online');
          }
          break;

        case 'goOffline':
          if (this.isOnline) {
            this.toggleOnlineStatus();
          } else {
            this.showModal('info', 'Already Offline', 'You are already offline');
          }
          break;

        case 'showDashboard':
          this.setActiveTab('dashboard');
          break;

        case 'showOrders':
          this.setActiveTab('orders');
          break;

        case 'showEarnings':
          this.setActiveTab('earnings');
          break;

        case 'showProfile':
          if (this.profileComplete) {
            this.setActiveTab('profile');
          } else {
            this.setActiveTab('complete-profile');
          }
          break;

        case 'acceptOrder':
          if (this.selectedOrderForClaim) {
            this.claimOrderForPickup();
          } else if (this.pendingOrder && !this.orderClaimed) {
            this.acceptOrder();
          } else {
            this.showModal('info', 'No Order', 'No order available to accept');
          }
          break;

        case 'markPickedUp':
          if (this.pendingOrder && this.orderClaimed && !this.orderPickedUp) {
            this.markOrderPickedUp();
          } else {
            this.showModal('info', 'Cannot Mark Picked Up', 'Order is not ready to be marked as picked up');
          }
          break;

        case 'deliverOrder':
          if (this.pendingOrder && this.orderPickedUp) {
            this.deliverOrder();
          } else {
            this.showModal('info', 'Cannot Deliver', 'Order must be picked up first');
          }
          break;

        case 'showAvailableOrders':
          if (this.isOnline && !this.orderClaimed) {
            this.loadAvailableOrders();
          } else if (!this.isOnline) {
            this.showModal('info', 'Go Online First', 'You need to be online to view available orders');
          } else {
            this.showModal('info', 'Order In Progress', 'Complete your current order first');
          }
          break;

        default:
          console.log('Unknown voice command:', action);
      }
    };

    window.addEventListener('voiceDeliveryCommand', this.voiceCommandListener);
    console.log('✓ Voice command listener setup complete');
  }

  // ======================== INITIALIZATION ========================

  loadProfile() {
    if (!this.partnerId) return;

    this.deliveryService.getDeliveryPartnerProfile(this.partnerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile: any) => {
          this.isOnline = profile.isOnline;
          this.isAvailable = profile.isAvailable;
          this.profileComplete = profile.profileComplete || false;
          this.currentLocation = profile.currentLocation || { latitude: 0, longitude: 0 };

          // Load delivery info if available
          if (profile.vehicleType) {
            this.deliveryInfo = {
              vehicleType: profile.vehicleType || '',
              vehicleNumber: profile.vehicleNumber || '',
              licenseNumber: profile.licenseNumber || '',
              aadharNumber: profile.aadharNumber || '',
              bankAccountNumber: profile.bankAccountNumber || '',
              bankIfsc: profile.bankIfsc || '',
              bankHolderName: profile.bankHolderName || ''
            };
          }

          // If profile not complete, redirect to profile completion
          if (!this.profileComplete) {
            this.activeTab = 'complete-profile';
            this.showModal('info', 'Complete Your Profile',
              'Please complete your delivery information to start accepting orders.');
          } else {
            this.loadEarnings();
            this.loadPendingOrder();
            this.loadAllOrders();
          }
        },
        error: (error) => {
          console.error('Error loading profile:', error);
          this.showModal('error', 'Error', 'Failed to load profile');
        }
      });
  }

  loadEarnings() {
    if (!this.partnerId) return;

    this.deliveryService.getEarningsSummary(this.partnerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (earnings: any) => {
          this.totalEarnings = earnings.totalEarnings;
          this.totalDeliveries = earnings.totalDeliveries;
          this.averageRating = earnings.averageRating;
          this.walletBalance = earnings.walletBalance;
        }
      });
  }

  loadPendingOrder() {
    if (!this.partnerId) return;

    this.deliveryService.getPendingOrder(this.partnerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order: any) => {
          if (order && order._id) {
            this.pendingOrder = {
              _id: order._id,
              customerName: order.userId?.name || 'Unknown',
              deliveryAddress: order.userId?.address || '',
              items: order.products || [],
              total: order.vendorItemTotal || order.total,
              status: order.status,
              vendorAddress: order.products?.[0]?.vendorId?.shopAddress || 'Vendor Location'
            };
            this.orderClaimed = true;
            if (this.isOnline) {
              this.showModal('info', 'New Order', `Order #${order._id.slice(0, 8)} assigned!`);
            }
          } else {
            this.pendingOrder = null;
            this.orderClaimed = false;
          }
        },
        error: (error) => {
          this.pendingOrder = null;
          this.orderClaimed = false;
        }
      });
  }

  // Load all orders (pending and completed)
  loadAllOrders() {
    if (!this.partnerId) return;

    this.loading = true;
    this.deliveryService.getAllOrders(this.partnerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.loading = false;

          // Convert orders to DeliveryOrder format
          const allOrders = response.all || [];
          this.orderHistory = allOrders
            .filter((order: any) => order.status === 'Delivered')
            .map((order: any) => this.mapOrderToDeliveryOrder(order));

          // Update pending order if exists
          const pending = allOrders.find((order: any) =>
            order.status !== 'Delivered' && order.status !== 'Cancelled'
          );

          if (pending && !this.pendingOrder) {
            this.pendingOrder = this.mapOrderToDeliveryOrder(pending);
            this.orderClaimed = true;
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error loading orders:', error);
        }
      });
  }

  // Helper to map order to DeliveryOrder format
  mapOrderToDeliveryOrder(order: any): DeliveryOrder {
    return {
      _id: order._id,
      customerName: order.userId?.name || 'Unknown',
      deliveryAddress: this.getAddressString(order.userId?.address || ''),
      vendorAddress: order.products?.[0]?.vendorId?.shopAddress || 'Vendor Location',
      items: order.products?.map((p: any) => ({
        name: p.productId?.name || 'Product',
        quantity: p.quantity,
        price: p.productId?.price || 0
      })) || [],
      total: order.total,
      status: order.status,
      userId: order.userId,
      products: order.products,
      deliveredAt: order.deliveredAt,
      orderDate: order.orderDate,
      vendorPhone: order.products?.[0]?.vendorId?.shopContactNumber || order.products?.[0]?.vendorId?.phone,
      customerPhone: order.userId?.number
    };
  }

  // ======================== GOOGLE MAPS ========================

  initializeMap() {
    setTimeout(() => {
      try {
        if (!this.mapContainer?.nativeElement) {
          console.warn('Map container not found');
          return;
        }

        // Initialize Mapbox
        mapboxgl.accessToken = 'pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjazAwMDAwMDAwMDAwIn0.test';

        const lat = this.currentLocation.latitude || 28.7041;
        const lng = this.currentLocation.longitude || 77.1025;

        try {
          this.map = new mapboxgl.Map({
            container: this.mapContainer.nativeElement,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [lng, lat],
            zoom: 15
          });

          console.log('Mapbox map initialized');

          // Wait for map to be ready before adding marker
          this.map.on('load', () => {
            this.addPartnerMarker();
          });

          // Handle map errors gracefully
          this.map.on('error', (err: any) => {
            console.warn('Mapbox error:', err);
          });
        } catch (mapError) {
          console.warn('Mapbox map creation failed:', mapError);
          // Show location as fallback
          if (this.mapContainer?.nativeElement) {
            this.mapContainer.nativeElement.innerHTML = `
              <div style="padding: 20px; background: #f0f0f0; color: #333; text-align: center; border-radius: 8px;">
                <p>📍 Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                <p style="font-size: 12px; color: #666;">Map loading...</p>
              </div>
            `;
          }
        }

      } catch (error) {
        console.warn('Mapbox initialization failed:', error);
      }
    }, 500);
  }

  addPartnerMarker() {
    if (!this.map) return;

    try {
      // Remove existing marker if any
      const existingMarker = document.querySelector('.mapboxgl-marker');
      if (existingMarker) {
        existingMarker.remove();
      }

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2732%27 height=%2732%27 viewBox=%270 0 32 32%27%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%2716%27 fill=%27%23667eea%27/%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%2712%27 fill=%27white%27/%3E%3C/svg%3E")';
      el.style.backgroundSize = '100%';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';

      new mapboxgl.Marker(el)
        .setLngLat([this.currentLocation.longitude, this.currentLocation.latitude])
        .addTo(this.map);

      console.log('Marker added to map');
    } catch (error) {
      console.warn('Error adding marker:', error);
    }
  }

  addDeliveryLocationMarker(lat: number, lng: number) {
    if (!this.map) return;
    // Mapbox marker will be added here for delivery location
  }

  setupMapListeners() {
    // Map listeners can be added here
  }

  // ======================== LOCATION TRACKING ========================

  startLocationTracking() {
    if (!navigator.geolocation) {
      this.showModal('error', 'Error', 'Geolocation not supported');
      return;
    }

    // Start watching position
    this.locationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        // Update map with Mapbox
        if (this.map) {
          this.addPartnerMarker(); // Update marker position
        }

        // If online and has order, send location to server
        if (this.isOnline && this.pendingOrder) {
          this.updateLocationOnServer();
          this.sendLocationSocketUpdate();
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  }

  stopLocationTracking() {
    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
    }
  }

  updateLocationOnServer() {
    if (!this.partnerId) return;

    this.deliveryService.updateLocation(
      this.partnerId,
      this.currentLocation.latitude,
      this.currentLocation.longitude
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Location updated
        },
        error: (error) => {
          console.error('Error updating location:', error);
        }
      });
  }

  sendLocationSocketUpdate() {
    if (!this.partnerId || !this.pendingOrder) return;

    this.deliveryService.updateLocationSocket(
      this.partnerId,
      this.pendingOrder._id,
      this.currentLocation.latitude,
      this.currentLocation.longitude
    );
  }

  // ======================== PROFILE COMPLETION ========================

  saveDeliveryInformation() {
    if (!this.partnerId) return;

    // Validate all fields are filled
    if (!this.deliveryInfo.vehicleType || !this.deliveryInfo.vehicleNumber ||
      !this.deliveryInfo.licenseNumber || !this.deliveryInfo.aadharNumber ||
      !this.deliveryInfo.bankAccountNumber || !this.deliveryInfo.bankIfsc ||
      !this.deliveryInfo.bankHolderName) {
      this.showModal('warning', 'Incomplete', 'Please fill all delivery information fields');
      return;
    }

    // Validate Aadhar format (12 digits)
    if (!/^\d{12}$/.test(this.deliveryInfo.aadharNumber)) {
      this.showModal('error', 'Invalid Aadhar', 'Aadhar must be 12 digits');
      return;
    }

    // Validate IFSC format (11 characters)
    if (this.deliveryInfo.bankIfsc.length !== 11) {
      this.showModal('error', 'Invalid IFSC', 'IFSC code must be 11 characters');
      return;
    }

    this.loading = true;
    this.deliveryService.updateDeliveryInformation(this.partnerId, this.deliveryInfo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          this.profileComplete = true;
          this.showModal('success', 'Profile Complete',
            'Your delivery information has been saved successfully!');

          // Switch to dashboard
          setTimeout(() => {
            this.activeTab = 'dashboard';
            this.loadEarnings();
            this.loadPendingOrder();
          }, 1500);
        },
        error: (error) => {
          this.loading = false;
          console.error('Profile save error:', error);
          const message = error.error?.message || error.message || 'Failed to save delivery information. Please try again.';
          this.showModal('error', 'Error', message);
        }
      });
  }

  // ======================== STATUS MANAGEMENT ========================

  toggleOnlineStatus() {
    if (!this.partnerId) return;

    // Check if profile is complete
    if (!this.profileComplete) {
      this.showModal('warning', 'Complete Profile First',
        'Please complete your delivery information before going online');
      this.activeTab = 'complete-profile';
      return;
    }

    this.loading = true;
    this.deliveryService.toggleOnlineStatus(this.partnerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.isOnline = response.partner.isOnline;
          this.loading = false;

          if (this.isOnline) {
            // Go online
            const socket = this.deliveryService.initializeSocket(this.partnerId!);
            this.deliveryService.goOnline(
              this.partnerId!,
              this.currentLocation.latitude,
              this.currentLocation.longitude
            );

            // Register socket listeners
            this.deliveryService.onFoodReady((data: any) => {
              console.log('🔔 Food ready alert received via socket:', data);
              const incomingOrder = data?.order || data;
              const mapped = this.mapOrderToDeliveryOrder(incomingOrder);

              // Show the claim modal and start timer
              this.showFoodReadyAlert(mapped);

              // Acknowledge to server that rider saw the alert
              if (this.partnerId && incomingOrder?._id) {
                this.deliveryService.acknowledgeFoodReady(this.partnerId, incomingOrder._id);
              }
            });

            this.showModal('success', 'Online', 'You are now online!');
          } else {
            // Go offline
            this.deliveryService.disconnectSocket();
            this.showModal('success', 'Offline', 'You are now offline');
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Toggle online status error:', error);
          const errMsg = error && error.error && error.error.message ? error.error.message : (error.message || 'Failed to toggle status');
          this.showModal('error', 'Error', errMsg);
        }
      });
  }

  // ======================== ORDER MANAGEMENT ========================

  acceptOrder() {
    if (!this.partnerId || !this.pendingOrder) return;

    this.loading = true;
    this.deliveryService.acceptOrder(this.partnerId, this.pendingOrder._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.showModal('success', 'Order Accepted', 'You accepted the order');
          this.deliveryService.acceptOrderSocket(this.partnerId!, this.pendingOrder!._id);

          // Show route
          // Extract address coordinates (in real app, use geocoding)
          this.showModal('info', 'Navigate', 'Navigate to customer location');
        },
        error: (error) => {
          this.loading = false;
          this.showModal('error', 'Error', error.error?.message || 'Failed to accept order');
        }
      });
  }

  // Load available orders ready for pickup
  loadAvailableOrders() {
    this.loading = true;
    this.deliveryService.getAvailableOrders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          // Backend may return either an array of orders or an object { orders: [...] }
          const rawOrders = Array.isArray(response) ? response : (response.orders || response.data || []);
          this.availableOrders = (rawOrders || []).map((o: any) => this.mapOrderToDeliveryOrder(o));
          console.log('📦 Available orders loaded:', this.availableOrders.length);
          this.loading = false;
          this.showAvailableOrdersList = true;

          if (this.availableOrders.length === 0) {
            this.showModal('info', 'No Orders', 'No orders ready for pickup at the moment.');
          }
        },
        error: (error) => {
          console.error('❌ Error loading available orders:', error);
          this.loading = false;
          this.showModal('error', 'Error', 'Failed to load available orders');
        }
      });
  }

  // Show food ready alert modal with order details (before claiming)
  openOrderForClaiming(order: any) {
    // Ensure we have a DeliveryOrder shaped object (map raw order if needed)
    const mapped = this.mapOrderToDeliveryOrder(order);

    this.selectedOrderForClaim = mapped;
    this.foodReadyAlert.order = mapped;
    this.foodReadyAlert.isOpen = true;

    // Start 30-second timer for claiming
    this.claimTimeRemaining = 30;
    this.claimTimeString = `${this.claimTimeRemaining}s`;
    this.cdr.detectChanges(); // Trigger initial display of timer

    if (this.claimTimer) {
      clearInterval(this.claimTimer);
    }

    this.claimTimer = setInterval(() => {
      this.claimTimeRemaining--;
      // Update human-friendly string and force change detection
      this.claimTimeString = this.claimTimeRemaining > 0 ? `${this.claimTimeRemaining}s` : '0s';
      this.cdr.detectChanges(); // Force change detection for timer

      if (this.claimTimeRemaining <= 0) {
        clearInterval(this.claimTimer);
        this.closeFoodReadyAlert();
        this.selectedOrderForClaim = null;
        this.showAvailableOrdersList = false;
        this.showModal('warning', 'Time Expired', 'You did not claim the order in time. The order is now available to other riders.');
      }
    }, 1000);
  }

  // Claim order for pickup (called from modal button)
  claimOrderForPickup(order?: DeliveryOrder) {
    const orderToClaim = order || this.selectedOrderForClaim;

    if (!orderToClaim) {
      this.showModal('error', 'Error', 'No order selected');
      return;
    }

    if (!this.partnerId) {
      this.showModal('error', 'Error', 'Partner ID not found');
      return;
    }

    const vendorId = orderToClaim.products?.[0]?.vendorId?._id || orderToClaim.products?.[0]?.vendorId;

    this.loading = true;
    this.deliveryService.claimOrder(orderToClaim._id, this.partnerId, vendorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          console.log('✓ Order claimed:', response);

          // Set addresses from response (vendor & user) if available
          const vendorAddressFromResp = response?.vendorLocation?.address;
          const userAddressFromResp = response?.userLocation?.address;

          this.pendingOrder = {
            _id: orderToClaim._id,
            customerName: orderToClaim.customerName,
            deliveryAddress: userAddressFromResp || orderToClaim.deliveryAddress,
            vendorAddress: vendorAddressFromResp || (orderToClaim.products?.[0]?.vendorId?.shopAddress || 'Vendor Location'),
            items: orderToClaim.items || [],
            total: orderToClaim.total,
            status: 'Out for Delivery',
            vendorPhone: response?.vendorLocation?.phone,
            customerPhone: response?.userLocation?.phone
          } as any;

          // Reset pickup state - now at vendor
          this.orderClaimed = true;
          this.orderPickedUp = false;

          this.showAvailableOrdersList = false;
          this.closeFoodReadyAlert();

          this.showModal('success', 'Order Claimed!', 'You have claimed this order. Navigate to the vendor to pick it up!');

          // Load order locations on map (will set coordinates if available)
          this.loadOrderLocations(orderToClaim._id);
        },
        error: (error) => {
          this.loading = false;
          console.error('❌ Error claiming order:', error);
          this.showModal('error', 'Error', 'Failed to claim order. It may have been claimed by another rider.');
        }
      });
  }

  // Load order locations
  loadOrderLocations(orderId: string) {
    this.deliveryService.http.get(`http://localhost:3000/api/order/${orderId}/locations`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('📍 Order locations loaded:', response);

          // Prefer vendor/user addresses returned by backend
          if (response?.vendor?.address || response?.user?.address) {
            if (this.pendingOrder) {
              this.pendingOrder.vendorAddress = response.vendor?.address || this.pendingOrder.vendorAddress;
              this.pendingOrder.deliveryAddress = response.user?.address || this.pendingOrder.deliveryAddress;
              this.pendingOrder.vendorPhone = response.vendor?.phone || this.pendingOrder.vendorPhone;
              this.pendingOrder.customerPhone = response.user?.phone || this.pendingOrder.customerPhone;
            }
          }

          // If backend returns coordinates, set them on pendingOrder for map navigation
          if (this.pendingOrder && response?.vendor?.location?.coordinates) {
            // Coordinates placeholder may be a string; parse if needed
            this.pendingOrder.vendorLocation = response.vendor.location.coordinates;
          }

          if (this.pendingOrder && response?.user?.location?.coordinates) {
            this.pendingOrder.customerLocation = response.user.location.coordinates;
          }

          // Trigger map update if we have coordinates
          if (this.pendingOrder?.vendorLocation) {
            this.updateMapToVendorLocation();
          }
        },
        error: (error) => {
          console.error('❌ Error loading locations:', error);
        }
      });
  }

  rejectOrder() {
    if (!this.partnerId || !this.pendingOrder) return;

    const confirm = () => {
      this.loading = true;
      this.deliveryService.rejectOrder(this.partnerId!, this.pendingOrder!._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loading = false;
            this.pendingOrder = null;
            this.showModal('success', 'Order Rejected', 'Order rejected successfully');
            this.loadPendingOrder(); // Load next order
          },
          error: (error) => {
            this.loading = false;
            this.showModal('error', 'Error', 'Failed to reject order');
          }
        });
    };

    this.showModal('confirm', 'Reject Order', 'Are you sure you want to reject this order?', confirm);
  }

  deliverOrder() {
    if (!this.partnerId || !this.pendingOrder) return;

    const confirm = () => {
      this.loading = true;
      this.deliveryService.markOrderDelivered(this.partnerId!, this.pendingOrder!._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.loading = false;
            this.totalEarnings += response.earnedAmount;
            this.walletBalance += response.earnedAmount;
            this.totalDeliveries += 1;

            this.pendingOrder = null;
            this.orderClaimed = false;
            this.orderPickedUp = false;
            this.foodReadyAlert.isOpen = false;

            this.showModal('success', 'Delivered',
              `Order delivered! Earned ₹${response.earnedAmount}`);
            this.loadPendingOrder();
            this.loadAllOrders();
            this.loadEarnings();
          },
          error: (error) => {
            this.loading = false;
            this.showModal('error', 'Error', 'Failed to deliver order');
          }
        });
    };

    this.showModal('confirm', 'Mark Delivered', 'Confirm delivery?', confirm);
  }

  // Mark order as picked up from vendor
  markOrderPickedUp() {
    if (!this.pendingOrder) return;

    this.orderPickedUp = true;
    this.pendingOrder.status = 'Picked Up';

    // Change map location to delivery address
    this.updateMapToDeliveryLocation();

    this.showModal('success', 'Order Picked Up', 'You have picked up the order. Navigate to the customer to deliver it!');
  }

  // Show food ready alert modal (start claim timer and open for claiming)
  showFoodReadyAlert(order: DeliveryOrder) {
    // Reuse the claim modal opener so timer and selection are initialized
    this.openOrderForClaiming(order);
  }

  // Close food ready alert modal
  closeFoodReadyAlert() {
    if (this.claimTimer) {
      clearInterval(this.claimTimer);
    }
    this.foodReadyAlert.isOpen = false;
    this.claimTimeString = '';
  }

  // Update map to delivery location
  updateMapToDeliveryLocation() {
    // This will change the map focus to delivery address
    // In production, use actual coordinates from delivery address
    const lat = (this.pendingOrder && this.pendingOrder.customerLocation?.latitude) || 28.6139; // Example fallback
    const lng = (this.pendingOrder && this.pendingOrder.customerLocation?.longitude) || 77.2090;

    if (this.map) {
      this.map.flyTo({
        center: [lng, lat],
        zoom: 15,
        essential: true
      });
    }
  }

  // Update map to vendor location (focus on vendor pickup point)
  updateMapToVendorLocation() {
    if (!this.pendingOrder) return;

    const lat = this.pendingOrder.vendorLocation?.latitude;
    const lng = this.pendingOrder.vendorLocation?.longitude;

    if (lat && lng && this.map) {
      this.map.flyTo({
        center: [lng, lat],
        zoom: 15,
        essential: true
      });
      return;
    }

    // Fallback: open Google Maps directions to vendor address
    this.openVendorMap();
  }

  // ======================== MAP & NAVIGATION ========================

  openVendorMap(order?: any) {
    // allow opening vendor map for a provided order (e.g., claim modal)
    const useOrder = order || this.pendingOrder;
    if (!useOrder) return;

    // Get destination based on whether order is picked up
    const destination = this.orderPickedUp
      ? (useOrder.deliveryAddress || 'Delivery Address')
      : (useOrder.vendorAddress || 'Restaurant Location');

    // Get current coordinates from map center or use stored location
    const origin = `${this.currentLocation.latitude},${this.currentLocation.longitude}`;

    // Open Google Maps with directions
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;

    window.open(mapsUrl, '_blank');
  }

  // Helper: Format address object to string
  private formatAddressObject(addr: any): string {
    if (!addr) return '';
    const parts = [addr.street, addr.city, addr.state, addr.postalCode, addr.country]
      .filter(part => part && String(part).trim());
    return parts.join(', ');
  }

  // Helper: Open Google Maps with destination
  private openGoogleMaps(destination: string) {
    const origin = `${this.currentLocation.latitude},${this.currentLocation.longitude}`;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    window.open(mapsUrl, '_blank');
  }

  openCustomerMap(order?: any) {
    const useOrder = order || this.pendingOrder;
    if (!useOrder) return;

    this.deliveryService.http.get(`http://localhost:3000/api/order/${useOrder._id}/locations`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          let destination = useOrder.deliveryAddress || 'Delivery Address';

          if (response?.user?.address) {
            const formatted = this.formatAddressObject(response.user.address);
            destination = formatted || useOrder.deliveryAddress || 'Delivery Address';
          }

          if (this.pendingOrder) {
            this.pendingOrder.deliveryAddress = destination;
            if (response?.user?.phone) {
              this.pendingOrder.customerPhone = response.user.phone;
            }
          }

          this.openGoogleMaps(destination);
        },
        error: (error) => {
          console.error('Error fetching customer address:', error);
          this.openGoogleMaps(useOrder.deliveryAddress || 'Delivery Address');
        }
      });
  }
  // ======================== UI HELPERS ========================

  setActiveTab(tab: 'dashboard' | 'orders' | 'earnings' | 'profile' | 'complete-profile') {
    this.activeTab = tab;
    if (tab === 'orders' && this.profileComplete) {
      this.loadAllOrders();
    }
  }

  showModal(type: any, title: string, message: string, action?: () => void) {
    this.modal = {
      type,
      title,
      message,
      isOpen: true,
      confirmAction: action
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

  viewOrderDetails() {
    this.showOrderDetails = true;
  }

  closeOrderDetails() {
    this.showOrderDetails = false;
  }

  logout() {
    localStorage.removeItem('userId');
    this.router.navigate(['/login']);
  }

  viewProfile() {
    this.router.navigate(['/profile-view']);
  }

  // Helper method to get address from order
  getAddressString(address: any): string {
    if (!address) return '';
    if (typeof address === 'string') {
      return address;
    }
    if (typeof address === 'object') {
      return address.street || address.city || JSON.stringify(address);
    }
    return '';
  }
}
