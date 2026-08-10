'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Github, Twitter, Linkedin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-gray-50 to-gray-100 border-t border-gray-200">
      {/* Main Footer Content - Full Width */}
      <div className="w-full px-8 lg:px-16 xl:px-24 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">E</span>
              </div>
              <span className="font-bold text-2xl text-gray-900">EduMatch</span>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t('footer.description') || 'Kết nối sinh viên với cơ hội học bổng và nhà cung cấp với ứng viên đủ tiêu chuẩn. Làm cho giáo dục trở nên dễ tiếp cận hơn.'}
            </p>
            <p className="text-gray-500 text-xs italic">
              Connecting students with scholarship opportunities and providers with qualified candidates.
            </p>
            <div className="flex space-x-3 mt-4">
                <a 
                  href="#" 
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                >
                  <Github className="h-5 w-5" />
                </a>
              </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h3 className="font-bold text-gray-900 text-lg">
              {t('footer.quickLinks') || 'Liên kết nhanh'}
              <span className="block text-xs text-gray-500 font-normal mt-1">Quick Links</span>
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-gray-600 hover:text-blue-600 text-sm transition-all hover:translate-x-1 inline-block">
                  {t('footer.home') || 'Trang chủ'}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-blue-600 text-sm transition-all hover:translate-x-1 inline-block">
                  {t('footer.aboutUs') || 'Về chúng tôi'}
                </Link>
              </li>
              <li>
                <Link href="/scholarships" className="text-gray-600 hover:text-blue-600 text-sm transition-all hover:translate-x-1 inline-block">
                  {t('footer.browseScholarships') || 'Duyệt học bổng'}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-600 hover:text-blue-600 text-sm transition-all hover:translate-x-1 inline-block">
                  {t('footer.pricingPlans') || 'Gói dịch vụ'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h3 className="font-bold text-gray-900 text-lg">
              {t('footer.support') || 'Hỗ trợ'}
              <span className="block text-xs text-gray-500 font-normal mt-1">Support</span>
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-blue-600 text-sm transition-all hover:translate-x-1 inline-block">
                  {t('footer.contactUs') || 'Liên hệ'}
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-gray-600 hover:text-blue-600 text-sm transition-all hover:translate-x-1 inline-block">
                  {t('footer.helpCenter') || 'Trung tâm trợ giúp'}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-600 hover:text-blue-600 text-sm transition-all hover:translate-x-1 inline-block">
                  {t('footer.faq') || 'Câu hỏi thường gặp'}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-blue-600 text-sm transition-all hover:translate-x-1 inline-block">
                  {t('footer.privacyPolicy') || 'Chính sách bảo mật'}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-blue-600 text-sm transition-all hover:translate-x-1 inline-block">
                  {t('footer.termsOfService') || 'Điều khoản dịch vụ'}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h3 className="font-bold text-gray-900 text-lg">
              {t('footer.getInTouch') || 'Liên lạc với chúng tôi'}
              <span className="block text-xs text-gray-500 font-normal mt-1">Get in Touch</span>
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 group">
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <a href="mailto:support@edumatch.com" className="text-sm text-gray-700 hover:text-blue-600 transition-colors break-all">
                    support@edumatch.com
                  </a>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 group">
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-green-50 group-hover:bg-green-100 transition-colors">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Điện thoại</p>
                  <a href="tel:+15551234567" className="text-sm text-gray-700 hover:text-blue-600 transition-colors">
                    +1 (555) 123-4567
                  </a>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 group">
                <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-purple-50 group-hover:bg-purple-100 transition-colors">
                  <MapPin className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-1">Địa chỉ</p>
                  <span className="text-sm text-gray-700">
                    {t('footer.address') || '123 Education Street'}<br />
                    {t('footer.city') || 'San Francisco, CA 94105'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar - Full Width with darker background */}
      <div className="w-full bg-gray-800 text-gray-300 py-6 px-8 lg:px-16 xl:px-24">
        <div className="flex justify-center items-center">
          <div className="text-sm text-center">
            © {currentYear} EduMatch. {t('footer.allRights') || 'Tất cả quyền được bảo lưu'}
          </div>
        </div>
      </div>
    </footer>
  );
}