'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/lib/auth'
import { 
  GraduationCap, 
  Brain, 
  Zap, 
  BarChart3, 
  Users, 
  School, 
  Award, 
  TrendingUp,
  ArrowRight,
  CheckCircle
} from 'lucide-react'

export default function HomePage() {
  const { t } = useLanguage();
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      
      {/* 1. Hero Section (Sáng) */}
      <section className="relative bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 pt-20 pb-16 min-h-screen flex items-center overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-br from-blue-300/10 to-cyan-300/10 rounded-full blur-3xl animate-float" style={{animationDelay: '4s'}}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0 hover:from-blue-700 hover:to-cyan-700 shadow-lg">
              {t('home.hero.badge')}
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-balance leading-tight">
              <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-cyan-800 bg-clip-text text-transparent">
                {t('home.hero.title')}
              </span>
              <span className="block bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 bg-clip-text text-transparent animate-gradient pb-1 md:pb-2">
                {t('home.hero.subtitle')}
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto text-balance leading-relaxed">
              {t('home.hero.description')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 shadow-xl transform hover:scale-105 transition-all duration-300 text-lg border-0">
                <Link href="/user/scholarships">
                  {t('home.hero.browseScholarships')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-700 shadow-xl text-lg transition-all duration-300 bg-white/80 backdrop-blur-sm">
                <Link href="/employer/scholarships">
                  {t('home.hero.postOpportunities')}
                </Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success-500" />
                <span>{t('home.hero.trust1')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success-500" />
                <span>{t('home.hero.trust2')}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success-500" />
                <span>{t('home.hero.trust3')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Features Section (Sáng) */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">
              {t('home.features.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="card-hover border-0 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl transform hover:scale-110 transition-transform">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900">{t('home.features.ai.title')}</h3>
                <p className="text-muted-foreground">
                  {t('home.features.ai.desc')}
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 bg-gradient-to-br from-cyan-50 to-blue-50 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl transform hover:scale-110 transition-transform">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900">{t('home.features.realtime.title')}</h3>
                <p className="text-muted-foreground">
                  {t('home.features.realtime.desc')}
                </p>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="bg-gradient-to-br from-blue-600 to-cyan-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl transform hover:scale-110 transition-transform">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900">{t('home.features.analytics.title')}</h3>
                <p className="text-muted-foreground">
                  {t('home.features.analytics.desc')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section (Sáng) */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">
              {t('home.howItWorks.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('home.howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold text-white shadow-xl group-hover:scale-110 transition-transform">
                1
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">{t('home.howItWorks.step1.title')}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('home.howItWorks.step1.desc')}
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold text-white shadow-xl group-hover:scale-110 transition-transform">
                2
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">{t('home.howItWorks.step2.title')}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('home.howItWorks.step2.desc')}
              </p>
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold text-white shadow-xl group-hover:scale-110 transition-transform">
                3
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">{t('home.howItWorks.step3.title')}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {t('home.howItWorks.step3.desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Stats Section (Sáng) - ĐÃ THAY ĐỔI */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            
            {/* Stat 1 */}
            <div className="stat-card">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl transform hover:scale-110 transition-transform">
                  <Award className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">1000+</div>
              <div className="text-muted-foreground">{t('home.stats.scholarships')}</div>
            </div>
            
            {/* Stat 2 */}
            <div className="stat-card">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl transform hover:scale-110 transition-transform">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">5000+</div>
              <div className="text-muted-foreground">{t('home.stats.students')}</div>
            </div>
            
            {/* Stat 3 */}
            <div className="stat-card">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl transform hover:scale-110 transition-transform">
                  <School className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">200+</div>
              <div className="text-muted-foreground">{t('home.stats.universities')}</div>
            </div>
            
            {/* Stat 4 */}
            <div className="stat-card">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-blue-600 to-cyan-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl transform hover:scale-110 transition-transform">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">95%</div>
              <div className="text-muted-foreground">{t('home.stats.successRate')}</div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. CTA Section (Sáng) - ĐÃ THAY ĐỔI */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 relative overflow-hidden">
        {/* Background decorations (vẫn giữ để tạo độ sâu) */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-3xl md:text-5xl font-semibold mb-6 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            {t('home.cta.title')}
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('home.cta.description')}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Nút CTA chính - Giống hệt nút chính ở Hero */}
            <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 shadow-xl transform hover:scale-105 transition-all duration-300 text-lg border-0">
              <Link href="/auth/register">
                {t('home.cta.getStarted')}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            
            {/* Nút CTA phụ - Giống hệt nút phụ ở Hero */}
            <Button asChild size="lg" variant="outline" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-700 shadow-xl text-lg transition-all duration-300 bg-white/80 backdrop-blur-sm">
              <Link href="/about">
                {t('home.cta.learnMore')}
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}