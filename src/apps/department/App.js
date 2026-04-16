import React, { useState } from 'react';
import { AppProvider } from './contexts/AppContext';
import Sidebar from './components/Sidebar';
import ScholarApplications from './components/ScholarApplications';
import ApprovedScholars from './components/ApprovedScholars';
import RejectedScholars from './components/RejectedScholars';
import ForwardedStudents from './components/ForwardedStudents';
import Results from './components/Results';
import Interview from './components/Interview';
import QuestionPapers from './components/QuestionPapers';
import QueriesPage from './components/QueriesPage';
import MinutesofMeeting from './components/MinutesofMeeting';
import 'tailwindcss/tailwind.css';
import './styles/App.css';

function AppContent() {
  const [activeTab, setActiveTab] = useState('Applications');

  const renderContent = () => {
    switch (activeTab) {
      case 'Applications':
        return <ScholarApplications />;
      case 'Approved':
        return <ApprovedScholars />;
      case 'Rejected':
        return <RejectedScholars />;
      case 'Forwarded':
        return <ForwardedStudents />;
      case 'Results':
        return <Results />;
      case 'Interview':
        return <Interview />;
      case 'QuestionPaper':
        return <QuestionPapers />;
      case 'Queries':
        return <QueriesPage />;
      case 'MinutesofMeeting':
        return <MinutesofMeeting />;
      default:
        return <ScholarApplications />;
    }
  };

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main id="app-main" className="flex-1 p-6 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
