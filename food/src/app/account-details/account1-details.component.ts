import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountService, AccountDetails } from '../services/account.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-account1-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './account1-details.component.html',
  styleUrls: ['./account1-details.component.css']
})
export class AccountsDetailsComponent implements OnInit {
  accountForm: FormGroup;
  accountDetails: AccountDetails | null = null;
  userId: string | null = null;
  userType: 'user' | 'vendor' = 'user';
  isLoading = false;
  isSaving = false;

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService
  ) {
    this.accountForm = this.fb.group({
      accountHolderName: ['', Validators.required],
      accountNumber: ['', [Validators.required, Validators.pattern(/^\d{9,18}$/)]],
      ifscCode: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]],
      bankName: ['', Validators.required],
      branchName: ['', Validators.required],
      upiId: ['', [Validators.pattern(/^[\w.-]+@[\w]+$/)]],
      razorpayAccountId: ['']
    });
  }

  ngOnInit(): void {
    if (typeof localStorage !== 'undefined') {
      this.userId = localStorage.getItem('userId');
      const role = localStorage.getItem('role');
      this.userType = role === 'vendor' ? 'vendor' : 'user';

      if (this.userId) {
        this.loadAccountDetails();
      }
    }
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
}

