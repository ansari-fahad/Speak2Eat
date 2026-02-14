import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ProductService, Product } from '../services/product.service';
import { VendorService, Vendor } from '../services/vendor.service';
import { CartService } from '../services/cart.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kitchen.component.html',
  styleUrls: ['./kitchen.component.css']
})
export class KitchenComponent implements OnInit {
  vendorId: string = '';
  vendor: Vendor | any = {}; // Allow flexible type if service has issues
  products: Product[] = [];
  activeTab: string = 'order'; // Default to Order Online

  // Grouped products
  categories: string[] = ['Thali', 'Meals', 'Breads', 'Rice', 'Beverages', 'Starters']; // Dynamic later?
  filteredProducts: Product[] = [];
  selectedCategory: string = 'All';

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService,
    public vendorService: VendorService, // Make public for template use
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.vendorId = params['id'];
      if (this.vendorId) {
        this.fetchVendorDetails();
        this.fetchVendorProducts();
      }
    });
  }

  fetchVendorDetails() {
    this.vendorService.getVendor(this.vendorId).subscribe({
      next: (data) => {
        this.vendor = data;
      },
      error: (err) => console.error('Error fetching vendor:', err)
    });
  }

  fetchVendorProducts() {
    this.productService.getProductsByVendor(this.vendorId).subscribe({
      next: (data) => {
        this.products = data;
        this.filteredProducts = data;
      },
      error: (err) => console.error('Error fetching products:', err)
    });
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  filterByCategory(category: string) {
    this.selectedCategory = category;
    if (category === 'All') {
      this.filteredProducts = this.products;
    } else {
      // filter by category name logic - simplistic for now as we might not have exact string match
      // In real app, check product.category_id which might be an ID or populated object
      this.filteredProducts = this.products;
    }
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

  // Helper to check login status
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  addToCart(product: Product, replaceCart: boolean = false) {
    if (!this.isLoggedIn()) {
      Swal.fire('Please Login', 'You need to be logged in to add items to cart', 'info');
      return;
    }

    const vId = typeof product.vendor_id === 'object' ? product.vendor_id._id : product.vendor_id;

    // Add to cart directly - kitchen status will be checked at checkout
    this.cartService.addToCart(product._id!, vId, 1, replaceCart).subscribe({
      next: (res) => {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Added to cart',
          showConfirmButton: false,
          timer: 1500
        });
      },
      error: (err) => {
        if (err.status === 409) { // Vendor conflict
          Swal.fire({
            title: 'Start new cart?',
            text: "Your cart contains items from another restaurant. clear it and add this item?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff4e50',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'Yes, start new cart!'
          }).then((result) => {
            if (result.isConfirmed) {
              this.addToCart(product, true);
            }
          });
        } else {
          Swal.fire('Error', 'Could not add to cart', 'error');
        }
      }
    });
  }
}

