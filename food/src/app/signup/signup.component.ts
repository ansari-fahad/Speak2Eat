import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-signup',
  standalone: true,
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,  // ✅ THIS FIXES formGroup ERROR
    RouterLink

  ]
})
export class SignupComponent {

  signupForm: FormGroup;
  loader: boolean = false;
  serverError: string = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,

  ) {
    this.signupForm = this.fb.group({
      name: ['', Validators.required],
      phone: ['', [Validators.required, Validators.minLength(10)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required]
      // Rider fields removed - will be collected after login
    });
  }
  get f() {
    return this.signupForm.controls;
  }

  onSubmit() {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Form',
        text: 'Please fill all required fields correctly.'
      });
      return;
    }
    
    this.loader = true;
    this.serverError = '';
    let formData = this.signupForm.value;

    // Strip ALL rider fields during signup
    // They will be collected after login
    formData = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      password: formData.password,
      role: formData.role
    };

    this.http.post('http://localhost:3000/api/auth/signup/', formData)
      .subscribe({
        next: (res) => {
          console.log('Signup success:', res);
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Account created successfully!'
          });
          this.signupForm.reset();
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.loader = false;
          const message =
            err?.error?.message ||
            err?.error?.error ||
            'Server error. Please try again later.';
          Swal.fire({
            icon: 'error',
            title: 'Signup Failed',
            text: message
          });
        }
      });
  }

}
