/**
 * ForensikGaji Frontend - Main Application Component
 *
 * This is the single-page application (SPA) that powers the ForensikGaji
 * forensic document auditing platform. It manages:
 *
 * - Dashboard: Audit case management and risk monitoring
 * - Expert Marketplace: Booking technical experts for interviews
 * - Candidate Portal: Secure document upload interface
 * - Report View: Detailed forensic analysis with heatmaps and overlays
 *
 * State Management:
 * - React hooks (useState, useEffect) for local state
 * - LocalStorage for data persistence
 * - BroadcastChannel for cross-tab synchronization
 *
 * @author ForensikGaji Team
 * @created May 2026
 * @hackathon Project 2030 - MyAI Future (Track 5: Secure Digital)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Users, Search,
  FileText, AlertTriangle, CheckCircle, FileWarning,
  ChevronRight, X, Star, Clock, FileDown, Activity,
  Link as LinkIcon, Copy, PlusCircle, UserCheck, Eye,
  UserPlus, Edit, Trash2, MessageSquare, Download, BarChart2, UploadCloud, Link, ArrowRight, Menu, Play, LogOut
} from 'lucide-react';

import { initialContainers, expertDatabase } from './constants';
import { fetchAllCases, createCase, updateCase, deleteCase, addFilesToCase } from './apiService';

/**
 * AuditCaseItem Component
 *
 * Displays a single audit case with its files, search/filter functionality,
 * and action buttons. Shows different states based on analysis status.
 *
 * @param {Object} c - The case object containing id, name, status, data
 * @param {Function} onRename - Callback to rename the case
 * @param {Function} onDelete - Callback to delete the case
 * @param {Function} onViewReport - Callback to view the forensic report
 * @param {Function} onCopyLink - Callback to copy the upload link
 * @param {Function} onOpenPortal - Callback to open candidate portal
 * @param {Function} onUpdateFileStatus - Callback to update file investigation status
 * @param {Function} onDeleteFile - Callback to delete a file from case
 * @param {Function} onRenameFile - Callback to rename a file
 * @param {Function} onBookExpertFromDashboard - Callback to book expert from dashboard
 */
