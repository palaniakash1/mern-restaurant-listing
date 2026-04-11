import { publicShellClass, sectionWrapClass, sectionEyebrowClass } from '../utils/publicPage';

export default function TermsOfServicePage() {
  return (
    <main className={publicShellClass + ' pt-24'}>
      <section className={sectionWrapClass}>
        <div className="mb-12 text-center">
          <p className={sectionEyebrowClass}>Legal</p>
          <h1 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-gray-600">Last updated: April 2024</p>
        </div>

        <div className="mx-auto max-w-3xl space-y-8">
          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              1. Acceptance of Terms
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              By accessing and using EatWisely, you accept and agree to be bound
              by the terms and provisions of this agreement. If you do not agree
              to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              2. Use License
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              Permission is granted to temporarily use EatWisely for personal,
              non-commercial use only. This is the grant of a license, not a
              transfer of title, and under this license you may not: modify or
              copy the materials, use the materials for any commercial purpose,
              or transfer the materials to another person.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              3. User Account
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              When creating an account, you must provide accurate and complete
              information. You are responsible for maintaining the confidentiality
              of your account and password. You agree to accept responsibility
              for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              4. User Content
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              You retain ownership of any content you submit to EatWisely. By
              submitting content, you grant us a worldwide, royalty-free, perpetual,
              non-exclusive license to use, display, and distribute your content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              5. Prohibited Uses
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              You may not use our service in any way that: is unlawful, violates
              any third-party rights, uploads viruses or malware, collects
              user data without consent, or interferes with the operation of
              our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              6. Disclaimer
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              EatWisely is provided &quot;as is&quot; without any representations or
              warranties, express or implied. We do not warrant that the service
              will be uninterrupted or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              7. Limitation of Liability
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              EatWisely will not be liable to you in relation to the contents
              of, or use of, or otherwise in connection with, this website for
              any indirect, special, or consequential damages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              8. Governing Law
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              These terms and conditions are governed by and construed in
              accordance with the laws of the United Kingdom and you irrevocably
              submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#23411f]">
              9. Contact Us
            </h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              If you have any questions about these terms, please contact us at
              legal@eatwisely.com.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}