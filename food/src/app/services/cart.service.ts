import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class CartService {
    private apiUrl = 'https://speak2-eatbackend.vercel.app/api/cart';

    constructor(
        private http: HttpClient,
        @Inject(PLATFORM_ID) private platformId: Object
    ) { }

    private getUserId(): string | null {
        if (isPlatformBrowser(this.platformId)) {
            return localStorage.getItem('userId');
        }
        return null;
    }

    addToCart(productId: string, vendorId: string, quantity: number = 1, replaceCart: boolean = false): Observable<any> {
        const userId = this.getUserId();
        if (!userId) {
            throw new Error('User not logged in');
        }
        return this.http.post(`${this.apiUrl}/create`, { userId, productId, vendorId, quantity, replaceCart });
    }

    getCart(): Observable<any> {
        const userId = this.getUserId();
        if (!userId) return new Observable(observer => observer.error('User not logged in'));
        return this.http.get(`${this.apiUrl}/${userId}`);
    }

    updateCart(products: any[], total: number): Observable<any> {
        const userId = this.getUserId();
        return this.http.put(`${this.apiUrl}/${userId}`, { products, total });
    }

    deleteCart(): Observable<any> {
        const userId = this.getUserId();
        return this.http.delete(`${this.apiUrl}/${userId}`);
    }
}
