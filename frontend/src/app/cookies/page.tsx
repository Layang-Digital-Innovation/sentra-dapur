import LegalLayout from '@/components/legal/LegalLayout';

export const metadata = {
  title: 'Cookie Policy',
  description: 'Kebijakan Cookie Sentra Dapur',
};

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" updatedAt="November 11, 2025" updatedLabel="Last updated">
      <h2><b>Introduction</b></h2>
      <p>
        This Cookie Policy explains how Sentra Dapur ("SD") uses cookies and similar technologies to
        provide, analyze, and improve your experience.
      </p>

      <h2><b>What Are Cookies?</b></h2>
      <p>
        Cookies are small files stored on your device when you visit a website. Cookies help us remember
        preferences, understand usage, and enhance security.
      </p>

      <h2><b>Types of Cookies We Use</b></h2>
      <ul>
        <li>Essential cookies: required for core site functions and security.</li>
        <li>Preference cookies: store language and display settings.</li>
        <li>Analytics cookies: help analyze usage to improve the service.</li>
        <li>Marketing cookies: used to personalize content and promotions.</li>
      </ul>

      <h2><b>Third Parties</b></h2>
      <p>
        We may use third-party services (e.g., analytics and payments) that also place cookies for operational and security purposes.
      </p>

      <h2><b>Managing Cookies</b></h2>
      <p>
        You can configure or disable cookies through your browser settings. Disabling certain cookies may affect site functionality.
      </p>

      <h2><b>Policy Changes</b></h2>
      <p>
        This Cookie Policy may be updated from time to time. Material changes will be announced on the site.
      </p>

      <h2><b>Contact</b></h2>
      <p>
        For cookie-related inquiries, please contact us via the official contact page on the site.
      </p>
    </LegalLayout>
  );
}