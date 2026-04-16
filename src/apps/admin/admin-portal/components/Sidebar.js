import React from 'react';
import './Sidebar.css';
import { FaUserTie, FaFileAlt, FaAward, FaProjectDiagram, FaClock, FaColumns, FaUserFriends, FaUsers, FaGraduationCap, FaClipboardList } from 'react-icons/fa';

const iconsMap = {
  supervisors: React.createElement(FaUserTie, { size: 20 }),
  questionPapers: React.createElement(FaFileAlt, { size: 20 }),
  result: React.createElement(FaAward, { size: 20 }),
  workflow: React.createElement(FaProjectDiagram, { size: 20 }),
  partTimeSplit: React.createElement(FaClock, { size: 20 }),

  dashboard: React.createElement(FaColumns, { size: 20 }),
  coordinators: React.createElement(FaUserFriends, { size: 20 }),
  faculties: React.createElement(FaUsers, { size: 20 }),
  scholarAdmin: React.createElement(FaGraduationCap, { size: 20 }),
  examination: React.createElement(FaClipboardList, { size: 20 }),
};

const menuJson = [
  {
    title: 'Admin',
    avatar: 'https://logodix.com/logo/1787040.png', // Adjust path as needed
    items: [
      { id: 'dashboard', label: 'Dashboard', iconKey: 'dashboard' },
      { id: 'coordinators', label: 'Coordinators', iconKey: 'coordinators' },
      { id: 'faculties', label: 'Faculties', iconKey: 'faculties' },
      { id: 'scholar-admin', label: 'Scholar Administration', iconKey: 'scholarAdmin' },
      { id: 'examination', label: 'Examination', iconKey: 'examination' },
      { id: 'supervisors', label: 'Supervisors', iconKey: 'supervisors' },
      { id: 'questionPapers', label: 'Question Papers', iconKey: 'questionPapers' },
      { id: 'result', label: 'Result', iconKey: 'result' },
      { id: 'workflow', label: 'Workflow', iconKey: 'workflow' },
      { id: 'partTimeSplit', label: 'Part Time Split', iconKey: 'partTimeSplit' },

    ],
  },
];

export default function Sidebar({ active, onNavigate }) {
  const section = menuJson[0];

  return React.createElement(
    'aside',
    { className: 'sidebar' },
    React.createElement(
      'div',
      { className: 'sidebar-header' },
      React.createElement('img', { src: section.avatar, alt: 'Logo', className: 'sidebar-logo' }),
      React.createElement('h2', { className: 'sidebar-title' }, section.title)
    ),
    React.createElement(
      'nav',
      { className: 'sidebar-menu' },
      section.items.map((item) =>
        React.createElement(
          'button',
          {
            key: item.id,
            className: `sidebar-menu-item${active === item.id ? ' active' : ''}`,
            onClick: () => onNavigate(item.id)
          },
          React.createElement('span', { className: 'sidebar-icon' }, iconsMap[item.iconKey]),
          React.createElement('span', { className: 'sidebar-label' }, item.label)
        )
      )
    )
  );
}
