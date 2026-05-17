'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, CheckCircle, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApplications } from '@/hooks/api';
import { Scholarship } from '@/types';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface ApplyButtonProps {
  scholarship: Scholarship;
  hasApplied?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  showDialog?: boolean; // If false, will navigate to detail page instead
}

export function ApplyButton({ 
  scholarship, 
  hasApplied = false, 
  disabled = false,
  variant = 'default',
  size = 'default',
  className = '',
  children,
  showDialog = true
}: ApplyButtonProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [applicationData, setApplicationData] = useState({
    coverLetter: '',
    motivation: '',
    additionalInfo: '',
    portfolioUrl: '',
    linkedinUrl: '',
    githubUrl: ''
  });
  const [cvFile, setCvFile] = useState<File | null>(null);

  const { submitApplication, loading: applicationLoading } = useApplications();

  const isDeadlinePassed = new Date() > new Date(scholarship.applicationDeadline);
  const normalizedStatus = String(scholarship.status || scholarship.moderationStatus || '').toUpperCase();
  const isOpenForApplications = normalizedStatus === 'PUBLISHED' || normalizedStatus === 'APPROVED';
  const canApply = isOpenForApplications && !isDeadlinePassed && !hasApplied;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('applyButton.fileTooLarge') || 'File size must be less than 5MB');
        return;
      }
      // Check file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error(t('applyButton.invalidFileType') || 'Only PDF and Word documents are allowed');
        return;
      }
      setCvFile(file);
    }
  };

  const handleRemoveFile = () => {
    setCvFile(null);
  };

  const handleApply = async () => {
    if (!canApply) return;

    try {
      // Upload CV file if exists (TODO: implement actual file upload service)
      let cvFileUrl: string | undefined;
      if (cvFile) {
        // For now, create a placeholder URL
        // In production, upload to S3/MinIO and get actual URL
        cvFileUrl = `placeholder://cv/${cvFile.name}`;
        // TODO: Implement actual file upload
        // const formData = new FormData();
        // formData.append('file', cvFile);
        // const uploadResponse = await uploadFile(formData);
        // cvFileUrl = uploadResponse.url;
      }

      // Get user info from localStorage or auth context
      const userDataStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      
      await submitApplication({
        scholarshipId: scholarship.id,
        opportunityId: scholarship.id, // BE uses opportunityId
        applicantUserName: userData?.name || userData?.username || '',
        applicantEmail: userData?.email || '',
        ...applicationData,
        cvFile: cvFile?.name,
        cvFileUrl: cvFileUrl,
      });

      setIsDialogOpen(false);
      toast.success(t('applyButton.submitSuccess') || 'Application submitted successfully!');
      
      // Reset form
      setApplicationData({
        coverLetter: '',
        motivation: '',
        additionalInfo: '',
        portfolioUrl: '',
        linkedinUrl: '',
        githubUrl: ''
      });
      setCvFile(null);

      // Refresh the page or redirect
      router.refresh();
    } catch (error) {
      console.error('Application error:', error);
      toast.error(t('applyButton.submitError') || 'Failed to submit application. Please try again.');
    }
  };

  const handleClick = () => {
    if (!showDialog) {
      router.push(`/user/scholarships/${scholarship.id}`);
      return;
    }
  };

  // Button content - only show "Applied" if user has actually applied
  const buttonContent = children || (
    hasApplied ? (
      <>
        <CheckCircle className="h-4 w-4 mr-2" />
        {t('applyButton.applied') || 'Applied'}
      </>
    ) : canApply ? (
      <>
        <GraduationCap className="h-4 w-4 mr-2" />
        {t('applyButton.applyNow') || 'Apply Now'}
      </>
    ) : (
      isDeadlinePassed ? (t('applyButton.deadlinePassed') || "Deadline Passed") : (t('applyButton.viewDetails') || "View Details")
    )
  );

  // Only show "Applied" button if user has actually applied
  // If hasApplied is false, show "Apply Now" button instead
  if (hasApplied) {
    return (
      <Button 
        disabled 
        variant={variant} 
        size={size} 
        className={className}
      >
        {buttonContent}
      </Button>
    );
  }

  if (!canApply) {
    return (
      <Button 
        disabled={isDeadlinePassed} 
        variant={isDeadlinePassed ? 'secondary' : variant} 
        size={size} 
        className={className}
        onClick={handleClick}
      >
        {buttonContent}
      </Button>
    );
  }

  if (!showDialog) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        className={className}
        onClick={handleClick}
        disabled={disabled || applicationLoading}
      >
        {buttonContent}
      </Button>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          disabled={disabled || applicationLoading}
        >
          {buttonContent}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('applyButton.title') || 'Apply for'} {scholarship.title}</DialogTitle>
          <DialogDescription>
            {t('applyButton.description') || 'Submit your application for this scholarship. Make sure to provide all required information.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* CV Upload */}
          <div className="space-y-2">
            <Label>
              {t('applyButton.cvFile') || 'CV/Resume'} *
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="cvFile"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <Label 
                htmlFor="cvFile"
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full h-10 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors">
                  <Upload className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-normal truncate">
                    {cvFile ? cvFile.name : (t('applyButton.uploadCV') || 'Tải lên CV')}
                  </span>
                </div>
              </Label>
              {cvFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('applyButton.maxFileSize') || 'Kích thước tối đa: 5MB (PDF, DOC, DOCX)'}
            </p>
          </div>

          {/* Cover Letter */}
          <div className="space-y-2">
            <Label htmlFor="coverLetter">
              {t('applyButton.coverLetter') || 'Cover Letter'} *
            </Label>
            <Textarea
              id="coverLetter"
              placeholder={t('applyButton.coverLetterPlaceholder') || 'Write your cover letter...'}
              value={applicationData.coverLetter}
              onChange={(e) => setApplicationData({...applicationData, coverLetter: e.target.value})}
              className="min-h-[120px]"
            />
          </div>

          {/* Motivation */}
          <div className="space-y-2">
            <Label htmlFor="motivation">
              {t('applyButton.motivation') || 'Motivation'} *
            </Label>
            <Textarea
              id="motivation"
              placeholder={t('applyButton.motivationPlaceholder') || 'Why are you interested in this scholarship?'}
              value={applicationData.motivation}
              onChange={(e) => setApplicationData({...applicationData, motivation: e.target.value})}
              className="min-h-[120px]"
            />
          </div>

          {/* Additional Information */}
          <div className="space-y-2">
            <Label htmlFor="additionalInfo">
              {t('applyButton.additionalInfo') || 'Additional Information'}
            </Label>
            <Textarea
              id="additionalInfo"
              placeholder={t('applyButton.additionalInfoPlaceholder') || 'Any additional information you\'d like to share...'}
              value={applicationData.additionalInfo}
              onChange={(e) => setApplicationData({...applicationData, additionalInfo: e.target.value})}
            />
          </div>

          {/* Optional URLs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="portfolioUrl">
                {t('applyButton.portfolioUrl') || 'Portfolio URL'} ({t('applyButton.optional') || 'Optional'})
              </Label>
              <Input
                id="portfolioUrl"
                type="url"
                placeholder="https://"
                value={applicationData.portfolioUrl}
                onChange={(e) => setApplicationData({...applicationData, portfolioUrl: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">
                {t('applyButton.linkedinUrl') || 'LinkedIn URL'} ({t('applyButton.optional') || 'Optional'})
              </Label>
              <Input
                id="linkedinUrl"
                type="url"
                placeholder="https://linkedin.com/in/"
                value={applicationData.linkedinUrl}
                onChange={(e) => setApplicationData({...applicationData, linkedinUrl: e.target.value})}
              />
            </div>
          </div>

          {/* GitHub URL */}
          <div className="space-y-2">
            <Label htmlFor="githubUrl">
              {t('applyButton.githubUrl') || 'GitHub URL'} ({t('applyButton.optional') || 'Optional'})
            </Label>
            <Input
              id="githubUrl"
              type="url"
              placeholder="https://github.com/"
              value={applicationData.githubUrl}
              onChange={(e) => setApplicationData({...applicationData, githubUrl: e.target.value})}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setIsDialogOpen(false)}
            disabled={applicationLoading}
          >
            {t('applyButton.cancel') || 'Cancel'}
          </Button>
          <Button 
            onClick={handleApply}
            disabled={applicationLoading || !applicationData.coverLetter || !applicationData.motivation || !cvFile}
          >
            {applicationLoading ? (t('applyButton.submitting') || "Submitting...") : (t('applyButton.submit') || "Submit Application")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
