import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Category {
    _id?: string;
    name: string;
    image: string;
    icon: string;
    itemCount: string;
    realCount?: number;
}

@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    private apiUrl = 'https://speak2-eatbackend.vercel.app/api/category';

    constructor(private http: HttpClient) { }

    getAllCategories(): Observable<Category[]> {
        return this.http.get<Category[]>(`${this.apiUrl}/`);
    }
}
