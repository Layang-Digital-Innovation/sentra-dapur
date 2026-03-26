import * as paypal from 'paypal-rest-sdk';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaypalConfigService {
  private readonly logger = new Logger(PaypalConfigService.name);
  constructor(private configService: ConfigService) {
    // Helper untuk membersihkan nilai env (hapus quotes/backticks, komentar inline) dan mode
    const clean = (v?: string) => (v || '')
      .trim()
      .replace(/^['"`]+|['"`]+$/g, '')
      .replace(/\s+#.*$/g, '');
    const cleanMode = (v?: string) => {
      const m = clean(v).toLowerCase();
      return m === 'live' ? 'live' : 'sandbox';
    };

    const mode = cleanMode(this.configService.get<string>('PAYPAL_MODE'));
    const clientId = clean(this.configService.get<string>('PAYPAL_CLIENT_ID'));
    const clientSecret = clean(this.configService.get<string>('PAYPAL_CLIENT_SECRET'));

    // Konfigurasi PayPal SDK
    paypal.configure({
      mode, // 'sandbox' atau 'live'
      client_id: clientId,
      client_secret: clientSecret,
    });

    // Logging ringan untuk verifikasi konfigurasi tanpa mengekspos secret
    const clientIdInfo = clientId ? `${clientId.substring(0, 8)}... (len=${clientId.length})` : 'EMPTY';
    this.logger.log(`PayPal SDK configured. mode=${mode}, clientId=${clientIdInfo}`);
  }

  getPaypalSDK() {
    return paypal;
  }
}