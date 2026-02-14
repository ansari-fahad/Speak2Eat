import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { CartService } from '../services/cart.service';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-cart',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './cart.component.html',
    styleUrls: ['./cart.component.css']
})
export class CartComponent implements OnInit {
    cart: any = null;
    loading: boolean = true;
    totalPrice: number = 0;

    constructor(private cartService: CartService, private router: Router) { }

    ngOnInit(): void {
        this.loadCart();
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('name');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
        localStorage.removeItem('lastActivity');
        this.router.navigate(['/']);
    }

    loadCart() {
        this.loading = true;
        this.cartService.getCart().subscribe({
            next: (data) => {
                this.cart = data;
                this.calculateTotal();
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading cart:', err);
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
        if (cleanPath.startsWith('uploads/uploads/')) cleanPath = cleanPath.substring(8);

        return `http://localhost:3000/${cleanPath}`;
    }

    calculateTotal() {
        if (!this.cart || !this.cart.products) {
            this.totalPrice = 0;
            return;
        }
        this.totalPrice = this.cart.products.reduce((acc: number, item: any) => {
            // Handle populated product vs unpopulated
            const price = item.productId && item.productId.price ? item.productId.price : 0;
            return acc + (price * item.quantity);
        }, 0);
    }

    updateQuantity(item: any, change: number) {
        const newQuantity = item.quantity + change;
        if (newQuantity < 1) return;

        item.quantity = newQuantity;
        this.saveCartChanges();
    }

    removeItem(index: number) {
        Swal.fire({
            title: 'Are you sure?',
            text: "Do you want to remove this item from your cart?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff4e50',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'Yes, remove it!'
        }).then((result) => {
            if (result.isConfirmed) {
                this.cart.products.splice(index, 1);
                this.saveCartChanges();
                Swal.fire(
                    'Removed!',
                    'Item has been removed.',
                    'success'
                );
            }
        });
    }

    saveCartChanges() {
        this.calculateTotal();

        // Prepare payload: map populated products back to IDs for the backend
        const productsPayload = this.cart.products.map((item: any) => ({
            productId: item.productId._id || item.productId, // Handle populated object or ID
            vendorId: item.vendorId._id || item.vendorId,
            quantity: item.quantity
        }));

        this.cartService.updateCart(productsPayload, this.totalPrice).subscribe({
            next: (updatedCart) => {
                console.log('Cart updated', updatedCart);
                // Optionally refresh or just rely on local state since backend confirms save
            },
            error: (err) => {
                console.error('Error updating cart:', err);
                Swal.fire('Error', 'Failed to update cart', 'error');
            }
        });
    }

    checkout() {
        this.router.navigate(['/checkout']);
    }
}
