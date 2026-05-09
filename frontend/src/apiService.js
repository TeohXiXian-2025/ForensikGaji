/**
 * ForensikGaji Frontend - API Service
 *
 * This module handles all communication with the backend API.
 * Replaces localStorage-based operations with proper API calls.
 *
 * @module apiService
 * @author ForensikGaji Team
 * @created May 2026
 */

// Backend API URL - update this to match your deployment
const API_BASE_URL = 'https://forensikgaji-backend-381516681695.asia-southeast1.run.app/api';

/**
 * Get a case from local state by ID (for getting current state before API update)
 * This is a helper that should be used with the cases returned from fetchAllCases
 */
export function getCaseFromList(cases, caseId) {
  return cases.find(c => c.id === caseId);
}

/**
 * Fetch all audit cases from the backend
 */
export async function fetchAllCases() {
  try {
    const response = await fetch(`${API_BASE_URL}/cases`);
    if (!response.ok) throw new Error('Failed to fetch cases');
    return await response.json();
  } catch (error) {
    console.error('Error fetching cases:', error);
    return [];
  }
}

/**
 * Fetch a single case by ID
 */
export async function fetchCase(caseId) {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}`);
    if (!response.ok) throw new Error('Case not found');
    return await response.json();
  } catch (error) {
    console.error('Error fetching case:', error);
    return null;
  }
}

/**
 * Create a new audit case
 */
export async function createCase(name, docTypes) {
  try {
    const response = await fetch(`${API_BASE_URL}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type: docTypes.join(' + ')
      })
    });
    if (!response.ok) throw new Error('Failed to create case');
    return await response.json();
  } catch (error) {
    console.error('Error creating case:', error);
    throw error;
  }
}

/**
 * Update an existing case
 */
export async function updateCase(caseId, updates) {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update case');
    return await response.json();
  } catch (error) {
    console.error('Error updating case:', error);
    throw error;
  }
}

/**
 * Delete a case
 */
export async function deleteCase(caseId) {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete case');
    return await response.json();
  } catch (error) {
    console.error('Error deleting case:', error);
    throw error;
  }
}

/**
 * Add analyzed files to a case
 * Called by candidate portal after document analysis
 */
export async function addFilesToCase(caseId, files) {
  try {
    const response = await fetch(`${API_BASE_URL}/cases/${caseId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files })
    });
    if (!response.ok) throw new Error('Failed to add files to case');
    return await response.json();
  } catch (error) {
    console.error('Error adding files to case:', error);
    throw error;
  }
}

/**
 * Scan a document for fraud
 */
export async function scanDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/scan-document`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) throw new Error('Scan failed');
  return await response.json();
}

/**
 * Sync function - fetches latest cases and provides diff
 * Returns { cases: [], hasChanges: boolean }
 */
export async function syncCases(localCases) {
  const remoteCases = await fetchAllCases();

  // Simple comparison - check if counts differ or timestamps changed
  const hasChanges =
    remoteCases.length !== localCases.length ||
    JSON.stringify(remoteCases) !== JSON.stringify(localCases);

  return {
    cases: remoteCases,
    hasChanges
  };
}
