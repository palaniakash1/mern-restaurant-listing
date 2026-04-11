import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiMail, HiPhone, HiLocationMarker, HiExternalLink } from 'react-icons/hi';
import { FaFacebook, FaTwitter, FaInstagram, FaYoutube } from 'react-icons/fa';
import logo from '../assets/eatwisely.ico';
import { joinClasses, surfaceCardClass, primaryButtonClass, inputClass } from '../utils/publicPage';

const footerLinks = {
  explore: [
    { to: '/restaurants', label: 'Restaurants' },
    { to: '/menu', label: 'Menus' },
    { to: '/gallery', label: 'Gallery' },
    { to: '/reviews', label: 'Reviews' },
    { to: '/favorites', label: 'Favorites' }
  ],
  company: [
    { to: '/about', label: 'About Us' },
    { to: '/contact', label: 'Contact' },
    { to: '/faq', label: 'FAQ' },
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/terms', label: 'Terms of Service' }
  ]
};

const inquiryTypes = [
  'Partnership Inquiry',
  'Restaurant Listing',
  'Technical Support',
  'Complaint',
  'Feedback',
  'Other'
];

export default function Footer() {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ type: '', name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setShowModal(false);
      setSubmitted(false);
      setFormData({ type: '', name: '', email: '', message: '' });
    }, 2000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <footer className="bg-[#1a2f16] text-white">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 xl:px-8 py-16">
          <div className="grid gap-12 lg:grid-cols-3">
            <div className="space-y-6">
              <Link to="/">
                <img src={logo} alt="EatWisely" className="h-12 w-auto" />
              </Link>
              <p className="text-sm leading-7 text-white/70">
                Discover exceptional dining experiences. Find the best restaurants, 
                read honest reviews, and make informed dining decisions.
              </p>
              <div className="flex gap-3">
                <a href="#" className="rounded-full bg-white/10 p-2.5 transition hover:bg-white/20">
                  <FaFacebook className="h-5 w-5" />
                </a>
                <a href="#" className="rounded-full bg-white/10 p-2.5 transition hover:bg-white/20">
                  <FaTwitter className="h-5 w-5" />
                </a>
                <a href="#" className="rounded-full bg-white/10 p-2.5 transition hover:bg-white/20">
                  <FaInstagram className="h-5 w-5" />
                </a>
                <a href="#" className="rounded-full bg-white/10 p-2.5 transition hover:bg-white/20">
                  <FaYoutube className="h-5 w-5" />
                </a>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className={joinClasses(primaryButtonClass, 'w-full sm:w-auto')}
              >
                <HiExternalLink className="h-5 w-5" />
                Partner With Us
              </button>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
                  Explore
                </h3>
                <ul className="space-y-3">
                  {footerLinks.explore.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-sm text-white/70 transition hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
                  Company
                </h3>
                <ul className="space-y-3">
                  {footerLinks.company.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-sm text-white/70 transition hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
                Get in Touch
              </h3>
              <div className="space-y-3">
                <a href="mailto:hello@eatwisely.com" className="flex items-center gap-3 text-sm text-white/70 hover:text-white">
                  <HiMail className="h-5 w-5 shrink-0" />
                  <span>hello@eatwisely.com</span>
                </a>
                <a href="tel:+442079460958" className="flex items-center gap-3 text-sm text-white/70 hover:text-white">
                  <HiPhone className="h-5 w-5 shrink-0" />
                  <span>+44 (0) 20 7946 0958</span>
                </a>
                <div className="flex items-start gap-3 text-sm text-white/70">
                  <HiLocationMarker className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>
                    123 Dining Street<br />
                    London, LD1 5AB<br />
                    United Kingdom
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 xl:px-8 py-6">
            <div className="flex flex-col items-center justify-between gap-4 text-sm text-white/50 sm:flex-row">
              <p>&copy; {new Date().getFullYear()} EatWisely. All rights reserved.</p>
              <p>Designed & Developed with care ❤️ by <a href="https://www.digimaraa.com" className='text-white'>DIGIMARAA TECHNOLOGIES</a></p>
            </div>
          </div>
        </div>
      </footer>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className={joinClasses(surfaceCardClass, 'w-full max-w-md p-6')}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#23411f]">Get in Touch</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {submitted ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f5faeb]">
                  <svg className="h-8 w-8 text-[#8fa31e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[#23411f]">Thank You!</h3>
                <p className="mt-2 text-sm text-gray-600">We&apos;ll get back to you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#23411f]">
                    Inquiry Type
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  >
                    <option value="">Select an option</option>
                    {inquiryTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

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
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className={inputClass}
                    placeholder="How can we help?"
                  />
                </div>

                <button type="submit" className={primaryButtonClass + ' w-full'}>
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}