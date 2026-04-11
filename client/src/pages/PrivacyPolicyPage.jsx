import { publicShellClass, sectionWrapClass, sectionEyebrowClass } from '../utils/publicPage';

export default function PrivacyPolicyPage() {
  return (
    <main className={publicShellClass + ' pt-24'}>
      <section className={sectionWrapClass}>
        <div className="mb-12 text-center">
          <p className={sectionEyebrowClass}>Legal</p>
          <h1 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-gray-600">Last updated: April 2024</p>
        </div>

        <div className="mx-auto max-w-3xl space-y-8">
          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              1. Information We Collect
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              We collect information you provide directly to us, such as your name,
              email address, and profile picture when creating an account. We also collect
              information about your location to show nearby restaurants and your browsing history
              to personalize your experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              2. How We Use Your Information
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              Your information is used to provide and improve our services,
              personalize your experience, communicate with you about updates
              and promotions, and ensure compliance with our terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              3. Information Sharing
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              We do not sell your personal information. We may share information
              with service providers who assist in operating our platform, and
              we may disclose information when required by law or to protect our
              rights and safety.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              4. Data Security
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              We implement appropriate security measures to protect your personal
              information. While no method of transmission over the internet is
              completely secure, we strive to protect your data using industry-standard
              encryption and security practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              5. Your Rights
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              You have the right to access, update, or delete your personal information
              at any time. You can manage your account settings or contact us to
              exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              6. Changes to This Policy
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              We may update this privacy policy from time to time. We will notify
              you of any material changes by posting the new policy on this page
              and updating the &quot;last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              7. Contact Us
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              If you have any questions about this privacy policy, please contact
              us at privacy@eatwisely.com.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}