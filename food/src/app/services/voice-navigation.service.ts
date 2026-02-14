import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class VoiceNavigationService {
    private recognition: any;
    private isListening = false;
    private isWakeWordMode = true; // Always listening for wake word
    private lastCommand = '';
    private commandTimeout: any;
    private hasLoggedWakeWord = false; // Track if wake word message logged

    constructor(private router: Router) {
        this.initializeSpeechRecognition();
        // Auto-start in wake word mode when service initializes
        setTimeout(() => {
            this.startWakeWordListening();
        }, 1000);
    }

    private initializeSpeechRecognition() {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();

            // IMPROVED SETTINGS for better recognition
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 5;
            this.recognition.lang = 'hi-IN'; // Hindi language with English fallback

            this.recognition.onstart = () => {
                // Reduced logging - only log once on first start
                if (this.isWakeWordMode && !this.hasLoggedWakeWord) {
                    console.log('👂 Wake word mode active. Say "food" to activate.');
                    this.hasLoggedWakeWord = true;
                }
            };

            this.recognition.onresult = (event: any) => {
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    const transcript = result[0].transcript.toLowerCase().trim();

                    if (result.isFinal) {
                        if (this.isWakeWordMode) {
                            // In wake word mode - only listen for "Hey Eat"
                            this.checkWakeWord(transcript);
                        } else {
                            // In active mode - process commands
                            console.log('🎤 Command:', transcript);

                            // Check for stop command first
                            if (this.checkStopCommand(transcript)) {
                                return;
                            }

                            this.processCommand(transcript);
                        }
                    }
                    // Removed interim logging to reduce spam
                }
            };

            this.recognition.onerror = (event: any) => {
                // Ignore common non-critical errors
                if (event.error === 'no-speech') {
                    // This is normal - just means user didn't speak
                    return;
                }

                if (event.error === 'aborted') {
                    // Recognition was aborted - this is normal during restarts
                    // Silent - don't log to avoid spam
                    return;
                }

                // Log other errors
                console.error('❌ Speech recognition error:', event.error);
                if (event.error === 'audio-capture') {
                    console.log('💡 Tip: Check microphone permissions');
                } else if (event.error === 'not-allowed') {
                    console.log('💡 Tip: Microphone access denied. Please allow microphone access.');
                    this.isWakeWordMode = false;
                    this.isListening = false;
                }
            };

            this.recognition.onend = () => {
                // Only restart if we're supposed to be listening
                if (this.isWakeWordMode || this.isListening) {
                    // Add delay to prevent rapid restart causing 'aborted' errors
                    setTimeout(() => {
                        if (this.isWakeWordMode || this.isListening) {
                            try {
                                this.recognition.start();
                            } catch (e: any) {
                                // Only log if it's not "already started" error
                                if (!e.message || !e.message.includes('already started')) {
                                    console.log('⚠️ Could not restart recognition:', e.message);
                                }
                            }
                        }
                    }, 300); // Increased delay to 300ms
                }
            };
        } else {
            console.error('Speech Recognition not supported in this browser');
        }
    }

    private checkWakeWord(transcript: string): void {
        // Debug: Log what we're hearing in wake word mode
        console.log('👂 Heard in wake word mode:', transcript);

        // Check for wake word: "food" and common variations (English + Hindi)
        const wakeWords = ['food', 'foods', 'good', 'foot', 'hood', 'wood', 'खाना', 'खाने', 'फूड', 'फ़ूड', 'भोजन'];

        for (const wakeWord of wakeWords) {
            if (transcript.includes(wakeWord)) {
                console.log('🎉 Wake word detected:', transcript);
                console.log('🎤 Activating voice navigation...');
                this.activateVoiceMode();
                this.speak('Voice navigation activated. Say your command.');
                return;
            }
        }

        // Debug: Show why it didn't match
        console.log('❌ No wake word match. Tried:', wakeWords);
    }

    private checkStopCommand(transcript: string): boolean {
        // Check for stop commands (English + Hindi)
        const stopCommands = [
            'stop listening',
            'stop',
            'top',
            'deactivate',
            'turn off',
            'sleep',
            'goodbye',
            'bye',
            'exit',
            'बंद करो',
            'बंद',
            'रुको',
            'स्टॉप',
            'बाय',
            'गुडबाय'
        ];

        for (const stopCmd of stopCommands) {
            if (transcript.includes(stopCmd)) {
                console.log('🛑 Stop command detected:', transcript);
                this.deactivateVoiceMode();
                this.speak('Voice navigation deactivated. Say food to activate again.');
                return true;
            }
        }
        return false;
    }

    private startWakeWordListening() {
        if (this.recognition) {
            this.isWakeWordMode = true;
            this.isListening = false;
            try {
                this.recognition.start();
                console.log('👂 Wake word listening started. Say "food" to activate!');
            } catch (e) {
                // Already started
            }
        }
    }

    private activateVoiceMode() {
        this.isWakeWordMode = false;
        this.isListening = true;
    }

    private deactivateVoiceMode() {
        this.isWakeWordMode = true;
        this.isListening = false;
        console.log('👂 Back to wake word mode. Say "food" to activate.');
    }

    startListening() {
        // Manual activation via button
        if (this.recognition && !this.isListening) {
            this.isWakeWordMode = false;
            this.isListening = true;
            try {
                this.recognition.start();
                console.log('🎤 Voice navigation STARTED - Speak now!');
                this.speak('Voice navigation activated');
            } catch (e) {
                console.log('Already listening...');
            }
        }
    }

    stopListening() {
        // Manual deactivation via button - go back to wake word mode
        if (this.recognition) {
            this.deactivateVoiceMode();
            console.log('🛑 Voice navigation STOPPED');
            this.speak('Voice navigation deactivated. Say food to activate again.');
        }
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    getListeningStatus(): boolean {
        return this.isListening;
    }

    // Check delivery partner specific actions
    private checkDeliveryPartnerActions(command: string, normalized: string): boolean {
        // Check if we're on delivery partner page
        const currentUrl = this.router.url;
        if (!currentUrl.includes('/delivery-partner')) {
            return false; // Not on delivery partner page
        }

        // Emit custom events for delivery partner component to handle
        const deliveryEvent = new CustomEvent('voiceDeliveryCommand', {
            detail: { command, normalized }
        });

        // Map navigation commands (English + Hindi)
        const mapKeywords = ['open map', 'show map', 'map', 'navigate', 'navigation', 'मैप', 'मैप खोलो', 'नेविगेशन', 'नेविगेट'];
        for (const keyword of mapKeywords) {
            if (normalized.includes(keyword) || command.includes(keyword)) {
                window.dispatchEvent(new CustomEvent('voiceDeliveryCommand', {
                    detail: { action: 'openMap' }
                }));
                this.speak('Opening map');
                return true;
            }
        }

        // Go online commands (English + Hindi)
        const onlineKeywords = ['go online', 'online', 'start work', 'available', 'ऑनलाइन', 'ऑनलाइन जाओ', 'काम शुरू करो', 'उपलब्ध'];
        for (const keyword of onlineKeywords) {
            if (normalized.includes(keyword) || command.includes(keyword)) {
                window.dispatchEvent(new CustomEvent('voiceDeliveryCommand', {
                    detail: { action: 'goOnline' }
                }));
                this.speak('Going online');
                return true;
            }
        }

        // Go offline commands (English + Hindi)
        const offlineKeywords = ['go offline', 'offline', 'stop work', 'unavailable', 'ऑफलाइन', 'ऑफलाइन जाओ', 'काम बंद करो', 'अनुपलब्ध'];
        for (const keyword of offlineKeywords) {
            if (normalized.includes(keyword) || command.includes(keyword)) {
                window.dispatchEvent(new CustomEvent('voiceDeliveryCommand', {
                    detail: { action: 'goOffline' }
                }));
                this.speak('Going offline');
                return true;
            }
        }

        // Dashboard tab commands (English + Hindi)
        const dashboardKeywords = ['dashboard', 'home', 'main', 'डैशबोर्ड', 'होम', 'मुख्य'];
        for (const keyword of dashboardKeywords) {
            if (normalized.includes(keyword) || command.includes(keyword)) {
                window.dispatchEvent(new CustomEvent('voiceDeliveryCommand', {
                    detail: { action: 'showDashboard' }
                }));
                this.speak('Opening dashboard');
                return true;
            }
        }

        // Orders tab commands (English + Hindi)
        const ordersKeywords = ['orders', 'order', 'deliveries', 'ऑर्डर', 'ऑर्डर्स', 'डिलीवरी'];
        for (const keyword of ordersKeywords) {
            if (normalized.includes(keyword) || command.includes(keyword)) {
                window.dispatchEvent(new CustomEvent('voiceDeliveryCommand', {
                    detail: { action: 'showOrders' }
                }));
                this.speak('Opening orders');
                return true;
            }
        }

        // Earnings tab commands (English + Hindi)
        const earningsKeywords = ['earnings', 'earning', 'wallet', 'money', 'income', 'कमाई', 'वॉलेट', 'पैसा', 'आय'];
        for (const keyword of earningsKeywords) {
            if (normalized.includes(keyword) || command.includes(keyword)) {
                window.dispatchEvent(new CustomEvent('voiceDeliveryCommand', {
                    detail: { action: 'showEarnings' }
                }));
                this.speak('Opening earnings');
                return true;
            }
        }

        // Profile tab commands (English + Hindi)
        const profileKeywords = ['profile', 'settings', 'account', 'प्रोफाइल', 'सेटिंग्स', 'अकाउंट'];
        for (const keyword of profileKeywords) {
            if (normalized.includes(keyword) || command.includes(keyword)) {
                window.dispatchEvent(new CustomEvent('voiceDeliveryCommand', {
                    detail: { action: 'showProfile' }
                }));
                this.speak('Opening profile');
                return true;
            }
        }

        // Accept order commands (English + Hindi)
        const acceptKeywords = ['accept order', 'accept', 'claim order', 'claim', 'ऑर्डर स्वीकार करो', 'स्वीकार करो', 'क्लेम करो'];
        for (const keyword of acceptKeywords) {
            if (normalized.includes(keyword) || command.includes(keyword)) {
                window.dispatchEvent(new CustomEvent('voiceDeliveryCommand', {
                    detail: { action: 'acceptOrder' }
                }));
                this.speak('Accepting order');
                return true;
            }
        }

        // Pickup order commands (English + Hindi)
        const pickupKeywords = ['picked up', 'pickup', 'order picked', 'ऑर्डर पिक किया', 'पिकअप', 'उठाया'];
        for (const keyword of pickupKeywords) {
            if (normalized.includes(keyword) || command.includes(keyword)) {
                window.dispatchEvent(new CustomEvent('voiceDeliveryCommand', {
                    detail: { action: 'markPickedUp' }
                }));
                this.speak('Marking order as picked up');
                return true;
            }
        }

        // Deliver order commands (English + Hindi)
        const deliverKeywords = ['deliver', 'delivered', 'complete', 'डिलीवर', 'डिलीवर किया', 'पूर्ण'];
        for (const keyword of deliverKeywords) {
            if (normalized.includes(keyword) || command.includes(keyword)) {
                window.dispatchEvent(new CustomEvent('voiceDeliveryCommand', {
                    detail: { action: 'deliverOrder' }
                }));
                this.speak('Marking order as delivered');
                return true;
            }
        }

        // View available orders commands (English + Hindi)
        const availableKeywords = ['available orders', 'show orders', 'view orders', 'उपलब्ध ऑर्डर', 'ऑर्डर दिखाओ'];
        for (const keyword of availableKeywords) {
            if (normalized.includes(keyword) || command.includes(keyword)) {
                window.dispatchEvent(new CustomEvent('voiceDeliveryCommand', {
                    detail: { action: 'showAvailableOrders' }
                }));
                this.speak('Loading available orders');
                return true;
            }
        }

        return false; // No delivery action matched
    }

    private processCommand(command: string) {
        // Removed excessive logging

        // Prevent duplicate commands
        if (command === this.lastCommand) {
            return;
        }

        this.lastCommand = command;
        clearTimeout(this.commandTimeout);
        this.commandTimeout = setTimeout(() => {
            this.lastCommand = '';
        }, 2000);

        // Normalize the command - remove extra spaces and common filler words
        const normalized = command
            .replace(/\s+/g, ' ')
            .replace(/^(go to|show me|open|navigate to|take me to|show|i want to see|display)\s+/gi, '')
            .trim();

        // IMPROVED: Category navigation with phonetic variations (English + Hindi)
        const categoryMap: { [key: string]: { route: string, keywords: string[] } } = {
            'burgers': {
                route: 'burgers',
                keywords: ['burger', 'burgers', 'burgher', 'berger', 'bergers', 'burger page', 'burgers page', 'बर्गर', 'बर्गर्स', 'बर्गर पेज', 'बर्गर के पेज']
            },
            'pizza': {
                route: 'pizza',
                keywords: ['pizza', 'pizzas', 'pisa', 'pisas', 'pizza page', 'pizzas page', 'पिज्जा', 'पिज़्ज़ा', 'पिज्जा पेज', 'पिज्जा के पेज']
            },
            'pasta': {
                route: 'pasta',
                keywords: ['pasta', 'pastas', 'paster', 'past', 'pasta page', 'pastas page', 'पास्ता', 'पास्ता पेज', 'पास्ता के पेज']
            },
            'desserts': {
                route: 'desserts',
                keywords: ['dessert', 'desserts', 'desert', 'deserts', 'sweet', 'sweets', 'dessert page', 'डेज़र्ट', 'डेसर्ट', 'मिठाई', 'स्वीट', 'डेज़र्ट पेज']
            },
            'beverages': {
                route: 'beverages',
                keywords: ['beverage', 'beverages', 'drink', 'drinks', 'beverage page', 'drinks page', 'ड्रिंक', 'ड्रिंक्स', 'पेय', 'बेवरेज', 'ड्रिंक पेज']
            },
            'seafood': {
                route: 'seafood',
                keywords: ['seafood', 'sea food', 'fish', 'seafood page', 'सीफूड', 'मछली', 'सी फूड', 'सीफूड पेज']
            },
            'sandwiches': {
                route: 'sandwiches',
                keywords: ['sandwich', 'sandwiches', 'sandwitch', 'sandwich page', 'सैंडविच', 'सैंडविच पेज']
            },
            'soups': {
                route: 'soups',
                keywords: ['soup', 'soups', 'soup page', 'सूप', 'सूप पेज']
            },
            'salads': {
                route: 'salads',
                keywords: ['salad', 'salads', 'salad page', 'सलाद', 'सलाद पेज']
            },
            'chinese': {
                route: 'chinese',
                keywords: ['chinese', 'china', 'chinese food', 'chinese page', 'चाइनीज', 'चीनी', 'चाइनीज फूड', 'चाइनीज पेज']
            },
            'japanese': {
                route: 'japanese',
                keywords: ['japanese', 'japan', 'japanese food', 'japanese page', 'जापानी', 'जैपनीज', 'जापानी फूड', 'जैपनीज पेज']
            },
            'fast-food': {
                route: 'fast-food',
                keywords: ['fast food', 'fastfood', 'fast', 'fast food page', 'फास्ट फूड', 'फास्टफूड', 'फास्ट फूड पेज']
            },
            'coffee-tea': {
                route: 'coffee-tea',
                keywords: ['coffee', 'tea', 'coffee and tea', 'coffee tea', 'cafe', 'कॉफी', 'चाय', 'कॉफ़ी', 'टी', 'कैफे']
            }
        };

        // IMPROVED: Page navigation with more variations (English + Hindi)
        const pageMap: { [key: string]: { route: string, keywords: string[] } } = {
            'home': {
                route: '/landing',
                keywords: ['home', 'landing', 'main page', 'homepage', 'home page', 'होम', 'घर', 'मुख्य पेज', 'होम पेज']
            },
            'cart': {
                route: '/cart',
                keywords: ['cart', 'shopping cart', 'my cart', 'basket', 'card', 'कार्ट', 'टोकरी', 'शॉपिंग कार्ट', 'मेरा कार्ट']
            },
            'checkout': {
                route: '/checkout',
                keywords: ['checkout', 'check out', 'payment', 'pay', 'चेकआउट', 'पेमेंट', 'भुगतान']
            },
            'orders': {
                route: '/order-history',
                keywords: ['order', 'orders', 'order history', 'my orders', 'order page', 'history', 'ऑर्डर', 'आर्डर', 'मेरे ऑर्डर', 'ऑर्डर हिस्ट्री']
            },
            'account': {
                route: '/account-details',
                keywords: ['account', 'profile', 'my account', 'my profile', 'account details', 'अकाउंट', 'प्रोफाइल', 'मेरा अकाउंट', 'खाता']
            },
            'login': {
                route: '/login',
                keywords: ['login', 'log in', 'sign in', 'signin', 'लॉगिन', 'साइन इन']
            },
            'signup': {
                route: '/signup',
                keywords: ['signup', 'sign up', 'register', 'registration', 'create account', 'साइनअप', 'रजिस्टर', 'खाता बनाओ', 'अकाउंट बनाओ']
            },
            'delivery-partner': {
                route: '/delivery-partner',
                keywords: ['delivery partner', 'delivery', 'partner', 'rider', 'delivery dashboard', 'डिलीवरी पार्टनर', 'डिलीवरी', 'राइडर', 'डिलीवरी डैशबोर्ड']
            }
        };

        // Check for delivery partner specific actions first
        const deliveryActions = this.checkDeliveryPartnerActions(command, normalized);
        if (deliveryActions) {
            return;
        }

        // Check category commands first (more specific)
        for (const [name, data] of Object.entries(categoryMap)) {
            for (const keyword of data.keywords) {
                if (normalized.includes(keyword) || command.includes(keyword)) {
                    this.router.navigate(['/category', data.route]);
                    this.speak(`Opening ${name}`);
                    return;
                }
            }
        }

        // Check page commands
        for (const [name, data] of Object.entries(pageMap)) {
            for (const keyword of data.keywords) {
                if (normalized.includes(keyword) || command.includes(keyword)) {
                    this.router.navigate([data.route]);
                    this.speak(`Opening ${name}`);
                    return;
                }
            }
        }

        // If no command matched
        console.log('❌ Command not recognized:', command);
        console.log('💡 Try saying: "burgers", "pizza", "pasta", "cart", "home", etc.');
        console.log('💡 Or say "stop listening" to deactivate.');
        this.speak('Command not recognized. Please try again.');
    }

    private speak(text: string) {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.1;
            utterance.pitch = 1;
            utterance.volume = 0.8;

            window.speechSynthesis.speak(utterance);
        }
    }

    isSupported(): boolean {
        return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
    }
}
