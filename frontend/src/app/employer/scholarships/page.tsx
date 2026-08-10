'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Edit, Trash2, Eye, Users, Calendar, DollarSign, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Scholarship, ScholarshipStatus } from '@/types';
import { formatDate } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Pagination } from '@/components/Pagination';
import { scholarshipServiceApi } from '@/services/scholarship.service';
import { mapOpportunityDtoToScholarship } from '@/lib/scholarship-mapper';
import { toast } from 'react-hot-toast';

export default function ProviderScholarshipsPage() {
  const { t } = useLanguage();
  
  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    hover: { y: -4, transition: { duration: 0.2 } }
  };
  
  // Fetch scholarships from API
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);
  
  // Fetch scholarships from API
  React.useEffect(() => {
    const fetchScholarships = async () => {
      try {
        setLoading(true);
        const data = await scholarshipServiceApi.getMyOpportunities();
        
        setScholarships(data.map((opp: any) => mapOpportunityDtoToScholarship(opp)));
      } catch (error: any) {
        console.error('Error fetching scholarships:', error);
        toast.error('Không thể tải danh sách học bổng: ' + (error?.message || 'Lỗi không xác định'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchScholarships();
  }, []);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    country: '',
    field: [] as string[],
    deadline: '',
    studyMode: 'Full-time' as 'Full-time' | 'Part-time' | 'Remote',
    stipend: '',
    requirements: [''],
  });
  const router = useRouter();

  const getStatusColor = (status: ScholarshipStatus) => {
    switch (status) {
      case ScholarshipStatus.PUBLISHED:
        return 'success';
      case ScholarshipStatus.DRAFT:
        return 'secondary';
      case ScholarshipStatus.CLOSED:
        return 'destructive';
      // case ScholarshipStatus.EXPIRED:
      //   return 'warning';
      default:
        return 'secondary';
    }
  };

  const filteredScholarships = scholarships.filter(scholarship => {
    const matchesSearch = !searchTerm || 
      scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scholarship.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || scholarship.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredScholarships.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedScholarships = filteredScholarships.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle delete scholarship
  const handleDelete = async (scholarshipId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa học bổng này?')) {
      return;
    }

    try {
      setLoading(true);
      await scholarshipServiceApi.deleteOpportunity(scholarshipId);
      toast.success('Xóa học bổng thành công!');
      
      // Refresh list
      const data = await scholarshipServiceApi.getMyOpportunities();
      setScholarships(data.map((opp: any) => mapOpportunityDtoToScholarship(opp)));
    } catch (error: any) {
      console.error('Error deleting scholarship:', error);
      toast.error('Xóa học bổng thất bại: ' + (error?.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  };

  // Handle edit - redirect to edit page
  const handleEdit = (scholarshipId: string) => {
    router.push(`/employer/scholarships/${scholarshipId}/edit`);
  };

  const stats = {
    total: scholarships.length,
    active: scholarships.filter(s => s.status === ScholarshipStatus.PUBLISHED).length,
    draft: scholarships.filter(s => s.status === ScholarshipStatus.DRAFT).length,
    closed: scholarships.filter(s => s.status === ScholarshipStatus.CLOSED).length,
  };

  const ScholarshipDetailModal = ({ scholarship }: { scholarship: Scholarship }) => (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center justify-between">
          <span>{scholarship.title}</span>
          <Badge variant={getStatusColor(scholarship.status as ScholarshipStatus)}>
            {scholarship.status}
          </Badge>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t('providerScholarships.details.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('providerScholarships.details.amount')}</p>
                <p className="font-semibold">{scholarship.amount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('providerScholarships.details.deadline')}</p>
                <p className="font-semibold">{scholarship.applicationDeadline ? formatDate(scholarship.applicationDeadline) : 'TBA'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('providerScholarships.details.level')}</p>
                <p className="font-semibold">{scholarship.level}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('providerScholarships.details.studyMode')}</p>
                <p className="font-semibold">{scholarship.studyMode}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">{t('providerScholarships.details.description')}</p>
              <p className="text-sm">{scholarship.description}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">{t('providerScholarships.details.fields')}</p>
              <div className="flex flex-wrap gap-2">
                {scholarship.requiredSkills?.map((field: string, index: number) => (
                  <Badge key={index} variant="outline">{field}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">{t('providerScholarships.details.requirements')}</p>
              <div className="space-y-1 text-sm">
                {Array.isArray(scholarship.requirements) ? (
                  (scholarship.requirements as string[]).map((requirement: string, index: number) => (
                    <p key={index}>• {requirement}</p>
                  ))
                ) : (
                  <p>• {t('providerScholarships.details.requirementsDefault')}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>{t('providerScholarships.stats.applications')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-brand-blue-600">45</p>
                <p className="text-sm text-muted-foreground">{t('providerScholarships.stats.applications')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">12</p>
                <p className="text-sm text-muted-foreground">{t('providerScholarships.stats.underReview')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">8</p>
                <p className="text-sm text-muted-foreground">{t('providerScholarships.stats.pending')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DialogContent>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Scholarship updated successfully!');
      router.push('/employer/scholarships');
    } catch (error) {
      alert('Failed to create scholarship');
    } finally {
      setLoading(false);
    }
  };

  const addRequirement = () => {
    setFormData(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }));
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-blue-50 to-brand-cyan-50 border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('providerScholarships.title')}</h1>
              <p className="text-muted-foreground mt-2">
                {t('providerScholarships.subtitle')}
              </p>
            </div>
            <Button className="mt-4 sm:mt-0" onClick={() => router.push('/employer/scholarships/create')}>
              <Plus className="h-4 w-4 mr-2" />
              {t('providerScholarships.create')}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 shadow-lg hover:shadow-2xl transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg mr-4">
                <DollarSign className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{stats.total}</p>
                <p className="text-xs text-muted-foreground">{t('providerScholarships.stats.total')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 shadow-lg hover:shadow-2xl transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-200 rounded-lg mr-4">
                <Calendar className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{stats.active}</p>
                <p className="text-xs text-muted-foreground">{t('providerScholarships.stats.published')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 shadow-lg hover:shadow-2xl transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mr-4">
                <Edit className="h-6 w-6 text-gray-700" />
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{stats.draft}</p>
                <p className="text-xs text-muted-foreground">{t('providerScholarships.stats.draft')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 shadow-lg hover:shadow-2xl transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-lg mr-4">
                <Users className="h-6 w-6 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{stats.closed}</p>
                <p className="text-xs text-muted-foreground">{t('providerScholarships.stats.closed')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder={t('providerScholarships.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={t('providerScholarships.filterStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('providerScholarships.all')}</SelectItem>
                  <SelectItem value={ScholarshipStatus.PUBLISHED}>{t('providerScholarships.stats.published')}</SelectItem>
                  <SelectItem value={ScholarshipStatus.DRAFT}>{t('providerScholarships.stats.draft')}</SelectItem>
                  <SelectItem value={ScholarshipStatus.CLOSED}>{t('providerScholarships.stats.closed')}</SelectItem>
                  {/* <SelectItem value={ScholarshipStatus.EXPIRED}>Expired</SelectItem> */}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Scholarships List */}
        <div className="space-y-6">
          {loading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-muted-foreground">Đang tải danh sách học bổng...</p>
              </CardContent>
            </Card>
          ) : filteredScholarships.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('providerScholarships.noResults')}</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? t('providerScholarships.noResultsDesc')
                    : t('providerScholarships.create')
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={() => router.push('/employer/scholarships/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Scholarship
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-6">
                {paginatedScholarships.map((scholarship) => (
                  <motion.div
                    key={scholarship.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 shadow-lg hover:shadow-2xl transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{scholarship.title}</h3>
                              <Badge variant={getStatusColor((scholarship as any).status)}>
                                {(scholarship as any).status}
                              </Badge>
                            </div>
                            
                            <p className="text-muted-foreground mb-3 line-clamp-2">{scholarship.description}</p>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-1" />
                                {scholarship.amount}
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                Deadline: {scholarship.applicationDeadline ? formatDate(scholarship.applicationDeadline) : 'TBA'}
                              </div>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {scholarship.applicationCount || 0} applications
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => router.push(`/employer/scholarships/${scholarship.id}/applications`)}
                              className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Applications
                            </Button>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="border-cyan-600 text-cyan-600 hover:bg-cyan-600 hover:text-white transition-colors">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                              </DialogTrigger>
                              <ScholarshipDetailModal scholarship={scholarship} />
                            </Dialog>

                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition-colors"
                              onClick={() => handleEdit(scholarship.id)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>

                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                              onClick={() => handleDelete(scholarship.id)}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredScholarships.length}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateScholarshipPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    country: '',
    field: [] as string[],
    deadline: '',
    studyMode: 'Full-time' as 'Full-time' | 'Part-time' | 'Remote',
    stipend: '',
    requirements: [''],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Scholarship created successfully!');
      router.push('/employer/scholarships');
    } catch (error) {
      alert('Failed to create scholarship');
    } finally {
      setLoading(false);
    }
  };

  const addRequirement = () => {
    setFormData(prev => ({
      ...prev,
      requirements: [...prev.requirements, '']
    }));
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/employer/scholarships')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Scholarships
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Create New Scholarship</h1>
        <p className="text-gray-600 mt-2">Fill in the details for your scholarship opportunity</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scholarship Title *
              </label>
              <Input
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter scholarship title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <Textarea
                required
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe the scholarship opportunity, goals, and what you're looking for in candidates..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country *
                </label>
                <Input
                  required
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))
                  }
                  placeholder="e.g., United States, Germany, Singapore"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Study Mode *
                </label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={formData.studyMode}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    studyMode: e.target.value as 'Full-time' | 'Part-time' | 'Remote'
                  }))}
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Deadline *
                </label>
                <Input
                  type="date"
                  required
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stipend (Optional)
                </label>
                <Input
                  value={formData.stipend}
                  onChange={(e) => setFormData(prev => ({ ...prev, stipend: e.target.value }))
                  }
                  placeholder="e.g., $50,000/year, €30,000/year"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.requirements.map((requirement, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  required
                  value={requirement}
                  onChange={(e) => updateRequirement(index, e.target.value)}
                  placeholder="Enter a requirement"
                  className="flex-1"
                />
                {formData.requirements.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeRequirement(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addRequirement}
            >
              Add Requirement
            </Button>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/employer/scholarships')}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Creating...' : 'Create Scholarship'}
          </Button>
        </div>
      </form>
    </div>
  );
}
