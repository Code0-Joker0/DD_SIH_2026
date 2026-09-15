// Data store for Chat conversations, Task runs, Chat Uploads, and Source Files

export const INITIAL_CHAT_UPLOADS = [
  {
    id: 'cup_001',
    name: 'Compressor_Vibration_Telemetry_Aug2026.pdf',
    type: 'PDF Document',
    chatId: 'chat_001',
    chatTitle: 'P&ID Safety & Telemetry Analysis',
    uploadDate: 'Sep 12, 2026',
    status: 'Ready',
    accessScope: 'Chat Only',
    fileSize: '3.4 MB'
  },
  {
    id: 'cup_002',
    name: 'Pressure_Relief_Valve_Log_RV402.xlsx',
    type: 'Spreadsheet',
    chatId: 'chat_001',
    chatTitle: 'P&ID Safety & Telemetry Analysis',
    uploadDate: 'Sep 12, 2026',
    status: 'Ready',
    accessScope: 'Chat Only',
    fileSize: '1.2 MB'
  },
  {
    id: 'cup_003',
    name: 'SOP_Inspection_Draft_Notes.docx',
    type: 'Word Document',
    chatId: 'chat_002',
    chatTitle: 'Compare Inspection Reports & SOPs',
    uploadDate: 'Sep 10, 2026',
    status: 'Indexed',
    accessScope: 'Chat Only',
    fileSize: '840 KB'
  },
  {
    id: 'cup_004',
    name: 'Scanned_Heat_Exchanger_Diagram.png',
    type: 'Image (PNG)',
    chatId: 'chat_003',
    chatTitle: 'Calculate Material Requirement & Flow',
    uploadDate: 'Sep 08, 2026',
    status: 'Ready',
    accessScope: 'Chat Only',
    fileSize: '5.1 MB'
  }
];

export const INITIAL_SOURCE_FILES = [
  {
    id: 'doc_001',
    name: 'SOP_Inspection_v4.2.pdf',
    department: 'Operations',
    version: 'v4.2',
    accessPermissions: 'All Engineering',
    status: 'Indexed',
    indexedStatus: 'Ready in Qdrant',
    lastUpdated: 'Aug 28, 2026',
    fileSize: '4.2 MB',
    category: 'Standard Operating Procedure'
  },
  {
    id: 'doc_002',
    name: 'Plant_Safety_Manual_2026.pdf',
    department: 'HSE (Health & Safety)',
    version: 'v2.0',
    accessPermissions: 'Organization Wide',
    status: 'Indexed',
    indexedStatus: 'Ready in Qdrant',
    lastUpdated: 'Aug 24, 2026',
    fileSize: '8.1 MB',
    category: 'Safety Manual'
  },
  {
    id: 'doc_003',
    name: 'Inspection_Report_Q3_Refinery.pdf',
    department: 'Maintenance',
    version: 'v1.0',
    accessPermissions: 'Maintenance Leads',
    status: 'Indexed',
    indexedStatus: 'Ready in Qdrant',
    lastUpdated: 'Aug 18, 2026',
    fileSize: '6.4 MB',
    category: 'Inspection Report'
  },
  {
    id: 'doc_004',
    name: 'Maintenance_Guidelines_HighTemp.pdf',
    department: 'Maintenance',
    version: 'v3.1',
    accessPermissions: 'All Engineering',
    status: 'Indexed',
    indexedStatus: 'Ready in Qdrant',
    lastUpdated: 'Aug 12, 2026',
    fileSize: '3.9 MB',
    category: 'Technical Guideline'
  },
  {
    id: 'doc_005',
    name: 'P&ID_Compressor_Unit_3.pdf',
    department: 'Process Design',
    version: 'v5.0',
    accessPermissions: 'Process Leads',
    status: 'Indexed',
    indexedStatus: 'Ready in Qdrant',
    lastUpdated: 'Jul 30, 2026',
    fileSize: '12.5 MB',
    category: 'Engineering Diagram'
  },
  {
    id: 'doc_006',
    name: 'Material_Standards_Specs_2026.xlsx',
    department: 'Procurement',
    version: 'v2.4',
    accessPermissions: 'Organization Wide',
    status: 'Indexed',
    indexedStatus: 'Ready in Qdrant',
    lastUpdated: 'Jul 15, 2026',
    fileSize: '2.1 MB',
    category: 'Standards & Spec'
  }
];

