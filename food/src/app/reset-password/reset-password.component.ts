
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {

    resetForm: FormGroup;
    isSessionValid = false;
    isCheckingSession = true;
    isSubmitting = false;

    constructor(private fb: FormBuilder, private http: HttpClient, private router: Router) {
        // Validating password confirm
        this.resetForm = this.fb.group({
            newPassword: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required]
        }, { validators: this.passwordMatchValidator });
    }

    ngOnInit() {
        this.checkSession();
    }

    checkSession() {
        this.http.get('https://speak2-eatbackend.vercel.app/api/auth/validate-reset-session', {
            withCredentials: true
        }).subscribe({
            next: (res: any) => {
                this.isSessionValid = true;
                this.isCheckingSession = false;
            },
            error: (err) => {
                this.isSessionValid = false;
                this.isCheckingSession = false;
            }
        });
    }

    passwordMatchValidator(g: FormGroup) {
        return g.get('newPassword')?.value === g.get('confirmPassword')?.value
            ? null : { mismatch: true };
    }

    onSubmit() {
        if (this.resetForm.invalid) {
            this.resetForm.markAllAsTouched();
            return;
        }

        if (this.isSubmitting) return;

        this.isSubmitting = true;
        const newPassword = this.resetForm.value.newPassword;

        // We rely on the session cookie to identify the user
        this.http.post('https://speak2-eatbackend.vercel.app/api/auth/reset-password', { newPassword }, {
            withCredentials: true // IMPORTANT: Send cookies
        }).subscribe({
            next: (res: any) => {
                this.isSubmitting = false;
                Swal.fire({
                    icon: 'success',
                    title: 'Password Reset Successful',
                    text: 'You can now log in with your new password.',
                    confirmButtonColor: '#1E272E'
                }).then(() => {
                    this.router.navigate(['/login']);
                });
            },
            error: (err) => {
                this.isSubmitting = false;
                const message =
                    err?.error?.message ||
                    'Session expired or invalid request. Please try the forgot password process again.';
                Swal.fire({
                    icon: 'error',
                    title: 'Reset Failed',
                    text: message,
                    confirmButtonColor: '#FF6B6B'
                });
            }
        });
    }
}
