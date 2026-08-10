'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import { scholarshipServiceApi, CreateOpportunityRequest } from '@/services/scholarship.service';

// THAY ĐỔI: Định nghĩa enums khớp với API
enum ScholarshipLevel {
  UNDERGRADUATE = 'UNDERGRADUATE',
  MASTER = 'MASTER',
  PHD = 'PHD',
  POSTDOC = 'POSTDOC',
  RESEARCH = 'RESEARCH',
}

enum StudyMode {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  ONLINE = 'ONLINE',
}

// XÓA: Các hằng số cũ (COUNTRIES, STUDY_FIELDS, EDUCATION_LEVELS)

export default function CreateScholarshipPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  // THAY ĐỔI: Cập nhật state của form để khớp với API
  const [formData, setFormData] = useState({
    title: '',
    fullDescription: '',
    applicationDeadline: '',
    startDate: '',
    endDate: '', // Tùy chọn
    scholarshipAmount: '',
    minGpa: '',
    studyMode: StudyMode.FULL_TIME,
    level: ScholarshipLevel.MASTER,
    isPublic: true,
    contactEmail: '',
    website: '', // Tùy chọn
    tags: '', // Sẽ chuyển thành array
    requiredSkills: '', // Sẽ chuyển thành array
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Thêm logic validate ở đây

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        toast.error('Vui lòng nhập tiêu đề học bổng');
        return;
      }
      if (!formData.fullDescription.trim()) {
        toast.error('Vui lòng nhập mô tả học bổng');
        return;
      }
      if (!formData.applicationDeadline) {
        toast.error('Vui lòng chọn hạn nộp đơn');
        return;
      }
      if (!formData.startDate) {
        toast.error('Vui lòng chọn ngày bắt đầu');
        return;
      }
      if (!formData.scholarshipAmount) {
        toast.error('Vui lòng nhập số tiền học bổng');
        return;
      }

      // Tạo body request khớp với API
      const splitByComma = (str: string) =>
        str.split(',').map((item) => item.trim()).filter(Boolean);

      const apiBody: CreateOpportunityRequest = {
        title: formData.title.trim(),
        fullDescription: formData.fullDescription.trim(),
        applicationDeadline: formData.applicationDeadline,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        scholarshipAmount: parseFloat(formData.scholarshipAmount),
        minGpa: formData.minGpa ? parseFloat(formData.minGpa) : undefined,
        studyMode: formData.studyMode,
        level: formData.level,
        isPublic: formData.isPublic,
        contactEmail: formData.contactEmail || undefined,
        website: formData.website || null,
        tags: formData.tags ? splitByComma(formData.tags) : [],
        requiredSkills: formData.requiredSkills ? splitByComma(formData.requiredSkills) : [],
      };

      // Gọi API thực tế
      const result = await scholarshipServiceApi.createOpportunity(apiBody);
      
      console.log('Scholarship created successfully:', result);

      toast.success(t('createScholarship.success') || 'Tạo học bổng thành công!');
      router.push('/employer/scholarships');
    } catch (error: any) {
      const errorMessage = error?.message || t('createScholarship.error') || 'Tạo học bổng thất bại';
      toast.error(errorMessage);
      console.error('Error creating scholarship:', error);
    } finally {
      setLoading(false);
    }
  };

  // XÓA: Tất cả các hàm helper cũ (addRequirement, addBenefit, addField, v.v.)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-blue-50 to-brand-cyan-50 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/employer/scholarships')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('createScholarship.backButton')}
          </Button>
          <h1 className="text-3xl font-bold text-foreground">
            {t('createScholarship.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('createScholarship.subtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('createScholarship.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="title">
                  {t('createScholarship.scholarshipTitle')} *
                </Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Học bổng Nghiên cứu AI Mùa hè 2026"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="fullDescription">
                  Full Description (Mô tả đầy đủ) *
                </Label>
                <Textarea
                  id="fullDescription"
                  required
                  rows={6}
                  value={formData.fullDescription}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      fullDescription: e.target.value,
                    }))
                  }
                  placeholder="Cơ hội tham gia Lab AI tại MIT..."
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="scholarshipAmount">
                    Scholarship Amount (USD) *
                  </Label>
                  <Input
                    id="scholarshipAmount"
                    type="number"
                    required
                    value={formData.scholarshipAmount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scholarshipAmount: e.target.value,
                      }))
                    }
                    placeholder="35000"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="minGpa">Min GPA *</Label>
                  <Input
                    id="minGpa"
                    type="number"
                    step="0.1"
                    min="0"
                    max="4.0"
                    required
                    value={formData.minGpa}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        minGpa: e.target.value,
                      }))
                    }
                    placeholder="3.5"
                    className="mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="level">Level (Trình độ) *</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value: ScholarshipLevel) =>
                      setFormData((prev) => ({ ...prev, level: value }))
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ScholarshipLevel).map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="studyMode">Study Mode *</Label>
                  <Select
                    value={formData.studyMode}
                    onValueChange={(value: StudyMode) =>
                      setFormData((prev) => ({ ...prev, studyMode: value }))
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select study mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(StudyMode).map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* XÓA: Country và Field of Study */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="applicationDeadline">
                    Application Deadline *
                  </Label>
                  <Input
                    id="applicationDeadline"
                    type="date"
                    required
                    value={formData.applicationDeadline}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        applicationDeadline: e.target.value,
                      }))
                    }
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    className="mt-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* XÓA: Card Requirements */}
          {/* XÓA: Card Benefits */}

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('createScholarship.additionalInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* XÓA: Application Process */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="contactEmail">Contact Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    required
                    value={formData.contactEmail}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contactEmail: e.target.value,
                      }))
                    }
                    placeholder="contact@edumatch.edu"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="website">Website (Optional)</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        website: e.target.value,
                      }))
                    }
                    placeholder="https://edumatch.edu/ai"
                    className="mt-2"
                  />
                </div>
              </div>

              {/* THÊM: Tags và Required Skills */}
              <div>
                <Label htmlFor="tags">Tags *</Label>
                <Input
                  id="tags"
                  required
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tags: e.target.value }))
                  }
                  placeholder="AI, Research, STEM"
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Nhập các tags cách nhau bằng dấu phẩy.
                </p>
              </div>

              <div>
                <Label htmlFor="requiredSkills">Required Skills *</Label>
                <Input
                  id="requiredSkills"
                  required
                  value={formData.requiredSkills}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      requiredSkills: e.target.value,
                    }))
                  }
                  placeholder="Python, Machine Learning, TensorFlow"
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Nhập các kỹ năng cách nhau bằng dấu phẩy.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Publishing Options */}
          <Card>
            <CardHeader>
              <CardTitle>{t('createScholarship.publishingOptions')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublic" // THAY ĐỔI: id
                  checked={formData.isPublic} // THAY ĐỔI: state
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      isPublic: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="isPublic">
                  Public this opportunity (Công khai cơ hội này)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/employer/scholarships')}
              className="flex-1"
            >
              {t('createScholarship.cancel')}
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading
                ? t('createScholarship.creating')
                : t('createScholarship.createAndPublish')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}