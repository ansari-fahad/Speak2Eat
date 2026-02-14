import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Product {
  _id?: string;
  vendor_id: any;
  category_id: string[];
  name: string;
  description: string;
  price: number;
  stock: number;
  image: string;
  ingredients: string[];
  createdAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = '/api/products';

  constructor(private http: HttpClient) { }

  // Create product with image
  createProduct(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/add-products`, formData);
  }

  // Get all products
  getAllProducts(): Observable<Product[]> {
    return this.http.get<any>(`${this.apiUrl}/all`).pipe(
      // Extract the 'data' array from the response object
      map((response: any) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response?.data || response?.products || [];
      })
    );
  }

  // Get products by vendor
  getProductsByVendor(vendorId: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/vendor/${vendorId}`);
  }

  // Get products by category
  getProductsByCategory(categoryId: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/category/${categoryId}`);
  }

  // Get single product
  getProductById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }
  // Delete product by ID
  deleteProduct(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
  // Update product by ID
  updateProduct(id: string, formData: FormData): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, formData);
  }
}

