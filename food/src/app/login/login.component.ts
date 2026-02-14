import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  loginForm: FormGroup;
  isVendor: boolean = false;

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  toggleUserType() {
    this.isVendor = !this.isVendor;
  }

  login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const loginData = this.loginForm.value;

    // Replace with your backend URL
    this.http.post('/api/auth/login', loginData).subscribe({
      next: (res: any) => {
        console.log('Login successful', res);
        const name = res.user;
        console.log('User name:', name);
        localStorage.setItem('token', res.token);
        localStorage.setItem('name', name);
        localStorage.setItem('role', res.role);
        if (res.userId) {
          localStorage.setItem('userId', res.userId);
        }

        // Initialize session timer
        localStorage.setItem('lastActivity', Date.now().toString());

        Swal.fire({
          icon: 'success',
          title: 'Login Successful',
          text: "Welcome back!"
        }).then(() => {
          // Navigate after popup is closed
          if (res.role === 'admin') {
            this.router.navigate(['/admin']);
          }
          else if (res.role === 'vendor') {
            this.router.navigate(['/vendor']);
          }
          else if (res.role === 'deliveryPartner') {
            this.router.navigate(['/delivery-partner']);
          }
          else if (res.role === 'user') {
            this.router.navigate(['/']);
          }
        });

      },
      error: (err) => {

        const message =
          err?.error?.message ||
          err?.error?.error ||
          'Server error. Please try again later.';
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: message
        });
      }
    });
  }
}

