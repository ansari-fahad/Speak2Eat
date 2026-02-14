import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
    text: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private toastSubject = new BehaviorSubject<ToastMessage | null>(null);
    toast$ = this.toastSubject.asObservable();

    show(text: string, type: 'success' | 'error' | 'info' = 'success', duration: number = 3000) {
        this.toastSubject.next({ text, type, duration });
        setTimeout(() => {
            this.toastSubject.next(null);
        }, duration);
    }
}
