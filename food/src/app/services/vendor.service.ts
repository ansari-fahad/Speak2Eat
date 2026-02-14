import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Vendor {
    _id: string;
    shopName: string;
    shopDescription: string;
    shopAddress: string;
    shopContactNumber: string;
    shopidentificationNumber: string;
}

@Injectable({
    providedIn: 'root'
})
export class VendorService {
    private apiUrl = '/api/vendor';

    constructor(private http: HttpClient) { }

    getVendor(vendorId: string): Observable<Vendor> {
        return this.http.get<Vendor>(`${this.apiUrl}/${vendorId}`);
    }

    getAllVendors(): Observable<Vendor[]> {
        return this.http.get<Vendor[]>(this.apiUrl);
    }

    updateVendor(vendorId: string, vendor: Partial<Vendor>): Observable<any> {
        return this.http.put(`${this.apiUrl}/${vendorId}`, vendor);
    }

    createVendor(vendor: Partial<Vendor>): Observable<Vendor> {
        return this.http.post<Vendor>(this.apiUrl, vendor);
    }

    deleteVendor(vendorId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${vendorId}`);
    }
}

