import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AccountDetails {
  _id?: string;
  userId: string;
  userType: 'user' | 'vendor';
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  upiId: string;
  razorpayAccountId?: string;
  isVerified: boolean;
  verifiedAt?: Date;
  isRejected?: boolean;
  rejectedAt?: Date;
  rejectionReason?: string;
  reviewedBy?: any;
  createdAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private apiUrl = 'http://localhost:3000/api/account';

  constructor(private http: HttpClient) { }

  getAccountDetails(userId: string, userType: 'user' | 'vendor' = 'user'): Observable<AccountDetails> {
    return this.http.get<AccountDetails>(`${this.apiUrl}/${userId}?userType=${userType}`);
  }

  saveAccountDetails(userId: string, details: Partial<AccountDetails>): Observable<any> {
    return this.http.post(`${this.apiUrl}/${userId}`, details);
  }

  updateAccountDetails(userId: string, details: Partial<AccountDetails>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${userId}`, details);
  }

  // Admin functions
  getPendingAccounts(): Observable<AccountDetails[]> {
    return this.http.get<AccountDetails[]>(`${this.apiUrl}/admin/pending`);
  }

  getAllAccountRequests(): Observable<AccountDetails[]> {
    return this.http.get<AccountDetails[]>(`${this.apiUrl}/admin/all`);
  }

  approveAccount(accountId: string, adminId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${accountId}/verify`, { adminId });
  }

  rejectAccount(accountId: string, adminId: string, rejectionReason: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${accountId}/reject`, { adminId, rejectionReason });
  }
}
