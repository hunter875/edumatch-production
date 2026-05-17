'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Save,
  Eye,
  Plus,
  Trash2,
  Upload,
  Calendar,
  DollarSign,
  FileText,
  Users,
  Globe,
  Target,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { toast } from 'sonner';
import { scholarshipServiceApi, CreateOpportunityRequest } from '@/services/scholarship.service';

// Enums matching API
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
  HYBRID = 'HYBRID',
}

export default function EditScholarshipPage() {
  const params = useParams();
  const router = useRouter();
  const scholarshipId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Form state matching CreateOpportunityRequest
  const [formData, setFormData] = useState({
    title: '',
    fullDescription: '',
    applicationDeadline: '',
    startDate: '',
    endDate: '',
    scholarshipAmount: '',
    minGpa: '',
    minGPA: 0,
    studyMode: StudyMode.FULL_TIME,
    level: ScholarshipLevel.MASTER,
    isPublic: true,
    contactEmail: '',
    website: '',
    tags: '',
    requiredSkills: '',
    // Additional fields for UI
    requirements: [] as string[],
    benefits: [] as string[],
    citizenship: 'any',
    academicLevel: [] as string[],
    majors: [] as string[],
    documentsRequired: [] as string[],
    interviews: false,
    additionalQuestions: [] as string[],
  });

  // Fetch scholarship data on mount
  useEffect(() => {
    const fetchScholarship = async () => {
      try {
        setLoading(true);
        // Get all opportunities and find the one with matching ID
        const data = await scholarshipServiceApi.getMyOpportunities();
        const scholarship = data.find((opp: any) => String(opp.id) === scholarshipId);
        
        if (!scholarship) {
          toast.error('Không tìm thấy học bổng');
          router.push('/employer/scholarships');
          return;
        }

        // Map API data to form
        setFormData({
          title: scholarship.title || '',
          fullDescription: scholarship.description || '',
          applicationDeadline: scholarship.applicationDeadline || '',
          startDate: scholarship.startDate || '',
          endDate: scholarship.endDate || '',
          scholarshipAmount: scholarship.scholarshipAmount ? String(scholarship.scholarshipAmount) : '',
          minGpa: scholarship.minGpa ? String(scholarship.minGpa) : '',
          minGPA: scholarship.minGpa || 0,
          studyMode: (scholarship.studyMode as StudyMode) || StudyMode.FULL_TIME,
          level: (scholarship.level as ScholarshipLevel) || ScholarshipLevel.MASTER,
          isPublic: scholarship.isPublic !== undefined ? scholarship.isPublic : true,
          contactEmail: scholarship.contactEmail || '',
          website: scholarship.website || '',
          tags: scholarship.tags ? scholarship.tags.join(', ') : '',
          requiredSkills: scholarship.requiredSkills ? scholarship.requiredSkills.join(', ') : '',
          // Additional fields - initialize with defaults
          requirements: [],
          benefits: [],
          citizenship: 'any',
          academicLevel: [],
          majors: [],
          documentsRequired: [],
          interviews: false,
          additionalQuestions: [],
        });
      } catch (error: any) {
        console.error('Error fetching scholarship:', error);
        toast.error('Không thể tải thông tin học bổng: ' + (error?.message || 'Lỗi không xác định'));
        router.push('/employer/scholarships');
      } finally {
        setLoading(false);
      }
    };

    if (scholarshipId) {
      fetchScholarship();
    }
  }, [scholarshipId, router]);

  // Track if form is dirty (simplified - can be enhanced)
  useEffect(() => {
    // Simple dirty check - form has been modified
    setIsDirty(true);
  }, [formData]);

  const handleSave = async () => {
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

    setIsSaving(true);
    try {
      // Prepare API body
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

      // Call API to update
      await scholarshipServiceApi.updateOpportunity(scholarshipId, apiBody);
      
      setIsDirty(false);
      toast.success('Cập nhật học bổng thành công!');
      router.push('/employer/scholarships');
    } catch (error: any) {
      console.error('Error updating scholarship:', error);
      toast.error('Cập nhật học bổng thất bại: ' + (error?.message || 'Lỗi không xác định'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishToggle = () => {
    setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }));
  };

  // Helper functions for managing arrays
  const addRequirement = () => {
    setFormData(prev => ({ ...prev, requirements: [...prev.requirements, ''] }));
  };

  const updateRequirement = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.map((req, i) => i === index ? value : req)
    }));
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index)
    }));
  };

  const addBenefit = () => {
    setFormData(prev => ({ ...prev, benefits: [...prev.benefits, ''] }));
  };

  const updateBenefit = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.map((benefit, i) => i === index ? value : benefit)
    }));
  };

  const removeBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const addQuestion = () => {
    setFormData(prev => ({ ...prev, additionalQuestions: [...prev.additionalQuestions, ''] }));
  };

  const updateQuestion = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      additionalQuestions: prev.additionalQuestions.map((q, i) => i === index ? value : q)
    }));
  };

  const removeQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalQuestions: prev.additionalQuestions.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải thông tin học bổng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild>
                <Link href="/employer/scholarships">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Scholarships
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Edit Scholarship</h1>
                <p className="text-gray-600">
                  {formData.title}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Label htmlFor="publish-toggle">Public</Label>
                <Switch
                  id="publish-toggle"
                  checked={formData.isPublic}
                  onCheckedChange={handlePublishToggle}
                />
              </div>
              
              <Button variant="outline" asChild>
                <Link href={`/employer/scholarships/${scholarshipId}/applications`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Applications
                </Link>
              </Button>
              
              <Button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="bg-brand-blue-600 hover:bg-brand-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
            <TabsTrigger value="application">Application</TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Basic Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Scholarship Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter scholarship title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="level">Level *</Label>
                    <Select
                      value={formData.level}
                      onValueChange={(value) => {
                        const level = value as ScholarshipLevel;
                        setFormData(prev => ({ ...prev, level }));
                      }}
                    >
                      <SelectTrigger>
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="studyMode">Study Mode *</Label>
                    <Select
                      value={formData.studyMode}
                      onValueChange={(value) => {
                        const studyMode = value as StudyMode;
                        setFormData(prev => ({ ...prev, studyMode }));
                      }}
                    >
                      <SelectTrigger>
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

                <div className="space-y-2">
                  <Label htmlFor="fullDescription">Full Description *</Label>
                  <Textarea
                    id="fullDescription"
                    value={formData.fullDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullDescription: e.target.value }))}
                    placeholder="Detailed description of the scholarship program"
                    className="min-h-[200px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="research, AI, machine learning"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="requiredSkills">Required Skills (comma-separated)</Label>
                    <Input
                      id="requiredSkills"
                      value={formData.requiredSkills}
                      onChange={(e) => setFormData(prev => ({ ...prev, requiredSkills: e.target.value }))}
                      placeholder="Python, TensorFlow, Research"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Funding Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="scholarshipAmount">Scholarship Amount (USD) *</Label>
                    <Input
                      id="scholarshipAmount"
                      type="number"
                      value={formData.scholarshipAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, scholarshipAmount: e.target.value }))}
                      placeholder="50000"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="minGpa">Min GPA</Label>
                    <Input
                      id="minGpa"
                      type="number"
                      step="0.1"
                      min="0"
                      max="4.0"
                      value={formData.minGpa}
                      onChange={(e) => setFormData(prev => ({ ...prev, minGpa: e.target.value }))}
                      placeholder="3.5"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="applicationDeadline">Application Deadline *</Label>
                    <Input
                      id="applicationDeadline"
                      type="date"
                      value={formData.applicationDeadline}
                      onChange={(e) => setFormData(prev => ({ ...prev, applicationDeadline: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date (Optional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.requirements.map((requirement, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={requirement}
                      onChange={(e) => updateRequirement(index, e.target.value)}
                      placeholder="Enter requirement"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeRequirement(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addRequirement}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Requirement
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Benefits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={benefit}
                      onChange={(e) => updateBenefit(index, e.target.value)}
                      placeholder="Enter benefit"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeBenefit(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" onClick={addBenefit}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Benefit
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Eligibility Tab */}
          <TabsContent value="eligibility" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Eligibility Criteria</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="minGPA">Minimum GPA</Label>
                    <Input
                      id="minGPA"
                      type="number"
                      step="0.1"
                      min="0"
                      max="4"
                      value={formData.minGPA}
                      onChange={(e) => setFormData(prev => ({ ...prev, minGPA: parseFloat(e.target.value) }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="citizenship">Citizenship Requirements</Label>
                    <Select
                      value={formData.citizenship}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, citizenship: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select requirement" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any citizenship</SelectItem>
                        <SelectItem value="us">US Citizens only</SelectItem>
                        <SelectItem value="international">International students</SelectItem>
                        <SelectItem value="permanent">US Citizens & Permanent Residents</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Academic Level</Label>
                  <div className="flex flex-wrap gap-2">
                    {['undergraduate', 'masters', 'phd'].map((level) => (
                      <Badge
                        key={level}
                        variant={formData.academicLevel.includes(level) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            academicLevel: prev.academicLevel.includes(level)
                              ? prev.academicLevel.filter(l => l !== level)
                              : [...prev.academicLevel, level]
                          }));
                        }}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Eligible Majors</Label>
                  <Textarea
                    value={formData.majors.join('\n')}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      majors: e.target.value.split('\n').filter(m => m.trim())
                    }))}
                    placeholder="Enter each major on a new line"
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Application Tab */}
          <TabsContent value="application" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Application Process</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Required Documents</Label>
                  <div className="flex flex-wrap gap-2">
                    {['cv', 'transcript', 'personal_statement', 'portfolio', 'letters_of_recommendation'].map((doc) => (
                      <Badge
                        key={doc}
                        variant={formData.documentsRequired.includes(doc) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            documentsRequired: prev.documentsRequired.includes(doc)
                              ? prev.documentsRequired.filter(d => d !== doc)
                              : [...prev.documentsRequired, doc]
                          }));
                        }}
                      >
                        {doc.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="interviews"
                    checked={formData.interviews}
                    onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, interviews: checked }))}
                  />
                  <Label htmlFor="interviews">Require interviews</Label>
                </div>

                <div className="space-y-4">
                  <Label>Additional Application Questions</Label>
                  {formData.additionalQuestions.map((question, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <Textarea
                        value={question}
                        onChange={(e) => updateQuestion(index, e.target.value)}
                        placeholder="Enter additional question"
                        className="flex-1 min-h-[60px]"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeQuestion(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addQuestion}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Unsaved Changes Warning */}
        {isDirty && (
          <div className="fixed bottom-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-yellow-800">You have unsaved changes</span>
              <Button size="sm" onClick={handleSave}>
                Save Now
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
