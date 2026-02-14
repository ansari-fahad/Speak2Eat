import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceNavigationService } from '../services/voice-navigation.service';

@Component({
    selector: 'app-voice-button',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './voice-button.component.html',
    styleUrls: ['./voice-button.component.css']
})
export class VoiceButtonComponent implements OnInit, OnDestroy {
    isListening = false;
    isSupported = false;

    constructor(private voiceService: VoiceNavigationService) { }

    ngOnInit() {
        this.isSupported = this.voiceService.isSupported();
    }

    toggleVoiceNavigation() {
        this.voiceService.toggleListening();
        this.isListening = this.voiceService.getListeningStatus();
    }

    ngOnDestroy() {
        this.voiceService.stopListening();
    }
}

