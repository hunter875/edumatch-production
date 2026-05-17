'use client';

import React from 'react';
import { 
  Check, 
  Star, 
  Zap,
  Shield,
  Users,
  BookOpen,
  Award,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PricingPage() {
  const { t } = useLanguage();
  
  const plans = [
    {
      name: t('pricing.plan.free.name'),
      price: t('pricing.plan.free.price'),
      period: t('pricing.plan.free.period'),
      description: t('pricing.plan.free.description'),
      features: [
        t('pricing.feature.accessScholarships500'),
        t('pricing.feature.basicAI'),
        t('pricing.feature.applicationTracking'),
        t('pricing.feature.emailNotifications'),
        t('pricing.feature.mobileAccess'),
        t('pricing.feature.communitySupport')
      ],
      limitations: [
        t('pricing.limitations.applications5'),
        t('pricing.limitations.standardAccuracy'),
        t('pricing.limitations.basicProfile')
      ],
      cta: t('pricing.plan.free.cta'),
      popular: false,
      color: 'border-gray-200'
    },
    {
      name: t('pricing.plan.premium.name'),
      price: t('pricing.plan.premium.price'),
      period: t('pricing.plan.premium.period'),
      description: t('pricing.plan.premium.description'),
      features: [
        t('pricing.feature.accessScholarships2000'),
        t('pricing.feature.advancedAI'),
        t('pricing.feature.unlimitedApplications'),
        t('pricing.feature.priorityNotifications'),
        t('pricing.feature.advancedAnalytics'),
        t('pricing.feature.personalScore'),
        t('pricing.feature.applicationTemplates'),
        t('pricing.feature.deadlineReminders'),
        t('pricing.feature.prioritySupport')
      ],
      limitations: [],
      cta: t('pricing.plan.premium.cta'),
      popular: true,
      color: 'border-brand-blue-500'
    },
    {
      name: t('pricing.plan.pro.name'),
      price: t('pricing.plan.pro.price'),
      period: t('pricing.plan.pro.period'),
      description: t('pricing.plan.pro.description'),
      features: [
        t('pricing.feature.everythingPremium'),
        t('pricing.feature.personalConsultant'),
        t('pricing.feature.essayReview'),
        t('pricing.feature.interviewPrep'),
        t('pricing.feature.recommendationLetters'),
        t('pricing.feature.whiteGloveSupport'),
        t('pricing.feature.successGuarantee'),
        t('pricing.feature.exclusiveOpportunities'),
        t('pricing.feature.mentoringSession'),
        t('pricing.feature.support247')
      ],
      limitations: [],
      cta: t('pricing.plan.pro.cta'),
      popular: false,
      color: 'border-purple-500'
    }
  ];

  const enterpriseFeatures = [
    {
      icon: Shield,
      title: t('pricing.enterprise.security.title'),
      description: t('pricing.enterprise.security.description')
    },
    {
      icon: Users,
      title: t('pricing.enterprise.teamManagement.title'),
      description: t('pricing.enterprise.teamManagement.description')
    },
    {
      icon: TrendingUp,
      title: t('pricing.enterprise.analytics.title'),
      description: t('pricing.enterprise.analytics.description')
    },
    {
      icon: Zap,
      title: t('pricing.enterprise.api.title'),
      description: t('pricing.enterprise.api.description')
    }
  ];

  const faqs = [
    {
      question: t('pricing.faq.q1.question'),
      answer: t('pricing.faq.q1.answer')
    },
    {
      question: t('pricing.faq.q2.question'),
      answer: t('pricing.faq.q2.answer')
    },
    {
      question: t('pricing.faq.q3.question'),
      answer: t('pricing.faq.q3.answer')
    },
    {
      question: t('pricing.faq.q4.question'),
      answer: t('pricing.faq.q4.answer')
    },
    {
      question: t('pricing.faq.q5.question'),
      answer: t('pricing.faq.q5.answer')
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-pastel-hero py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient-primary mb-6">
            {t('pricing.hero.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            {t('pricing.hero.subtitle')}
          </p>
          <div className="flex justify-center">
            <Badge className="text-sm bg-blue-100 text-blue-700 border-blue-200">
              {t('pricing.hero.badge')}
            </Badge>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 section-gradient-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card key={index} className={`
                relative 
                ${plan.popular ? 'ring-2 ring-blue-500 card-gradient-purple' : 
                  index === 0 ? 'card-gradient-blue' : 'card-gradient-cyan'} 
                card-hover
              `}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-brand-blue-500 text-white">
                      <Star className="w-4 h-4 mr-1" />
                      {t('pricing.plan.premium.badge')}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-600 ml-2">/{plan.period}</span>
                  </div>
                  <p className="text-gray-600 mt-2">{plan.description}</p>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Features */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{t('pricing.included')}</h4>
                      <ul className="space-y-2">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-center text-sm">
                            <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Limitations */}
                    {plan.limitations.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">{t('pricing.limitations.title')}</h4>
                        <ul className="space-y-2">
                          {plan.limitations.map((limitation, limitIndex) => (
                            <li key={limitIndex} className="flex items-center text-sm text-gray-600">
                              <span className="w-4 h-4 mr-2 text-center">•</span>
                              <span>{limitation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Button 
                      asChild 
                      className={`w-full mt-6 ${plan.popular ? 'bg-brand-blue-600 hover:bg-brand-blue-700' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      <Link href={plan.name === 'Free' ? '/auth/register' : '/auth/register'}>
                        {plan.cta}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Enterprise Section */}
          <div className="mt-16 text-center">
            <Card className="bg-gray-50 border-2 border-dashed border-gray-300">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('pricing.enterprise.title')}</h3>
                <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                  {t('pricing.enterprise.subtitle')}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {enterpriseFeatures.map((feature, index) => (
                    <div key={index} className="text-center">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-3">
                        <feature.icon className="w-6 h-6 text-brand-blue-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">{feature.title}</h4>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  ))}
                </div>

                <Button asChild size="lg">
                  <Link href="/contact">
                    {t('pricing.enterprise.cta')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t('pricing.faq.title')}
            </h2>
            <p className="text-gray-600">
              {t('pricing.faq.subtitle')}
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {faq.question}
                  </h3>
                  <p className="text-gray-600">
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              {t('pricing.faq.stillHaveQuestions')}
            </p>
            <Button asChild variant="outline">
              <Link href="/contact">
                {t('pricing.faq.contactSupport')}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-brand-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('pricing.cta.title')}
          </h2>
          <p className="text-xl text-brand-blue-100 mb-8">
            {t('pricing.cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="secondary">
              <Link href="/auth/register">
                {t('pricing.cta.startFree')}
              </Link>
            </Button>
            <Button 
              asChild 
              size="lg" 
              variant="outline" 
              className="bg-transparent border-white text-white hover:bg-white hover:text-brand-blue-600"
            >
              <Link href="/user/scholarships">
                {t('pricing.cta.browse')}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}