import LegalLayout from '@/components/legal/LegalLayout';

export const metadata = {
  title: 'Terms of Service',
  description: 'Ketentuan Layanan Sentra Dapur',
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updatedAt="November 11, 2025" updatedLabel="Last updated">
      <h2><b>Introduction</b></h2>
      <p>
        Welcome to Sentra Dapur ("SD"). By accessing or using our services, you agree to these
        Terms of Service ("Terms"). Please read them carefully. If you do not agree to any part of the Terms,
        please refrain from using TIC services.
      </p>

      <h2><b>Eligibility & Accounts</b></h2>
      <ul>
        <li>You confirm that you are at least 18 years old and have legal capacity.</li>
        <li>You are responsible for keeping your account credentials confidential and for all activities under your account.</li>
        <li>Please notify us immediately if you suspect unauthorized access to your account.</li>
      </ul>

      <h2><b>Subscriptions & Payments</b></h2>
      <ul>
        <li>Paid services are available through subscriptions listed on the site.</li>
        <li>Prices may be displayed in USD and/or IDR; taxes and third-party fees may apply.</li>
        <li>Payments are processed via trusted providers (e.g., PayPal/Xendit).</li>
      </ul>

      <h2><b>Cancellation & Refunds</b></h2>
      <ul>
        <li>You may cancel at any time; access continues until the end of the current billing period.</li>
        <li>Unless otherwise agreed in writing, fees paid are non-refundable.</li>
      </ul>

      <h2><b>Acceptable Use</b></h2>
      <ul>
        <li>Do not misuse the service, engage in illegal activities, or infringe on others’ rights.</li>
        <li>Do not perform reverse engineering, large-scale scraping, or circumvent security mechanisms.</li>
      </ul>

      <h2><b>Intellectual Property</b></h2>
      <p>
        All materials, trademarks, logos, and content within the service are protected by law.
        You are granted a limited license to use the service in accordance with these Terms.
      </p>

      <h2><b>User Content</b></h2>
      <p>
        By uploading content, you grant us a non-exclusive license to store, display, and process such content to operate the service.
        You remain fully responsible for the legality of the content you upload.
      </p>

      <h2><b>Disclaimers & Limitation of Liability</b></h2>
      <p>
        The service is provided "as is" without express or implied warranties. To the extent permitted by law,
        TIC shall not be liable for any indirect, incidental, special, consequential, or loss of profits arising from use of the service.
      </p>

      <h2><b>Service & Terms Changes</b></h2>
      <p>
        We may update the service and these Terms from time to time. Material changes will be communicated via the site or your registered email.
      </p>

      <h2><b>Governing Law</b></h2>
      <p>
        These Terms are governed by the laws applicable in TIC’s operating jurisdiction. Disputes will be resolved in accordance with applicable law.
      </p>

      <h2><b>Contact</b></h2>
      <p>
        For questions regarding the Terms of Service, please contact us via the official contact page on the site.
      </p>
    </LegalLayout>
  );
}