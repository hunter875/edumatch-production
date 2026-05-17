'use client';

import React, { useState } from 'react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  Send,
  MessageSquare,
  HelpCircle,
  Building,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export default function ContactPage() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const contactMethods = [
    {
      icon: Mail,
      title: t('contact.method.email.title'),
      description: t('contact.method.email.description'),
      contact: t('contact.method.email.contact'),
      time: t('contact.method.email.time'),
      color: 'text-blue-600'
    },
    {
      icon: Phone,
      title: t('contact.method.phone.title'),
      description: t('contact.method.phone.description'),
      contact: t('contact.method.phone.contact'),
      time: t('contact.method.phone.time'),
      color: 'text-green-600'
    },
    {
      icon: MessageSquare,
      title: t('contact.method.chat.title'),
      description: t('contact.method.chat.description'),
      contact: t('contact.method.chat.contact'),
      time: t('contact.method.chat.time'),
      color: 'text-purple-600'
    }
  ];

  const offices = [
    {
      city: t('contact.office.sf.city'),
      address: t('contact.office.sf.address'),
      zipCode: t('contact.office.sf.zipCode'),
      phone: t('contact.office.sf.phone'),
      type: t('contact.office.sf.type')
    },
    {
      city: t('contact.office.ny.city'),
      address: t('contact.office.ny.address'),
      zipCode: t('contact.office.ny.zipCode'),
      phone: t('contact.office.ny.phone'),
      type: t('contact.office.ny.type')
    },
    {
      city: t('contact.office.austin.city'),
      address: t('contact.office.austin.address'),
      zipCode: t('contact.office.austin.zipCode'),
      phone: t('contact.office.austin.phone'),
      type: t('contact.office.austin.type')
    }
  ];

  const categories = [
    { value: 'general', label: t('contact.category.general') },
    { value: 'technical', label: t('contact.category.technical') },
    { value: 'billing', label: t('contact.category.billing') },
    { value: 'partnership', label: t('contact.category.partnership') },
    { value: 'feature', label: t('contact.category.feature') },
    { value: 'bug', label: t('contact.category.bug') }
  ];

  const faqs = [
    {
      question: t('contact.faq.q1.question'),
      answer: t('contact.faq.q1.answer')
    },
    {
      question: t('contact.faq.q2.question'),
      answer: t('contact.faq.q2.answer')
    },
    {
      question: t('contact.faq.q3.question'),
      answer: t('contact.faq.q3.answer')
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const toastId = toast.loading('Đang gửi tin nhắn...');
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success('Gửi tin nhắn thành công!', {
      id: toastId,
      description: 'Chúng tôi sẽ phản hồi trong vòng 24 giờ'
    });
    
    setIsSubmitted(true);
    setIsSubmitting(false);
    
    // Reset form after showing success message
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({
        name: '',
        email: '',
        subject: '',
        category: 'general',
        message: ''
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-pastel-hero py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient-primary mb-6">
            {t('contact.hero.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            {t('contact.hero.subtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Badge className="text-sm bg-blue-100 text-blue-700 border-blue-200">
              <Clock className="w-4 h-4 mr-2" />
              {t('contact.hero.badge1')}
            </Badge>
            <Badge className="text-sm bg-green-100 text-green-700 border-green-200">
              <Users className="w-4 h-4 mr-2" />
              {t('contact.hero.badge2')}
            </Badge>
            <Badge className="text-sm bg-purple-100 text-purple-700 border-purple-200">
              <HelpCircle className="w-4 h-4 mr-2" />
              {t('contact.hero.badge3')}
            </Badge>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 section-gradient-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gradient-primary mb-4">{t('contact.methods.title')}</h2>
            <p className="text-gray-600">{t('contact.methods.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {contactMethods.map((method, index) => (
              <Card key={index} className={`
                ${index % 3 === 0 ? 'card-gradient-blue' : 
                  index % 3 === 1 ? 'card-gradient-cyan' : 
                  'card-gradient-purple'} card-hover
              `}>
                <CardContent className="p-6 text-center">
                  <div className={`
                    ${index % 3 === 0 ? 'bg-icon-blue' : 
                      index % 3 === 1 ? 'bg-icon-green' : 
                      'bg-icon-purple'} 
                    w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center animate-scale-hover
                  `}>
                    <method.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {method.title}
                  </h3>
                  <p className="text-gray-600 mb-3">{method.description}</p>
                  <p className="font-medium text-blue-600">{method.contact}</p>
                  <p className="text-sm text-gray-500">{method.time}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact Form and FAQ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center text-gradient-blue">
                  <Send className="w-5 h-5 mr-2" />
                  {t('contact.form.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isSubmitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                      <Send className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {t('contact.form.successTitle')}
                    </h3>
                    <p className="text-gray-600">
                      {t('contact.form.successMessage')}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('contact.form.name')} {t('contact.form.required')}
                        </label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          required
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder={t('contact.form.namePlaceholder')}
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('contact.form.email')} {t('contact.form.required')}
                        </label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder={t('contact.form.emailPlaceholder')}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('contact.form.category')}
                      </label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue-500 focus:border-brand-blue-500"
                      >
                        {categories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('contact.form.subject')} {t('contact.form.required')}
                      </label>
                      <Input
                        id="subject"
                        name="subject"
                        type="text"
                        required
                        value={formData.subject}
                        onChange={handleInputChange}
                        placeholder={t('contact.form.subjectPlaceholder')}
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                        {t('contact.form.message')} {t('contact.form.required')}
                      </label>
                      <Textarea
                        id="message"
                        name="message"
                        required
                        rows={5}
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder={t('contact.form.messagePlaceholder')}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          {t('contact.form.submitting')}
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          {t('contact.form.submit')}
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* FAQ */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-900">{t('contact.faq.title')}</h3>
              
              {faqs.map((faq, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {faq.question}
                    </h4>
                    <p className="text-gray-600 text-sm">
                      {faq.answer}
                    </p>
                  </CardContent>
                </Card>
              ))}

              <Card className="bg-brand-blue-50 border-brand-blue-200">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-brand-blue-900 mb-2">
                    {t('contact.help.title')}
                  </h4>
                  <p className="text-brand-blue-700 text-sm mb-4">
                    {t('contact.help.description')}
                  </p>
                  <Button variant="outline" size="sm" className="border-brand-blue-300 text-brand-blue-700 hover:bg-brand-blue-100">
                    {t('contact.help.button')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Office Locations */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('contact.offices.title')}</h2>
            <p className="text-gray-600">{t('contact.offices.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {offices.map((office, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-brand-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Building className="w-5 h-5 text-brand-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{office.city}</h3>
                      <Badge variant="outline" className="text-xs">
                        {office.type}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p>{office.address}</p>
                        <p>{office.zipCode}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 text-gray-400 mr-2" />
                      <p>{office.phone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}