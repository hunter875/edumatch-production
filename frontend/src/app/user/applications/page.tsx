'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  FileText,
  Download,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApplications } from '@/hooks/api';
import { scholarshipServiceApi } from '@/services/scholarship.service';
import { mapOpportunityDtoToScholarship, mapOpportunityDetailToScholarship } from '@/lib/scholarship-mapper';
import { Application, Scholarship } from '@/types';
import { toast } from 'react-hot-toast';

export default function ApplicationsPage() {
  const { t } = useLanguage();
  
  // Fetch applications from API
  const { applications: apiApplications, fetchApplications, loading: appsLoading } = useApplications();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch applications
        await fetchApplications();
      } catch (error) {
        console.error('Error fetching applications data:', error);
        toast.error('Failed to load applications');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [fetchApplications]);
  
  // Fetch scholarships when applications change
  useEffect(() => {
    const fetchScholarships = async () => {
      if (apiApplications.length === 0) {
        setLoading(false);
        return;
      }
      
      try {
        const scholarshipIds = [...new Set(apiApplications.map(app => app.scholarshipId).filter(Boolean))];
        
        if (scholarshipIds.length === 0) {
          setLoading(false);
          return;
        }
        
        console.log('Fetching scholarships for IDs:', scholarshipIds);
        
        const scholarshipPromises = scholarshipIds.map(async (id) => {
          try {
            const response = await scholarshipServiceApi.getScholarshipById(id);
            console.log(`Scholarship ${id} response:`, response);
            
            // Check if response has opportunity field (OpportunityDetailDto) or is direct OpportunityDto
            if (response.opportunity) {
              const mapped = mapOpportunityDetailToScholarship(response);
              return mapped.scholarship;
            } else {
              return mapOpportunityDtoToScholarship(response);
            }
          } catch (err) {
            console.error(`Error fetching scholarship ${id}:`, err);
            return null;
          }
        });
        
        const fetchedScholarships = (await Promise.all(scholarshipPromises)).filter(Boolean) as Scholarship[];
        console.log('Fetched scholarships:', fetchedScholarships);
        setScholarships(fetchedScholarships);
      } catch (error) {
        console.error('Error fetching scholarships:', error);
        toast.error('Failed to load scholarship details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchScholarships();
  }, [apiApplications]);
  
  // Use applications from API hook
  const applications = apiApplications;

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACCEPTED':
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'UNDER_REVIEW':
      case 'VIEWED':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'SUBMITTED':
      case 'PENDING':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACCEPTED':
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'destructive';
      case 'UNDER_REVIEW':
      case 'VIEWED':
        return 'warning';
      case 'SUBMITTED':
      case 'PENDING':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACCEPTED':
      case 'APPROVED':
        return t('applicantApplications.stats.accepted');
      case 'REJECTED':
        return t('applicantApplications.stats.rejected');
      case 'UNDER_REVIEW':
      case 'VIEWED':
        return t('applicantApplications.stats.underReview');
      case 'SUBMITTED':
      case 'PENDING':
        return t('applicantApplications.stats.submitted');
      default:
        return status || 'Unknown';
    }
  };

  const filteredApplications = applications.filter(app => {
    // Allow applications to show even if scholarship not loaded yet
    const scholarship = scholarships.find(s => 
      s.id === app.scholarshipId || 
      s.id?.toString() === app.scholarshipId?.toString() ||
      app.scholarshipId?.toString() === s.id?.toString()
    );
    
    // If scholarship not found yet, still show application (just filter by status)
    if (!scholarship) {
      const matchesStatus = statusFilter === 'all' || 
        app.status?.toUpperCase() === statusFilter?.toUpperCase() ||
        (statusFilter === 'SUBMITTED' && app.status?.toUpperCase() === 'PENDING');
      return matchesStatus;
    }

    const matchesSearch = !searchTerm || 
      scholarship.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scholarship.providerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      app.status?.toUpperCase() === statusFilter?.toUpperCase() ||
      (statusFilter === 'SUBMITTED' && app.status?.toUpperCase() === 'PENDING');
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: applications.length,
    submitted: applications.filter(a => {
      const status = a.status?.toUpperCase();
      return status === 'PENDING' || status === 'SUBMITTED';
    }).length,
    underReview: applications.filter(a => {
      const status = a.status?.toUpperCase();
      return status === 'VIEWED' || status === 'UNDER_REVIEW';
    }).length,
    accepted: applications.filter(a => {
      const status = a.status?.toUpperCase();
      return status === 'ACCEPTED' || status === 'APPROVED';
    }).length,
    rejected: applications.filter(a => a.status?.toUpperCase() === 'REJECTED').length
  };

  const handleViewDetails = (application: Application) => {
    setSelectedApplication(application);
    setIsModalOpen(true);
  };

  const handleDownload = async (application: Application) => {
    try {
      // Tạo nội dung file để download
      const scholarship = scholarships.find(s => 
        s.id === application.scholarshipId || 
        s.id?.toString() === application.scholarshipId?.toString()
      );

      const content = `
EduMatch - Application Details
==============================

Application ID: ${application.id}
Scholarship: ${scholarship?.title || 'N/A'}
Status: ${getStatusLabel(application.status)}
Applied Date: ${application.createdAt ? formatDate(application.createdAt) : 'N/A'}
Updated Date: ${application.updatedAt ? formatDate(application.updatedAt) : 'N/A'}

${application.coverLetter ? `Cover Letter:\n${application.coverLetter}\n\n` : ''}
${application.motivation ? `Motivation:\n${application.motivation}\n\n` : ''}
${application.additionalInfo ? `Additional Info:\n${application.additionalInfo}\n\n` : ''}

Documents: ${application.additionalDocs?.length || 0}
${application.additionalDocs?.map((doc, idx) => `${idx + 1}. ${doc}`).join('\n') || 'No documents'}

Portfolio Links:
${application.portfolioUrl ? `- Portfolio: ${application.portfolioUrl}` : ''}
${application.linkedinUrl ? `- LinkedIn: ${application.linkedinUrl}` : ''}
${application.githubUrl ? `- GitHub: ${application.githubUrl}` : ''}
      `.trim();

      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `application-${application.id}-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Application downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download application');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-blue-50 to-brand-cyan-50 border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{t('applicantApplications.title')}</h1>
              <p className="text-gray-600 mt-2">
                {t('applicantApplications.subtitle')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 shadow-lg hover:shadow-2xl transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg mr-4">
                <FileText className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{stats.total}</p>
                <p className="text-xs text-muted-foreground">{t('applicantApplications.stats.total')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 shadow-lg hover:shadow-2xl transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-lg mr-4">
                <AlertCircle className="h-6 w-6 text-cyan-700" />
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{stats.submitted}</p>
                <p className="text-xs text-muted-foreground">{t('applicantApplications.stats.submitted')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 shadow-lg hover:shadow-2xl transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-100 to-amber-200 rounded-lg mr-4">
                <Clock className="h-6 w-6 text-yellow-700" />
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{stats.underReview}</p>
                <p className="text-xs text-muted-foreground">{t('applicantApplications.stats.underReview')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 shadow-lg hover:shadow-2xl transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-200 rounded-lg mr-4">
                <CheckCircle className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{stats.accepted}</p>
                <p className="text-xs text-muted-foreground">{t('applicantApplications.stats.accepted')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-white to-blue-50/30 shadow-lg hover:shadow-2xl transition-all duration-300">
            <CardContent className="flex items-center p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-lg mr-4">
                <XCircle className="h-6 w-6 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">{stats.rejected}</p>
                <p className="text-xs text-muted-foreground">{t('applicantApplications.stats.rejected')}</p>
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
                    placeholder={t('applicantApplications.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="w-full sm:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue-500 focus:border-brand-blue-500"
                >
                  <option value="all">{t('applicantApplications.filterStatus')}</option>
                  <option value="PENDING">{t('applicantApplications.statusOptions.submitted')}</option>
                  <option value="SUBMITTED">{t('applicantApplications.statusOptions.submitted')}</option>
                  <option value="UNDER_REVIEW">{t('applicantApplications.statusOptions.underReview')}</option>
                  <option value="VIEWED">{t('applicantApplications.statusOptions.underReview')}</option>
                  <option value="ACCEPTED">{t('applicantApplications.statusOptions.accepted')}</option>
                  <option value="APPROVED">{t('applicantApplications.statusOptions.accepted')}</option>
                  <option value="REJECTED">{t('applicantApplications.statusOptions.rejected')}</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications List */}
        <div className="space-y-6">
          {filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('applicantApplications.empty.title')}</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? t('applicantApplications.empty.withFilters')
                    : t('applicantApplications.empty.noApps')
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={() => window.location.href = '/user/scholarships'}>
                    {t('applicantApplications.empty.browse')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredApplications.map((application) => {
              const scholarship = scholarships.find(s => 
                s.id === application.scholarshipId || 
                s.id?.toString() === application.scholarshipId?.toString()
              );

              return (
                <Card key={application.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                            {scholarship?.title || `Scholarship ID: ${application.scholarshipId}`}
                          </h3>
                          <Badge variant={getStatusVariant(application.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(application.status)}
                              <span>{getStatusLabel(application.status)}</span>
                            </div>
                          </Badge>
                        </div>
                        
                        {scholarship ? (
                          <div className="flex items-center text-sm text-gray-600 mb-3">
                            <Building2 className="h-4 w-4 mr-1" />
                            {scholarship.providerName || 'Unknown Provider'}
                          </div>
                        ) : (
                          <div className="flex items-center text-sm text-gray-500 mb-3">
                            <Clock className="h-4 w-4 mr-1" />
                            Loading scholarship details...
                          </div>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {t('applicantApplications.labels.applied')}: {application.createdAt ? formatDate(application.createdAt) : 'N/A'}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {t('applicantApplications.labels.updated')}: {application.updatedAt ? formatDate(application.updatedAt) : 'N/A'}
                          </div>
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-1" />
                            {application.additionalDocs?.length || 0} {t('applicantApplications.labels.documents')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(application)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t('applicantApplications.actions.viewDetails')}
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownload(application)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {t('applicantApplications.actions.download')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Application Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) {
          setSelectedApplication(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedApplication && (() => {
            const scholarship = scholarships.find(s => 
              s.id === selectedApplication.scholarshipId || 
              s.id?.toString() === selectedApplication.scholarshipId?.toString()
            );

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span>{scholarship?.title || `Scholarship ID: ${selectedApplication.scholarshipId}`}</span>
                    <Badge variant={getStatusVariant(selectedApplication.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(selectedApplication.status)}
                        <span>{getStatusLabel(selectedApplication.status)}</span>
                      </div>
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Application Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Application Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">{t('applicantApplications.labels.applied')}</p>
                          <p className="font-semibold">{selectedApplication.createdAt ? formatDate(selectedApplication.createdAt) : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">{t('applicantApplications.labels.updated')}</p>
                          <p className="font-semibold">{selectedApplication.updatedAt ? formatDate(selectedApplication.updatedAt) : 'N/A'}</p>
                        </div>
                        {selectedApplication.gpa && (
                          <div>
                            <p className="text-sm text-gray-500">GPA</p>
                            <p className="font-semibold">{selectedApplication.gpa}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-500">{t('applicantApplications.labels.documents')}</p>
                          <p className="font-semibold">{selectedApplication.additionalDocs?.length || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cover Letter */}
                  {selectedApplication.coverLetter && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Cover Letter</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedApplication.coverLetter}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Motivation */}
                  {selectedApplication.motivation && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Motivation</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedApplication.motivation}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Additional Info */}
                  {selectedApplication.additionalInfo && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Additional Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 whitespace-pre-wrap">{selectedApplication.additionalInfo}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Portfolio Links */}
                  {(selectedApplication.portfolioUrl || selectedApplication.linkedinUrl || selectedApplication.githubUrl) && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Portfolio Links</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {selectedApplication.portfolioUrl && (
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                              <span className="font-medium">Portfolio</span>
                              <Button variant="outline" size="sm" asChild>
                                <a href={selectedApplication.portfolioUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Visit
                                </a>
                              </Button>
                            </div>
                          )}
                          {selectedApplication.linkedinUrl && (
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                              <span className="font-medium">LinkedIn</span>
                              <Button variant="outline" size="sm" asChild>
                                <a href={selectedApplication.linkedinUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Visit
                                </a>
                              </Button>
                            </div>
                          )}
                          {selectedApplication.githubUrl && (
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                              <span className="font-medium">GitHub</span>
                              <Button variant="outline" size="sm" asChild>
                                <a href={selectedApplication.githubUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Visit
                                </a>
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Documents */}
                  {selectedApplication.additionalDocs && selectedApplication.additionalDocs.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Documents</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {selectedApplication.additionalDocs.map((doc: string, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <span className="font-medium truncate mr-2">{doc}</span>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  // Download individual document
                                  const link = document.createElement('a');
                                  link.href = doc;
                                  link.download = doc.split('/').pop() || `document-${index + 1}`;
                                  link.target = '_blank';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                {t('applicantApplications.actions.download')}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

