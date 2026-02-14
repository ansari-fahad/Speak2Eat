
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {

    forgotForm: FormGroup;

    constructor(private fb: FormBuilder, private http: HttpClient, private router: Router) {
        this.forgotForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]]
        });
    }

    onSubmit() {
        if (this.forgotForm.invalid) {
            this.forgotForm.markAllAsTouched();
            return;
        }

        const email = this.forgotForm.value.email;

        // Replace with your backend URL
        this.http.post('https://speak2-eatbackend.vercel.app/api/auth/forgot-password', { email }, { withCredentials: true }).subscribe({
            next: (res: any) => {
                // Save the email in local storage as requested
                localStorage.setItem('resetEmail', email);

                Swal.fire({
                    icon: 'success',
                    title: 'Email Sent',
                    text: res.message || 'If the email exists, a reset link has been sent.'
                }).then(() => {
                    this.router.navigate(['/login']);
                });
            },
            error: (err) => {
                const message =
                    err?.error?.message ||
                    err?.error?.error ||
                    'Server error. Please try again later.';
                Swal.fire({
                    icon: 'error',
                    title: 'Request Failed',
                    text: message
                });
            }
        });
    }
}
