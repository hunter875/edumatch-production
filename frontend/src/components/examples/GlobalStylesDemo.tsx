/**
 * Global Styles Demo Component
 * Demonstrates how to use the global CSS classes across the application
 */

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Zap, 
  BarChart3, 
  Users, 
  School, 
  Award, 
  TrendingUp,
  ArrowRight,
  CheckCircle,
  Shield,
  Clock
} from 'lucide-react'

export default function GlobalStylesDemo() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section Example */}
      <section className="py-20 bg-gradient-primary text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <Badge className="mb-4 bg-white/20 text-white border-white/30">
            🎨 Global Styles Demo
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Beautiful Design System
            <span className="block text-gradient-primary bg-white text-transparent bg-clip-text">
              Across All Pages
            </span>
          </h1>
          
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Sử dụng các class CSS toàn cục để tạo giao diện nhất quán và đẹp mắt
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl transform hover:scale-105 transition-all duration-300">
              Primary Button
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button size="lg" variant="outline" className="border-2 border-white/80 text-white hover:bg-white/10 hover:border-white backdrop-blur-sm shadow-xl">
              Outline Button
            </Button>
          </div>
        </div>
      </section>

      {/* Cards Section Example */}
      <section className="py-20 section-overlay">
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gradient-primary mb-4">
              Card Variations
            </h2>
            <p className="text-muted-foreground">Different card styles using global classes</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Blue Card */}
            <Card className="card-gradient-blue card-hover">
              <CardContent className="p-8 text-center">
                <div className="bg-icon-blue w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-scale-hover">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Blue Theme</h3>
                <p className="text-muted-foreground">
                  Card với gradient xanh dương và hiệu ứng hover mượt mà
                </p>
              </CardContent>
            </Card>

            {/* Cyan Card */}
            <Card className="card-gradient-cyan card-hover">
              <CardContent className="p-8 text-center">
                <div className="bg-icon-cyan w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-scale-hover">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Cyan Theme</h3>
                <p className="text-muted-foreground">
                  Card với gradient xanh cyan tươi mới
                </p>
              </CardContent>
            </Card>

            {/* Purple Card */}
            <Card className="card-gradient-purple card-hover">
              <CardContent className="p-8 text-center">
                <div className="bg-icon-pink w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-scale-hover">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Purple Theme</h3>
                <p className="text-muted-foreground">
                  Card với gradient tím và hồng sang trọng
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section Example */}
      <section className="py-16 section-gradient-light">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gradient-blue mb-4">
              Statistics với Gradient Icons
            </h2>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div className="stat-card">
              <div className="flex justify-center mb-4">
                <div className="stat-icon bg-icon-blue">
                  <Award className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="stat-number text-gradient-blue">1000+</div>
              <div className="text-muted-foreground">Blue Stats</div>
            </div>
            
            <div className="stat-card">
              <div className="flex justify-center mb-4">
                <div className="stat-icon bg-icon-green">
                  <Users className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="stat-number text-gradient-blue">5000+</div>
              <div className="text-muted-foreground">Green Stats</div>
            </div>
            
            <div className="stat-card">
              <div className="flex justify-center mb-4">
                <div className="stat-icon bg-icon-purple">
                  <School className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="stat-number text-gradient-blue">200+</div>
              <div className="text-muted-foreground">Purple Stats</div>
            </div>
            
            <div className="stat-card">
              <div className="flex justify-center mb-4">
                <div className="stat-icon bg-icon-orange">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="stat-number text-gradient-blue">95%</div>
              <div className="text-muted-foreground">Orange Stats</div>
            </div>
          </div>
        </div>
      </section>

      {/* Animation Examples */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gradient-primary mb-12">
            Animation Examples
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-gradient-secondary rounded-xl">
              <div className="w-20 h-20 bg-gradient-primary rounded-full mx-auto mb-4 animate-float"></div>
              <h3 className="font-semibold mb-2">Float Animation</h3>
              <p className="text-sm text-muted-foreground">Hiệu ứng bay lơ lửng</p>
            </div>
            
            <div className="p-8 bg-gradient-secondary rounded-xl">
              <div className="w-20 h-20 bg-gradient-primary rounded-full mx-auto mb-4 animate-scale-hover"></div>
              <h3 className="font-semibold mb-2">Scale on Hover</h3>
              <p className="text-sm text-muted-foreground">Hover để phóng to</p>
            </div>
            
            <div className="p-8 bg-gradient-secondary rounded-xl">
              <div className="w-20 h-20 bg-gradient-primary rounded-full mx-auto mb-4 animate-pulse-glow"></div>
              <h3 className="font-semibold mb-2">Pulse Glow</h3>
              <p className="text-sm text-muted-foreground">Hiệu ứng sáng nhấp nháy</p>
            </div>
          </div>
        </div>
      </section>

      {/* Usage Guide */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gradient-primary mb-12">
            Cách Sử Dụng Global Classes
          </h2>
          
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-gradient-blue">Gradient Backgrounds</h3>
              <div className="space-y-2 text-sm font-mono bg-gray-100 p-4 rounded">
                <div>.bg-gradient-primary - Gradient chính (blue → purple → cyan)</div>
                <div>.bg-gradient-secondary - Gradient nhẹ (light blue → indigo → purple)</div>
                <div>.section-gradient-light - Cho section backgrounds</div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-gradient-blue">Gradient Text</h3>
              <div className="space-y-2 text-sm font-mono bg-gray-100 p-4 rounded">
                <div>.text-gradient-primary - Text gradient đầy đủ</div>
                <div>.text-gradient-blue - Text gradient blue → purple</div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-gradient-blue">Icon Backgrounds</h3>
              <div className="space-y-2 text-sm font-mono bg-gray-100 p-4 rounded">
                <div>.bg-icon-blue, .bg-icon-purple, .bg-icon-cyan</div>
                <div>.bg-icon-green, .bg-icon-orange, .bg-icon-pink</div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-gradient-blue">Card Styles</h3>
              <div className="space-y-2 text-sm font-mono bg-gray-100 p-4 rounded">
                <div>.card-gradient-blue, .card-gradient-cyan, .card-gradient-purple</div>
                <div>.card-hover - Hiệu ứng hover cho cards</div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold mb-4 text-gradient-blue">Animations</h3>
              <div className="space-y-2 text-sm font-mono bg-gray-100 p-4 rounded">
                <div>.animate-float - Hiệu ứng bay lơ lửng</div>
                <div>.animate-scale-hover - Phóng to khi hover</div>
                <div>.animate-pulse-glow - Sáng nhấp nháy</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}