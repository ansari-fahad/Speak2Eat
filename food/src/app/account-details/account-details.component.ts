import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountService, AccountDetails } from '../services/account.service';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-account-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './account-details.component.html',
  styleUrls: ['./account-details.component.css']
})
export class AccountDetailsComponent implements OnInit {
  accountForm: FormGroup;
  profileForm: FormGroup;
  userDetails: any = null;
  accountDetails: AccountDetails | null = null;
  userId: string | null = null;
  userType: 'user' | 'vendor' = 'user';
  isLoading = false;
  isSaving = false;
  isEditingProfile = false;

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private http: HttpClient,
    private router: Router
  ) {
    this.accountForm = this.fb.group({
      accountHolderName: [''],
      accountNumber: [''],
      ifscCode: [''],
      bankName: [''],
      branchName: [''],
      upiId: [''],
      razorpayAccountId: ['']
    });

    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      street: [''],
      city: [''],
      state: [''],
      postalCode: ['']
    });
  }

  ngOnInit(): void {
    if (typeof localStorage !== 'undefined') {
      this.userId = localStorage.getItem('userId');
      const role = localStorage.getItem('role');
      this.userType = role === 'vendor' ? 'vendor' : 'user';

      if (this.userId) {
        this.loadAccountDetails();
        this.loadUserProfile();
      }
    }
  }

  toggleEditProfile() {
    this.isEditingProfile = !this.isEditingProfile;
  }

  loadUserProfile(): void {
    if (!this.userId) return;
    this.http.get(`/api/auth/user/${this.userId}`).subscribe({
      next: (data: any) => {
        this.userDetails = data.user;
        console.log('User Profile Loaded:', this.userDetails);

        // Populate profile form
        this.profileForm.patchValue({
          name: this.userDetails.name,
          email: this.userDetails.email,
          phone: this.userDetails.number,
          street: this.userDetails.address?.street || '',
          city: this.userDetails.address?.city || '',
          state: this.userDetails.address?.state || '',
          postalCode: this.userDetails.address?.postalCode || ''
        });
      },
      error: (err) => {
        console.error('Error loading user profile:', err);
      }
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid || !this.userId) {
      this.profileForm.markAllAsTouched();
      Swal.fire('Validation Error', 'Please check your inputs', 'warning');
      return;
    }

    const profileData = {
      name: this.profileForm.get('name')?.value,
      email: this.profileForm.get('email')?.value,
      phone: this.profileForm.get('phone')?.value,
      address: {
        street: this.profileForm.get('street')?.value,
        city: this.profileForm.get('city')?.value,
        state: this.profileForm.get('state')?.value,
        postalCode: this.profileForm.get('postalCode')?.value
      }
    };

    console.log('Updating profile:', profileData);

    this.http.put(`/api/auth/user/${this.userId}`, profileData).subscribe({
      next: (res: any) => {
        Swal.fire('Success', 'Profile updated successfully!', 'success');
        this.isEditingProfile = false;
        this.loadUserProfile(); // Reload to show updated data
      },
      error: (err) => {
        console.error('Error updating profile:', err);
        let errorMsg = 'Failed to update profile';

        // Check for HTML response (syntax error during parsing) which usually means 404/500 from backend
        if (err.status === 200 && err.error && err.error.text && err.error.text.startsWith('<')) {
          errorMsg = 'Invalid server response. Please check backend logs.';
        } else if (err.status === 404) {
          errorMsg = 'API Endpoint not found. Please restart your backend server to apply recent changes.';
        } else if (err.error instanceof SyntaxError) {
          errorMsg = 'Received HTML instead of JSON. Please restart your backend server.';
        } else if (err.error?.message) {
          errorMsg = err.error.message;
        }

        Swal.fire('Error', errorMsg, 'error');
      }
    });
  }

  loadAccountDetails(): void {
    if (!this.userId) return;

    this.isLoading = true;
    this.accountService.getAccountDetails(this.userId, this.userType).subscribe({
      next: (data) => {
        this.accountDetails = data;
        this.accountForm.patchValue({
          accountHolderName: data.accountHolderName || '',
          accountNumber: data.accountNumber || '',
          ifscCode: data.ifscCode || '',
          bankName: data.bankName || '',
          branchName: data.branchName || '',
          upiId: data.upiId || '',
          razorpayAccountId: data.razorpayAccountId || ''
        });
        this.isLoading = false;
      },
      error: (err) => {
        // 404 is OK - means no account details yet
        if (err.status === 404) {
          this.accountDetails = null;
        } else {
          console.error('Error loading account details:', err);
          Swal.fire('Error', 'Failed to load account details', 'error');
        }
        this.isLoading = false;
      }
    });
  }

  saveAccountDetails(): void {
    if (this.accountForm.invalid || !this.userId) {
      this.accountForm.markAllAsTouched();
      Swal.fire('Validation Error', 'Please fill all required fields correctly', 'warning');
      return;
    }

    this.isSaving = true;
    const formData = {
      ...this.accountForm.value,
      userType: this.userType
    };

    this.accountService.saveAccountDetails(this.userId, formData).subscribe({
      next: (response) => {
        this.isSaving = false;
        Swal.fire('Success', 'Account details saved successfully!', 'success');
        this.loadAccountDetails();
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Error saving account details:', err);
        Swal.fire('Error', err.error?.message || 'Failed to save account details', 'error');
      }
    });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('lastActivity');
    this.router.navigate(['/']);
  }
}

