'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

export function LanguageDemo() {
  const { t, language, setLanguage } = useLanguage();
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-3xl font-bold mb-4">{t('common.selectLanguage')}</h1>
        
        <div className="flex gap-4 mb-6">
          <Button
            onClick={() => setLanguage('en')}
            variant={language === 'en' ? 'default' : 'outline'}
          >
            🇬🇧 English
          </Button>
          <Button
            onClick={() => setLanguage('vi')}
            variant={language === 'vi' ? 'default' : 'outline'}
          >
            🇻🇳 Tiếng Việt
          </Button>
        </div>

        <div className="space-y-4">
          <section>
            <h2 className="text-xl font-semibold mb-2">{t('nav.home')}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">{t('nav.scholarships')}</p>
                <p className="text-gray-600">{t('scholarship.search')}</p>
              </div>
              <div>
                <p className="font-medium">{t('nav.applications')}</p>
                <p className="text-gray-600">{t('application.status')}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">{t('auth.signIn')}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">{t('auth.email')}</p>
                <p className="font-medium">{t('auth.password')}</p>
              </div>
              <div>
                <p className="font-medium">{t('auth.register')}</p>
                <p className="font-medium">{t('auth.forgotPassword')}</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">{t('common.loading')}</h2>
            <div className="flex gap-2">
              <Button size="sm">{t('common.save')}</Button>
              <Button size="sm" variant="outline">{t('common.cancel')}</Button>
              <Button size="sm" variant="destructive">{t('common.delete')}</Button>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">{t('role.student')}</h2>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">{t('role.applicant')}:</span> {t('scholarship.apply')}</p>
              <p><span className="font-medium">{t('role.provider')}:</span> {t('scholarship.create')}</p>
              <p><span className="font-medium">{t('role.admin')}:</span> {t('nav.users')}</p>
            </div>
          </section>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>{t('common.info')}:</strong> {' '}
          {language === 'en' 
            ? 'Language preference is saved to localStorage and persists across sessions.'
            : 'Tùy chọn ngôn ngữ được lưu vào localStorage và duy trì qua các phiên.'}
        </p>
      </div>
    </div>
  );
}
