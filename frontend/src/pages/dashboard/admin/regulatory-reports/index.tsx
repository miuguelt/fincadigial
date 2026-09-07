import React from 'react';
import { RegulatoryReportsDashboard } from '@/features/regulatory-reports/components/RegulatoryReportsDashboard';

const RegulatoryReportsPage: React.FC = () => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8 space-y-6 animate-fade-in">
      <RegulatoryReportsDashboard />
    </div>
  );
};

export default RegulatoryReportsPage;
