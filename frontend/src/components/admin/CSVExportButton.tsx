'use client';

import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CSVExportButtonProps {
  data: any[];
  filename?: string;
  headers?: string[];
  className?: string;
}

export default function CSVExportButton({
  data,
  filename = 'export',
  headers,
  className
}: CSVExportButtonProps) {
  const exportToCSV = () => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    // Get headers from data keys if not provided
    const csvHeaders = headers || Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','), // Header row
      ...data.map(row =>
        csvHeaders.map(header => {
          const value = row[header];
          // Handle values that might contain commas or quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button
      onClick={exportToCSV}
      variant="outline"
      className={className}
    >
      <Download className="w-4 h-4 mr-2" />
      Export CSV
    </Button>
  );
}
