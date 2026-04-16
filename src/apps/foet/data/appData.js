// Application Data
export const appData = {
  RMP: {
    faculties: [
      { 
        id: 'FOET', 
        name: "Faculty of Engineering & Technology", 
        departments: [
          { id: 'MECH-RMP', name: "Mechanical Engineering", staffName: "Dr. Chandru", staffEmail: "chandru.mech@srmist.edu.in", staffContact: "9876543212" },
          { id: 'ECE-RMP', name: "Electronics & Communication Engineering", staffName: "Dr. Baskar", staffEmail: "baskar.ece@srmist.edu.in", staffContact: "9876543211" },
          { id: 'EEE-RMP', name: "Electrical and Electronics Engineering", staffName: "Dr. Deepak", staffEmail: "deepak.eee@srmist.edu.in", staffContact: "9876543213" },
          { id: 'CIVIL-RMP', name: "Civil Engineering", staffName: "Dr. Eswar", staffEmail: "eswar.civil@srmist.edu.in", staffContact: "9876543214" },
          { id: 'CSE-RMP', name: "Computer Science Engineering", staffName: "Dr. Anand", staffEmail: "anand.cse@srmist.edu.in", staffContact: "9876543210" },
          { id: 'MATH-RMP', name: "Mathematics", staffName: "Dr. Ganesh", staffEmail: "ganesh.maths@srmist.edu.in", staffContact: "9876543215" },
          { id: 'PHY-RMP', name: "Physics", staffName: "Dr. Harish", staffEmail: "harish.phy@srmist.edu.in", staffContact: "9876543216" },
          { id: 'CHEM-RMP', name: "Chemistry", staffName: "Dr. Indira", staffEmail: "indira.chem@srmist.edu.in", staffContact: "9876543217" },
          { id: 'BT-RMP', name: "Biotechnology", staffName: "Dr. Karthik", staffEmail: "karthik.biotech@srmist.edu.in", staffContact: "9876543219" },
        ] 
      }
    ],
    scholarList: [
      { 'id': 'sch1', 'Specialization': 'Computer Science Engineering', 'Mode of Study': 'Full Time', 'Application Status': 'Approved', 'Registered Name': 'Ananya Rao', 'Application Number': 'APP001', 'Registered Email': 'ananya.r@srmist.edu.in', 'Registered Mobile': '9876543210', 'cgpa': 8.5, 'distribution': 'Distributed', 'submissionStatus': 'Pending Verification', 'Eligibility Status': 'Eligible' },
      { 'id': 'sch4', 'Specialization': 'Mechanical Engineering', 'Mode of Study': 'Full Time', 'Application Status': 'Approved', 'Registered Name': 'Divya Singh', 'Application Number': 'APP004', 'Registered Email': 'divya.s@srmist.edu.in', 'Registered Mobile': '9876543213', 'cgpa': 9.1, 'distribution': 'Distributed', 'submissionStatus': 'Pending Verification', 'Eligibility Status': 'Eligible' },
      { 'id': 'sch6', 'Specialization': 'Electronics & Communication Engineering', 'Mode of Study': 'Full Time', 'Application Status': 'Approved', 'Registered Name': 'Priya Venkatesh', 'Application Number': 'APP006', 'Registered Email': 'priya.v@srmist.edu.in', 'Registered Mobile': '9876543215', 'cgpa': 8.8, 'distribution': 'Distributed', 'submissionStatus': 'Pending Verification', 'Eligibility Status': 'Eligible' },
      { 'id': 'sch10', 'Specialization': 'Computer Science Engineering', 'Mode of Study': 'Part Time', 'Application Status': 'In Review', 'Registered Name': 'Fatima Sheikh', 'Application Number': 'APP010', 'Registered Email': 'fatima.s@srmist.edu.in', 'Registered Mobile': '9876543219', 'cgpa': 8.2, 'distribution': 'Pending', 'submissionStatus': 'Pending Verification', 'Eligibility Status': 'Eligible' },
      { 'id': 'sch11', 'Specialization': 'Electronics & Communication Engineering', 'Mode of Study': 'Part Time', 'Application Status': 'Approved', 'Registered Name': 'Rahul Kumar', 'Application Number': 'APP011', 'Registered Email': 'rahul.k@srmist.edu.in', 'Registered Mobile': '9876543220', 'cgpa': 7.8, 'distribution': 'Distributed', 'submissionStatus': 'Verified', 'Eligibility Status': 'Eligible', 'verified': true },
      { 'id': 'sch12', 'Specialization': 'Mechanical Engineering', 'Mode of Study': 'Full Time', 'Application Status': 'Approved', 'Registered Name': 'Arjun Sharma', 'Application Number': 'APP012', 'Registered Email': 'arjun.s@srmist.edu.in', 'Registered Mobile': '9876543222', 'cgpa': 8.9, 'distribution': 'Distributed', 'submissionStatus': 'Pending Verification', 'Eligibility Status': 'Eligible' },
      { 'id': 'sch13', 'Specialization': 'Electronics & Communication Engineering', 'Mode of Study': 'Part Time', 'Application Status': 'In Review', 'Registered Name': 'Kavya Reddy', 'Application Number': 'APP013', 'Registered Email': 'kavya.r@srmist.edu.in', 'Registered Mobile': '9876543223', 'cgpa': 8.1, 'distribution': 'Pending', 'submissionStatus': 'Pending Verification', 'Eligibility Status': 'Eligible' },
      { 'id': 'sch14', 'Specialization': 'Computer Science Engineering', 'Mode of Study': 'Full Time', 'Application Status': 'Approved', 'Registered Name': 'Vikram Patel', 'Application Number': 'APP014', 'Registered Email': 'vikram.p@srmist.edu.in', 'Registered Mobile': '9876543224', 'cgpa': 9.2, 'distribution': 'Distributed', 'submissionStatus': 'Verified', 'Eligibility Status': 'Eligible', 'verified': true },
      { 'id': 'sch15', 'Specialization': 'Mechanical Engineering', 'Mode of Study': 'Part Time', 'Application Status': 'Approved', 'Registered Name': 'Neha Gupta', 'Application Number': 'APP015', 'Registered Email': 'neha.g@srmist.edu.in', 'Registered Mobile': '9876543225', 'cgpa': 7.9, 'distribution': 'Pending', 'submissionStatus': 'Pending Verification', 'Eligibility Status': 'Eligible' }
    ],
    examMarks: [
      { id: 'em1', scholarId: 'sch1', studentName: 'Ananya Rao', studentId: 'APP001', department: 'Computer Science Engineering', vivaMarks: 28, status: 'Distributed' },
      { id: 'em4', scholarId: 'sch4', studentName: 'Divya Singh', studentId: 'APP004', department: 'Mechanical Engineering', vivaMarks: 27, status: 'Distributed' },
      { id: 'em6', scholarId: 'sch6', studentName: 'Priya Venkatesh', studentId: 'APP006', department: 'Electronics & Communication Engineering', vivaMarks: 22, status: 'Pending Distribution' },
      { id: 'em10', scholarId: 'sch10', studentName: 'Fatima Sheikh', studentId: 'APP010', department: 'Computer Science Engineering', vivaMarks: 15, status: 'Distributed' },
      { id: 'em11', scholarId: 'sch11', studentName: 'Rahul Kumar', studentId: 'APP011', department: 'Electronics & Communication Engineering', vivaMarks: 18, status: 'Distributed' },
      { id: 'em12', scholarId: 'sch12', studentName: 'Arjun Sharma', studentId: 'APP012', department: 'Mechanical Engineering', vivaMarks: 29, status: 'Distributed' },
      { id: 'em13', scholarId: 'sch13', studentName: 'Kavya Reddy', studentId: 'APP013', department: 'Electronics & Communication Engineering', vivaMarks: 23, status: 'Pending Distribution' },
      { id: 'em14', scholarId: 'sch14', studentName: 'Vikram Patel', studentId: 'APP014', department: 'Computer Science Engineering', vivaMarks: 30, status: 'Distributed' },
      { id: 'em15', scholarId: 'sch15', studentName: 'Neha Gupta', studentId: 'APP015', department: 'Mechanical Engineering', vivaMarks: 21, status: 'Pending Distribution' }
    ],
    coordinatorList: [
      { id: 'coord2', name: 'Rajesh Pillai', email: 'rajesh.p@srmist.edu.in', assignedFaculty: 'Faculty of Engineering & Technology' },
    ],
    adminList: [
     { id: 'admin1', name: "Suresh Kumar", email: "ad1@srmist.edu.in" },
    ],
    submissionLogs: [
      { logId: 'log1', scholarId: 'sch1', coordinatorId: 'coord2', decision: 'Approved', reason: '', timestamp: '2025-08-01T10:30:00Z' },
      { logId: 'log6', scholarId: 'sch6', coordinatorId: 'coord2', decision: 'Approved', reason: '', timestamp: '2025-08-05T11:00:00Z' },
    ],
    vivaMarks: {
      'sch1': { marks: 28, evaluator: 'Dr. Priya Menon', timestamp: '2025-08-10T15:00:00Z' },
      'sch4': { marks: 27, evaluator: 'Dr. Ramesh Kumar', timestamp: '2025-08-11T11:00:00Z' },
      'sch6': { marks: 22, evaluator: 'Dr. Priya Menon', timestamp: '2025-08-12T11:00:00Z' },
      'sch10': { marks: 15, evaluator: 'Dr. Anand Kumar', timestamp: '2025-08-13T14:00:00Z' },
      'sch11': { marks: 18, evaluator: 'Dr. Baskar Kumar', timestamp: '2025-08-14T16:00:00Z' },
      'sch12': { marks: 29, evaluator: 'Dr. Chandru Kumar', timestamp: '2025-08-15T10:00:00Z' },
      'sch13': { marks: 23, evaluator: 'Dr. Baskar Kumar', timestamp: '2025-08-16T11:00:00Z' },
      'sch14': { marks: 30, evaluator: 'Dr. Priya Menon', timestamp: '2025-08-16T14:00:00Z' },
      'sch15': { marks: 21, evaluator: 'Dr. Chandru Kumar', timestamp: '2025-08-17T10:00:00Z' },
    },
    adminDecisions: {
      'sch1': { adminId: 'admin1', decision: 'Verified', reason: 'All documents clear.', timestamp: '2025-08-12T09:00:00Z' }
    },
    questionPapers: [
      { id: 'qp1', facultyId: 'FOET', departmentId: 'CSE-RMP', title: 'Question Paper Set A', demoUrl: 'https://example.com/cse-set-a.pdf', driveLink: 'https://drive.google.com/file/d/example1' },
      { id: 'qp2', facultyId: 'FOET', departmentId: 'CSE-RMP', title: 'Question Paper Set B', demoUrl: 'https://example.com/cse-set-b.pdf', driveLink: 'https://drive.google.com/file/d/example2' },
      { id: 'qp3', facultyId: 'FOET', departmentId: 'MECH-RMP', title: 'Question Paper Set A', demoUrl: 'https://example.com/mech-set-a.pdf', driveLink: 'https://drive.google.com/file/d/example3' },
      { id: 'qp4', facultyId: 'FOET', departmentId: 'MECH-RMP', title: 'Question Paper Set B', demoUrl: 'https://example.com/mech-set-b.pdf', driveLink: 'https://drive.google.com/file/d/example4' },
      { id: 'qp5', facultyId: 'FOET', departmentId: 'ECE-RMP', title: 'Question Paper Set A', demoUrl: 'https://example.com/ece-set-a.pdf', driveLink: 'https://drive.google.com/file/d/example5' },
      { id: 'qp6', facultyId: 'FOET', departmentId: 'ECE-RMP', title: 'Question Paper Set B', demoUrl: 'https://example.com/ece-set-b.pdf', driveLink: 'https://drive.google.com/file/d/example6' }
    ]
  }
};

// CGPA Eligibility Criteria
export const cgpaEligibilityCriteria = {
  'Ramapuram': {
    'FOET': {
      'Computer Science Engineering': { fullTime: 8.0, partTime: 7.5 },
      'Electronics & Communication Engineering': { fullTime: 7.8, partTime: 7.3 },
      'Mechanical Engineering': { fullTime: 7.5, partTime: 7.0 },
    }
  }
};

// Faculty Acronyms
export const facultyAcronyms = { 
  "Faculty of Engineering & Technology": "E&T" 
};