import { useState } from 'react';
import { HiMail, HiPhone, HiLocationMarker, HiClock } from 'react-icons/hi';
import {
  publicShellClass,
  sectionWrapClass,
  sectionEyebrowClass,
  primaryButtonClass,
  surfaceCardClass,
  inputClass
} from '../utils/publicPage';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSubmitted(true);
    setLoading(false);
  };

  return (
    <main className={publicShellClass + ' pt-24'}>
      <section className={sectionWrapClass}>
        <div className="mb-12 text-center">
          <p className={sectionEyebrowClass}>Get in Touch</p>
          <h1 className="mt-3 text-2xl font-bold text-[#23411f] sm:text-3xl">
            Contact Us
          </h1>
          <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
            We&apos;d love to hear from you. Send us a message and we&apos;ll respond as soon as possible.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className={joinClasses(surfaceCardClass, 'p-8')}>
            <h2 className="text-xl font-bold text-[#23411f]">Send us a message</h2>

            {submitted ? (
              <div className="mt-6 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#f5faeb] text-[#8fa31e]">
                  <HiCheck className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#23411f]">
                  Message Sent!
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Thank you for reaching out. We&apos;ll get back to you soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#23411f]">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className={inputClass}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#23411f]">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={inputClass}
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#23411f]">
                    Subject
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  >
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="support">Technical Support</option>
                    <option value="partnership">Partnership</option>
                    <option value="feedback">Feedback</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#23411f]">
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className={inputClass}
                    placeholder="How can we help?"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={primaryButtonClass + ' w-full'}
                >
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>

          <div className="space-y-6">
            <div className={surfaceCardClass + ' p-6'}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f5faeb]">
                  <HiMail className="h-6 w-6 text-[#8fa31e]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#23411f]">Email</h3>
                  <p className="mt-1 text-sm text-gray-600">hello@eatwisely.com</p>
                  <p className="mt-1 text-sm text-gray-500">support@eatwisely.com</p>
                </div>
              </div>
            </div>

            <div className={surfaceCardClass + ' p-6'}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f5faeb]">
                  <HiPhone className="h-6 w-6 text-[#8fa31e]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#23411f]">Phone</h3>
                  <p className="mt-1 text-sm text-gray-600">+44 (0) 20 7946 0958</p>
                  <p className="mt-1 text-sm text-gray-500">Mon-Fri, 9am-6pm GMT</p>
                </div>
              </div>
            </div>

            <div className={surfaceCardClass + ' p-6'}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f5faeb]">
                  <HiLocationMarker className="h-6 w-6 text-[#8fa31e]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#23411f]">Address</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    123 Dining Street
                    <br />
                    London, LD1 5AB
                    <br />
                    United Kingdom
                  </p>
                </div>
              </div>
            </div>

            <div className={surfaceCardClass + ' p-6'}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f5faeb]">
                  <HiClock className="h-6 w-6 text-[#8fa31e]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#23411f]">Hours</h3>
                  <div className="mt-1 space-y-1 text-sm text-gray-600">
                    <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                    <p>Saturday: 10:00 AM - 4:00 PM</p>
                    <p>Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

import { joinClasses } from '../utils/publicPage';
import { HiCheck } from 'react-icons/hi';