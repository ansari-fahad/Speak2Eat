import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Product, ALL_PRODUCTS } from '../shared/products.data';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css'
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  quantity: number = 1;
  selectedSize: string = 'Regular';
  sizes: string[] = ['Small', 'Regular', 'Large'];
  relatedProducts: Product[] = [];

  // Use shared products data
  private allProducts: Product[] = ALL_PRODUCTS;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const productId = +params['id'];
      this.loadProduct(productId);
    });
  }

  loadProduct(id: number) {
    this.product = this.allProducts.find(p => p.id === id) || null;
    if (this.product) {
      this.loadRelatedProducts();
    }
  }

  loadRelatedProducts() {
    if (!this.product) return;

    this.relatedProducts = this.allProducts
      .filter(p => p.category === this.product!.category && p.id !== this.product!.id)
      .slice(0, 4);
  }

  increaseQuantity() {
    this.quantity++;
  }

  decreaseQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  selectSize(size: string) {
    this.selectedSize = size;
  }

  addToCart() {
    console.log('Added to cart:', {
      product: this.product,
      quantity: this.quantity,
      size: this.selectedSize
    });
    // Add cart logic here
  }

  viewProduct(product: Product) {
    this.router.navigate(['/product', product.id]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goBack() {
    window.history.back();
  }

  getRatingStars(): string[] {
    if (!this.product) return [];
    const rating = this.product.rating;
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars: string[] = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push('full');
    }
    if (hasHalfStar) {
      stars.push('half');
    }
    while (stars.length < 5) {
      stars.push('empty');
    }

    return stars;
  }
}
