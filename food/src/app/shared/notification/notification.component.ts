import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocketService } from '../../services/socket.service';
import { Router } from '@angular/router';
import { OrderService } from '../../services/order.service';

@Component({
    selector: 'app-notification',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './notification.component.html',
    styleUrls: ['./notification.component.css']
})
export class NotificationComponent implements OnInit {
    show = false;
    orderData: any = null;

    constructor(private socketService: SocketService, private router: Router, private orderService: OrderService) { }

    mainMessage: string = 'Preparing your order';
    timeMessage: string = 'arriving in';
    showTime: boolean = true;
    remainingTime: number | string = 30;

    ngOnInit() {
        // 1. Check for any existing active active orders on load (Persistence)
        this.checkActiveOrders();

        // 2. Listen for real-time updates
        this.socketService.listen('orderStatusUpdated').subscribe((data) => {
            console.log('ðŸ”” Socket notification received:', data);

            const currentUserId = localStorage.getItem('userId');
            // Handle various structures of userId that might come from backend (string or object with _id)
            const eventUserId = data.userId || (data.updatedOrder?.userId?._id) || (data.updatedOrder?.userId);

            console.log(`ðŸ”” ID Check -- Event: ${eventUserId}, Local: ${currentUserId}`);

            if (currentUserId && String(eventUserId) === String(currentUserId)) {
                console.log('âœ… User ID matched! Displaying notification.');
                this.handleNotification(data);
            } else {
                console.log('âŒ User ID did not match.');
            }
        });
    }

    handleNotification(data: any) {
        this.orderData = data;
        const status = data.status;

        // Default setup
        this.showTime = true;
        this.timeMessage = 'arriving in';

        switch (status) {
            case 'Confirmed':
            case 'Accepted':
                this.mainMessage = 'Order Accepted';
                this.calculateRemainingTime();
                break;
            case 'Preparing':
                this.mainMessage = 'Preparing your order';
                this.calculateRemainingTime();
                break;
            case 'Ready for Pickup':
                this.mainMessage = 'Food is ready for pickup';
                this.timeMessage = 'Status';
                this.remainingTime = 'Ready';
                break;
            case 'Out for Delivery':
                this.mainMessage = 'Rider is on the way';
                this.remainingTime = 'Soon';
                break;
            case 'Delivered':
                this.mainMessage = 'Order Delivered';
                this.showTime = false;
                break;
            case 'Cancelled':
                this.mainMessage = 'Order Cancelled';
                this.showTime = false;
                break;
            default:
                console.log('Unknown status:', status);
                return; // Don't show for unknown statuses
        }

        this.show = true;
        // Sticky notification: No auto-hide timeout here
    }

    calculateRemainingTime() {
        if (this.orderData.updatedOrder?.preparationDeadline) {
            const deadline = new Date(this.orderData.updatedOrder.preparationDeadline).getTime();
            const now = new Date().getTime();
            const diff = Math.round((deadline - now) / 60000); // mins
            this.remainingTime = diff > 0 ? diff + ' mins' : '30 mins';
        } else {
            this.remainingTime = '30 mins';
        }
    }

    checkActiveOrders() {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        this.orderService.getOrdersByUser(userId).subscribe({
            next: (orders) => {
                // Find the most recent active order
                // Active = Not Delivered, Not Cancelled
                const activeOrder = orders.find(o =>
                    o.status !== 'Delivered' &&
                    o.status !== 'Cancelled' &&
                    o.status !== 'Pending' // Pending active too? Maybe. Usually wait for accepted.
                );

                if (activeOrder) {
                    console.log('ðŸ”„ Found active order, restoring notification:', activeOrder._id);
                    // Construct data object to match socket structure
                    const notificationData = {
                        status: activeOrder.status,
                        updatedOrder: activeOrder,
                        userId: userId
                    };
                    this.handleNotification(notificationData);
                }
            },
            error: (err) => console.error('Error checking active orders:', err)
        });
    }

    navigateToTracking() {
        this.router.navigate(['/orders']);
        this.show = false;
    }

    close() {
        this.show = false;
    }
}

