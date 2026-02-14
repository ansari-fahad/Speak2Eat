import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { DeliveryPartnerService } from '../services/delivery-partner.service';

interface ModalDialog {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  isOpen: boolean;
}

@Component({
  selector: 'app-delivery-registration',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterLink],
  templateUrl: './delivery-registration.component.html',
  styleUrl: './delivery-registration.component.css'
})
export class DeliveryRegistrationComponent implements OnInit {
  
  // Form Data
  formData = {
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    vehicleType: 'bike',
    vehicleNumber: '',
    licenseNumber: '',
    aadharNumber: '',
    bankAccountNumber: '',
    bankIfsc: '',
    bankHolderName: ''
  };

  // UI State
  loading = false;
  currentStep = 1;
  totalSteps = 4;
  modal: ModalDialog = {
    type: 'info',
    title: '',
    message: '',
    isOpen: false
  };

  passwordsMatch = true;

  constructor(
    private deliveryService: DeliveryPartnerService,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if already logged in
    if (localStorage.getItem('userId')) {
      this.router.navigate(['/delivery-dashboard']);
    }
  }

  // ======================== FORM VALIDATION ========================

  isBasicInfoValid(): boolean {
    return this.formData.name.trim().length > 0 &&
           this.formData.phone.trim().length === 10 &&
           this.formData.email.includes('@') &&
           this.formData.password.length >= 6 &&
           this.passwordsMatch;
  }

  isVehicleInfoValid(): boolean {
    return this.formData.vehicleNumber.trim().length > 0 &&
           this.formData.licenseNumber.trim().length > 0;
  }

  isDocumentValid(): boolean {
    return this.formData.aadharNumber.trim().length === 12;
  }

  isBankInfoValid(): boolean {
    return this.formData.bankAccountNumber.trim().length > 0 &&
           this.formData.bankIfsc.trim().length > 0 &&
           this.formData.bankHolderName.trim().length > 0;
  }

  onPasswordChange() {
    this.passwordsMatch = this.formData.password === this.formData.confirmPassword;
  }

  // ======================== STEP NAVIGATION ========================

  nextStep() {
    if (this.currentStep === 1 && !this.isBasicInfoValid()) {
      this.showModal('error', 'Invalid Input', 'Please fill all fields correctly');
      return;
    }
    if (this.currentStep === 2 && !this.isVehicleInfoValid()) {
      this.showModal('error', 'Invalid Input', 'Please fill all vehicle details');
      return;
    }
    if (this.currentStep === 3 && !this.isDocumentValid()) {
      this.showModal('error', 'Invalid Aadhar', 'Aadhar number must be 12 digits');
      return;
    }
    if (this.currentStep === 4 && !this.isBankInfoValid()) {
      this.showModal('error', 'Invalid Bank Details', 'Please fill all bank details');
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // ======================== REGISTRATION ========================

  submitRegistration() {
    if (!this.isBankInfoValid()) {
      this.showModal('error', 'Invalid Input', 'Please fill all details');
      return;
    }

    this.loading = true;

    const registrationData = {
      name: this.formData.name,
      phone: this.formData.phone,
      email: this.formData.email,
      password: this.formData.password,
      role: 'deliveryPartner',
      vehicleType: this.formData.vehicleType,
      vehicleNumber: this.formData.vehicleNumber,
      licenseNumber: this.formData.licenseNumber,
      aadharNumber: this.formData.aadharNumber,
      bankAccountNumber: this.formData.bankAccountNumber,
      bankIfsc: this.formData.bankIfsc,
      bankHolderName: this.formData.bankHolderName
    };

    this.deliveryService.createDeliveryPartner(registrationData).subscribe({
      next: (response: any) => {
        this.loading = false;
        localStorage.setItem('userId', response.partner._id);
        localStorage.setItem('token', response.token);
        this.showModal('success', 'Registration Complete', 'Welcome to delivery platform!');
        
        setTimeout(() => {
          this.router.navigate(['/delivery-dashboard']);
        }, 2000);
      },
      error: (error: any) => {
        this.loading = false;
        const message = error.error?.message || 'Registration failed. Please try again.';
        this.showModal('error', 'Registration Failed', message);
      }
    });
  }

  // ======================== UI HELPERS ========================

  showModal(type: any, title: string, message: string) {
    this.modal = { type, title, message, isOpen: true };
  }

  closeModal() {
    this.modal.isOpen = false;
  }

  getStepProgress(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }
}
