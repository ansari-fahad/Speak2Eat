import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = 'http://localhost:3000/api/admin';

    constructor(private http: HttpClient) { }

    getDashboardStats(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/dashboard-stats`);
    }

    getUsers(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/users`);
    }

    getVendors(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/vendors`);
    }

    getProducts(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/products`);
    }

    // User CRUD
    createUser(data: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/users`, data);
    }
    updateUser(id: string, data: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/users/${id}`, data);
    }
    deleteUser(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/users/${id}`);
    }

    // Vendor CRUD
    createVendor(data: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/vendors`, data);
    }
    updateVendor(id: string, data: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/vendors/${id}`, data);
    }
    deleteVendor(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/vendors/${id}`);
    }

    // Rider CRUD
    getRiders(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/riders`);
    }
    createRider(data: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/riders`, data);
    }
    updateRider(id: string, data: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/riders/${id}`, data);
    }
    deleteRider(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/riders/${id}`);
    }

    // Product CRUD
    createProduct(data: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/products`, data);
    }
    updateProduct(id: string, data: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/products/${id}`, data);
    }
    deleteProduct(id: string): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/products/${id}`);
    }
}
