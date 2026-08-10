'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Filter, 
  Eye, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Users,
  GraduationCap,
  Calendar,
  MapPin,
  Star,
  Send,
  FileText,
  Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRealTime } from '@/providers/RealTimeProvider';
import { Application, Scholarship, ApplicationStatus } from '@/types';
import { scholarshipServiceApi } from '@/services/scholarship.service';
import { useRouter } from 'next/navigation';

const getApplicantProfile = (app: Application) => {
  return {
    name: app.applicantUserName || app.applicant?.name || 'Unknown Applicant',
    email: app.applicantEmail || app.applicant?.email || 'Unknown Email',
    university: app.applicant?.profile?.university || 'N/A',
    major: app.applicant?.profile?.major || 'N/A',
    gpa: app.gpa ? `${app.gpa}/4.0` : app.applicant?.profile?.gpa || 'N/A',
    avatar: '',
    skills: app.applicant?.profile?.skills || [],
    bio: '',
    graduationYear: app.applicant?.profile?.graduationYear || 'N/A',
  };
};

export default function ScholarshipApplicationsPage() {
  const params = useParams();
  const router = useRouter();
  const scholarshipId = params.id as string;
  
  const { sendMessage } = useRealTime();
  
  const [loading, setLoading] = useState(true);
  const [scholarship, setScholarship] = useState<any>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);

  // Fetch scholarship and applications from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch scholarship
        const opportunities = await scholarshipServiceApi.getMyOpportunities();
        const foundScholarship = opportunities.find((opp: any) => String(opp.id) === scholarshipId);
        
        if (!foundScholarship) {
          toast.error('Không tìm thấy học bổng');
          router.push('/employer/scholarships');
          return;
        }
        
        setScholarship(foundScholarship);
        
        // Fetch applications
        const apps = await scholarshipServiceApi.getApplicationsForOpportunity(scholarshipId);
        
        // Map API response to Application format
        const mappedApplications: Application[] = apps.map((app: any) => ({
          id: String(app.id),
          scholarshipId: String(app.opportunityId),
          applicantId: String(app.applicantUserId),
          status: app.status || 'SUBMITTED',
          additionalDocs: app.documents?.map((doc: any) => doc.documentUrl || doc.documentName) || [],
          createdAt: app.submittedAt ? new Date(app.submittedAt) : new Date(),
          updatedAt: app.submittedAt ? new Date(app.submittedAt) : new Date(),
          // Additional fields from backend
          submittedAt: app.submittedAt || app.createdAt,
          coverLetter: app.coverLetter || '',
          motivation: app.motivation || '',
          additionalInfo: app.additionalInfo || '',
          portfolioUrl: app.portfolioUrl || '',
          linkedinUrl: app.linkedinUrl || '',
          githubUrl: app.githubUrl || '',
          applicantUserName: app.applicantUserName,
          applicantEmail: app.applicantEmail,
          phone: app.phone,
          gpa: app.gpa ? Number(app.gpa) : undefined,
        }));
        
        setApplications(mappedApplications);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast.error('Không thể tải dữ liệu: ' + (error?.message || 'Lỗi không xác định'));
      } finally {
        setLoading(false);
      }
    };
    
    if (scholarshipId) {
      fetchData();
    }
  }, [scholarshipId, router]);

  // Memoize filtered applications to prevent infinite re-renders
  const filteredApplications = useMemo(() => {
    let filtered = applications;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((app: Application) => {
        const profile = getApplicantProfile(app);
        return profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          profile.university.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((app: Application) => app.status === statusFilter);
    }

    return filtered;
  }, [applications, searchTerm, statusFilter]);

  const handleStatusUpdate = async (applicationId: string, newStatus: string) => {
    try {
      setLoading(true);
      await scholarshipServiceApi.updateApplicationStatus(applicationId, newStatus);
      toast.success(`Cập nhật trạng thái thành công!`);
      
      // Refresh applications list
      const apps = await scholarshipServiceApi.getApplicationsForOpportunity(scholarshipId);
      const mappedApplications: Application[] = apps.map((app: any) => ({
        id: String(app.id),
        scholarshipId: String(app.opportunityId),
        applicantId: String(app.applicantUserId),
        status: app.status || 'SUBMITTED',
        additionalDocs: app.documents?.map((doc: any) => doc.documentUrl || doc.documentName) || [],
        createdAt: app.submittedAt ? new Date(app.submittedAt) : new Date(),
        updatedAt: app.submittedAt ? new Date(app.submittedAt) : new Date(),
        // Additional fields from backend
        submittedAt: app.submittedAt || app.createdAt,
        coverLetter: app.coverLetter || '',
        motivation: app.motivation || '',
        additionalInfo: app.additionalInfo || '',
        portfolioUrl: app.portfolioUrl || '',
        linkedinUrl: app.linkedinUrl || '',
        githubUrl: app.githubUrl || '',
        applicantUserName: app.applicantUserName,
        applicantEmail: app.applicantEmail,
        phone: app.phone,
        gpa: app.gpa ? Number(app.gpa) : undefined,
      }));
      setApplications(mappedApplications);
    } catch (error: any) {
      console.error('Error updating application status:', error);
      toast.error('Cập nhật trạng thái thất bại: ' + (error?.message || 'Lỗi không xác định'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedApplication || !messageText.trim() || !messageSubject.trim()) {
      toast.error('Please fill in both subject and message');
      return;
    }

    try {
      // Send real-time message through socket
      sendMessage(selectedApplication.applicantId, `Subject: ${messageSubject}\n\n${messageText}`);
      
      toast.success('Message sent successfully via real-time!');
      setMessageText('');
      setMessageSubject('');
      setIsMessageDialogOpen(false);
      setSelectedApplication(null);
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'under_review':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'submitted':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'default'; // Green
      case 'rejected':
        return 'destructive'; // Red
      case 'under_review':
        return 'secondary'; // Yellow
      case 'submitted':
        return 'outline'; // Blue
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'under_review':
        return 'Under Review';
      case 'submitted':
        return 'New Application';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!scholarship && !loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Scholarship Not Found</h1>
          <p className="text-gray-600">The scholarship you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Applications for "{scholarship.title || scholarship.fullDescription?.substring(0, 50)}"
        </h1>
        <p className="text-gray-600 mb-4">{scholarship.description || scholarship.fullDescription || ''}</p>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {applications.length} applications
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Deadline: {scholarship?.applicationDeadline ? formatDate(scholarship.applicationDeadline) : 'TBA'}
          </span>
          <span className="flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            ${scholarship.scholarshipAmount?.toLocaleString() || 'TBA'}/year
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search applicants by name, email, or university..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="submitted">New Applications</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No applications found matching your criteria.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredApplications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <Avatar className="h-12 w-12">
                      {(() => {
                        const profile = getApplicantProfile(application);
                        return <>
                          <AvatarImage src={profile.avatar} alt={profile.name} />
                          <AvatarFallback>{profile.name.split(' ').map((n: string) => n[0]).join('') || 'N/A'}</AvatarFallback>
                        </>;
                      })()}
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getApplicantProfile(application).name}
                        </h3>
                        <Badge variant={getStatusVariant(application.status)} className="flex items-center gap-1">
                          {getStatusIcon(application.status)}
                          {getStatusLabel(application.status)}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-2">{getApplicantProfile(application).email}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-4 w-4" />
                          {getApplicantProfile(application).university} • {getApplicantProfile(application).major}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4" />
                          GPA: {getApplicantProfile(application).gpa}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Applied: {application.createdAt ? new Date(application.createdAt).toLocaleDateString() : 'Unknown'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {getApplicantProfile(application).skills.slice(0, 3).map((skill: string) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {getApplicantProfile(application).skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{getApplicantProfile(application).skills.length - 3} more
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Applied on {application.createdAt ? formatDate(application.createdAt.toString()) : 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* View Details Dialog */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Application Details - {application.applicantUserName || getApplicantProfile(application).name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6">
                          {/* Personal Information */}
                          <div>
                            <h4 className="font-semibold mb-3 text-lg">Personal Information</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                              <div>
                                <span className="text-gray-500 font-medium">Name:</span>
                                <p className="text-gray-900 mt-1">{application.applicantUserName || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 font-medium">Email:</span>
                                <p className="text-gray-900 mt-1">{application.applicantEmail || getApplicantProfile(application).email}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 font-medium">Phone:</span>
                                <p className="text-gray-900 mt-1">{application.phone || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 font-medium">GPA:</span>
                                <p className="text-gray-900 mt-1">{application.gpa ? `${application.gpa}/4.0` : getApplicantProfile(application).gpa || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 font-medium">University:</span>
                                <p className="text-gray-900 mt-1">{getApplicantProfile(application).university}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 font-medium">Major:</span>
                                <p className="text-gray-900 mt-1">{getApplicantProfile(application).major}</p>
                              </div>
                            </div>
                          </div>

                          {/* Cover Letter */}
                          {application.coverLetter && (
                            <div>
                              <h4 className="font-semibold mb-2 text-lg">Cover Letter</h4>
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.coverLetter}</p>
                              </div>
                            </div>
                          )}

                          {/* Motivation */}
                          {application.motivation && (
                            <div>
                              <h4 className="font-semibold mb-2 text-lg">Motivation</h4>
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.motivation}</p>
                              </div>
                            </div>
                          )}

                          {/* Additional Information */}
                          {application.additionalInfo && (
                            <div>
                              <h4 className="font-semibold mb-2 text-lg">Additional Information</h4>
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.additionalInfo}</p>
                              </div>
                            </div>
                          )}

                          {/* Portfolio & Social Links */}
                          {(application.portfolioUrl || application.linkedinUrl || application.githubUrl) && (
                            <div>
                              <h4 className="font-semibold mb-2 text-lg">Portfolio & Social Links</h4>
                              <div className="space-y-2">
                                {application.portfolioUrl && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500 text-sm w-24">Portfolio:</span>
                                    <a href={application.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                      {application.portfolioUrl}
                                    </a>
                                  </div>
                                )}
                                {application.linkedinUrl && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500 text-sm w-24">LinkedIn:</span>
                                    <a href={application.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                      {application.linkedinUrl}
                                    </a>
                                  </div>
                                )}
                                {application.githubUrl && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500 text-sm w-24">GitHub:</span>
                                    <a href={application.githubUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                      {application.githubUrl}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Documents */}
                          {application.additionalDocs && application.additionalDocs.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2 text-lg">Documents</h4>
                              <div className="space-y-2">
                                {application.additionalDocs.map((doc: string, index: number) => (
                                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                    <FileText className="h-4 w-4 text-gray-500" />
                                    <a href={doc} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex-1">
                                      {doc}
                                    </a>
                                    <Button variant="ghost" size="sm" asChild>
                                      <a href={doc} download>
                                        <Download className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Application Metadata */}
                          <div>
                            <h4 className="font-semibold mb-2 text-lg">Application Information</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                              <div>
                                <span className="text-gray-500 font-medium">Status:</span>
                                <Badge variant={getStatusVariant(application.status)} className="ml-2">
                                  {getStatusLabel(application.status)}
                                </Badge>
                              </div>
                              <div>
                                <span className="text-gray-500 font-medium">Submitted:</span>
                                <p className="text-gray-900 mt-1">{application.createdAt ? formatDate(application.createdAt.toString()) : 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-gray-500 font-medium">Application ID:</span>
                                <p className="text-gray-900 mt-1">{application.id}</p>
                              </div>
                            </div>
                          </div>

                          {/* Status Actions */}
                          <div>
                            <h4 className="font-semibold mb-2">Update Status</h4>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={() => handleStatusUpdate(application.id, 'VIEWED')}
                                disabled={application.status === 'VIEWED'}
                              >
                                Mark Under Review
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleStatusUpdate(application.id, 'ACCEPTED')}
                                disabled={application.status === 'ACCEPTED'}
                              >
                                Accept
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleStatusUpdate(application.id, 'REJECTED')}
                                disabled={application.status === 'REJECTED'}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Send Message Dialog */}
                    <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedApplication(application)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Message
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Send Message to {selectedApplication?.applicant?.name || 'Applicant'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Subject</label>
                            <Input
                              placeholder="Enter message subject..."
                              value={messageSubject}
                              onChange={(e) => setMessageSubject(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Message</label>
                            <Textarea
                              placeholder="Type your message here..."
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              rows={6}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleSendMessage}>
                              <Send className="h-4 w-4 mr-1" />
                              Send Message
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Quick Status Update */}
                    <Select 
                      value={application.status} 
                      onValueChange={(value) => handleStatusUpdate(application.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitted">New</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="accepted">Accept</SelectItem>
                        <SelectItem value="rejected">Reject</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {applications.filter(app => app.status === 'PENDING').length}
            </div>
            <div className="text-sm text-gray-500">New Applications</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {/* If you want to support VIEWED status, update here */}
              {applications.filter(app => app.status === 'VIEWED').length}
            </div>
            <div className="text-sm text-gray-500">Under Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {applications.filter(app => app.status === 'ACCEPTED').length}
            </div>
            <div className="text-sm text-gray-500">Accepted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {applications.filter(app => app.status === 'REJECTED').length}
            </div>
            <div className="text-sm text-gray-500">Rejected</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
