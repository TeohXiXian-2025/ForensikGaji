import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Users, Search, 
  FileText, AlertTriangle, CheckCircle, FileWarning, 
  ChevronRight, X, Star, Clock, FileDown, Activity, 
  Link as LinkIcon, Copy, PlusCircle, UserCheck, Eye,
  UserPlus, Edit, Trash2, MessageSquare, Download, BarChart2, UploadCloud, Link
} from 'lucide-react';

import { initialContainers, expertDatabase } from './constants';

export default function App() {
  const isExternalLink = new URLSearchParams(window.location.search).get('upload') !== null;
  const [activeTab, setActiveTab] = useState(isExternalLink ? 'candidate_portal' : 'scanner'); 
  
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
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isClosed, setIsClosed] = useState(false); 
  
  const [sessionUploadedFiles, setSessionUploadedFiles] = useState([]);
  
  const [bookingExpert, setBookingExpert] = useState(null);
  const [selectedExpertDetail, setSelectedExpertDetail] = useState(null); 
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const [containerToDelete, setContainerToDelete] = useState(null);
  const [containerToRename, setContainerToRename] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const [viewMode, setViewMode] = useState('original'); 
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);
  const [activeAnomaly, setActiveAnomaly] = useState(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  const [creationMode, setCreationMode] = useState('link');
  const [directFiles, setDirectFiles] = useState([]);
  
  const claimBoxRef = useRef(null);

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
  const completedAudits = safeContainers.filter(c => c && c.status === 'completed' && c.data);
  const highRiskCount = completedAudits.filter(c => c.data.score < 40).length;
  const avgScore = completedAudits.length > 0
    ? (completedAudits.reduce((acc, curr) => acc + (curr.data.score || 0), 0) / completedAudits.length).toFixed(1)
    : 0;

  const cleanCount = completedAudits.filter(c => c.data.score >= 80).length;
  const reviewCount = completedAudits.filter(c => c.data.score >= 40 && c.data.score < 80).length;
  
  const cleanWidth = completedAudits.length ? (cleanCount / completedAudits.length) * 100 : 0;
  const reviewWidth = completedAudits.length ? (reviewCount / completedAudits.length) * 100 : 0;
  
  const safeCleanWidth = cleanWidth || 0;
  const safeReviewWidth = reviewWidth || 0;

  const handleCreateContainer = (e) => {
    e.preventDefault();
    if (!newContainerName.trim() || newContainerTypes.length === 0) return;
    
    const finalTypes = newContainerTypes.map(t => t === 'Other' && otherDocType.trim() ? otherDocType.trim() : t).filter(t => t !== 'Other' || otherDocType.trim());
    if (finalTypes.length === 0) return;

    const newId = `req-${Math.floor(1000 + Math.random() * 9000)}`;
    const newContainer = {
      id: newId,
      name: newContainerName,
      type: finalTypes.join(' + '), 
      status: 'waiting',
      link: `${window.location.origin}/?upload=${newId}`,
      data: null
    };
    
    setContainers(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const newContainers = [newContainer, ...safePrev];
      try {
        const bc = new BroadcastChannel('forensik_sync');
        bc.postMessage({ type: 'UPDATE_CASE', payload: newContainer });
        bc.close();
      } catch(e) {}
      return newContainers;
    });
    
    setNewContainerName('');
    setNewContainerTypes(['Resume']);
    setOtherDocType('');
  };

  const handleDirectHRUpload = async (e) => {
    e.preventDefault();
    if (!newContainerName.trim() || directFiles.length === 0) return;

    const finalTypes = newContainerTypes.map(t => t === 'Other' && otherDocType.trim() ? otherDocType.trim() : t).filter(t => t !== 'Other' || otherDocType.trim());
    const newId = `req-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const tempContainer = {
      id: newId,
      name: newContainerName,
      type: finalTypes.length > 0 ? finalTypes.join(' + ') : 'Direct Upload',
      status: 'processing',
      link: `${window.location.origin}/?upload=${newId}`,
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

      setToastMessage(`✅ Case Complete: ${filesToProcess.length} documents analyzed.`);
      setTimeout(() => setToastMessage(null), 4000);

    } catch (error) {
      console.error("Backend error:", error);
      alert("Backend connection failed. Please check Python console.");
      setContainers(prev => Array.isArray(prev) ? prev.filter(c => c && c.id !== newId) : []); 
    }
  };

  const handleCandidateUpload = async (event) => {
    const files = Array.from(event.target.files);
    event.target.value = null; 
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadSuccess(false);
    
    try {
      const uploadedFilesData = [];
      let anyFraud = false;

      for (const file of files) {
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

        if (result.fraud_probability_score < 40) anyFraud = true;
      }

      setSessionUploadedFiles(prev => [...prev, ...uploadedFilesData]);

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
      
      setIsUploading(false);
      setUploadSuccess(true);
      
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

  const confirmDelete = () => {
    setContainers(prev => Array.isArray(prev) ? prev.filter(c => c && c.id !== containerToDelete) : []);
    setContainerToDelete(null);
  };

  const openRenameModal = (id, currentName) => {
    setContainerToRename(id);
    setRenameValue(currentName);
  };

  const confirmRename = (e) => {
    e.preventDefault();
    if (renameValue && renameValue.trim() !== "") {
      setContainers(prev => Array.isArray(prev) ? prev.map(c => c && c.id === containerToRename ? { ...c, name: renameValue } : c) : []);
    }
    setContainerToRename(null);
  };

  const handleBookExpert = async (e) => {
    e.preventDefault();
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingSuccess(false);
      setBookingExpert(null);
      setSelectedExpertDetail(null); 
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

  const renderSidebar = () => (
    <div className="w-72 bg-slate-900 text-white flex flex-col h-full flex-shrink-0 shadow-xl z-10">
      <div className="p-6 flex items-center space-x-3 border-b border-slate-800 bg-slate-950">
        <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <span className="text-2xl font-bold tracking-tight">Forensik<span className="text-blue-500">Gaji</span></span>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-8">
        <button onClick={() => setActiveTab('scanner')} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl font-medium transition-all ${activeTab === 'scanner' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
          <Search className="w-5 h-5" /> <span>Forensic Scanner</span>
        </button>
        <button onClick={() => setActiveTab('marketplace')} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl font-medium transition-all ${activeTab === 'marketplace' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
          <Users className="w-5 h-5" /> <span>Expert Marketplace</span>
        </button>
        <button onClick={() => setActiveTab('register')} className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl font-medium transition-all ${activeTab === 'register' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
          <UserPlus className="w-5 h-5" /> <span>Register as Expert</span>
        </button>
      </nav>
    </div>
  );

  const renderForensicScannerView = () => (
    <div className="p-8 lg:p-12 pb-32 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Forensic Document Scanner</h1>
      <p className="text-slate-500 mb-10 text-lg">Deploy secure Audit Links to your talent pool. Powered by our Sovereign Forensic Layer.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
          <h3 className="text-sm text-slate-500 font-bold uppercase tracking-wider">Total Audits</h3>
          <p className="text-3xl font-black mt-2 text-slate-900">{totalAudits}</p>
        </div>
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-red-500">
          <h3 className="text-sm text-slate-500 font-bold uppercase tracking-wider">High Risk (Critical)</h3>
          <p className="text-3xl font-black mt-2 text-red-600">{highRiskCount}</p>
        </div>
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-green-500">
          <h3 className="text-sm text-slate-500 font-bold uppercase tracking-wider">Avg Trust Score</h3>
          <p className="text-3xl font-black mt-2 text-slate-900">{avgScore}%</p>
        </div>
      </div>

      <div className="flex justify-end mb-8">
        <button 
          onClick={() => setShowCharts(!showCharts)}
          className="flex items-center text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-4 py-2 rounded-full"
        >
          <BarChart2 className="w-4 h-4 mr-1.5" /> 
          {showCharts ? 'Hide Advanced Analytics' : 'Show Advanced Analytics'}
        </button>
      </div>

      {showCharts && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-10 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-xl font-bold text-slate-800 mb-8 border-b pb-4">Executive Risk Distribution</h3>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="relative w-56 h-56 rounded-full flex items-center justify-center shadow-inner" 
                 style={{ background: `conic-gradient(#22c55e ${safeCleanWidth}%, #facc15 ${safeCleanWidth}% ${safeCleanWidth + safeReviewWidth}%, #ef4444 ${safeCleanWidth + safeReviewWidth}% 100%)` }}>
              <div className="w-40 h-40 bg-white rounded-full flex flex-col items-center justify-center shadow-sm z-10">
                <span className="text-4xl font-black text-slate-800">{completedAudits.length}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Total Scans</span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-4">
               <div className="flex justify-between items-center p-5 bg-slate-50 rounded-xl border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                 <div className="flex items-center">
                   <div className="w-3.5 h-3.5 bg-green-500 rounded-full mr-4 shadow-[0_0_10px_#22c55e]"></div>
                   <div>
                     <span className="font-bold text-slate-700 block text-base">Authentic / Clear</span>
                     <span className="text-xs text-slate-400 font-medium">Trust Score 80-100%</span>
                   </div>
                 </div>
                 <span className="font-black text-xl text-slate-900">{cleanCount} <span className="text-sm font-medium text-slate-400 ml-1">({Math.round(safeCleanWidth)}%)</span></span>
               </div>

               <div className="flex justify-between items-center p-5 bg-slate-50 rounded-xl border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                 <div className="flex items-center">
                   <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full mr-4 shadow-[0_0_10px_#facc15]"></div>
                   <div>
                     <span className="font-bold text-slate-700 block text-base">Manual Review Required</span>
                     <span className="text-xs text-slate-400 font-medium">Trust Score 40-79%</span>
                   </div>
                 </div>
                 <span className="font-black text-xl text-slate-900">{reviewCount} <span className="text-sm font-medium text-slate-400 ml-1">({Math.round(safeReviewWidth)}%)</span></span>
               </div>

               <div className="flex justify-between items-center p-5 bg-slate-50 rounded-xl border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                 <div className="flex items-center">
                   <div className="w-3.5 h-3.5 bg-red-500 rounded-full mr-4 shadow-[0_0_10px_#ef4444]"></div>
                   <div>
                     <span className="font-bold text-slate-700 block text-base">Critical Risk (Fraud Detected)</span>
                     <span className="text-xs text-slate-400 font-medium">Trust Score &lt;40%</span>
                   </div>
                 </div>
                 <span className="font-black text-xl text-slate-900">{highRiskCount} <span className="text-sm font-medium text-slate-400 ml-1">({100 - Math.round(safeCleanWidth) - Math.round(safeReviewWidth)}%)</span></span>
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-10">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            <PlusCircle className="w-5 h-5 mr-2 text-blue-600" />
            Create Audit Case
          </h2>
          
          <div className="flex bg-slate-100 rounded-lg p-1.5 self-start">
            <button 
              onClick={() => { setCreationMode('link'); setNewContainerName(''); }} 
              className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${creationMode === 'link' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <Link className="w-4 h-4 mr-2" /> Candidate Link
            </button>
            <button 
              onClick={() => { setCreationMode('direct'); setNewContainerName(''); setDirectFiles([]); }} 
              className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${creationMode === 'direct' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <UploadCloud className="w-4 h-4 mr-2" /> Direct Upload
            </button>
          </div>
        </div>

        {creationMode === 'direct' ? (
          <form onSubmit={handleDirectHRUpload} className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Audit Case Name</label>
                <input 
                  type="text" 
                  placeholder="e.g., Q1 Engineering Intake - Ali" 
                  value={newContainerName} 
                  onChange={(e) => setNewContainerName(e.target.value)} 
                  className="w-full border rounded-xl p-3.5 outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Document Type</label>
                <div className="w-full bg-slate-50 border rounded-xl p-3 h-32 overflow-y-auto">
                  {['Resume', 'Payslip', 'Medical Certificate (MC)', 'Expense Receipt', 'Other'].map(type => (
                    <div key={type}>
                      <label className="flex items-center space-x-2 text-sm mb-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={newContainerTypes.includes(type)} 
                          onChange={(e) => e.target.checked ? setNewContainerTypes([...newContainerTypes, type]) : setNewContainerTypes(newContainerTypes.filter(t => t !== type))} 
                          className="w-4 h-4 text-blue-600 rounded" 
                        />
                        <span className="text-slate-700 font-medium">{type}</span>
                      </label>
                      {type === 'Other' && newContainerTypes.includes('Other') && (
                        <input 
                          type="text" 
                          placeholder="Specify custom document type..." 
                          value={otherDocType} 
                          onChange={(e) => setOtherDocType(e.target.value)} 
                          className="ml-6 mb-2 mt-1 p-1 text-sm border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-500 w-[85%]" 
                          autoFocus
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col space-y-4">
              <div onClick={() => document.getElementById('directFileInput').click()} className="border-2 border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50/80 rounded-xl p-10 text-center cursor-pointer transition-colors group">
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
                 
                 <UploadCloud className="w-12 h-12 text-blue-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                 <h3 className="text-lg font-bold text-slate-800 mb-1">Click or Drag & Drop multiple files</h3>
                 <p className="text-slate-500 text-sm">Select all documents belonging to this case. They will be processed together immediately.</p>
              </div>

              {directFiles.length > 0 && (
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm w-full text-left">
                   <p className="font-bold text-sm text-slate-700 mb-2 border-b pb-2">Selected Files ({directFiles.length}):</p>
                   <div className="max-h-32 overflow-y-auto">
                     {directFiles.map((f, i) => (
                       <div key={i} className="flex items-center text-xs text-slate-600 mt-1.5">
                         <CheckCircle className="w-3.5 h-3.5 text-green-500 mr-2 flex-shrink-0" /> 
                         <span className="truncate font-medium">{f.name}</span>
                       </div>
                     ))}
                   </div>
                 </div>
              )}
            </div>

            <button type="submit" disabled={directFiles.length === 0 || !newContainerName.trim()} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-4 rounded-xl font-bold shadow-md transition-colors text-lg">
              Upload & Analyze {directFiles.length > 0 ? `${directFiles.length} Files` : ''}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateContainer} className="flex flex-col md:flex-row gap-4 animate-in fade-in duration-300">
            <input type="text" placeholder="e.g., Audit Case - Ahmad" value={newContainerName} onChange={(e) => setNewContainerName(e.target.value)} className="flex-1 border rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500" required />
            <div className="w-full md:w-64 bg-slate-50 border rounded-xl p-3 h-32 overflow-y-auto">
              {['Resume', 'Payslip', 'Medical Certificate (MC)', 'Expense Receipt', 'Other'].map(type => (
                <div key={type}>
                  <label className="flex items-center space-x-2 text-sm mb-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={newContainerTypes.includes(type)} 
                      onChange={(e) => e.target.checked ? setNewContainerTypes([...newContainerTypes, type]) : setNewContainerTypes(newContainerTypes.filter(t => t !== type))} 
                      className="w-4 h-4 text-blue-600 rounded" 
                    />
                    <span className="text-slate-700 font-medium">{type}</span>
                  </label>
                  {type === 'Other' && newContainerTypes.includes('Other') && (
                    <input 
                      type="text" 
                      placeholder="Specify..." 
                      value={otherDocType} 
                      onChange={(e) => setOtherDocType(e.target.value)} 
                      className="ml-6 mb-2 mt-1 p-1 text-xs border border-slate-300 rounded outline-none focus:ring-1 focus:ring-blue-500 w-[85%]" 
                      autoFocus
                    />
                  )}
                </div>
              ))}
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium shadow-sm h-fit transition-colors">Generate Link</button>
          </form>
        )}
      </div>

      <h2 className="text-xl font-bold text-slate-800 mb-6 border-b pb-2">Active Audit Ledger</h2>
      <div className="space-y-4">
        {safeContainers.map((c) => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col md:flex-row justify-between gap-6 transition-all hover:shadow-md">
            <div className="flex-1 min-w-0 w-full md:pr-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">{c.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    c.status === 'waiting' ? 'bg-amber-100 text-amber-700' : 
                    c.status === 'processing' ? 'bg-blue-100 text-blue-700 animate-pulse' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {c.status === 'waiting' ? 'Waiting for Candidate' : c.status === 'processing' ? 'Analyzing Files...' : 'Analysis Complete'}
                  </span>
                  {c.data?.clash_detected && (
                     <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white uppercase animate-pulse shadow-sm">Clash Detected</span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <button onClick={() => openRenameModal(c.id, c.name)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Rename Case">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => setContainerToDelete(c.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Case">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900">{c.name}</h3>
              {c.status === 'completed' && Array.isArray(c.data?.files) && c.data.files.length > 0 ? (
                <div className="mt-4 flex flex-col gap-2 max-w-xl">
                  {c.data.files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 px-3 py-2 rounded-lg">
                      <div className="flex items-center min-w-0 overflow-hidden pr-4">
                        <FileText className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-700 truncate block">{file.name}</span>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${
                        file.score >= 95 ? 'bg-green-100 text-green-700' :
                        file.score < 40 ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {file.score}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm mt-1">{c.type}</p>
              )}
            </div>
            {(c.status === 'waiting' || c.status === 'completed') && (
              <div className="flex items-center h-fit self-center space-x-2 bg-slate-50 border p-2 rounded-lg mt-2 md:mt-0 flex-shrink-0">
                <button onClick={() => { setActiveCandidateUploadId(c.id); setActiveTab('candidate_portal'); }} className="text-blue-600 font-mono text-sm underline truncate max-w-[200px]" title={c.link}>{c.link}</button>
                <button onClick={() => copyToClipboard(c.link)} className="p-1 hover:bg-slate-200 rounded text-slate-400"><Copy className="w-4 h-4" /></button>
              </div>
            )}
            {c.status === 'processing' && (
              <div className="flex items-center h-fit self-center px-4 flex-shrink-0">
                <Activity className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            )}
            {c.status === 'completed' && (
              <div className="flex items-center h-fit self-center md:mt-8 flex-shrink-0">
                <button onClick={() => { setSelectedContainer(c); setViewMode('original'); setSelectedFileIndex(0); setActiveAnomaly(null); }} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap">View Report</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderMarketplaceView = () => (
    <div className="p-8 lg:p-12 pb-32 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Expert Interview Marketplace</h1>
      <p className="text-slate-500 mb-10 text-lg">Hire verified industry professionals to conduct technical interviews for your candidates.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {expertDatabase.map(expert => (
          <div key={expert.id} onClick={() => setSelectedExpertDetail(expert)} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer">
            <div className="flex items-center space-x-4 mb-4">
              <img src={expert.image} alt={expert.name} className="w-16 h-16 rounded-full object-cover border border-slate-200" />
              <div>
                <h3 className="font-bold text-slate-900 leading-tight">{expert.name}</h3>
                <p className="text-[#4f46e5] font-medium text-sm mt-0.5">{expert.role}</p>
                <p className="text-slate-500 text-sm">{expert.company}</p>
              </div>
            </div>
            <div className="flex items-center text-sm mb-4">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400 mr-1.5" />
              <span className="font-bold text-slate-900 mr-1.5 text-base">{expert.rating}</span>
              <span className="text-slate-400">({expert.reviews} reviews)</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-6 flex-1">
              {expert.skills.map(s => <span key={s} className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium rounded-md">{s}</span>)}
            </div>
            <p className="text-xs text-slate-400 mb-4 text-center italic font-medium">Click card to view full profile</p>
            <div className="flex items-center justify-between pt-5 border-t border-slate-100 mt-auto">
              <div className="flex items-center text-slate-700 font-bold text-base"><Clock className="w-4 h-4 mr-1.5 text-slate-400" /> {expert.rate}</div>
              <button onClick={(e) => { e.stopPropagation(); setBookingExpert(expert); }} className="bg-[#4f46e5] hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors">Book Interview</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderExpertRegistrationView = () => (
    <div className="p-8 lg:p-12 pb-32 max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Become an Expert Auditor</h1>
        <p className="text-slate-500 mt-2 text-lg">Join our vetted marketplace of elite technical interviewers and help secure the hiring ecosystem.</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl">
        <form onSubmit={(e) => { e.preventDefault(); setRegistrationSuccess(true); setTimeout(() => { setRegistrationSuccess(false); setActiveTab('marketplace'); }, 3000); }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                <input type="text" required placeholder="e.g., Dr. Jane Doe" className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Current Role</label>
                <input type="text" required placeholder="e.g., Lead Engineer" className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Company / Institution</label>
            <input type="text" required placeholder="e.g., TechCorp Malaysia" className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Primary Expertise (Comma separated)</label>
            <input type="text" required placeholder="e.g., Java, Data Science, System Architecture" className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Desired Hourly Rate (RM)</label>
              <input type="number" required placeholder="e.g., 150" className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">LinkedIn Profile URL</label>
              <input type="url" required placeholder="https://linkedin.com/in/..." className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl mt-6 transition-colors shadow-lg">Submit Application</button>
        </form>
      </div>
    </div>
  );

  const renderCandidatePortalView = () => {
    const activeContainer = safeContainers.find(c => c && c.id === activeCandidateUploadId);
    if (!activeContainer) return (<div className="fixed inset-0 bg-slate-50 z-50 flex flex-col p-6 items-center justify-center"><Activity className="w-12 h-12 text-blue-600 animate-spin mb-4" /><h2 className="text-xl font-bold text-slate-700">Connecting to HR Dashboard...</h2></div>);
    if (isClosed) return (<div className="fixed inset-0 bg-slate-50 z-50 flex flex-col p-6 items-center justify-center"><div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-10 text-center animate-in fade-in zoom-in duration-300"><CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6" /><h2 className="text-2xl font-black text-slate-900 mb-4">Upload Securely Transmitted</h2><p className="text-slate-500 mb-8 font-medium">Your documents have been actively synced to the HR dashboard.</p><div className="bg-slate-100 rounded-xl p-4 border border-slate-200"><p className="text-slate-700 font-bold">You may now safely close this browser tab.</p></div></div></div>);
    return (<div className="fixed inset-0 bg-slate-50 z-50 flex flex-col p-6 items-center justify-center"><div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 p-10 text-center"><h2 className="text-2xl font-bold text-slate-900 mb-8">Secure Document Upload</h2>{uploadSuccess && <div className="py-6 flex flex-col items-center bg-green-50 rounded-xl mb-4 border border-green-200"><CheckCircle className="w-10 h-10 text-green-600 mb-2" /><h3 className="text-lg font-bold text-slate-800">Files successfully added!</h3><p className="text-slate-500 text-sm">You can select more files or click finish below.</p></div>}{sessionUploadedFiles.length > 0 && <div className="mb-6 text-left bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-32 overflow-y-auto"><p className="font-bold text-sm text-slate-700 mb-2 border-b pb-2">Documents Uploaded to HR:</p>{sessionUploadedFiles.map((f, i) => (<div key={i} className="flex items-center text-xs text-slate-600 mt-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500 mr-2 flex-shrink-0" /> <span className="truncate font-medium">{f.name}</span></div>))}</div>}{isUploading ? (<div className="py-12 flex flex-col items-center"><Activity className="w-12 h-12 text-blue-600 animate-pulse mb-4" /><p className="font-bold text-slate-700">Analyzing Document Integrity...</p></div>) : (<div onClick={() => document.getElementById('fileInput').click()} className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl p-12 cursor-pointer hover:bg-blue-50 transition-colors"><input id="fileInput" type="file" multiple className="hidden" onChange={handleCandidateUpload} onClick={(e) => e.stopPropagation()} /><FileDown className="w-12 h-12 text-blue-600 mx-auto mb-4" /><h3 className="text-lg font-bold text-slate-800">Click to select files</h3><p className="text-slate-500 text-xs">You can select multiple documents at once.</p></div>)}{!isUploading && <button onClick={() => { if (!isExternalLink) { setActiveTab('scanner'); setActiveCandidateUploadId(null); window.history.replaceState(null, '', window.location.pathname); } else { setIsClosed(true); } }} className="mt-8 bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold shadow-md hover:bg-slate-800">{isExternalLink ? "Finish and Close Tab" : "Finish and Return"}</button>}</div></div>);
  };

  const renderSplitScreenModal = () => {
    if (!selectedContainer || !selectedContainer.data) return null;
    const report = selectedContainer.data;
    if (!Array.isArray(report.files) || report.files.length === 0) return null;
    const activeFile = report.files[selectedFileIndex] || report.files[0];
    const isHighRisk = activeFile.score < 40;
    
    const isPdfPreview = viewMode === 'original' && (activeFile.original?.startsWith('data:application/pdf') || activeFile.original?.toLowerCase().endsWith('.pdf'));

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 lg:p-8">
        <div className="bg-white w-full max-w-7xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="flex justify-between items-center px-8 py-5 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center space-x-4"><div className={`p-2.5 rounded-xl ${isHighRisk ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{isHighRisk ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}</div><div><h2 className="text-xl font-bold text-slate-900">Audit Report: {selectedContainer.name}</h2><p className="text-slate-400 text-xs mt-0.5">Sovereign Forensic Layer v2.0</p></div></div>
            <div className="flex items-center space-x-3"><button onClick={handleExportPDF} disabled={isExportingPDF} className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-bold text-sm shadow-sm disabled:opacity-50">{isExportingPDF ? <Activity className="w-4 h-4 mr-2 animate-spin text-blue-600" /> : <Download className="w-4 h-4 mr-2" />} {isExportingPDF ? 'Generating...' : 'Export PDF'}</button><button onClick={() => { setSelectedContainer(null); setActiveAnomaly(null); setViewMode('original'); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X className="w-6 h-6" /></button></div>
          </div>
          <div className="flex flex-1 overflow-hidden">
            <div className="w-1/2 p-8 border-r border-slate-200 overflow-y-auto bg-white">
              <div className="flex justify-between mb-8"><div><p className="text-slate-500 font-medium mb-1">Document Trust</p><div className={`text-6xl font-black ${isHighRisk ? 'text-red-600' : 'text-green-600'}`}>{activeFile.score}%</div></div><div className="text-right"><p className="text-slate-500 font-medium mb-1">Status</p><div className={`px-4 py-1.5 rounded-full font-bold border ${isHighRisk ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{isHighRisk ? 'FRAUD DETECTED' : 'AUTHENTIC'}</div></div></div>
              <div className={`p-6 rounded-2xl mb-8 border ${isHighRisk ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200'}`}><h4 className="font-bold flex items-center mb-2 text-slate-800"><Activity className="w-5 h-5 mr-2 text-blue-600" /> AI Verdict</h4><p className="font-medium text-slate-700 leading-relaxed">{activeFile.issue}</p></div>
              {Array.isArray(activeFile.flagged_claims) && activeFile.flagged_claims.map((claim, idx) => (
                <div key={idx} onClick={() => setActiveAnomaly(activeAnomaly === idx ? null : idx)} className={`bg-white border rounded-xl p-5 shadow-sm mb-4 cursor-pointer transition-all ${activeAnomaly === idx ? 'ring-2 ring-yellow-400 border-yellow-400 scale-[1.02]' : 'border-slate-200 hover:border-blue-300'}`}>
                  <div className="bg-yellow-100 text-slate-800 font-mono text-xs px-2 py-1 rounded mb-3 inline-block font-bold">Extract: "{claim.claim}"</div>
                  
                  <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg mb-2">
                    <span className="font-bold">Flag:</span> {claim.hr_note}
                  </p>
                  
                  {claim.interview_question && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <p className="text-blue-800 text-sm">
                        <span className="font-bold text-blue-900">Suggested Question:</span> {claim.interview_question}
                      </p>
                    </div>
                  )}

                  {!claim.box_hidden && <p className="text-xs text-slate-400 mt-3 font-bold text-right hover:text-blue-500">Click to locate on document ➔</p>}
                </div>
              ))}
            </div>

            {/* --- FIX 2: NEW SCROLLING DOCUMENT VIEWER LAYOUT --- */}
            <div className="w-1/2 bg-[#f8fafc] flex flex-col relative overflow-hidden">
              {Array.isArray(report.files) && <div className="bg-white border-b border-slate-200 px-4 pt-4 flex space-x-2 overflow-x-auto z-20 shadow-sm">{report.files.map((f, idx) => (<button key={idx} onClick={() => { setSelectedFileIndex(idx); setViewMode('original'); setActiveAnomaly(null); }} className={`px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors border-t border-l border-r ${selectedFileIndex === idx ? 'bg-[#f8fafc] text-blue-600 border-slate-200' : 'bg-white text-slate-400 border-transparent hover:bg-slate-50'}`}>{typeof f === 'string' ? f : f.name}</button>))}</div>}
              
              {/* Sticky Toggle Bar */}
              <div className="bg-white border-b border-slate-200 p-3 flex justify-center z-10 shadow-sm">
                  <div className="bg-slate-100 p-1 rounded-full inline-flex">
                      <button onClick={() => setViewMode('original')} className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${viewMode === 'original' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Eye className="w-4 h-4" /> <span>Original</span></button>
                      <button onClick={() => setViewMode('heatmap')} className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${viewMode === 'heatmap' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Activity className="w-4 h-4" /> <span>Heatmap Overlay</span></button>
                  </div>
              </div>

              {/* Scrollable Area for Tall Images */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-200/50">
                  <div className="max-w-4xl mx-auto shadow-xl bg-white border border-slate-300 rounded-xl relative overflow-hidden">
                      {viewMode === 'original' ? (
                          isPdfPreview ? (
                              <iframe src={activeFile.original} className="w-full border-none" title="PDF Preview" style={{ height: '80vh' }} />
                          ) : (
                              <img src={activeFile.original} alt="Original Document" className="w-full h-auto block" />
                          )
                      ) : (
                          activeFile.heatmap ? (
                              <img src={activeFile.heatmap} alt="ELA Heatmap Overlay" className="w-full h-auto block bg-slate-800" />
                          ) : (
                              <div className="flex items-center justify-center p-20 text-slate-500 font-bold text-center">
                                  Heatmap Analysis Unavailable.<br/>Document is likely purely digital (Resume) or could not be processed.
                              </div>
                          )
                      )}

                      {/* Yellow Bounding Box Layer */}
                      {activeAnomaly !== null && Array.isArray(activeFile.flagged_claims) && activeFile.flagged_claims[activeAnomaly] && !activeFile.flagged_claims[activeAnomaly].box_hidden && viewMode === 'original' && !isPdfPreview && (
                          <div ref={claimBoxRef} className="absolute bg-yellow-400/60 z-20 transition-all duration-500 shadow-[0_0_0_2px_#eab308]" 
                               style={{ 
                                   top: `${activeFile.flagged_claims[activeAnomaly].y_position}%`, 
                                   left: `${activeFile.flagged_claims[activeAnomaly].x_position}%`, 
                                   width: `${activeFile.flagged_claims[activeAnomaly].box_width}%`, 
                                   height: `${activeFile.flagged_claims[activeAnomaly].box_height}%`, 
                                   mixBlendMode: 'multiply'
                               }}>
                               <div className="absolute -top-7 -left-0.5 bg-yellow-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-sm uppercase whitespace-nowrap">
                                   {activeFile.flagged_claims[activeAnomaly].page_num ? `Evidence on Pg ${activeFile.flagged_claims[activeAnomaly].page_num}` : 'Target Locked'}
                               </div>
                          </div>
                      )}
                  </div>
              </div>
              {/* --- END FIX 2 --- */}

            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderExpertDetailModal = () => {
    if (!selectedExpertDetail) return null;
    const expert = selectedExpertDetail;
    return (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"><div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50"><h2 className="text-xl font-bold text-slate-900">Expert Profile</h2><button onClick={() => setSelectedExpertDetail(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X className="w-5 h-5"/></button></div><div className="p-8 overflow-y-auto flex-1"><div className="flex flex-col md:flex-row items-start md:space-x-6 mb-8"><img src={expert.image} alt={expert.name} className="w-24 h-24 rounded-full border-2 border-slate-200 object-cover mb-4 md:mb-0" /><div className="flex-1"><h1 className="text-2xl font-bold text-slate-900">{expert.name}</h1><p className="text-[#4f46e5] font-medium text-lg">{expert.role} @ {expert.company}</p><div className="flex items-center text-sm mt-2 mb-4"><Star className="w-5 h-5 text-amber-400 fill-amber-400 mr-1.5" /><span className="font-bold text-slate-900 mr-1.5 text-base">{expert.rating}</span><span className="text-slate-500">({expert.reviews} verified reviews)</span></div><div className="flex flex-wrap gap-2">{expert.skills.map(s => <span key={s} className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-md">{s}</span>)}</div></div><div className="mt-6 md:mt-0 w-full md:w-auto"><button onClick={() => { setSelectedExpertDetail(null); setBookingExpert(expert); }} className="w-full bg-[#4f46e5] hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold shadow-md transition-colors">Book ({expert.rate})</button></div></div><div className="mb-10"><h3 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">About {expert.name.split(' - ')[0]}</h3><p className="text-slate-600 leading-relaxed">{expert.bio}</p></div><div><h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center border-b border-slate-100 pb-2"><MessageSquare className="w-5 h-5 mr-2 text-slate-400" /> Recent Reviews</h3><div className="space-y-4">{expert.reviewList.map((r, i) => (<div key={i} className="bg-slate-50 p-5 rounded-xl border border-slate-100"><div className="flex items-center justify-between mb-2"><span className="font-bold text-sm text-slate-800">{r.author}</span><div className="flex">{[...Array(r.rating)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}</div></div><p className="text-sm text-slate-600 italic">"{r.text}"</p></div>))}</div></div></div></div></div>);
  };

  if (isExternalLink) return (<div className="flex h-screen font-sans bg-slate-50 text-slate-800 overflow-hidden relative">{renderCandidatePortalView()}{toastMessage && (<div className="fixed top-6 right-6 z-[60] animate-in slide-in-from-right fade-in duration-300"><div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center border-l-4 border-emerald-500"><CheckCircle className="w-6 h-6 text-emerald-500 mr-3 flex-shrink-0" /><p className="font-bold pr-6">{toastMessage}</p><button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button></div></div>)}</div>);

  return (
    <div className="flex h-screen font-sans bg-white text-slate-800 overflow-hidden relative">
      {renderSidebar()}
      <main className="flex-1 h-screen overflow-y-auto relative bg-slate-50 border-l border-slate-200 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-0">{activeTab === 'scanner' && renderForensicScannerView()}{activeTab === 'marketplace' && renderMarketplaceView()}{activeTab === 'register' && renderExpertRegistrationView()}</main>
      {activeTab === 'candidate_portal' && renderCandidatePortalView()}
      {renderSplitScreenModal()}
      {renderExpertDetailModal()}
      {toastMessage && (<div className="fixed top-6 right-6 z-[60] animate-in slide-in-from-right fade-in duration-300"><div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center border-l-4 border-emerald-500"><CheckCircle className="w-6 h-6 text-emerald-500 mr-3 flex-shrink-0" /><p className="font-bold pr-6">{toastMessage}</p><button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button></div></div>)}
      {containerToRename && (<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in fade-in zoom-in duration-200"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-slate-900">Rename Audit Case</h2><button onClick={() => setContainerToRename(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5"/></button></div><form onSubmit={confirmRename}><input type="text" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="w-full border border-slate-300 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none mb-6 font-medium text-slate-800" autoFocus required /><div className="flex space-x-3"><button type="button" onClick={() => setContainerToRename(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-colors">Cancel</button><button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md">Save Changes</button></div></form></div></div>)}
      {containerToDelete && (<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center animate-in fade-in zoom-in duration-200"><div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6"><Trash2 className="w-8 h-8 text-red-600" /></div><h2 className="text-2xl font-bold text-slate-900 mb-2">Delete Audit Case?</h2><p className="text-slate-500 mb-8">This action cannot be undone. Are you sure you want to permanently remove this case from the ledger?</p><div className="flex space-x-3"><button onClick={() => setContainerToDelete(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition-colors">Cancel</button><button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md">Yes, Delete</button></div></div></div>)}
      {registrationSuccess && (<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 text-center animate-in fade-in zoom-in duration-200"><CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" /><h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2><p className="text-slate-500">Our team will review your profile and contact you shortly.</p></div></div>)}
      {bookingExpert && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8">{bookingSuccess ? <div className="text-center py-6"><CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4"/><h2 className="text-2xl font-bold text-slate-900 mb-2">Interview Booked!</h2><p className="text-slate-500">Google Meet invite sent to {bookingExpert.name}.</p></div> : <form onSubmit={handleBookExpert}><div className="flex justify-between items-start mb-8"><div><h2 className="text-2xl font-bold text-slate-900">Book Interview</h2><p className="text-slate-500 mt-1">with {bookingExpert.name}</p></div><button type="button" onClick={() => setBookingExpert(null)}><X className="w-5 h-5 text-slate-400"/></button></div><div className="space-y-5"><div><label className="block text-sm font-bold text-slate-700 mb-2">Select Date & Time</label><input type="datetime-local" required className="w-full border border-slate-300 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium" /></div></div><button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl mt-8 transition-colors shadow-lg">Confirm Booking</button></form>}</div></div>}
    </div>
  );
}