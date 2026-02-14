import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../services/product.service';
import { CategoryService, Category } from '../services/category.service';
import { combineLatest } from 'rxjs';

interface Product {
  _id?: string;
  id?: number;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category?: string;
  category_id?: string[];
  rating?: number;
  reviews?: number;
  badge?: string;
  stock?: number;
  vendor_id?: string | any;
}

interface VendorCard {
  id: string;
  name: string;
  totalProducts: number;
}

@Component({
  selector: 'app-category-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './category-products.component.html',
  styleUrl: './category-products.component.css'
})
export class CategoryProductsComponent implements OnInit {
  categoryName: string = '';
  products: Product[] = [];
  filteredProducts: Product[] = [];
  vendors: VendorCard[] = [];
  selectedVendorId: string | null = null;
  sortBy: string = 'popular';
  priceRange: string = 'all';
  searchQuery: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  categories: Category[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService
  ) { }

  ngOnInit(): void {
    // Combine route params and categories loading to ensure we have categories 
    // before trying to resolve the category name from the URL
    combineLatest([
      this.route.params,
      this.categoryService.getAllCategories()
    ]).subscribe({
      next: ([params, cats]) => {
        this.categories = cats || [];

        const categoryParam = params['category'];
        if (categoryParam) {
          this.categoryName = categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1);
          this.loadProducts(categoryParam);
        } else {
          this.categoryName = 'Products';
          this.loadProducts('');
        }
      },
      error: (err) => {
        console.error('Error in initialization:', err);
        // Fallback: try to load from params even if categories failed
        const categoryParam = this.route.snapshot.params['category'];
        if (categoryParam) {
          this.categoryName = categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1);
          this.loadProducts(categoryParam);
        }
      }
    });
  }

  loadProducts(category: string): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Try to resolve category name to a real category _id first
    const categoryLower = category?.toLowerCase();
    const matchedCategory = categoryLower
      ? this.categories.find(c => c.name.toLowerCase() === categoryLower)
      : undefined;

    if (matchedCategory && matchedCategory._id) {
      // Prefer backend filtering by category ID
      this.productService.getProductsByCategory(matchedCategory._id).subscribe({
        next: (products: any[]) => {
          // If API returns products, use them; if empty, fall back to client-side filter
          if (products && products.length > 0) {
            this.finishLoad(products);
          } else {
            console.log('No products via category ID, falling back to client-side filter.');
            this.fallbackLoadAllProducts(category);
          }
        },
        error: (error) => {
          console.error('Error loading products by category ID:', error);
          this.fallbackLoadAllProducts(category);
        }
      });
    } else {
      // Fallback: filter client-side by name (for safety)
      this.fallbackLoadAllProducts(category);
    }
  }

  private finishLoad(products: any[]): void {
    this.products = products || [];
    this.vendors = this.buildVendorsFromProducts(this.products);
    this.filteredProducts = this.filterProductsByVendor(this.products);
    this.isLoading = false;
    console.log(`Loaded ${this.products.length} products, ${this.vendors.length} vendors`);
  }

  private buildVendorsFromProducts(products: Product[]): VendorCard[] {
    const vendorMap = new Map<string, VendorCard>();

    for (const p of products) {
      const v = p.vendor_id;
      const vendorId = typeof v === 'object' ? (v._id || v.id) : v;
      const vendorName = typeof v === 'object' ? (v.shopName || v.name || 'Vendor') : 'Vendor';

      if (!vendorId) continue;

      const existing = vendorMap.get(vendorId) || { id: vendorId, name: vendorName, totalProducts: 0 };
      existing.totalProducts++;
      vendorMap.set(vendorId, existing);
    }

    return Array.from(vendorMap.values());
  }

  private filterProductsByVendor(products: Product[]): Product[] {
    if (!this.selectedVendorId) return [...products];

    return products.filter(p => {
      const v = p.vendor_id;
      const vendorId = typeof v === 'object' ? (v._id || v.id) : v;
      return vendorId === this.selectedVendorId;
    });
  }

  selectVendor(vendor: VendorCard): void {
    // Toggle: click again to clear filter
    if (this.selectedVendorId === vendor.id) {
      this.selectedVendorId = null;
    } else {
      this.selectedVendorId = vendor.id;
    }
    this.filteredProducts = this.filterProductsByVendor(this.products);
    this.sortProducts();
  }

  private fallbackLoadAllProducts(category: string): void {
    const categoryLower = category ? category.toLowerCase() : '';
    const matchedCategory = this.categories.find(c => c.name.toLowerCase() === categoryLower);

    this.productService.getAllProducts().subscribe({
      next: (allProducts: any[]) => {
        if (category && category.toLowerCase()) {
          const categoryLower = category.toLowerCase();
          this.products = allProducts.filter(p => {
            // 1. Try to match by ID if we found the category
            if (matchedCategory?._id) {
              if (Array.isArray(p.category_id)) {
                // Check if any of the product's category IDs match
                if (p.category_id.some((id: any) => String(id) === String(matchedCategory._id))) {
                  return true;
                }
              } else if (p.category_id && String(p.category_id) === String(matchedCategory._id)) {
                return true;
              }
            }

            // 2. Prefer explicit category name if present (legacy/populated)
            const name = (p.category || '').toString().toLowerCase();
            if (name.includes(categoryLower)) return true;

            // 3. Otherwise, try to match any category_id object that has a name (populated)
            if (Array.isArray(p.category_id)) {
              return p.category_id.some((cat: any) => {
                if (typeof cat === 'object' && cat.name) {
                  return cat.name.toLowerCase().includes(categoryLower);
                }
                return false;
              });
            }
            return false;
          });
        } else {
          this.products = allProducts;
        }

        this.finishLoad(this.products);
        console.log(`Loaded ${this.products.length} products for category (fallback): ${category}`);
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.errorMessage = 'Unable to load products. Please try again later.';
        this.isLoading = false;
        this.products = [];
        this.filteredProducts = [];
      }
    });
  }

  applyFilters(): void {
    this.filterByPrice();
    this.sortProducts();
  }

  sortProducts(): void {
    if (this.filteredProducts.length === 0) return;

    switch (this.sortBy) {
      case 'price-low':
        this.filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        this.filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        this.filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        this.filteredProducts.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
    }
  }

  filterByPrice(): void {
    let filtered = [...this.products];

    switch (this.priceRange) {
      case '0-500':
        filtered = filtered.filter(p => p.price < 500);
        break;
      case '500-1000':
        filtered = filtered.filter(p => p.price >= 500 && p.price <= 1000);
        break;
      case '1000+':
        filtered = filtered.filter(p => p.price > 1000);
        break;
    }

    this.filteredProducts = filtered;
    if (this.searchQuery) {
      this.searchProducts();
    } else {
      this.sortProducts();
    }
  }

  searchProducts(): void {
    if (!this.searchQuery.trim()) {
      this.filteredProducts = this.filterProductsByVendor(this.products);
      this.filterByPrice();
      return;
    }

    const query = this.searchQuery.toLowerCase();
    let filtered = this.filterProductsByVendor(this.products);
    this.filteredProducts = filtered.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query)
    );
    this.sortProducts();
  }

  viewProduct(product: Product): void {
    this.router.navigate(['/product', product._id || product.id]);
  }

  // Navigate to kitchen/vendor page if vendor_id is available, otherwise go to product
  navigateToKitchen(product: Product): void {
    const vendorRaw = product.vendor_id;
    const vendorId =
      typeof vendorRaw === 'object'
        ? (vendorRaw._id || (vendorRaw as any).id)
        : vendorRaw;

    if (vendorId) {
      this.router.navigate(['/kitchen', vendorId]);
    } else {
      this.viewProduct(product);
    }
  }

  // Normalize image path from backend/uploads
  getImageUrl(imagePath: string): string {
    if (!imagePath) {
      return 'assets/placeholder-food.jpg';
    }
    if (imagePath.startsWith('http')) {
      return imagePath;
    }

    let cleanPath = imagePath.replace(/\\/g, '/');
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.substring(1);
    }
    if (cleanPath.includes('products/')) {
      cleanPath = cleanPath.replace('products/', '');
    }
    if (!cleanPath.startsWith('uploads/')) {
      cleanPath = `uploads/${cleanPath}`;
    }
    if (cleanPath.startsWith('uploads/uploads/')) {
      cleanPath = cleanPath.substring(8);
    }

    return `https://speak2-eatbackend.vercel.app/${cleanPath}`;
  }

  addToCart(product: Product, event: Event): void {
    event.stopPropagation();
    console.log('Added to cart:', product);
  }

  onSortChange(): void {
    this.applyFilters();
  }

  onPriceChange(): void {
    this.applyFilters();
  }

  onSearchChange(): void {
    this.searchProducts();
  }
}
