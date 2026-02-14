import { Component, HostListener, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { VoiceButtonComponent } from './voice-button/voice-button.component';
import { NotificationComponent } from './shared/notification/notification.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, VoiceButtonComponent, NotificationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'food';
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds
  private lastActivityKey = 'lastActivity';

  constructor(private router: Router) { }

  ngOnInit() {
    // Check session validity immediately on load
    this.checkSession();
    this.checkInitialRedirect();

    // Check session every minute
    setInterval(() => {
      this.checkSession();
    }, 60 * 1000);
  }

  checkInitialRedirect() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const currentPath = window.location.pathname;

    if (token && role) {
      // User is logged in
      // If user is on an auth page or the root, redirect to their specific dashboard
      if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/') {
        if (role === 'admin') {
          this.router.navigate(['/admin']);
        } else if (role === 'vendor') {
          this.router.navigate(['/vendor']);
        } else if (role === 'user') {
          this.router.navigate(['/']);
        }
      }
    } else {
      // No valid session
      // If user is trying to access successful/internal pages without login, redirect to landing
      // Allowed pages for guests: Landing, Login, Signup, Forgot Password, Reset Password
      const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];

      // We check if the current path is NOT in public paths
      // Note: This matches exact paths. For routes like /product/123, this will redirect to home if accessed directly without login.
      // This fulfills the requirement "if not session is presented then it redirect to landing page"
      if (!publicPaths.includes(currentPath)) {
        this.router.navigate(['/']);
      }
    }
  }

  @HostListener('window:mousemove')
  @HostListener('window:click')
  @HostListener('window:keypress')
  @HostListener('window:scroll')
  resetTimer() {
    if (localStorage.getItem('token')) {
      // Update last activity timestamp
      // We could throttle this if performance becomes an issue, but for now simple update is fine
      localStorage.setItem(this.lastActivityKey, Date.now().toString());
    }
  }

  checkSession() {
    const token = localStorage.getItem('token');
    if (token) {
      const lastActivityStr = localStorage.getItem(this.lastActivityKey);

      if (lastActivityStr) {
        const lastActivity = parseInt(lastActivityStr, 10);
        const now = Date.now();

        if (now - lastActivity > this.sessionTimeout) {
          // Session expired
          console.log('Session expired due to inactivity');
          this.logout();
        }
      } else {
        // If token exists but no activity time (legacy/error), set it now to avoid immediate logout
        // or force logout? Let's be lenient and start timer now.
        localStorage.setItem(this.lastActivityKey, Date.now().toString());
      }
    }
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
    // Optional: Alert the user
    alert('Your session has expired due to inactivity (30 minutes). Please login again.');
  }
}

