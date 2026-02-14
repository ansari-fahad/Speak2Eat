import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DeliveryPartnerService } from '../../services/delivery-partner.service';

@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-view.component.html',
  styleUrl: './profile-view.component.css'
})
export class ProfileViewComponent implements OnInit {
  partnerId: string | null = null;
  profile: any = null;
  loading: boolean = true;
  error: string = '';

  constructor(
    private deliveryService: DeliveryPartnerService,
    private router: Router
  ) {}

  ngOnInit() {
    this.partnerId = localStorage.getItem('userId');
    if (!this.partnerId) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadProfile();
  }

  loadProfile() {
    this.deliveryService.getDeliveryPartnerProfile(this.partnerId!)
      .subscribe({
        next: (data: any) => {
          this.profile = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load profile';
          this.loading = false;
        }
      });
  }

  goBack() {
    this.router.navigate(['/delivery-partner']);
  }

  editProfile() {
    this.router.navigate(['/delivery-partner'], { queryParams: { tab: 'profile' } });
  }
}
