// src/db.js

export const appData = {
  RMP: {
    faculties: [
        {
            id: 'FOET', 
            name: "Faculty of Engineering & Technology",
            departments: [
                { id: 'MECH-RMP', name: "Mechanical Engineering" },
                { id: 'ECE-RMP', name: "Electronics and Communication Engineering" },
                { id: 'EEE-RMP', name: "Electrical and Electronics Engineering" },
                { id: 'CIVIL-RMP', name: "Civil Engineering" },
                { id: 'CSE-RMP', name: "Computer Science and Engineering" },
                { id: 'MATH-ENG', name: "Mathematics" },
                { id: 'PHY-ENG', name: "Physics" },
            ]
        },
        {
            id: 'FSH', 
            name: "Faculty of Science & Humanities",
            departments: [
                { id: 'COMMERCE-SH', name: "Commerce" },
                { id: 'VISCOM-SH', name: "Visual Communication" },
                { id: 'CSC-SH', name: "Computer Science" },
                { id: 'ENGLISH-SH', name: "English & Foreign Languages" },
            ]
        },
    ],
    questionPapers: [
      { 
        id: 'qp1', 
        title: 'Data Structures Mid-Term (Set A)', 
        facultyId: 'FOET', 
        departmentId: 'CSE-RMP', 
        fileName: 'CS_MidTerm_2024_A.pdf', 
        uploadDate: '2024-08-01', 
        hasDemo: true, 
        demoUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        driveLink: 'https://drive.google.com/file/d/example_A'
      },
      { 
        id: 'qp2', 
        title: 'Literary Theory Final Exam (Set A)', 
        facultyId: 'FSH', 
        departmentId: 'ENGLISH-SH', 
        fileName: 'English_Final_2024_A.pdf', 
        uploadDate: '2024-08-02', 
        hasDemo: false,
        driveLink: null
      },
      { 
        id: 'qp3', 
        title: 'Data Structures Mid-Term (Set B)', 
        facultyId: 'FOET', 
        departmentId: 'CSE-RMP', 
        fileName: 'CS_MidTerm_2024_B.pdf', 
        uploadDate: '2024-08-01', 
        hasDemo: true, 
        demoUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        driveLink: 'https://drive.google.com/file/d/example_B'
      },
      { 
        id: 'qp4', 
        title: 'Advanced Thermodynamics (Set A)', 
        facultyId: 'FOET', 
        departmentId: 'MECH-RMP', 
        fileName: 'MECH_Thermo_2024_A.pdf', 
        uploadDate: '2024-08-03', 
        hasDemo: false,
        driveLink: 'https://drive.google.com/file/d/example_C'
      }
    ]
  }
};