export const INITIAL_CHATS = [
  {
    id: 'chat_001',
    title: 'P&ID Safety & Telemetry Analysis',
    userId: 'usr_rkulkarni',
    createdDate: 'Today',
    updatedDate: '2 hours ago',
    pinned: true,
    archived: false,
    attachedFileIds: ['cup_001', 'cup_002'],
    selectedSourceDocumentIds: ['doc_001', 'doc_002', 'doc_005'],
    knowledgeScope: 'selected',
    aiMode: 'Vision & P&ID Analysis',
    messages: [
      {
        id: 'msg_001',
        sender: 'user',
        timestamp: '10:15 AM',
        content: 'Analyze the attached telemetry logs and compare them against P&ID Compressor Unit 3 SOP to check safety compliance.',
        attachedFiles: [
          { name: 'Compressor_Vibration_Telemetry_Aug2026.pdf', size: '3.4 MB' },
          { name: 'Pressure_Relief_Valve_Log_RV402.xlsx', size: '1.2 MB' }
        ],
        selectedSourcesCount: 3
      },
      {
        id: 'msg_002',
        sender: 'ai',
        timestamp: '10:16 AM',
        taskRun: {
          id: 'tr_1092',
          executionStatus: 'Completed',
          progressStages: [
            { key: 'understanding', label: 'Understanding request', status: 'done' },
            { key: 'reading', label: 'Reading 2 uploaded files', status: 'done' },
            { key: 'searching', label: 'Searching 3 selected sources', status: 'done' },
            { key: 'comparing', label: 'Comparing telemetry against SOP', status: 'done' },
            { key: 'verifying', label: 'Verifying extracted safety limits', status: 'done' },
            { key: 'preparing', label: 'Preparing final answer', status: 'done' }
          ],
          answer: 'Based on the cross-analysis of your uploaded telemetry logs and the 3 selected organizational source files (SOP_Inspection_v4.2.pdf, Plant_Safety_Manual_2026.pdf, P&ID_Compressor_Unit_3.pdf), Compressor Unit 3 is operating within normal thermal ranges but exhibits 2 compliance warnings:',
          findings: [
            {
              num: '01',
              title: 'Vibration Telemetry Spike',
              desc: 'Telemetry shows a 14% peak shaft displacement exceeding Section 3.2 ISO vibration thresholds.'
            },
            {
              num: '02',
              title: 'Relief Valve RV-402 Calibration Overdue',
              desc: 'Log entries show RV-402 testing expired on Aug 15, 2026. Recalibration must be executed before vessel re-pressurization.'
            }
          ],
          recommendation: 'Schedule immediate diagnostic testing for Compressor Unit 3 shaft bearings and lock out pressure vessel line B until RV-402 is recalibrated.',
          sources: ['SOP_Inspection_v4.2.pdf', 'Plant_Safety_Manual_2026.pdf', 'P&ID_Compressor_Unit_3.pdf'],
          generatedFiles: [
            { name: 'Safety_Audit_Report_Compressor3.pdf', size: '1.8 MB', type: 'Executive PDF' },
            { name: 'Telemetry_Anomalies_Summary.xlsx', size: '420 KB', type: 'Spreadsheet' }
          ],
          technicalDetails: {
            modelsUsed: 'Autonomous Vision & P&ID Analysis Pipeline',
            ocrUsed: 'Applied PaddleOCR-VL to scanned diagram pages',
            retrievalScope: 'Filtered by 3 selected document IDs (doc_001, doc_002, doc_005) in Qdrant',
            selectedSources: '3 verified organizational sources',
            toolsUsed: 'P&ID Vector Parser · Telemetry Anomaly Detector',
            executionTime: '3.8 seconds',
            finalStatus: 'COMPLETED_SUCCESS'
          }
        }
      }
    ]
  },
  {
    id: 'chat_002',
    title: 'Compare Inspection Reports & SOPs',
    userId: 'usr_rkulkarni',
    createdDate: 'Yesterday',
    updatedDate: 'Yesterday',
    pinned: false,
    archived: false,
    attachedFileIds: ['cup_003'],
    selectedSourceDocumentIds: ['doc_001', 'doc_003'],
    knowledgeScope: 'selected',
    aiMode: 'General Analysis',
    messages: [
      {
        id: 'msg_003',
        sender: 'user',
        timestamp: '4:30 PM',
        content: 'Compare the Q3 Inspection Report findings with SOP_Inspection guidelines and summarize key deviations.',
        attachedFiles: [
          { name: 'SOP_Inspection_Draft_Notes.docx', size: '840 KB' }
        ],
        selectedSourcesCount: 2
      },
      {
        id: 'msg_004',
        sender: 'ai',
        timestamp: '4:31 PM',
        taskRun: {
          id: 'tr_1091',
          executionStatus: 'Completed',
          progressStages: [
            { key: 'understanding', label: 'Understanding request', status: 'done' },
            { key: 'reading', label: 'Reading draft notes', status: 'done' },
            { key: 'searching', label: 'Searching 2 selected sources', status: 'done' },
            { key: 'comparing', label: 'Comparing inspection reports', status: 'done' },
            { key: 'preparing', label: 'Preparing response', status: 'done' }
          ],
          answer: 'The Q3 Inspection Report shows general compliance across primary storage tanks. However, comparison with SOP_Inspection_v4.2 reveals a procedural deviation in secondary seal verification routines.',
          findings: [
            {
              num: '01',
              title: 'Single Sign-off Deviation',
              desc: 'Section 4.2 of SOP-Inspection requires dual-technician sign-off on high-temperature line audits, whereas Q3 logs reflect single signatures.'
            }
          ],
          recommendation: 'Re-issue standard operating guidelines to regional inspection leads and enforce mandatory digital dual sign-offs.',
          sources: ['SOP_Inspection_v4.2.pdf', 'Inspection_Report_Q3_Refinery.pdf'],
          generatedFiles: [
            { name: 'SOP_Deviation_Executive_Summary.pdf', size: '1.2 MB', type: 'PDF Summary' }
          ],
          technicalDetails: {
            modelsUsed: 'General Analysis Pipeline',
            ocrUsed: 'None (Native text extraction)',
            retrievalScope: 'Filtered by 2 selected document IDs (doc_001, doc_003)',
            selectedSources: '2 verified organizational sources',
            toolsUsed: 'Document Layout Parser',
            executionTime: '2.4 seconds',
            finalStatus: 'COMPLETED_SUCCESS'
          }
        }
      }
    ]
  },
  {
    id: 'chat_003',
    title: 'Calculate Material Requirement & Flow',
    userId: 'usr_rkulkarni',
    createdDate: 'Sep 08, 2026',
    updatedDate: 'Sep 08, 2026',
    pinned: false,
    archived: false,
    attachedFileIds: ['cup_004'],
    selectedSourceDocumentIds: ['doc_006'],
    knowledgeScope: 'selected',
    aiMode: 'General Analysis',
    messages: [
      {
        id: 'msg_005',
        sender: 'user',
        timestamp: '2:10 PM',
        content: 'Calculate material requirement for the heat exchanger maintenance based on the scanned diagram and material specifications.',
        attachedFiles: [
          { name: 'Scanned_Heat_Exchanger_Diagram.png', size: '5.1 MB' }
        ],
        selectedSourcesCount: 1
      },
      {
        id: 'msg_006',
        sender: 'ai',
        timestamp: '2:12 PM',
        taskRun: {
          id: 'tr_1090',
          executionStatus: 'Completed',
          progressStages: [
            { key: 'understanding', label: 'Understanding request', status: 'done' },
            { key: 'reading', label: 'Reading diagram image', status: 'done' },
            { key: 'calculating', label: 'Performing calculation', status: 'done' },
            { key: 'preparing', label: 'Preparing response', status: 'done' }
          ],
          answer: 'The calculated material requirements for the heat exchanger bundle replacement total 42 meters of Seamless Titanium Grade 2 Tubing (3/4" OD x 0.065" Wall) and 2 gaskets.',
          findings: [
            {
              num: '01',
              title: 'Titanium Tubing Quantity',
              desc: '42 meters required across 28 dual-pass tubes.'
            }
          ],
          recommendation: 'Verify stock availability in Procurement sheet Material_Standards_Specs_2026.xlsx before issuing purchase requisition.',
          sources: ['Material_Standards_Specs_2026.xlsx'],
          generatedFiles: [
            { name: 'BoM_HeatExchanger_Q4.xlsx', size: '310 KB', type: 'Bill of Materials' }
          ],
          technicalDetails: {
            modelsUsed: 'Vision & Calculation Engine',
            ocrUsed: 'Vision OCR on PNG drawing',
            retrievalScope: 'Filtered by 1 selected document ID (doc_006)',
            selectedSources: '1 verified organizational source',
            toolsUsed: 'Engineering Math Engine',
            executionTime: '3.1 seconds',
            finalStatus: 'COMPLETED_SUCCESS'
          }
        }
      }
    ]
  }
];
