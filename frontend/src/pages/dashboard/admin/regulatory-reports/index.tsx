import React from 'react';
import { RegulatoryReportsDashboard } from '@/features/regulatory-reports/components/RegulatoryReportsDashboard';

const RegulatoryReportsPage: React.FC = () => {
  return (
    <div className="min-h-full space-y-6 overflow-x-hidden p-4 sm:p-6 lg:p-8 animate-fade-in">
      <RegulatoryReportsDashboard embedded={false} />
    </div>
  );
};

export default RegulatoryReportsPage;
