import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import WorkflowScholarAdministration from './WorkflowScholarAdministration';
import WorkflowExamination from './WorkflowExamination';
import './WorkflowPage.css';

const WorkflowPage = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'scholar-administration');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  return (
    <div className="workflow-page">
      <div className="workflow-container">
        {/* Content Area */}
        <div className="workflow-content">
          {activeTab === 'scholar-administration' && <WorkflowScholarAdministration />}
          {activeTab === 'examination' && <WorkflowExamination />}
        </div>
      </div>
    </div>
  );
};

export default WorkflowPage;