const AuditCaseItem = ({ c, onRename, onDelete, onViewReport, onCopyLink, onOpenPortal, onUpdateFileStatus, onDeleteFile, onRenameFile, onBookExpertFromDashboard, onOpenDetail }) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('risk_high');

  let displayFiles = Array.isArray(c.data?.files) ? [...c.data.files] : [];

  if (search) {
    displayFiles = displayFiles.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  }

  if (sortBy === 'risk_high') {
    displayFiles.sort((a, b) => a.score - b.score);
  } else if (sortBy === 'risk_low') {
    displayFiles.sort((a, b) => b.score - a.score);
  } else if (sortBy === 'name') {
    displayFiles.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div onClick={() => onOpenDetail && onOpenDetail(c)} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-6 transition-all hover:bg-gray-50 hover:shadow-[0_8px_30px_rgba(37,99,235,0.1)] hover:border-gray-300 cursor-pointer">
      <div className="flex-1 min-w-0 w-full md:pr-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-500 uppercase">{c.id}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              c.status === 'waiting' ? 'bg-amber-100 text-amber-700 border-amber-300' :
              c.status === 'processing' ? 'bg-blue-100 text-blue-700 animate-pulse border-blue-300' :
              'bg-emerald-100 text-emerald-700 border-emerald-300'
            }`}>
              {c.status === 'waiting' ? 'Waiting for Candidate' : c.status === 'processing' ? 'Analyzing Files...' : 'Analysis Complete'}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button onClick={(e) => { e.stopPropagation(); onRename(c.id, c.name); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded transition-colors" title="Rename Case">
              <Edit className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(c.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors" title="Delete Case">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{c.name}</h3>

        {c.status === 'completed' && Array.isArray(c.data?.files) && c.data.files.length > 0 ? (
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search file name..."
                  value={search}
                  onChange={(e) => { e.stopPropagation(); setSearch(e.target.value); }}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => { e.stopPropagation(); setSortBy(e.target.value); }}
                className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="risk_high">Sort: Highest Risk</option>
                <option value="risk_low">Sort: Lowest Risk</option>
                <option value="name">Sort: A-Z</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {displayFiles.map((file, idx) => {
                const isHighRisk = file.score < 40;
                const origIdx = c.data.files.findIndex(f => f.name === file.name);

                return (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 border border-gray-200 px-4 py-3 rounded-lg gap-3 hover:border-gray-300 transition-colors">
                    <div className="flex items-center min-w-0 overflow-hidden flex-1">
                      <FileText className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-800 truncate block cursor-pointer hover:text-blue-600" onClick={() => onViewReport(c, origIdx)}>{file.name}</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap ${
                        file.score >= 80 ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                        file.score < 40 ? 'bg-red-100 text-red-700 border border-red-300' :
                        'bg-amber-100 text-amber-700 border border-amber-300'
                      }`}>
                        Score: {file.score}%
                      </div>

                      {isHighRisk && (
                        <select
                          value={file.investigation_status || 'Unreviewed'}
                          onChange={(e) => onUpdateFileStatus(c.id, file.name, e.target.value)}
                          className={`text-xs rounded-md px-2 py-1 outline-none border font-medium ${
                            file.investigation_status === 'Investigated - Fraud' ? 'bg-red-100 text-red-700 border-red-300' :
                            file.investigation_status === 'Investigated - Not Scam' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                            file.investigation_status === 'Investigation Ongoing' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                            'bg-gray-200 text-gray-600 border-gray-300'
                          }`}
                        >
                          <option value="Unreviewed">Unreviewed</option>
                          <option value="Investigation Ongoing">Investigation Ongoing</option>
                          <option value="Investigated - Not Scam">Investigated - Not Scam</option>
                          <option value="Investigated - Fraud">Investigated - Fraud</option>
                        </select>
                      )}

                      <button onClick={(e) => { e.stopPropagation(); onRenameFile(c.id, origIdx, file.name); }} className="text-gray-400 hover:text-blue-600 p-1 transition-colors" title="Rename File">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDeleteFile(c.id, file.name); }} className="text-gray-400 hover:text-red-600 p-1 transition-colors" title="Delete File">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {displayFiles.length === 0 && <p className="text-gray-500 text-sm italic">No files match your search.</p>}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm mt-2">{c.type}</p>
        )}
      </div>

      <div className="flex flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6 min-w-[200px]">
        {(c.status === 'waiting' || c.status === 'completed') && (
          <div className="flex flex-col space-y-2">
             <label className="text-xs font-bold text-gray-500 uppercase">Upload Portal Link</label>
             <div className="flex items-center space-x-2 bg-gray-50 border border-gray-300 p-2 rounded-lg">
               <button onClick={(e) => { e.stopPropagation(); onOpenPortal(c.id); }} className="text-blue-600 font-mono text-xs truncate max-w-[140px] hover:underline" title={c.link}>{c.link}</button>
               <button onClick={(e) => { e.stopPropagation(); onCopyLink(c.link); }} className="p-1 hover:bg-gray-200 rounded text-gray-400 transition-colors"><Copy className="w-4 h-4" /></button>
             </div>
          </div>
        )}

        {c.status === 'processing' && (
          <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <Activity className="w-6 h-6 text-blue-600 animate-spin mb-2" />
            <span className="text-xs font-medium text-gray-600">Processing...</span>
          </div>
        )}

        {c.status === 'completed' && (
          <div className="flex flex-col space-y-2 w-full mt-2 md:mt-0">
            <button onClick={(e) => { e.stopPropagation(); onViewReport(c, 0); }} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white py-2.5 rounded-lg font-bold transition-colors shadow-sm text-sm flex justify-center items-center">
              View Full Report <ArrowRight className="w-4 h-4 ml-2" />
            </button>
            {c.type?.toLowerCase().includes('resume') && (
               <button onClick={() => onBookExpertFromDashboard(c)} className="w-full bg-gray-100 hover:bg-gray-200 text-cyan-600 border border-gray-300 py-2.5 rounded-lg font-bold transition-colors shadow-sm text-sm flex justify-center items-center">
                  Book Expert <Users className="w-4 h-4 ml-2" />
               </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Main Application Component
 *
 * Manages the entire ForensikGaji SPA including:
 * - Tab navigation (Landing, Dashboard, Marketplace, Registration, Candidate Portal)
 * - Audit case management (CRUD operations)
 * - File upload and analysis workflow
 * - Expert booking functionality
 * - Cross-tab state synchronization
 * - Local storage persistence
 */
export default function App() {
  const isExternalLink = new URLSearchParams(window.location.search).get('upload') !== null;
  const [activeTab, setActiveTab] = useState(isExternalLink ? 'candidate_portal' : 'landing'); 
  // Audit cases view state
  const [caseSearch, setCaseSearch] = useState('');
  const [caseSortBy, setCaseSortBy] = useState('newest');
  // Audit case detail view state
  const [fileSearch, setFileSearch] = useState('');
  const [fileSortBy, setFileSortBy] = useState('risk_high');


  
  const [containers, setContainers] = useState(() => {
    try {
      const saved = localStorage.getItem('forensikGajiCases');
      if (!saved) return initialContainers;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return initialContainers;
      
      const validData = parsed.filter(c => c !== null && typeof c === 'object' && c.id && c.name);
      return validData.length > 0 ? validData : initialContainers;
    } catch (e) {
      return initialContainers;
    }
  });

  // Load data from API on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const apiCases = await fetchAllCases();
        if (apiCases && apiCases.length > 0) {
          setContainers(apiCases);
          try {
            localStorage.setItem('forensikGajiCases', JSON.stringify(apiCases));
          } catch (e) {}
        }
      } catch (error) {
        console.error("Failed to load from API on mount, using localStorage:", error);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    const bc = new BroadcastChannel('forensik_sync');
    
    bc.onmessage = (event) => {
      const { type, payload } = event.data;
      
      if (type === 'REQUEST_STATE') {
        setContainers(prev => {
          try {
            const replyBc = new BroadcastChannel('forensik_sync');
            replyBc.postMessage({ type: 'SYNC_STATE', payload: prev });
            replyBc.close();
          } catch(e) {}
          return prev; 
        });
      } else if (type === 'SYNC_STATE' && Array.isArray(payload)) {
        if (isExternalLink) setContainers(payload.filter(c => c && c.id));
      } else if (type === 'UPDATE_CASE' && payload && payload.id) {
        setContainers(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          const exists = safePrev.find(c => c.id === payload.id);
          if (exists) {
            return safePrev.map(c => {
              if (c.id === payload.id) {
                const oldFiles = Array.isArray(c.data?.files) ? c.data.files : [];
                const newFiles = Array.isArray(payload.data?.files) ? payload.data.files : [];
                const mergedFiles = [...oldFiles];
                
                newFiles.forEach(nf => {
                  if (!mergedFiles.find(of => of.name === nf.name)) {
                    mergedFiles.push(nf);
                  }
                });
                
                const avgScore = mergedFiles.length > 0 
                  ? Math.round(mergedFiles.reduce((acc, f) => acc + f.score, 0) / mergedFiles.length) 
                  : 100;
                
                return {
                  ...c, 
                  status: 'completed',
                  data: {
                    ...c.data,
                    ...payload.data,
                    score: avgScore === 100 && mergedFiles.length === 0 ? 0 : avgScore,
                    files: mergedFiles
                  }
                };
              }
              return c;
            });
          }
          return [payload, ...safePrev];
        });
      }
    };

    if (isExternalLink) bc.postMessage({ type: 'REQUEST_STATE' });
    return () => bc.close();
  }, [isExternalLink]);

  useEffect(() => {
    try {
      localStorage.setItem('forensikGajiCases', JSON.stringify(containers));
    } catch (e) {}
  }, [containers]);
  
  const [newContainerName, setNewContainerName] = useState('');
  const [newContainerTypes, setNewContainerTypes] = useState(['Resume']); 
  const [otherDocType, setOtherDocType] = useState(''); 
  
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [activeCandidateUploadId, setActiveCandidateUploadId] = useState(isExternalLink ? new URLSearchParams(window.location.search).get('upload') : null);

  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingHRUpload, setIsProcessingHRUpload] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [lastUploadCompletionTime, setLastUploadCompletionTime] = useState(0); 
  
  const [sessionUploadedFiles, setSessionUploadedFiles] = useState([]);
  const [candidateCustomName, setCandidateCustomName] = useState('');
  
  const [bookingExpert, setBookingExpert] = useState(null);
  const [selectedExpertDetail, setSelectedExpertDetail] = useState(null); 
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  const [marketplaceTab, setMarketplaceTab] = useState('discover');
  const [myBookings, setMyBookings] = useState([]);
  const [shareCaseModal, setShareCaseModal] = useState(null);
  const [viewFeedbackModal, setViewFeedbackModal] = useState(null);
  const [selectedShareCase, setSelectedShareCase] = useState('');
  const [selectedShareFiles, setSelectedShareFiles] = useState([]);
  const [shareMessage, setShareMessage] = useState('');
  
  const [searchExpertName, setSearchExpertName] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterPriceRange, setFilterPriceRange] = useState('All');

  const [containerToDelete, setContainerToDelete] = useState(null);
  const [containerToRename, setContainerToRename] = useState(null);
  const [fileToRename, setFileToRename] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const [viewMode, setViewMode] = useState('original'); 
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);
  const [activeAnomaly, setActiveAnomaly] = useState(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  const [activeAuditCase, setActiveAuditCase] = useState(null);
  const [activeDocTab, setActiveDocTab] = useState('all');
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const [auditCaseTypeFilter, setAuditCaseTypeFilter] = useState('all');

  const [creationMode, setCreationMode] = useState('link');
  const [directFiles, setDirectFiles] = useState([]);
  
  const claimBoxRef = useRef(null);

  // Function to manually refresh data from API (with localStorage fallback)
  const refreshData = async () => {
    // Don't refresh if currently uploading to prevent overwriting local changes
    if (isUploading || isProcessingHRUpload) {
      console.log("Skipping refresh during upload to preserve local changes");
      return;
    }

    // Don't refresh immediately after upload completion to give Firestore time to sync
    const timeSinceUpload = Date.now() - lastUploadCompletionTime;
    if (timeSinceUpload < 5000) { // 5 second buffer after upload
      console.log(`Skipping refresh, waiting for Firestore sync (${5000 - timeSinceUpload}ms remaining)`);
      return;
    }

    try {
      // Try to fetch from API first
      const apiCases = await fetchAllCases();
      if (apiCases && apiCases.length > 0) {
        // Preserve local images when refreshing from API
        // Firestore doesn't store base64 images due to size limits
        setContainers(prev => {
          const localCases = Array.isArray(prev) ? prev : [];

          return apiCases.map(apiCase => {
            const localCase = localCases.find(lc => lc.id === apiCase.id);

            // If we have local data with images, preserve them
            if (localCase?.data?.files && apiCase.data?.files) {
              const mergedFiles = apiCase.data.files.map(apiFile => {
                const localFile = localCase.data.files.find(lf => lf.name === apiFile.name);
                // Preserve images from local state
                return {
                  ...apiFile,
                  heatmap: localFile?.heatmap || apiFile.heatmap || null,
                  original: localFile?.original || apiFile.original || null
                };
              });

              return {
                ...apiCase,
                data: {
                  ...apiCase.data,
                  files: mergedFiles
                }
              };
            }

            return apiCase;
          });
        });

        // Also update localStorage as cache
        try {
          localStorage.setItem('forensikGajiCases', JSON.stringify(apiCases));
        } catch (e) {}
      } else {
        // Fallback to localStorage if API returns empty
        const saved = localStorage.getItem('forensikGajiCases');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const validData = parsed.filter(c => c !== null && typeof c === 'object' && c.id && c.name);
            setContainers(validData.length > 0 ? validData : []);
          }
        }
      }
      setLastRefreshTime(Date.now());
    } catch (e) {
      console.error("Error refreshing data from API, falling back to localStorage:", e);
      // Fallback to localStorage
      const saved = localStorage.getItem('forensikGajiCases');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const validData = parsed.filter(c => c !== null && typeof c === 'object' && c.id && c.name);
            setContainers(validData.length > 0 ? validData : []);
          }
        } catch (e2) {}
      }
      setLastRefreshTime(Date.now());
    }
  };

  // Auto-poll for updates every 10 seconds when on dashboard or audit cases
  useEffect(() => {
    if (activeTab === 'scanner' || activeTab === 'new_entry' || activeTab === 'audit_cases') {
      const interval = setInterval(() => {
        refreshData();
      }, 10000); // Poll every 10 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedContainer && viewMode === 'original') {
      const report = selectedContainer.data;
      if (Array.isArray(report?.files) && report.files.length > 0) {
        const activeFile = report.files[selectedFileIndex] || report.files[0];
        if (Array.isArray(activeFile.flagged_claims)) {
          const firstValidIndex = activeFile.flagged_claims.findIndex(c => !c.box_hidden);
          if (firstValidIndex !== -1) {
            setActiveAnomaly(firstValidIndex);
          }
        }
      }
    }
  }, [selectedContainer, selectedFileIndex, viewMode]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const uploadId = urlParams.get('upload');
    if (uploadId) {
      setContainers(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        if (!safePrev.find(c => c && c.id === uploadId)) {
          return [{
            id: uploadId,
            name: `Candidate Upload (${uploadId})`, 
            type: 'External Upload',
            status: 'waiting',
            link: window.location.href,
            data: null
          }, ...safePrev];
        }
        return safePrev;
      });
      setActiveCandidateUploadId(uploadId);
      setActiveTab('candidate_portal');
    }
  }, []);

  const safeContainers = Array.isArray(containers) ? containers : [];
  const totalAudits = safeContainers.length;
  
  let totalFilesScanned = 0;
  let totalCriticalRiskFiles = 0;
  const allHighRiskFiles = [];

  safeContainers.forEach(c => {
    if (c.status === 'completed' && Array.isArray(c.data?.files)) {
      totalFilesScanned += c.data.files.length;
      c.data.files.forEach((file, index) => {
        if (file.score < 40) {
          if (file.investigation_status !== 'Investigated - Not Scam') {
            totalCriticalRiskFiles++;
          }
          if (file.investigation_status !== 'Investigated - Not Scam' && file.investigation_status !== 'Investigated - Fraud') {
            allHighRiskFiles.push({ container: c, file, fileIndex: index });
          }
        }
      });
    }
  });

  const completedAudits = safeContainers.filter(c => c && c.status === 'completed' && c.data);
  const avgScore = completedAudits.length > 0
    ? (completedAudits.reduce((acc, curr) => acc + (curr.data.score || 0), 0) / completedAudits.length).toFixed(1)
    : 0;

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  /**
   * Creates a new audit case with a unique ID and upload link.
   * Supports both link generation (for candidates) and direct upload modes.
   * Now uses API for proper cross-device synchronization.
   */
  const handleCreateContainer = async (e) => {
    e.preventDefault();
    if (!newContainerName.trim() || newContainerTypes.length === 0) return;

    const finalTypes = newContainerTypes.map(t => t === 'Other' && otherDocType.trim() ? otherDocType.trim() : t).filter(t => t !== 'Other' || otherDocType.trim());
    if (finalTypes.length === 0) return;

    try {
      // Use API to create the case
      const newCase = await createCase(newContainerName, finalTypes);

      // Update local state
      setContainers(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return [newCase, ...safePrev];
      });

      setNewContainerName('');
      setNewContainerTypes(['Resume']);
      setOtherDocType('');
    } catch (error) {
      console.error("Failed to create case via API, falling back to local:", error);

      // Fallback to local creation (for offline/error scenarios)
      const newId = `req-${Math.floor(1000 + Math.random() * 9000)}`;
      const newContainer = {
        id: newId,
        name: newContainerName,
        type: finalTypes.join(' + '),
        status: 'waiting',
        link: `https://forensikgaji-frontend-381516681695.asia-southeast1.run.app/?upload=${newId}`,
        data: null
      };

      setContainers(prev => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return [newContainer, ...safePrev];
      });

      setNewContainerName('');
      setNewContainerTypes(['Resume']);
      setOtherDocType('');
    }
  };

  /**
   * Handles direct HR upload flow - creates case and processes files immediately.
   * Files are sent to the backend API for forensic analysis.
   */
  const handleDirectHRUpload = async (e) => {
    e.preventDefault();
    if (!newContainerName.trim() || directFiles.length === 0) return;

    const finalTypes = newContainerTypes.map(t => t === 'Other' && otherDocType.trim() ? otherDocType.trim() : t).filter(t => t !== 'Other' || otherDocType.trim());
    const newId = `req-${Math.floor(1000 + Math.random() * 9000)}`;

    setIsProcessingHRUpload(true);

    const tempContainer = {
      id: newId,
      name: newContainerName,
      type: finalTypes.length > 0 ? finalTypes.join(' + ') : 'Direct Upload',
      status: 'processing',
      link: `https://forensikgaji-frontend-381516681695.asia-southeast1.run.app/?upload=${newId}`,
      data: null
    };

    setContainers(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const newContainers = [tempContainer, ...safePrev];
      try {
        const bc = new BroadcastChannel('forensik_sync');
        bc.postMessage({ type: 'UPDATE_CASE', payload: tempContainer });
        bc.close();
      } catch(e) {}
      return newContainers;
    });

    const filesToProcess = [...directFiles];
    setNewContainerName('');
    setDirectFiles([]);
    setNewContainerTypes(['Resume']);
    setOtherDocType('');

    try {
      const uploadedFilesData = [];

      for (const file of filesToProcess) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("https://forensikgaji-backend-381516681695.asia-southeast1.run.app/api/scan-document", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error("Scan failed");
        const result = await response.json();

        uploadedFilesData.push({
          name: file.name,
          score: result.fraud_probability_score,
          issue: result.fraud_verdict,
          flagged_claims: result.flagged_claims,
          heatmap: result.ela_heatmap_base64,
          original: result.original_document_base64
        });
      }

      const avgScore = uploadedFilesData.length > 0
        ? Math.round(uploadedFilesData.reduce((acc, f) => acc + f.score, 0) / uploadedFilesData.length)
        : 0;

      // Use API to add files to the case (enables persistence)
      try {
        const updatedCase = await addFilesToCase(newId, uploadedFilesData);
        setContainers(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return safePrev.map(c => c?.id === newId ? updatedCase : c);
        });
      } catch (apiError) {
        console.error("API upload failed, using local fallback:", apiError);

        // Fallback to local state management (files won't persist after refresh)
        setContainers(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          const newContainers = safePrev.map(c => {
            if (c && c.id === newId) {
              return {
                ...c,
                status: 'completed',
                data: {
                  score: avgScore,
                  date: new Date().toLocaleDateString(),
                  clash_detected: false,
                  files: uploadedFilesData
                }
              };
            }
            return c;
          });

          try {
            const updatedContainer = newContainers.find(c => c && c.id === newId);
            if (updatedContainer) {
              const bc = new BroadcastChannel('forensik_sync');
              bc.postMessage({ type: 'UPDATE_CASE', payload: updatedContainer });
              bc.close();
            }
          } catch(e) { console.warn("Sync skipped for large payload"); }

          return newContainers;
        });
      }

      setToastMessage(`✅ Case Complete: ${filesToProcess.length} documents analyzed.`);
      setTimeout(() => setToastMessage(null), 4000);

    } catch (error) {
      console.error("Backend error:", error);
      alert("Backend connection failed. Please check Python console.");
      setContainers(prev => Array.isArray(prev) ? prev.filter(c => c && c.id !== newId) : []);
    } finally {
      setIsProcessingHRUpload(false);
      setLastUploadCompletionTime(Date.now()); // Track when upload completed
    }
  };

  /**
   * Handles candidate document uploads from the candidate portal.
   * Processes files through the backend API and updates the case status.
   */
  const handleCandidateUpload = async (event) => {
    const files = Array.from(event.target.files);
    event.target.value = null; 
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadSuccess(false);
    
    try {
      const uploadedFilesData = [];
      let anyFraud = false;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let finalName = file.name;
        if (candidateCustomName.trim() !== '') {
          const extParts = file.name.split('.');
          const ext = extParts.length > 1 ? '.' + extParts.pop() : '';
          finalName = files.length === 1 
            ? `${candidateCustomName.trim()}${ext}` 
            : `${candidateCustomName.trim()}-${i + 1}${ext}`;
        }

        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch("https://forensikgaji-backend-381516681695.asia-southeast1.run.app/api/scan-document", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) throw new Error("Scan failed");
        const result = await response.json();

        uploadedFilesData.push({
          name: finalName,
          score: result.fraud_probability_score,
          issue: result.fraud_verdict,
          flagged_claims: result.flagged_claims,
          heatmap: result.ela_heatmap_base64,
          original: result.original_document_base64
        });

        if (result.fraud_probability_score < 40) anyFraud = true;
      }

      setSessionUploadedFiles(prev => [...prev, ...uploadedFilesData]);

      // Use API to add files to the case (enables cross-device sync)
      try {
        const updatedCase = await addFilesToCase(activeCandidateUploadId, uploadedFilesData);
        setContainers(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return safePrev.map(c => {
            if (c?.id === activeCandidateUploadId) {
              // Merge API response with local uploadedFilesData to preserve images
              // Firestore can't store large base64 images, so we keep them locally
              const apiFiles = updatedCase.data?.files || [];
              const localFiles = uploadedFilesData;

              // Merge: API metadata + local images
              const mergedFiles = apiFiles.map(apiFile => {
                const localFile = localFiles.find(lf => lf.name === apiFile.name);
                return {
                  ...apiFile,
                  heatmap: localFile?.heatmap || null,
                  original: localFile?.original || null,
                  // Preserve local investigation status if set
                  investigation_status: apiFile.investigation_status || 'Unreviewed'
                };
              });

              const mergedCase = {
                ...updatedCase,
                data: {
                  ...updatedCase.data,
                  files: mergedFiles
                }
              };

              // Save to localStorage to preserve uploaded files
              try {
                localStorage.setItem('forensikGajiCases', JSON.stringify(
                  safePrev.map(tc => tc?.id === activeCandidateUploadId ? mergedCase : tc)
                ));
              } catch (e) {
                console.warn("Failed to save to localStorage:", e);
              }

              return mergedCase;
            }
            return c;
          });
        });
      } catch (apiError) {
        console.error("API upload failed, using local fallback:", apiError);

        // Fallback to local state management
        setContainers(prev => {
          const safePrev = Array.isArray(prev) ? prev : [];
          const newContainers = safePrev.map(c => {
            if (c && c.id === activeCandidateUploadId) {
              const existingFiles = Array.isArray(c.data?.files) ? c.data.files : [];
              const mergedFiles = [...existingFiles];
              uploadedFilesData.forEach(nf => {
                 if (!mergedFiles.find(of => of.name === nf.name)) mergedFiles.push(nf);
              });

              const newAvgScore = mergedFiles.length > 0
                  ? Math.round(mergedFiles.reduce((acc, f) => acc + f.score, 0) / mergedFiles.length)
                  : 100;

              return {
                ...c,
                status: 'completed',
                data: {
                  ...c.data,
                  score: newAvgScore === 100 && mergedFiles.length === 0 ? 0 : newAvgScore,
                  date: new Date().toLocaleDateString(),
                  clash_detected: false,
                  files: mergedFiles
                }
              };
            }
            return c;
          });

          try {
            const updatedContainer = newContainers.find(c => c && c.id === activeCandidateUploadId);
            if (updatedContainer) {
              const bc = new BroadcastChannel('forensik_sync');
              bc.postMessage({ type: 'UPDATE_CASE', payload: updatedContainer });
              bc.close();
            }
          } catch (e) { console.warn("Sync skipped for large payload"); }

          return newContainers;
        });
      }

      setIsUploading(false);
      setUploadSuccess(true);
      setLastUploadCompletionTime(Date.now()); // Track when upload completed
      
      if (anyFraud) {
        setToastMessage(`🚨 High Risk Alert: Critical anomaly detected in candidate upload.`);
        setTimeout(() => setToastMessage(null), 5000);
      }

    } catch (error) {
      console.error("Backend error:", error);
      alert("Backend connection failed or server error occurred. Please check the Python console.");
      setIsUploading(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteCase(containerToDelete);
      setContainers(prev => Array.isArray(prev) ? prev.filter(c => c && c.id !== containerToDelete) : []);
      setContainerToDelete(null);
    } catch (error) {
      console.error("Failed to delete case via API, using local fallback:", error);
      setContainers(prev => Array.isArray(prev) ? prev.filter(c => c && c.id !== containerToDelete) : []);
      setContainerToDelete(null);
    }
  };

  const openRenameModal = (id, currentName) => {
    setContainerToRename(id);
    setRenameValue(currentName);
  };

  const confirmRename = async (e) => {
    e.preventDefault();
    if (renameValue && renameValue.trim() !== "") {
      try {
        await updateCase(containerToRename, { name: renameValue });
        setContainers(prev => Array.isArray(prev) ? prev.map(c => c && c.id === containerToRename ? { ...c, name: renameValue } : c) : []);
      } catch (error) {
        console.error("Failed to rename case via API, using local fallback:", error);
        setContainers(prev => Array.isArray(prev) ? prev.map(c => c && c.id === containerToRename ? { ...c, name: renameValue } : c) : []);
      }
    }
    setContainerToRename(null);
  };

  const confirmFileRename = async (e) => {
    e.preventDefault();
    if (!fileToRename || !renameValue || renameValue.trim() === "") return;

    const newName = renameValue.trim();

    try {
      // Update local state first for immediate feedback
      setContainers(prev => {
         const safePrev = Array.isArray(prev) ? prev : [];
         return safePrev.map(c => {
           if (c.id === fileToRename.containerId) {
              const files = Array.isArray(c.data?.files) ? [...c.data.files] : [];
              if (files[fileToRename.origIdx]) {
                 files[fileToRename.origIdx] = {
                   ...files[fileToRename.origIdx],
                   name: newName
                 };
              }
              return {
                 ...c,
                 data: {
                    ...c.data,
                    files
                 }
              };
           }
           return c;
         });
      });

      // Persist to backend
      const container = containers.find(c => c.id === fileToRename.containerId);
      if (container) {
        const files = Array.isArray(container.data?.files) ? [...container.data.files] : [];
        if (files[fileToRename.origIdx]) {
          files[fileToRename.origIdx] = {
            ...files[fileToRename.origIdx],
            name: newName
          };
          await updateCase(fileToRename.containerId, { data: { ...container.data, files } });
        }
      }
    } catch (error) {
      console.error("Failed to rename file via API:", error);
    }

    setFileToRename(null);
  };

  const handleBookExpert = async (e) => {
    e.preventDefault();
    setBookingSuccess(true);
    
    setMyBookings(prev => [{
      id: `booking-${Date.now()}`,
      expert: bookingExpert,
      status: 'Not Shared', 
      dateBooked: new Date().toLocaleDateString(),
      sharedCaseId: null,
      sharedFiles: [],
      message: '',
      feedback: null
    }, ...prev]);

    setTimeout(() => {
      setBookingSuccess(false);
      setBookingExpert(null);
      setSelectedExpertDetail(null); 
      setActiveTab('marketplace');
      setMarketplaceTab('bookings');
    }, 3000);
  };

  const handleExportPDF = () => {
    setIsExportingPDF(true);
    const report = selectedContainer.data;
    
    if (!Array.isArray(report?.files)) {
        setIsExportingPDF(false);
        return;
    }
    
    const fileDetails = report.files.map(f => `
      <div style="margin-bottom: 40px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc; page-break-inside: avoid;">
        <h3 style="margin-top: 0; color: #0f172a; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px;">📄 ${f.name}</h3>
        <p style="font-size: 18px;"><strong>Trust Score:</strong> <span style="color: ${f.score < 40 ? '#ef4444' : '#22c55e'}; font-weight: bold;">${f.score}%</span></p>
        <p><strong>AI Verdict:</strong> ${f.issue}</p>
        
        ${Array.isArray(f.flagged_claims) && f.flagged_claims.length > 0 ? `
          <h4 style="margin-top: 20px; color: #334155;">⚠️ Flagged Claims:</h4>
          <ul style="list-style-type: none; padding-left: 0;">
            ${f.flagged_claims.map(c => `
              <li style="background: #fff; padding: 15px; border-left: 4px solid #facc15; margin-bottom: 10px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="font-family: monospace; font-size: 12px; background: #fef9c3; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 8px;">Target: "${c.claim}"</div>
                <p style="margin: 0; color: #b91c1c;"><strong>Forensic Note:</strong> ${c.hr_note}</p>
              </li>
            `).join('')}
          </ul>
        ` : '<p style="color: #64748b; font-style: italic;">No anomalies detected in this document.</p>'}

        ${f.heatmap ? `
          <div style="margin-top: 30px; text-align: center; page-break-inside: avoid;">
            <h4 style="color: #ef4444; margin-bottom: 10px; font-size: 18px;">Forensic ELA Heatmap (Tampering Highlighted)</h4>
            
            <div style="background: #fff; border: 2px solid #ef4444; border-radius: 8px; padding: 15px; display: inline-block; box-shadow: 0 4px 6px rgba(239,68,68,0.1); width: 100%; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #fee2e2; padding-bottom: 10px;">
                    <div style="text-align: left;">
                        <span style="font-size: 11px; color: #991b1b; font-weight: bold; display: block; text-transform: uppercase;">Analysis Type: Error Level Analysis (ELA)</span>
                        <span style="font-size: 10px; color: #ef4444;">Compression Baseline: 90%</span>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 11px; color: #991b1b; font-weight: bold; display: block; text-transform: uppercase;">Legend / Key</span>
                        <span style="font-size: 11px; background: #ef4444; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;">Tampered Region</span>
                    </div>
                </div>

                <div style="position: relative; display: block; width: 100%; margin: 0 auto;">
                    <img src="${f.heatmap}" style="width: 100%; height: auto; display: block; border-radius: 4px; border: 1px solid #cbd5e1;" />
                </div>
                
                <p style="font-size: 10px; color: #ef4444; margin-top: 10px; font-style: italic;">Note: Highlights indicate pixel compression inconsistencies commonly caused by digital splicing or copy-pasting new text over original documents.</p>
            </div>
          </div>
        ` : f.original ? `
           <div style="margin-top: 30px; text-align: center; page-break-inside: avoid;">
            <h4 style="color: #334155; margin-bottom: 10px;">Original Document Scan</h4>
            <img src="${f.original}" style="max-width: 100%; border: 1px solid #cbd5e1; border-radius: 8px;" />
          </div>
        ` : ''}
      </div>
    `).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Audit Report - ${selectedContainer.name}</title>
          <style>
            @page { margin: 0; } 
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 4px solid #4f46e5; padding-bottom: 20px; margin-bottom: 40px; }
            .score { font-size: 32px; font-weight: 900; color: ${report.score < 40 ? '#ef4444' : '#22c55e'}; }
            .badge { display: inline-block; padding: 6px 12px; border-radius: 50px; font-size: 14px; font-weight: bold; margin-left: 10px; }
            .badge-red { background: #fee2e2; color: #991b1b; border: 1px solid #f87171; }
            .badge-green { background: #dcfce7; color: #166534; border: 1px solid #4ade80; }
            @media print { body { padding: 15mm; } } 
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin-bottom: 5px;">ForensikGaji <span style="color: #4f46e5;">Audit Report</span></h1>
            <p style="color: #64748b; margin-top: 0;">Generated on ${new Date().toLocaleDateString()}</p>
            <h2 style="margin-top: 30px;">Candidate: ${selectedContainer.name}</h2>
            <div style="display: flex; align-items: center; margin-top: 10px;">
              <span style="font-size: 18px; font-weight: bold; margin-right: 10px;">Overall Trust Score:</span>
              <span class="score">${report.score}%</span>
              <span class="badge ${report.score < 40 ? 'badge-red' : 'badge-green'}">${report.score < 40 ? 'CRITICAL FRAUD DETECTED' : 'AUTHENTIC'}</span>
            </div>
          </div>
          ${fileDetails}
          <p style="text-align: center; color: #94a3b8; margin-top: 40px; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px;">Secured by ForensikGaji Sovereign Forensic Layer</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      setIsExportingPDF(false);
      setToastMessage(`✅ Forensic Report generated successfully.`);
      setTimeout(() => setToastMessage(null), 5000);
    }, 1000);
  };

  const copyToClipboard = (link) => {
    navigator.clipboard.writeText(link);
    setToastMessage("Link copied to clipboard!");
    setTimeout(() => setToastMessage(null), 2000);
  };

  // ==========================================================================
  // RENDER FUNCTIONS
  // ==========================================================================

  /**
   * Renders the navigation sidebar with menu items.
   * Shows different active states based on current tab.
   */
  const renderSidebar = () => {
    // Get unique case types from containers for the audit cases filter
    const caseTypes = ['all', ...new Set(safeContainers.flatMap(c => {
      if (!c.type) return [];
      return c.type.split(' + ').map(t => t.trim());
    }))];

    return (
    <div className="w-72 bg-white/80 backdrop-blur-xl text-gray-800 flex flex-col h-full flex-shrink-0 border-r border-gray-200 shadow-[5px_0_30px_rgba(0,0,0,0.1)] z-20">
      <div className="p-6 flex items-center space-x-3 border-b border-gray-200">
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-cyan-500/20">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-gray-900">Forensik<span className="text-cyan-600">Gaji</span></span>
      </div>
      <nav className="flex-1 px-3 space-y-2 mt-6">
        <button onClick={() => { setActiveTab('scanner'); setActiveAuditCase(null); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'scanner' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
          <Activity className="w-5 h-5" /> <span>Dashboard</span>
        </button>

        {/* New Audit Cases Tab with Expandable Type Filters */}
        <div>
          <button
            onClick={() => { setActiveTab(activeTab === 'audit_cases' ? 'scanner' : 'audit_cases'); setActiveAuditCase(null); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'audit_cases' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5" /> <span>Audit Cases</span>
            </div>
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{safeContainers.length}</span>
          </button>

          {/* Show type filters when Audit Cases is active */}
          {activeTab === 'audit_cases' && (
            <div className="ml-6 mt-2 space-y-1">
              {caseTypes.map(type => {
                const displayName = type === 'all' ? 'All Types' : type;
                const count = type === 'all' ? safeContainers.length : safeContainers.filter(c => c.type && c.type.includes(type)).length;
                return (
                  <button
                    key={type}
                    onClick={() => { setAuditCaseTypeFilter(type); setActiveAuditCase(null); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      auditCaseTypeFilter === type
                        ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span>{displayName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      auditCaseTypeFilter === type
                        ? 'bg-cyan-200 text-cyan-800'
                        : 'bg-gray-200 text-gray-500'
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button onClick={() => { setActiveTab('marketplace'); setActiveAuditCase(null); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'marketplace' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
          <Users className="w-5 h-5" /> <span>Expert Marketplace</span>
        </button>
        <button onClick={() => { setActiveTab('register'); setActiveAuditCase(null); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'register' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
          <UserPlus className="w-5 h-5" /> <span>Register as Expert</span>
        </button>
      </nav>
      <div className="p-4 mt-auto border-t border-gray-200 space-y-3">
        <button onClick={() => { setActiveTab('new_entry'); setActiveAuditCase(null); }} className={`w-full flex items-center justify-center space-x-2 px-4 py-3.5 rounded-xl font-medium transition-all ${activeTab === 'new_entry' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25' : 'bg-gray-100 text-emerald-600 border border-gray-200 hover:bg-gray-200 hover:shadow-lg'}`}>
          <PlusCircle className="w-5 h-5" /> <span>New Entry</span>
        </button>
        <button onClick={() => { setActiveTab('landing'); setActiveAuditCase(null); }} className="w-full flex items-center justify-center space-x-2 px-4 py-3.5 rounded-xl font-medium transition-all bg-transparent text-gray-500 border border-transparent hover:border-red-500/30 hover:bg-red-50 hover:text-red-500">
          <LogOut className="w-5 h-5" /> <span>Log Out</span>
        </button>
      </div>
    </div>
    );
  };

  const renderForensicScannerView = () => (
    <div className="p-8 lg:p-12 pb-32 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
         <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Forensic Scanner Dashboard</h1>
            <p className="text-cyan-600 mt-2 text-lg font-bold">Sovereign Forensic Layer v2.0</p>
         </div>
         <button
           onClick={refreshData}
           className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors border border-gray-300"
           title="Refresh data from storage"
         >
           <Activity className="w-4 h-4" />
           <span>Refresh</span>
           <span className="text-xs text-gray-500">
             {lastRefreshTime && `(${Math.round((Date.now() - lastRefreshTime) / 1000)}s ago)`}
           </span>
         </button>
      </div>

      {/* Global Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-[0_4px_30px_rgba(0,0,0,0.1)] relative overflow-hidden group hover:border-gray-300 hover:shadow-[0_8px_40px_rgba(37,99,235,0.1)] transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:text-blue-400 group-hover:opacity-10 transition-all"><Shield className="w-24 h-24 text-gray-400" /></div>
          <h3 className="text-sm text-gray-500 font-bold uppercase tracking-wider">Total Active Audits</h3>
          <p className="text-4xl font-black mt-3 text-gray-900">{totalAudits}</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-[0_4px_30px_rgba(0,0,0,0.1)] relative overflow-hidden group hover:border-gray-300 hover:shadow-[0_8px_40px_rgba(37,99,235,0.1)] transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-all"><FileText className="w-24 h-24 text-blue-400" /></div>
          <h3 className="text-sm text-gray-500 font-bold uppercase tracking-wider">Total Files Scanned</h3>
          <p className="text-4xl font-black mt-3 text-blue-600">{totalFilesScanned}</p>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-red-200 shadow-[0_4px_30px_rgba(0,0,0,0.1)] relative overflow-hidden group hover:border-red-300 hover:shadow-[0_8px_40px_rgba(239,68,68,0.1)] transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-red-500 group-hover:opacity-10 transition-all"><AlertTriangle className="w-24 h-24" /></div>
          <h3 className="text-sm text-red-500 font-bold uppercase tracking-wider">Total Critical Risk Files</h3>
          <p className="text-4xl font-black mt-3 text-red-600">{totalCriticalRiskFiles}</p>
        </div>
      </div>

      {/* High Risk Action Center */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" /> High Priority Action Center
        </h2>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.1)]">
          {allHighRiskFiles.length > 0 ? (
            <div className="max-h-64 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {allHighRiskFiles.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 p-4 rounded-xl hover:border-red-400 hover:shadow-lg transition-all cursor-pointer" onClick={() => { setSelectedContainer(item.container); setViewMode('original'); setSelectedFileIndex(item.fileIndex); setActiveAnomaly(null); }}>
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <div>
                      <p className="font-bold text-gray-800">{item.file.name}</p>
                      <p className="text-xs text-gray-500 mt-1">Audit: {item.container.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-bold ${item.file.investigation_status && item.file.investigation_status !== 'Unreviewed' ? 'bg-gray-200 text-gray-600 border border-gray-300' : 'bg-red-100 text-red-600 border border-red-300'}`}>
                      {item.file.investigation_status || 'Unreviewed'}
                    </span>
                    <span className="text-sm font-black text-red-600">{item.file.score}% Score</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No high-risk files requiring immediate action</p>
              <p className="text-gray-500 text-sm mt-1">All documents are within acceptable risk parameters</p>
            </div>
          )}
        </div>
      </div>


      {/* Quick Action Button */}
      <div className="text-center mt-8">
        <button onClick={() => setActiveTab("audit_cases")} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-md transition-colors inline-flex items-center">
          <FileText className="w-5 h-5 mr-2" /> View All Audit Cases
        </button>
      </div>

    </div>
  );


  const renderAuditCasesView = () => {
    try {
    // Filter cases by selected type and search
    let filteredCases = auditCaseTypeFilter === 'all'
      ? safeContainers
      : safeContainers.filter(c => c.type && c.type.includes(auditCaseTypeFilter));

    // Apply search filter
    if (caseSearch) {
      filteredCases = filteredCases.filter(c =>
        c.name.toLowerCase().includes(caseSearch.toLowerCase()) ||
        c.id.toLowerCase().includes(caseSearch.toLowerCase())
      );
    }

    // Apply sorting
    if (caseSortBy === 'newest') {
      filteredCases = [...filteredCases].sort((a, b) => b.id.localeCompare(a.id));
    } else if (caseSortBy === 'oldest') {
      filteredCases = [...filteredCases].sort((a, b) => a.id.localeCompare(b.id));
    } else if (caseSortBy === 'name_asc') {
      filteredCases = [...filteredCases].sort((a, b) => a.name.localeCompare(b.name));
    } else if (caseSortBy === 'name_desc') {
      filteredCases = [...filteredCases].sort((a, b) => b.name.localeCompare(a.name));
    } else if (caseSortBy === 'risk_high') {
      filteredCases = [...filteredCases].sort((a, b) => (a.data?.score || 100) - (b.data?.score || 100));
    } else if (caseSortBy === 'risk_low') {
      filteredCases = [...filteredCases].sort((a, b) => (b.data?.score || 100) - (a.data?.score || 100));
    }

    return (
    <div className="p-8 lg:p-12 pb-32 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
         <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              {auditCaseTypeFilter === 'all' ? 'All Audit Cases' : `${auditCaseTypeFilter} Cases`}
            </h1>
            <p className="text-gray-500 mt-1">Manage and review forensic audit cases</p>
         </div>
         <button
           onClick={refreshData}
           className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors border border-gray-300"
         >
           <Activity className="w-4 h-4" />
           <span>Refresh</span>
         </button>
      </div>

      {/* Search and Sort Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search case name or ID..."
            value={caseSearch}
            onChange={(e) => setCaseSearch(e.target.value)}
            className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={caseSortBy}
          onChange={(e) => setCaseSortBy(e.target.value)}
          className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="newest">Sort: Newest First</option>
          <option value="oldest">Sort: Oldest First</option>
          <option value="name_asc">Sort: Name (A-Z)</option>
          <option value="name_desc">Sort: Name (Z-A)</option>
          <option value="risk_high">Sort: Highest Risk</option>
          <option value="risk_low">Sort: Lowest Risk</option>
        </select>
      </div>

      <div className="space-y-6">
        {filteredCases.length === 0 ? (
           <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
              <FileWarning className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-600">No audit cases found</h3>
              <p className="text-gray-500 text-sm mt-2">
                {auditCaseTypeFilter === 'all'
                  ? "Create a new entry to get started."
                  : `No cases with type "${auditCaseTypeFilter}" found.`}
              </p>
           </div>
        ) : (
           filteredCases.map((c) => (
             <AuditCaseItem
                key={c.id}
                c={c}
                onRename={openRenameModal}
                onDelete={setContainerToDelete}
                onViewReport={(container, fileIdx) => { setSelectedContainer(container); setViewMode('original'); setSelectedFileIndex(fileIdx); setActiveAnomaly(null); }}
                onCopyLink={copyToClipboard}
                onOpenPortal={(id) => { setActiveCandidateUploadId(id); setActiveTab('candidate_portal'); }}
                onUpdateFileStatus={async (containerId, fileName, status) => {
                   let updatedCase = null;
                   setContainers(prev => {
                      const result = prev.map(con => {
                         if (con.id === containerId && con.data && Array.isArray(con.data.files)) {
                            const updated = { ...con, data: { ...con.data, files: con.data.files.map(f => f.name === fileName ? { ...f, investigation_status: status } : f) } };
                            updatedCase = updated;
                            return updated;
                         }
                         return con;
                      });
                      return result;
                   });

                   if (updatedCase && updatedCase.data) {
                      try {
                        await updateCase(containerId, { data: updatedCase.data });
                      } catch (e) {
                        console.error("Failed to sync investigation status:", e);
                      }
                   }
                }}
                onDeleteFile={async (containerId, fileName) => {
                   let updatedCase = null;
                   setContainers(prev => {
                      const result = prev.map(con => {
                         if (con.id === containerId && con.data && Array.isArray(con.data.files)) {
                            const newFiles = con.data.files.filter(f => f.name !== fileName);
                            const newScore = newFiles.length > 0 ? Math.round(newFiles.reduce((acc, f) => acc + f.score, 0) / newFiles.length) : 0;
                            const updated = { ...con, data: { ...con.data, files: newFiles, score: newScore } };
                            updatedCase = updated;
                            return updated;
                         }
                         return con;
                      });
                      return result;
                   });

                   if (updatedCase && updatedCase.data) {
                      try {
                         await updateCase(containerId, { data: updatedCase.data });
                      } catch (e) {
                        console.error("Failed to sync deleted file:", e);
                      }
                   }
                }}
                onRenameFile={(containerId, origIdx, currentName) => {
                   setFileToRename({ containerId, origIdx });
                   setRenameValue(currentName);
                }}
                onBookExpertFromDashboard={(caseData) => {
                   setActiveTab('marketplace');
                   setMarketplaceTab('discover');
                }}
                onOpenDetail={(caseData) => {
                   setActiveAuditCase(caseData);
                   setActiveDocTab('all');
                }}
             />
           ))
        )}
      </div>
    </div>
  );
    } catch (error) {
      console.error("Error rendering audit cases view:", error);
      return <div className="p-8 text-center text-red-500">Error loading audit cases. Please refresh.</div>;
    }
  };

  const renderNewEntryView = () => (
    <div className="p-8 lg:p-12 pb-32 max-w-4xl mx-auto">
      <h1 className="text-3xl font-black text-gray-900 mb-2">Create Audit Case</h1>
      <p className="text-gray-500 mb-10 text-lg">Initialize a new secure forensic container for document analysis.</p>

      <div className="bg-white rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] border border-gray-200 p-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 border-b border-gray-200 pb-6">
          <div className="flex bg-gray-100 rounded-lg p-1.5 self-start shadow-inner border border-gray-200">
            <button
              onClick={() => { setCreationMode('link'); setNewContainerName(''); }}
              className={`px-6 py-2.5 rounded-md text-sm font-bold flex items-center transition-all ${creationMode === 'link' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
            >
              <LinkIcon className="w-4 h-4 mr-2" /> Candidate Link
            </button>
            <button
              onClick={() => { setCreationMode('direct'); setNewContainerName(''); setDirectFiles([]); }}
              className={`px-6 py-2.5 rounded-md text-sm font-bold flex items-center transition-all ${creationMode === 'direct' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
            >
              <UploadCloud className="w-4 h-4 mr-2" /> Direct Upload
            </button>
          </div>
        </div>

        {creationMode === 'direct' ? (
          <form onSubmit={(e) => { handleDirectHRUpload(e); setActiveTab('scanner'); }} className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Audit Case Name</label>
                <input
                  type="text"
                  placeholder="e.g., Q1 Engineering Intake - Ali"
                  value={newContainerName}
                  onChange={(e) => setNewContainerName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm text-gray-900 placeholder-gray-400 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Document Type</label>
                <div className="w-full bg-gray-50 shadow-sm border border-gray-300 rounded-lg p-4 h-32 overflow-y-auto custom-scrollbar">
                  {['Resume', 'Payslip', 'Medical Certificate (MC)', 'Expense Receipt', 'Other'].map(type => (
                    <div key={type}>
                      <label className="flex items-center space-x-3 text-sm mb-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newContainerTypes.includes(type)}
                          onChange={(e) => e.target.checked ? setNewContainerTypes([...newContainerTypes, type]) : setNewContainerTypes(newContainerTypes.filter(t => t !== type))}
                          className="w-4 h-4 text-blue-600 bg-white rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-gray-700 font-medium">{type}</span>
                      </label>
                      {type === 'Other' && newContainerTypes.includes('Other') && (
                        <input
                          type="text"
                          placeholder="Specify custom document type..."
                          value={otherDocType}
                          onChange={(e) => setOtherDocType(e.target.value)}
                          className="ml-7 mb-3 p-2 text-sm border border-gray-300 bg-white text-gray-900 rounded outline-none focus:ring-1 focus:ring-blue-500 w-[85%]"
                          autoFocus
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <div onClick={() => document.getElementById('directFileInput').click()} className="border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl p-12 text-center cursor-pointer bg-gray-50 hover:bg-blue-50 transition-colors group">
                 <input
                   id="directFileInput"
                   type="file"
                   multiple
                   className="hidden"
                   onChange={(e) => {
                     const newFiles = Array.from(e.target.files);
                     setDirectFiles(prev => {
                       const existingNames = prev.map(f => f.name);
                       const uniqueNew = newFiles.filter(f => !existingNames.includes(f.name));
                       return [...prev, ...uniqueNew];
                     });
                     e.target.value = null;
                   }}
                   onClick={(e) => e.stopPropagation()}
                 />

                 <UploadCloud className="w-16 h-16 text-cyan-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                 <h3 className="text-xl font-bold text-gray-800 mb-2">Click or Drag & Drop multiple files</h3>
                 <p className="text-gray-500 text-sm">Select all documents belonging to this case. They will be processed together immediately.</p>
              </div>

              {directFiles.length > 0 && (
                 <div className="bg-white border border-gray-300 p-5 rounded-lg w-full text-left mt-6 shadow-sm">
                   <p className="font-bold text-sm text-gray-700 mb-3 border-b border-gray-200 pb-2">Selected Files ({directFiles.length}):</p>
                   <div className="max-h-40 overflow-y-auto custom-scrollbar">
                     {directFiles.map((f, i) => (
                       <div key={i} className="flex items-center text-sm text-gray-600 mt-2">
                         <CheckCircle className="w-4 h-4 text-emerald-500 mr-3 flex-shrink-0" />
                         <span className="truncate font-medium text-gray-800">{f.name}</span>
                       </div>
                     ))}
                   </div>
                 </div>
              )}
            </div>

            <button type="submit" disabled={directFiles.length === 0 || !newContainerName.trim()} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 text-white px-6 py-4 rounded-lg font-bold shadow-lg transition-colors text-lg mt-4">
              Upload & Analyze {directFiles.length > 0 ? `${directFiles.length} Files` : ''}
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.2)] rounded-full flex items-center justify-center mb-6">
              <LinkIcon className="w-10 h-10 text-cyan-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate Candidate Link</h3>
            <p className="text-gray-500 text-center max-w-md mb-8">Create a secure upload portal for a candidate. They will only see an upload screen and cannot access the dashboard.</p>

            <div className="bg-white p-6 rounded-lg border border-gray-300 w-full shadow-sm">
            <form onSubmit={(e) => { handleCreateContainer(e); setActiveTab('scanner'); }} className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Audit Case Name</label>
              <input type="text" placeholder="e.g., Audit Case - Ahmad" value={newContainerName} onChange={(e) => setNewContainerName(e.target.value)} className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 outline-none mb-6 font-medium placeholder-gray-400 shadow-sm" required />

              <label className="block text-sm font-bold text-gray-700 mb-2">Requested Documents</label>
              <div className="w-full bg-gray-50 shadow-sm border border-gray-300 rounded-lg p-4 h-40 overflow-y-auto custom-scrollbar mb-6">
                {['Resume', 'Payslip', 'Medical Certificate (MC)', 'Expense Receipt', 'Other'].map(type => (
                  <div key={type}>
                    <label className="flex items-center space-x-3 text-sm mb-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newContainerTypes.includes(type)}
                        onChange={(e) => e.target.checked ? setNewContainerTypes([...newContainerTypes, type]) : setNewContainerTypes(newContainerTypes.filter(t => t !== type))}
                        className="w-4 h-4 text-blue-600 bg-white rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-gray-700 font-medium">{type}</span>
                    </label>
                    {type === 'Other' && newContainerTypes.includes('Other') && (
                      <input
                        type="text"
                        placeholder="Specify..."
                        value={otherDocType}
                        onChange={(e) => setOtherDocType(e.target.value)}
                        className="ml-7 mb-3 p-2 text-sm border border-gray-300 bg-white text-gray-900 rounded outline-none focus:ring-1 focus:ring-blue-500 w-[85%]"
                        autoFocus
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-6 py-4 rounded-lg font-bold shadow-lg transition-colors text-lg mt-2">Generate Candidate Link</button>
          </form>
          </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderMarketplaceView = () => {
    const filteredExperts = expertDatabase.filter(expert => {
      const matchesSearch = expert.name.toLowerCase().includes(searchExpertName.toLowerCase());
      const matchesRole = filterRole === 'All' || expert.role === filterRole;
      const matchesPrice = filterPriceRange === 'All' ||
        (filterPriceRange === '< RM 150' && expert.rate < 150) ||
        (filterPriceRange === 'RM 150 - RM 200' && expert.rate >= 150 && expert.rate <= 200) ||
        (filterPriceRange === '> RM 200' && expert.rate > 200);
      return matchesSearch && matchesRole && matchesPrice;
    });

    return (
    <div className="p-8 lg:p-12 pb-32 max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Expert Interview Marketplace</h1>
          <p className="text-gray-500">Hire verified industry professionals for technical interviews.</p>
        </div>
        <div className="bg-gray-100 p-1 rounded-lg border border-gray-300 flex space-x-1">
           <button onClick={() => setMarketplaceTab('discover')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${marketplaceTab === 'discover' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-600 hover:text-gray-900'}`}>Find Experts</button>
           <button onClick={() => setMarketplaceTab('bookings')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${marketplaceTab === 'bookings' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-600 hover:text-gray-900'}`}>My Bookings</button>
        </div>
      </div>

      {marketplaceTab === 'discover' ? (
        <>
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Search</label>
              <input type="text" value={searchExpertName} onChange={(e) => setSearchExpertName(e.target.value)} placeholder="Search by name..." className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400" />
            </div>
            <div className="w-full md:w-48">
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Role</label>
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="All">All Roles</option>
                <option value="Technical Lead">Technical Lead</option>
                <option value="AI Engineer">AI Engineer</option>
                <option value="Mobile Developer">Mobile Developer</option>
                <option value="Frontend Specialist">Frontend Specialist</option>
                <option value="DevOps Architect">DevOps Architect</option>
                <option value="Cybersecurity Analyst">Cybersecurity Analyst</option>
              </select>
            </div>
            <div className="w-full md:w-48">
              <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Price</label>
              <select value={filterPriceRange} onChange={(e) => setFilterPriceRange(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="All">All Prices</option>
                <option value="< RM 150">&lt; RM 150/hr</option>
                <option value="RM 150 - RM 200">RM 150 - RM 200/hr</option>
                <option value="> RM 200">&gt; RM 200/hr</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {filteredExperts.map(expert => (
              <div key={expert.id} onClick={() => setSelectedExpertDetail(expert)} className="bg-white border border-gray-200 p-5 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row gap-5 items-center rounded-2xl">
                <img src={expert.image} alt={expert.name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-300" />
                <div className="flex-1 text-center md:text-left">
                  <h3 className="font-semibold text-gray-900">{expert.name}</h3>
                  <p className="text-cyan-600 text-sm">{expert.role} · {expert.company}</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center text-sm">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 mr-1" />
                    <span className="font-medium text-gray-700">{expert.rating}</span>
                    <span className="text-gray-500 ml-1">({expert.reviews})</span>
                  </div>
                  <div className="text-sm font-medium text-emerald-600">RM {expert.rate}/hr</div>
                  <button onClick={(e) => { e.stopPropagation(); setBookingExpert(expert); }} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg whitespace-nowrap">Book</button>
                </div>
              </div>
            ))}
            {filteredExperts.length === 0 && (
              <div className="py-16 text-center bg-gray-50 border border-gray-200 border-dashed rounded-2xl">
                <p className="text-gray-500">No experts found matching your criteria.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4">
           {myBookings.length === 0 ? (
               <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
                  <h3 className="text-lg font-bold text-gray-600">No Bookings Yet</h3>
                  <p className="text-gray-500 text-sm mt-2">Book an expert from the Find Experts tab to see them here.</p>
               </div>
           ) : myBookings.map((b) => (
               <div key={b.id} className="bg-white border border-gray-200 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                     <img src={b.expert.image} alt={b.expert.name} className="w-12 h-12 rounded-full border-2 border-gray-300 shadow-sm" />
                     <div>
                        <h3 className="font-bold text-gray-900">{b.expert.name}</h3>
                        <p className="text-xs text-cyan-600">{b.expert.role} @ {b.expert.company}</p>
                        <p className="text-xs text-gray-500 mt-1">Booked on {b.dateBooked}</p>
                     </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                     <div className="text-sm">
                        <span className="text-gray-500 mr-2">Status:</span>
                        <span className={`font-bold px-2 py-1 rounded text-xs border ml-1 ${
                           b.status === 'Not Shared' ? 'bg-gray-100 text-gray-600 border-gray-300' :
                           b.status === 'Awaiting Feedback' ? 'bg-blue-100 text-blue-600 border-blue-300 animate-pulse' :
                           'bg-emerald-100 text-emerald-600 border-emerald-300'
                        }`}>{b.status}</span>
                     </div>

                     {b.status === 'Not Shared' && (
                        <button onClick={() => { setShareCaseModal(b); setSelectedShareCase(''); setSelectedShareFiles([]); setShareMessage(''); }} className="w-full md:w-auto bg-gray-100 hover:bg-gray-200 text-cyan-600 border border-gray-300 px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors">
                           Share Audit Case
                        </button>
                     )}
                     {b.status === 'Feedback Received' && (
                        <button onClick={() => setViewFeedbackModal(b)} className="w-full md:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-colors">
                           View Feedback
                        </button>
                     )}
                  </div>
               </div>
           ))}
        </div>
      )}
    </div>
  );
};

  const renderExpertRegistrationView = () => (
    <div className="p-8 lg:p-12 pb-32 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Become an Expert Auditor</h1>
        <p className="text-gray-500">Join our vetted marketplace of elite technical interviewers.</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-2xl shadow-sm">
        <form onSubmit={(e) => { e.preventDefault(); setRegistrationSuccess(true); setTimeout(() => { setRegistrationSuccess(false); setActiveTab('marketplace'); }, 3000); }} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                <input type="text" required placeholder="e.g., Dr. Jane Doe" className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Current Role</label>
                <input type="text" required placeholder="e.g., Lead Engineer" className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 shadow-sm" />
              </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Company / Institution</label>
            <input type="text" required placeholder="e.g., TechCorp Malaysia" className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Primary Expertise (Comma separated)</label>
            <input type="text" required placeholder="e.g., Java, Data Science, System Architecture" className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 shadow-sm" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Desired Hourly Rate (RM)</label>
              <input type="number" required placeholder="e.g., 150" className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">LinkedIn Profile URL</label>
              <input type="url" required placeholder="https://linkedin.com/in/..." className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 shadow-sm" />
            </div>
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3.5 rounded-lg mt-6 transition-colors shadow-md">Submit Application</button>
        </form>
      </div>
    </div>
  );

  const renderCandidatePortalView = () => {
    const activeContainer = safeContainers.find(c => c && c.id === activeCandidateUploadId);
    if (!activeContainer) return (<div className="fixed inset-0 bg-gray-100 text-gray-900 z-50 flex flex-col p-6 items-center justify-center"><Activity className="w-12 h-12 text-blue-600 animate-spin mb-4" /><h2 className="text-xl font-bold">Connecting to HR Dashboard...</h2></div>);
    if (isClosed) return (<div className="fixed inset-0 bg-gray-100 z-50 flex flex-col p-6 items-center justify-center"><div className="bg-white w-full max-w-md rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-gray-200 p-10 text-center animate-in fade-in zoom-in duration-300"><CheckCircle className="w-20 h-20 text-emerald-600 mx-auto mb-6" /><h2 className="text-2xl font-black text-gray-900 mb-4">Upload Securely Transmitted</h2><p className="text-gray-600 mb-8 font-medium">Your documents have been actively synced to the HR dashboard.</p><div className="bg-gray-50 rounded-xl p-4 border border-gray-200"><p className="text-gray-700 font-bold">You may now safely close this browser tab.</p></div></div></div>);
    return (<div className="fixed inset-0 bg-gray-100 z-50 flex flex-col p-6 items-center justify-center"><div className="bg-white w-full max-w-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-gray-200 p-10 text-center"><h2 className="text-2xl font-bold text-gray-900 mb-8">Secure Document Upload</h2>{uploadSuccess && <div className="py-6 flex flex-col items-center bg-emerald-50 rounded-xl mb-4 border border-emerald-200"><CheckCircle className="w-10 h-10 text-emerald-600 mb-2" /><h3 className="text-lg font-bold text-emerald-600">Files successfully added!</h3><p className="text-emerald-700 text-sm">You can select more files or click finish below.</p></div>}

    {!isUploading && !uploadSuccess && (
      <div className="mb-6 text-left">
        <label className="block text-sm font-bold text-gray-700 mb-2">Rename File(s) (Optional)</label>
        <input type="text" value={candidateCustomName} onChange={(e) => setCandidateCustomName(e.target.value)} placeholder="e.g., JohnDoe-Resume" className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-400 mb-2" />
        <p className="text-xs text-gray-500">If multiple files are uploaded, a number will be added to the name.</p>
      </div>
    )}

    {isUploading ? (<div className="py-12 flex flex-col items-center"><Activity className="w-12 h-12 text-blue-600 animate-pulse mb-4" /><p className="font-bold text-gray-700">Analyzing Document Integrity...</p></div>) : (<div onClick={() => document.getElementById('fileInput').click()} className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl p-12 cursor-pointer hover:bg-gray-100 hover:border-blue-400 transition-colors"><input id="fileInput" type="file" multiple className="hidden" onChange={handleCandidateUpload} onClick={(e) => e.stopPropagation()} /><FileDown className="w-12 h-12 text-blue-600 mx-auto mb-4" /><h3 className="text-lg font-bold text-gray-900">Click to select files</h3><p className="text-gray-500 text-xs mt-2">You can select multiple documents at once.</p></div>)}{!isUploading && <button onClick={() => { if (!isExternalLink) { setActiveTab('scanner'); setActiveCandidateUploadId(null); window.history.replaceState(null, '', window.location.pathname); } else { setIsClosed(true); } }} className="mt-8 w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-4 rounded-xl text-lg font-bold shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:from-cyan-400 hover:to-blue-500 transition-colors">{isExternalLink ? "Finish and Close Tab" : "Finish and Return"}</button>}</div></div>);
  };

  const renderSplitScreenModal = () => {
    if (!selectedContainer || !selectedContainer.data) return null;
    const report = selectedContainer.data;
    if (!Array.isArray(report.files) || report.files.length === 0) return null;
    const activeFile = report.files[selectedFileIndex] || report.files[0];
    const isHighRisk = activeFile.score < 40;

    const isPdfPreview = viewMode === 'original' && (activeFile.original?.startsWith('data:application/pdf') || activeFile.original?.toLowerCase().endsWith('.pdf'));

    return (
      <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-3xl z-50 flex items-center justify-center p-4 lg:p-8">
        <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-200">
          <div className="flex justify-between items-center px-8 py-5 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-4"><div className={`p-2.5 rounded-lg shadow-sm border ${isHighRisk ? 'bg-red-100 text-red-600 border-red-200' : 'bg-emerald-100 text-emerald-600 border-emerald-200'}`}>{isHighRisk ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}</div><div><h2 className="text-lg font-semibold text-gray-900">Audit Report: {selectedContainer.name}</h2><p className="text-gray-500 text-xs mt-0.5 font-medium">Sovereign Forensic Layer v2.0</p></div></div>
            <div className="flex items-center space-x-3"><button onClick={handleExportPDF} disabled={isExportingPDF} className="flex items-center px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-bold text-sm shadow-sm disabled:opacity-50">{isExportingPDF ? <Activity className="w-4 h-4 mr-2 animate-spin text-blue-600" /> : <Download className="w-4 h-4 mr-2" />} {isExportingPDF ? 'Generating...' : 'Export PDF'}</button><button onClick={() => { setSelectedContainer(null); setActiveAnomaly(null); setViewMode('original'); }} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-900 transition-colors"><X className="w-6 h-6" /></button></div>
          </div>
          <div className="flex flex-1 overflow-hidden">
            <div className="w-1/2 p-8 border-r border-gray-200 overflow-y-auto bg-gray-50">
              <div className="flex justify-between mb-8 items-start">
                <div>
                  <p className="text-gray-500 font-medium mb-1">Document Trust</p>
                  <div className={`text-6xl font-black drop-shadow-md ${isHighRisk ? 'text-red-600' : 'text-emerald-600'}`}>{activeFile.score}%</div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <p className="text-gray-500 font-medium mb-1">AI Status</p>
                  <div className={`px-4 py-1.5 rounded-full font-bold border mb-3 shadow-sm ${isHighRisk ? 'bg-red-100 text-red-600 border-red-200' : 'bg-emerald-100 text-emerald-600 border-emerald-200'}`}>{isHighRisk ? 'FRAUD DETECTED' : 'AUTHENTIC'}</div>

                  {isHighRisk && (
                    <select
                      value={activeFile.investigation_status || 'Unreviewed'}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        setContainers(prev => prev.map(con => {
                           if (con.id === selectedContainer.id && con.data && Array.isArray(con.data.files)) {
                              return { ...con, data: { ...con.data, files: con.data.files.map(f => f.name === activeFile.name ? { ...f, investigation_status: newStatus } : f) } };
                           }
                           return con;
                        }));
                        setSelectedContainer(prev => {
                           if (!prev) return prev;
                           return { ...prev, data: { ...prev.data, files: prev.data.files.map(f => f.name === activeFile.name ? { ...f, investigation_status: newStatus } : f) } };
                        });
                      }}
                      className={`text-xs w-48 rounded-md px-2 py-1 outline-none border font-bold shadow-sm transition-colors cursor-pointer ${
                        activeFile.investigation_status === 'Investigated - Fraud' ? 'bg-red-100 text-red-600 border-red-200' :
                        activeFile.investigation_status === 'Investigated - Not Scam' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                        activeFile.investigation_status === 'Investigation Ongoing' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                        'bg-gray-100 text-gray-600 border-gray-300'
                      }`}
                    >
                      <option value="Unreviewed">HR: Unreviewed</option>
                      <option value="Investigation Ongoing">HR: Investigation Ongoing</option>
                      <option value="Investigated - Not Scam">HR: Investigated - Not Scam</option>
                      <option value="Investigated - Fraud">HR: Investigated - Fraud</option>
                    </select>
                  )}
                </div>
              </div>

              <div className={`p-6 rounded-2xl mb-8 border shadow-sm ${isHighRisk ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}><h4 className="font-bold flex items-center mb-2 text-gray-900"><Activity className="w-5 h-5 mr-2 text-blue-600" /> AI Verdict</h4><p className="font-medium text-gray-700 leading-relaxed">{activeFile.issue}</p></div>
              {Array.isArray(activeFile.flagged_claims) && activeFile.flagged_claims.map((claim, idx) => (
                <div key={idx} onClick={() => setActiveAnomaly(activeAnomaly === idx ? null : idx)} className={`bg-white border rounded-2xl p-4 shadow-sm mb-4 cursor-pointer transition-all ${activeAnomaly === idx ? 'ring-2 ring-yellow-500/50 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'border-gray-200 hover:border-blue-400 hover:shadow-md'}`}>
                  <div className="bg-yellow-100 border border-yellow-300 text-yellow-700 font-mono text-xs px-2 py-1 rounded mb-3 inline-block font-bold">Extract: "{claim.claim}"</div>

                  <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg mb-2 border border-red-200 shadow-sm">
                    <span className="font-bold">Flag:</span> {claim.hr_note}
                  </p>

                  {claim.interview_question && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm">
                      <p className="text-blue-700 text-sm">
                        <span className="font-bold text-cyan-600">Suggested Question:</span> {claim.interview_question}
                      </p>
                    </div>
                  )}

                  {!claim.box_hidden && <p className="text-xs text-gray-500 mt-3 font-bold text-right hover:text-blue-600">Click to locate on document ➔</p>}
                </div>
              ))}
            </div>

            <div className="w-1/2 bg-gray-100 border-l border-gray-200 flex flex-col relative overflow-hidden">
              {Array.isArray(report.files) && <div className="bg-white border-b border-gray-200 px-4 pt-4 flex space-x-2 overflow-x-auto z-20 shadow-sm">{report.files.map((f, idx) => (<button key={idx} onClick={() => { setSelectedFileIndex(idx); setViewMode('original'); setActiveAnomaly(null); }} className={`px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors border-t border-l border-r ${selectedFileIndex === idx ? 'bg-white text-blue-600 border-gray-300' : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700'}`}>{typeof f === 'string' ? f : f.name}</button>))}</div>}

              <div className="bg-white border-b border-gray-200 p-3 flex justify-center z-10 shadow-sm">
                  <div className="bg-gray-100 border border-gray-300 shadow-sm p-1 rounded-full inline-flex">
                      <button onClick={() => setViewMode('original')} className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${viewMode === 'original' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Eye className="w-4 h-4" /> <span>Original</span></button>
                      <button onClick={() => setViewMode('heatmap')} className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${viewMode === 'heatmap' ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Activity className="w-4 h-4" /> <span>Heatmap Overlay</span></button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                  <div className="max-w-4xl mx-auto shadow-[0_8px_30px_rgba(0,0,0,0.15)] bg-white border border-gray-300 rounded-lg relative overflow-hidden">
                      {viewMode === 'original' ? (
                          isPdfPreview ? (
                              <iframe src={activeFile.original} className="w-full border-none" title="PDF Preview" style={{ height: '80vh' }} />
                          ) : (
                              <img src={activeFile.original} alt="Original Document" className="w-full h-auto block" />
                          )
                      ) : (
                          activeFile.heatmap ? (
                              <img src={activeFile.heatmap} alt="ELA Heatmap Overlay" className="w-full h-auto block bg-white" />
                          ) : (
                              <div className="flex items-center justify-center p-20 text-gray-500 font-bold text-center bg-gray-50 border border-gray-200 rounded-lg">
                                  Heatmap Analysis Unavailable.<br/>Document is likely purely digital (Resume) or could not be processed.
                              </div>
                          )
                      )}

                      {activeAnomaly !== null && Array.isArray(activeFile.flagged_claims) && activeFile.flagged_claims[activeAnomaly] && !activeFile.flagged_claims[activeAnomaly].box_hidden && viewMode === 'original' && !isPdfPreview && (
                          <div ref={claimBoxRef} className="absolute bg-yellow-500/60 z-20 transition-all duration-500 shadow-[0_0_0_2px_#eab308]"
                               style={{
                                   top: `${activeFile.flagged_claims[activeAnomaly].y_position}%`,
                                   left: `${activeFile.flagged_claims[activeAnomaly].x_position}%`,
                                   width: `${activeFile.flagged_claims[activeAnomaly].box_width}%`,
                                   height: `${activeFile.flagged_claims[activeAnomaly].box_height}%`,
                                   mixBlendMode: 'normal'
                               }}>
                               <div className="absolute -top-7 -left-0.5 bg-yellow-500 text-gray-900 text-[10px] font-black px-2 py-1 rounded shadow-sm uppercase whitespace-nowrap">
                                   {activeFile.flagged_claims[activeAnomaly].page_num ? `Evidence on Pg ${activeFile.flagged_claims[activeAnomaly].page_num}` : 'Target Locked'}
                               </div>
                          </div>
                      )}
                  </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAuditCaseDetailView = () => {
    try {
      if (!activeAuditCase) return null;
      const c = activeAuditCase;

      if (!c || typeof c !== 'object') {
        return (
          <div className="p-8 text-center">
            <p className="text-gray-500">Invalid case data. Please go back and try again.</p>
            <button onClick={() => setActiveAuditCase(null)} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg">Go Back</button>
          </div>
        );
      }

    const allFiles = Array.isArray(c.data?.files) ? c.data.files : [];

    // Apply search filter
    let displayFiles = [...allFiles];
    if (fileSearch) {
      displayFiles = displayFiles.filter(f =>
        f.name.toLowerCase().includes(fileSearch.toLowerCase())
      );
    }

    // Apply sorting
    if (fileSortBy === 'risk_high') {
      displayFiles.sort((a, b) => a.score - b.score);
    } else if (fileSortBy === 'risk_low') {
      displayFiles.sort((a, b) => b.score - a.score);
    } else if (fileSortBy === 'name_asc') {
      displayFiles.sort((a, b) => a.name.localeCompare(b.name));
    } else if (fileSortBy === 'name_desc') {
      displayFiles.sort((a, b) => b.name.localeCompare(a.name));
    }

    return (
      <div className="p-8 lg:p-12 pb-32 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button onClick={() => setActiveAuditCase(null)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{c.name}</h1>
              <p className="text-gray-500 text-sm mt-1">
                <span className="text-xs font-bold text-gray-500 uppercase">{c.id}</span>
                {' · '}
                {c.type}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {c.data && (
              <div className={`px-4 py-2 rounded-lg font-bold text-sm border ${
                c.data.score < 40 ? 'bg-red-100 text-red-700 border-red-300' :
                c.data.score < 70 ? 'bg-amber-100 text-amber-700 border-amber-300' :
                'bg-emerald-100 text-emerald-700 border-emerald-300'
              }`}>
                Risk Score: {c.data.score}%
              </div>
            )}
            <button onClick={() => { setSelectedContainer(c); setViewMode('original'); setSelectedFileIndex(0); setActiveAnomaly(null); }} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all">
              View Full Report
            </button>
          </div>
        </div>

        {/* Search and Sort Bar for Files */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row gap-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search file name..."
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={fileSortBy}
            onChange={(e) => setFileSortBy(e.target.value)}
            className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="risk_high">Sort: Highest Risk</option>
            <option value="risk_low">Sort: Lowest Risk</option>
            <option value="name_asc">Sort: Name (A-Z)</option>
            <option value="name_desc">Sort: Name (Z-A)</option>
          </select>
        </div>

        {/* Files List */}
        {displayFiles.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
            <FileWarning className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-600">No documents found</h3>
            <p className="text-gray-500 text-sm mt-2">
              {fileSearch ? 'No files match your search.' : 'No files have been uploaded for this case yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {displayFiles.map((file, idx) => {
              const isHighRisk = file.score < 40;
              const origIdx = allFiles.findIndex(f => f.name === file.name);
              return (
                <div key={idx} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center min-w-0 overflow-hidden flex-1">
                      <FileText className={`w-5 h-5 mr-4 flex-shrink-0 ${isHighRisk ? 'text-red-500' : 'text-blue-600'}`} />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-gray-900 font-medium truncate">{file.name}</h4>
                        <p className="text-gray-500 text-xs mt-1">
                          {isHighRisk ? '⚠️ High risk detected' : '✓ Analysis complete'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 flex-shrink-0">
                      <div className={`px-3 py-1.5 rounded-md text-sm font-bold whitespace-nowrap ${
                        file.score >= 80 ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                        file.score < 40 ? 'bg-red-100 text-red-700 border border-red-300' :
                        'bg-amber-100 text-amber-700 border border-amber-300'
                      }`}>
                        {file.score}%
                      </div>

                      {isHighRisk && (
                        <select
                          value={file.investigation_status || 'Unreviewed'}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            let updatedData = null;

                            setContainers(prev => prev.map(con => {
                              if (con.id === c.id && con.data && Array.isArray(con.data.files)) {
                                const updated = { ...con, data: { ...con.data, files: con.data.files.map(f => f.name === file.name ? { ...f, investigation_status: newStatus } : f) } };
                                updatedData = updated.data;
                                return updated;
                              }
                              return con;
                            }));

                            setActiveAuditCase(prev => {
                              if (!prev) return prev;
                              return { ...prev, data: { ...prev.data, files: prev.data.files.map(f => f.name === file.name ? { ...f, investigation_status: newStatus } : f) } };
                            });

                            // Sync with API
                            if (updatedData) {
                              try {
                                await updateCase(c.id, { data: updatedData });
                              } catch (e) {
                                console.error("Failed to sync status:", e);
                              }
                            }
                          }}
                          className={`text-xs rounded-md px-2 py-1.5 outline-none border font-medium ${
                            file.investigation_status === 'Investigated - Fraud' ? 'bg-red-100 text-red-700 border-red-300' :
                            file.investigation_status === 'Investigated - Not Scam' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                            file.investigation_status === 'Investigation Ongoing' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                            'bg-gray-200 text-gray-600 border-gray-300'
                          }`}
                        >
                          <option value="Unreviewed">Unreviewed</option>
                          <option value="Investigation Ongoing">Investigating</option>
                          <option value="Investigated - Not Scam">Cleared</option>
                          <option value="Investigated - Fraud">Confirmed Fraud</option>
                        </select>
                      )}

                      <button
                        onClick={() => { setSelectedContainer(c); setViewMode('original'); setSelectedFileIndex(origIdx); setActiveAnomaly(null); }}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                      >
                        View Analysis
                      </button>
                    </div>
                  </div>

                  {/* Show flagged claims preview */}
                  {isHighRisk && Array.isArray(file.flagged_claims) && file.flagged_claims.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Flagged Claims ({file.flagged_claims.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {file.flagged_claims.slice(0, 3).map((claim, claimIdx) => (
                          <span key={claimIdx} className="bg-red-100 text-red-700 border border-red-300 px-3 py-1 rounded-full text-xs font-medium">
                            "{claim.claim?.substring(0, 30)}..."
                          </span>
                        ))}
                        {file.flagged_claims.length > 3 && (
                          <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                            +{file.flagged_claims.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
    } catch (error) {
      console.error("Error rendering audit case detail view:", error);
      return (
        <div className="p-8 text-center">
          <p className="text-red-500">Error loading case details. Please go back.</p>
          <button onClick={() => setActiveAuditCase(null)} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg">Go Back</button>
        </div>
      );
    }
  };

  const renderExpertDetailModal = () => {
    if (!selectedExpertDetail) return null;
    const expert = selectedExpertDetail;
    return (
      <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-3xl z-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
          <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Expert Profile</h2>
            <button onClick={() => setSelectedExpertDetail(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-900 transition-colors"><X className="w-4 h-4"/></button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex flex-col md:flex-row items-start md:gap-5 mb-6">
              <img src={expert.image} alt={expert.name} className="w-16 h-16 rounded-full border-2 border-gray-300 object-cover mb-3 md:mb-0 shadow-lg" />
              <div className="flex-1">
                <h1 className="text-xl font-semibold text-gray-900">{expert.name}</h1>
                <p className="text-cyan-600 text-sm font-medium">{expert.role} @ {expert.company}</p>
                <div className="flex items-center text-sm mt-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400 mr-1" />
                  <span className="font-medium text-gray-700 mr-1">{expert.rating}</span>
                  <span className="text-gray-500">({expert.reviews} reviews)</span>
                </div>
              </div>
              <div className="mt-4 md:mt-0 w-full md:w-auto">
                <button onClick={() => { setSelectedExpertDetail(null); setBookingExpert(expert); }} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all shadow-md">Book ({expert.rate})</button>
              </div>
            </div>
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-2 border-b border-gray-200">About</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{expert.bio}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200 flex items-center"><MessageSquare className="w-4 h-4 mr-2 text-cyan-600" /> Reviews</h3>
              <div className="space-y-3">
                {expert.reviewList.map((r, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-inner">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-gray-700">{r.author}</span>
                      <div className="flex">{[...Array(r.rating)].map((_, j) => <Star key={j} className="w-3 h-3 text-amber-400 fill-amber-400" />)}</div>
                    </div>
                    <p className="text-sm text-gray-600">"{r.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLandingPage = () => {
    const stats = [
      { value: '50K+', label: 'Documents Analyzed' },
      { value: '99.8%', label: 'Detection Accuracy' },
      { value: '500+', label: 'Companies Trust Us' },
      { value: '24/7', label: 'AI Processing' }
    ];

    const features = [
      {
        icon: <Activity className="w-6 h-6" />,
        title: 'ELA Heatmap Analysis',
        desc: 'Error Level Analysis reveals pixel-level tampering invisible to the naked eye. Our AI highlights manipulated regions with precision.',
        color: 'from-red-500/20 to-orange-500/20',
        iconColor: 'text-red-400',
        borderColor: 'border-red-500/20'
      },
      {
        icon: <FileText className="w-6 h-6" />,
        title: 'Multi-Document Support',
        desc: 'Analyze resumes, payslips, medical certificates, expense receipts, and more. All major formats supported including PDF and images.',
        color: 'from-blue-500/20 to-cyan-500/20',
        iconColor: 'text-blue-400',
        borderColor: 'border-blue-500/20'
      },
      {
        icon: <Users className="w-6 h-6" />,
        title: 'Expert Verification Network',
        desc: 'When AI flags concerns, connect with certified forensic experts for deep-dive technical interviews and human verification.',
        color: 'from-purple-500/20 to-pink-500/20',
        iconColor: 'text-purple-400',
        borderColor: 'border-purple-500/20'
      },
      {
        icon: <Shield className="w-6 h-6" />,
        title: 'Enterprise-Grade Security',
        desc: 'End-to-end encryption, GDPR compliance, and SOC 2 Type II certified infrastructure. Your data never leaves secure environments.',
        color: 'from-emerald-500/20 to-teal-500/20',
        iconColor: 'text-emerald-500',
        borderColor: 'border-emerald-500/20'
      },
      {
        icon: <Search className="w-6 h-6" />,
        title: 'Claim Extraction & Verification',
        desc: 'AI extracts specific claims from documents and cross-references them for consistency. Flagged discrepancies include suggested interview questions.',
        color: 'from-amber-500/20 to-yellow-500/20',
        iconColor: 'text-amber-400',
        borderColor: 'border-amber-500/20'
      },
      {
        icon: <BarChart2 className="w-6 h-6" />,
        title: 'Comprehensive Reporting',
        desc: 'Generate detailed forensic audit reports with evidence, heatmaps, and risk scores. Export as PDF for compliance and documentation.',
        color: 'from-cyan-500/20 to-blue-500/20',
        iconColor: 'text-cyan-600',
        borderColor: 'border-cyan-500/20'
      }
    ];

    const testimonials = [
      {
        quote: "ForensikGaji caught 3 fraudulent resumes in our first month. The ELA heatmap analysis is incredibly accurate—it spotted manipulations we would have never caught manually.",
        author: "Sarah Chen",
        role: "HR Director, TechVentures Asia",
        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=100&q=80"
      },
      {
        quote: "The expert marketplace is brilliant. When the AI flags high-risk candidates, we can book specialized interviews. Saved us from a bad hire that could have cost RM50K+.",
        author: "Ahmad Razak",
        role: "CTO, FinTech Malaysia",
        avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=100&q=80"
      },
      {
        quote: "Implementation took less than a day. Our hiring managers love the simple workflow—generate link, candidate uploads, get results. No training needed.",
        author: "Priya Sharma",
        role: "Talent Acquisition Lead, StartupX",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80"
      }
    ];

    const faqs = [
      {
        q: "How accurate is the fraud detection?",
        a: "Our AI achieves 99.8% accuracy in detecting document tampering based on our validation dataset. The ELA (Error Level Analysis) technique identifies pixel compression inconsistencies that occur when portions of an image are edited or manipulated."
      },
      {
        q: "What types of documents can you analyze?",
        a: "We support resumes, CVs, payslips, medical certificates (MC), expense receipts, offer letters, and most HR-related documents. Formats include PDF, PNG, JPEG, and more."
      },
      {
        q: "Is my data secure and private?",
        a: "Absolutely. All documents are encrypted in transit and at rest. We're GDPR compliant and SOC 2 Type II certified. Documents are automatically deleted after 30 days, and you can delete them anytime."
      },
      {
        q: "What happens when fraud is detected?",
        a: "When our AI detects potential tampering, the document receives a low risk score. You'll see highlighted anomalies with suggested interview questions to verify claims during the interview."
      },
      {
        q: "Can I integrate this with my existing ATS?",
        a: "Yes! Our Professional and Enterprise plans include API access for seamless integration with major ATS platforms like Greenhouse, Lever, and Workday."
      }
    ];

    return (
      <div className="w-full overflow-y-auto bg-slate-950">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-xl shadow-lg shadow-cyan-500/20">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Forensik<span className="text-cyan-600">Gaji</span></span>
              </div>
              <div className="hidden md:flex items-center space-x-8">
                <button onClick={() => document.getElementById('features-section')?.scrollIntoView({behavior: 'smooth'})} className="text-gray-600 hover:text-white text-sm font-medium transition-colors">Features</button>
                <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({behavior: 'smooth'})} className="text-gray-600 hover:text-white text-sm font-medium transition-colors">How It Works</button>
                <button onClick={() => document.getElementById('pricing')?.scrollIntoView({behavior: 'smooth'})} className="text-gray-600 hover:text-white text-sm font-medium transition-colors">Pricing</button>
                <button onClick={() => document.getElementById('faq')?.scrollIntoView({behavior: 'smooth'})} className="text-gray-600 hover:text-white text-sm font-medium transition-colors">FAQ</button>
              </div>
              <div className="flex items-center space-x-4">
                <button onClick={() => setActiveTab('new_entry')} className="hidden sm:block text-gray-600 hover:text-white text-sm font-medium transition-colors">Sign In</button>
                <button onClick={() => setActiveTab('new_entry')} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-cyan-500/25 transition-all">
                  Start Free Trial
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Background elements */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-transparent to-transparent"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="relative max-w-7xl mx-auto">
            <div className="text-center max-w-4xl mx-auto">
              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Stop Hiring Fraud.
                <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mt-2">
                  Verify with AI Forensics.
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                Detect document tampering in seconds with enterprise-grade AI. ELA heatmaps, claim extraction, and expert verification—all in one platform.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <button
                  onClick={() => setActiveTab('new_entry')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-8 py-4 rounded-xl text-base font-semibold shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center group"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <a
                  href="https://youtu.be/2ju8OihCAEc" target="_blank" rel="noopener noreferrer"
                  className="bg-gray-100/50 hover:bg-gray-100 border border-slate-700 text-white px-8 py-4 rounded-xl text-base font-medium transition-all flex items-center justify-center"
                >
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center mr-3">
                    <Play className="w-4 h-4 text-white ml-0.5" />
                  </div>
                  Watch Demo
                </a>
              </div>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-8 text-gray-500 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span>5 free document scans</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span>Setup in 2 minutes</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-5xl mx-auto">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Logos Section */}
        <section className="py-12 border-y border-white/5 bg-slate-900/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-500 mb-8">TRUSTED BY LEADING COMPANIES</p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-50">
              {['TechVentures', 'FinTech MY', 'StartupX', 'CloudSec', 'DataCorp'].map((company, i) => (
                <span key={i} className="text-xl font-bold text-gray-600">{company}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features-section" className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-4 py-2 mb-4">
                <span className="text-cyan-600 text-sm font-semibold">FEATURES</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Enterprise-Grade Document Forensics
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Powerful AI tools to detect fraud, verify claims, and streamline your hiring process
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <div key={i} className="group bg-slate-900/50 border border-white/5 hover:border-gray-200 rounded-2xl p-6 transition-all hover:bg-slate-900/80">
                  <div className={`bg-gradient-to-br ${feature.color} w-14 h-14 rounded-xl flex items-center justify-center border ${feature.borderColor} mb-5`}>
                    <span className={feature.iconColor}>{feature.icon}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900/30 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2 mb-4">
                <span className="text-blue-400 text-sm font-semibold">HOW IT WORKS</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Verify Documents in 3 Simple Steps
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                No technical expertise required. Get started in minutes.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  step: '01',
                  icon: <LinkIcon className="w-8 h-8" />,
                  title: 'Create Secure Upload Link',
                  desc: 'Generate a unique, encrypted portal link for your candidate. Specify required documents like resume, payslip, or certificates.',
                  details: ['Customizable document requirements', 'Branded upload portal', 'Expiry settings for security']
                },
                {
                  step: '02',
                  icon: <UploadCloud className="w-8 h-8" />,
                  title: 'Candidate Uploads Documents',
                  desc: 'Candidate uploads documents through the secure portal. They see only a clean upload interface—no access to your dashboard.',
                  details: ['Mobile-friendly upload', 'Multi-file support', 'Real-time progress tracking']
                },
                {
                  step: '03',
                  icon: <FileText className="w-8 h-8" />,
                  title: 'Receive AI Analysis Report',
                  desc: 'Our AI scans documents for tampering, extracts claims, and generates a comprehensive forensic report with risk scores.',
                  details: ['ELA heatmap visualization', 'Flagged claim extraction', 'Suggested interview questions']
                }
              ].map((step, i) => (
                <div key={i} className="relative">
                  <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 h-full">
                    <div className="text-7xl font-black text-slate-800 absolute -top-4 -left-2">{step.step}</div>
                    <div className="relative z-10">
                      <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 w-16 h-16 rounded-2xl flex items-center justify-center border border-cyan-500/20 mb-6 text-cyan-600">
                        {step.icon}
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                      <p className="text-gray-600 mb-6">{step.desc}</p>
                      <ul className="space-y-2">
                        {step.details.map((detail, j) => (
                          <li key={j} className="flex items-center text-sm text-gray-500">
                            <CheckCircle className="w-4 h-4 text-cyan-500 mr-2" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {i < 2 && <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-cyan-500/50 to-transparent"></div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block bg-purple-500/10 border border-purple-500/20 rounded-lg px-4 py-2 mb-4">
                <span className="text-purple-400 text-sm font-semibold">TESTIMONIALS</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Trusted by HR Teams Worldwide
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, i) => (
                <div key={i} className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-5 h-5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 leading-relaxed">"{testimonial.quote}"</p>
                  <div className="flex items-center">
                    <img src={testimonial.avatar} alt={testimonial.author} className="w-12 h-12 rounded-full object-cover mr-4" />
                    <div>
                      <div className="text-white font-semibold">{testimonial.author}</div>
                      <div className="text-gray-500 text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900/30 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2 mb-4">
                <span className="text-emerald-500 text-sm font-semibold">PRICING</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Simple, Transparent Pricing
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Start free, upgrade when you need more. No hidden fees.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  name: 'Starter',
                  description: 'Perfect for small teams and startups',
                  price: 'Free',
                  period: 'forever',
                  features: ['5 document scans per month', 'Basic AI fraud detection', 'ELA heatmap analysis', 'Email support', '7-day data retention'],
                  cta: 'Get Started Free',
                  popular: false
                },
                {
                  name: 'Professional',
                  description: 'For growing companies with higher volume',
                  price: 'RM99',
                  period: '/month',
                  features: ['100 document scans per month', 'Advanced AI + GPT-4 Vision', 'Expert marketplace access', 'Priority email support', '30-day data retention', 'Custom branding', 'API access'],
                  cta: 'Start 14-Day Trial',
                  popular: true
                },
                {
                  name: 'Enterprise',
                  description: 'For large organizations with custom needs',
                  price: 'Custom',
                  period: '',
                  features: ['Unlimited document scans', 'Custom AI model training', 'Dedicated account manager', 'SLA guarantee', 'Unlimited data retention', 'SSO & advanced security', 'Custom integrations'],
                  cta: 'Contact Sales',
                  popular: false
                }
              ].map((plan, i) => (
                <div key={i} className={`relative ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold px-4 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}
                  <div className={`bg-slate-900/50 border rounded-2xl p-8 h-full ${plan.popular ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'border-white/5'}`}>
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                      <p className="text-gray-600 text-sm">{plan.description}</p>
                    </div>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      <span className="text-gray-600">{plan.period}</span>
                    </div>
                    <button
                      onClick={() => setActiveTab('new_entry')}
                      className={`w-full py-3 rounded-xl font-semibold mb-6 transition-all ${
                        plan.popular
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500'
                          : 'bg-gray-100 text-white hover:bg-gray-200 border border-slate-700'
                      }`}
                    >
                      {plan.cta}
                    </button>
                    <ul className="space-y-3">
                      {plan.features.map((feature, j) => (
                        <li key={j} className="flex items-start text-sm text-gray-700">
                          <CheckCircle className={`w-5 h-5 mr-3 flex-shrink-0 ${plan.popular ? 'text-cyan-600' : 'text-gray-500'}`} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <div className="inline-block bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-2 mb-4">
                <span className="text-amber-400 text-sm font-semibold">FAQ</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, i) => (
                <details key={i} className="group bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden">
                  <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-900/80 transition-colors">
                    <span className="text-white font-semibold pr-4">{faq.q}</span>
                    <ChevronRight className="w-5 h-5 text-gray-500 group-open:rotate-90 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-white/5 pt-4">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
              <div className="col-span-2">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-xl">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-white">Forensik<span className="text-cyan-600">Gaji</span></span>
                </div>
                <p className="text-gray-600 text-sm mb-6 max-w-xs">
                  Enterprise-grade AI forensics for HR document verification. Stop fraud, hire with confidence.
                </p>
              </div>
              {[
                { title: 'Product', links: ['Features', 'Pricing', 'API', 'Integrations'] },
                { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
                { title: 'Resources', links: ['Documentation', 'Help Center', 'Status', 'Security'] }
              ].map((col, i) => (
                <div key={i}>
                  <h4 className="text-white font-semibold mb-4">{col.title}</h4>
                  <ul className="space-y-3">
                    {col.links.map((link, j) => (
                      <li key={j}>
                        <button className="text-gray-600 hover:text-white text-sm transition-colors">{link}</button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-500 text-sm">© 2025 ForensikGaji. All rights reserved.</p>
              <div className="flex space-x-6 text-sm text-gray-600">
                <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  };

  if (isExternalLink) return (<div className="flex h-screen font-sans bg-gray-100 text-gray-800 overflow-hidden relative">{renderCandidatePortalView()}{toastMessage && (<div className="fixed top-6 right-6 z-[60] animate-in slide-in-from-right fade-in duration-300"><div className="bg-white/90 backdrop-blur-sm text-gray-800 px-6 py-4 rounded-xl shadow-lg flex items-center border border-gray-200"><CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" /><p className="font-medium pr-6">{toastMessage}</p><button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button></div></div>)}</div>);

  // ==========================================================================
  // MAIN RENDER - Conditional rendering based on active tab
  // ==========================================================================
  return (
    <div className="flex h-screen font-sans bg-gray-100 text-gray-800 overflow-hidden relative">
      {activeTab === 'landing' ? (
        <>
          <div className="fixed inset-0 bg-slate-950 -z-10"></div>
          <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[50%] bg-cyan-500/10 rounded-full blur-[200px] pointer-events-none"></div>
          <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[50%] bg-blue-500/10 rounded-full blur-[200px] pointer-events-none"></div>
        </>
      ) : null}

      {activeTab === 'landing' ? renderLandingPage() : (
        <div className="z-10 flex h-screen w-full relative">
          {renderSidebar()}
          <main className="flex-1 h-screen overflow-y-auto relative bg-gray-50 backdrop-blur-sm z-10 border-l border-gray-200">
            {activeTab === 'scanner' && !activeAuditCase && renderForensicScannerView()}
            {activeTab === 'scanner' && activeAuditCase && renderAuditCaseDetailView()}
            {activeTab === 'audit_cases' && !activeAuditCase && renderAuditCasesView()}
            {activeTab === 'audit_cases' && activeAuditCase && renderAuditCaseDetailView()}
            {activeTab === 'new_entry' && renderNewEntryView()}
            {activeTab === 'marketplace' && renderMarketplaceView()}
            {activeTab === 'register' && renderExpertRegistrationView()}
          </main>
        </div>
      )}
      {activeTab === 'candidate_portal' && renderCandidatePortalView()}
      {renderSplitScreenModal()}
      {renderExpertDetailModal()}
      {toastMessage && (<div className="fixed top-6 right-6 z-[60] animate-in slide-in-from-right fade-in duration-300"><div className="bg-white/90 backdrop-blur-sm text-gray-800 px-5 py-3 rounded-xl shadow-lg flex items-center border border-gray-200"><CheckCircle className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" /><p className="font-medium pr-6">{toastMessage}</p><button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-4 h-4" /></button></div></div>)}
      {containerToRename && (<div className="fixed inset-0 bg-slate-950/80 backdrop-blur-3xl z-50 flex items-center justify-center p-4"><div className="bg-slate-900/50 backdrop-blur-2xl border border-gray-200 w-full max-w-md rounded-2xl p-6 animate-in fade-in zoom-in duration-200 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"><div className="flex justify-between items-center mb-6"><h2 className="text-lg font-semibold text-gray-900">Rename Audit Case</h2><button onClick={() => setContainerToRename(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition-colors"><X className="w-5 h-5"/></button></div><form onSubmit={confirmRename}><input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="w-full bg-gray-50 shadow-inner border border-gray-200 text-gray-900 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none mb-5 font-medium placeholder-gray-400" autoFocus required /><div className="flex space-x-3"><button type="button" onClick={() => setContainerToRename(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition-colors shadow-inner">Cancel</button><button type="submit" className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium py-3 rounded-lg transition-all shadow-lg">Save Changes</button></div></form></div></div>)}
      {fileToRename && (<div className="fixed inset-0 bg-slate-950/80 backdrop-blur-3xl z-50 flex items-center justify-center p-4"><div className="bg-slate-900/50 backdrop-blur-2xl border border-gray-200 w-full max-w-md rounded-2xl p-6 animate-in fade-in zoom-in duration-200 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"><div className="flex justify-between items-center mb-6"><h2 className="text-lg font-semibold text-gray-900">Rename File</h2><button onClick={() => setFileToRename(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition-colors"><X className="w-5 h-5"/></button></div><form onSubmit={confirmFileRename}><input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="w-full bg-gray-50 shadow-inner border border-gray-200 text-gray-900 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none mb-5 font-medium placeholder-gray-400" autoFocus required /><div className="flex space-x-3"><button type="button" onClick={() => setFileToRename(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition-colors shadow-inner">Cancel</button><button type="submit" className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium py-3 rounded-lg transition-all shadow-lg">Save</button></div></form></div></div>)}
      {containerToDelete && (<div className="fixed inset-0 bg-gray-900/80 backdrop-blur-3xl z-50 flex items-center justify-center p-4"><div className="bg-white border border-red-200 w-full max-w-md rounded-3xl shadow-lg p-8 text-center animate-in fade-in zoom-in duration-200"><div className="mx-auto w-16 h-16 bg-red-500/20 shadow-inner rounded-full flex items-center justify-center mb-6"><Trash2 className="w-8 h-8 text-red-400" /></div><h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Audit Case?</h2><p className="text-gray-600 mb-8 font-medium">This action cannot be undone. Are you sure you want to permanently remove this case from the ledger?</p><div className="flex space-x-3"><button onClick={() => setContainerToDelete(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition-colors shadow-inner">Cancel</button><button onClick={confirmDelete} className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-bold py-3.5 rounded-xl transition-colors shadow-[0_4px_15px_rgba(220,38,38,0.4)]">Yes, Delete</button></div></div></div>)}
      {registrationSuccess && (<div className="fixed inset-0 bg-gray-900/80 backdrop-blur-3xl z-50 flex items-center justify-center p-4"><div className="bg-white border border-gray-200 w-full max-w-md rounded-3xl shadow-lg p-8 text-center animate-in fade-in zoom-in duration-200"><CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" /><h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2><p className="text-gray-600 font-medium">Our team will review your profile and contact you shortly.</p></div></div>)}
      {bookingExpert && <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-3xl z-50 flex items-center justify-center p-4"><div className="bg-white border border-gray-200 w-full max-w-md rounded-2xl p-6 shadow-lg">{bookingSuccess ? <div className="text-center py-6"><CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4"/><h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Booked!</h2><p className="text-gray-600 font-medium">Google Meet invite sent to {bookingExpert.name}.</p></div> : <form onSubmit={handleBookExpert}><div className="flex justify-between items-start mb-8"><div><h2 className="text-2xl font-bold text-gray-900">Book Interview</h2><p className="text-gray-600 mt-1 font-medium">with <span className="text-cyan-600">{bookingExpert.name}</span></p></div><button type="button" onClick={() => setBookingExpert(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5 text-gray-600 hover:text-gray-900"/></button></div><div className="space-y-5"><div><label className="block text-sm font-bold text-gray-700 mb-2">Select Date & Time</label><input type="datetime-local" required className="w-full bg-gray-50 shadow-inner border border-gray-200 text-gray-900 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium" style={{ colorScheme: 'dark' }} /></div></div><button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium py-3 rounded-lg mt-6 transition-all shadow-lg">Confirm Booking</button></form>}</div></div>}
      
      {shareCaseModal && (
         <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-3xl z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 w-full max-w-lg rounded-2xl p-6 shadow-lg">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Share Audit Case</h2>
                  <button onClick={() => setShareCaseModal(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition-colors"><X className="w-5 h-5"/></button>
               </div>
               <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select Audit Case</label>
                  <select value={selectedShareCase} onChange={(e) => { setSelectedShareCase(e.target.value); setSelectedShareFiles([]); }} className="w-full bg-gray-50 shadow-inner border border-gray-200 text-gray-900 rounded-lg p-3 outline-none">
                     <option value="" disabled>Select a case...</option>
                     {safeContainers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
               
               {selectedShareCase && (
                  <div className="mb-4">
                     <label className="block text-sm font-bold text-gray-700 mb-2">Select Files to Share</label>
                     <div className="max-h-40 overflow-y-auto space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        {safeContainers.find(c => c.id === selectedShareCase)?.data?.files.map(f => (
                           <label key={f.name} className="flex items-center space-x-3 text-slate-200 text-sm cursor-pointer">
                              <input type="checkbox" checked={selectedShareFiles.includes(f.name)} onChange={(e) => {
                                 if (e.target.checked) setSelectedShareFiles([...selectedShareFiles, f.name]);
                                 else setSelectedShareFiles(selectedShareFiles.filter(name => name !== f.name));
                              }} className="rounded bg-gray-100 border-white/20 text-cyan-500 focus:ring-cyan-500" />
                              <span>{f.name}</span>
                           </label>
                        ))}
                     </div>
                  </div>
               )}

               <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Message to Expert</label>
                  <textarea value={shareMessage} onChange={(e) => setShareMessage(e.target.value)} placeholder="E.g., Please pay special attention to the timeline in the candidate's experience section." className="w-full bg-gray-50 shadow-inner border border-gray-200 text-gray-900 rounded-lg p-3 h-24 outline-none resize-none placeholder-gray-400"></textarea>
               </div>

               <div className="flex space-x-3">
                  <button onClick={() => setShareCaseModal(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition-colors shadow-inner">Cancel</button>
                  <button onClick={() => {
                     setMyBookings(prev => prev.map(b => b.id === shareCaseModal.id ? { ...b, status: 'Awaiting Feedback', sharedCaseId: selectedShareCase, sharedFiles: selectedShareFiles, message: shareMessage } : b));
                     setShareCaseModal(null);
                     setTimeout(() => {
                        setMyBookings(prev => prev.map(b => b.id === shareCaseModal.id ? { ...b, status: 'Feedback Received', feedback: { score: 85, comments: 'The timeline inconsistencies noted by the AI were successfully explained by the candidate during the interview. They were working part-time for another agency which caused the overlap. However, the exact technical depth described in their resume seems slightly embellished.', recommendation: 'Proceed with caution. Validate technical skills via a small take-home assignment.' } } : b));
                        setToastMessage(`Feedback received from ${shareCaseModal.expert.name}`);
                     }, 8000);
                  }} disabled={!selectedShareCase || selectedShareFiles.length === 0} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium py-3 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">Share Case</button>
               </div>
            </div>
         </div>
      )}
      
      {viewFeedbackModal && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-3xl z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-gray-200 w-full max-w-lg rounded-2xl p-6 shadow-lg">
               <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg shadow-lg">
                        <CheckCircle className="w-5 h-5 text-white" />
                     </div>
                     <h2 className="text-xl font-bold text-gray-900">Expert Feedback Report</h2>
                  </div>
                  <button onClick={() => setViewFeedbackModal(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-900 transition-colors"><X className="w-5 h-5"/></button>
               </div>
               
               <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                     <span className="text-sm font-medium text-gray-600 uppercase tracking-wider">Expert Confidence Score</span>
                     <span className="text-2xl font-black text-emerald-500">{viewFeedbackModal.feedback.score}%</span>
                  </div>
                  <div className="mb-4">
                     <span className="text-sm font-medium text-gray-600 uppercase tracking-wider block mb-2">Interview Notes</span>
                     <p className="text-slate-200 text-sm leading-relaxed">{viewFeedbackModal.feedback.comments}</p>
                  </div>
                  <div>
                     <span className="text-sm font-medium text-gray-600 uppercase tracking-wider block mb-2">Recommendation</span>
                     <p className="text-amber-400 text-sm font-medium bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">{viewFeedbackModal.feedback.recommendation}</p>
                  </div>
               </div>

               <button onClick={() => setViewFeedbackModal(null)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-lg transition-colors shadow-inner">Close Report</button>
            </div>
         </div>
      )}
    </div>
);
}
