const BASE_URL = 'http://localhost:8000';

export async function uploadDataset(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/upload`, { method: 'POST', body: formData });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Upload failed');
    }
    return res.json();
}

export async function fetchProfile(sessionId) {
    const res = await fetch(`${BASE_URL}/dataset/profile?session_id=${sessionId}`);
    return res.json();
}

export async function fetchIssues(sessionId) {
    const res = await fetch(`${BASE_URL}/data-quality/issues?session_id=${sessionId}`);
    return res.json();
}

export async function acceptIssue(sessionId, issueId) {
    const fd = new FormData();
    fd.append('session_id', sessionId);
    const res = await fetch(`${BASE_URL}/data-quality/${issueId}/accept`, { method: 'POST', body: fd });
    return res.json();
}

export async function declineIssue(sessionId, issueId) {
    const fd = new FormData();
    fd.append('session_id', sessionId);
    const res = await fetch(`${BASE_URL}/data-quality/${issueId}/decline`, { method: 'POST', body: fd });
    return res.json();
}

export async function acceptSafeIssues(sessionId) {
    const fd = new FormData();
    fd.append('session_id', sessionId);
    const res = await fetch(`${BASE_URL}/data-quality/accept-safe`, { method: 'POST', body: fd });
    return res.json();
}

export async function fetchPreview(sessionId) {
    const res = await fetch(`${BASE_URL}/dataset/preview?session_id=${sessionId}`);
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch preview');
    }
    return res.json();
}

export async function fetchPivotRecommendations(sessionId) {
    const res = await fetch(`${BASE_URL}/pivot/recommendations?session_id=${sessionId}`);
    return res.json();
}

export async function createPivot(sessionId, config) {
    const res = await fetch(`${BASE_URL}/pivot/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, ...config })
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to create pivot');
    }
    return res.json();
}

export async function saveChart(sessionId, chartConfig) {
    const res = await fetch(`${BASE_URL}/pivot/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, ...chartConfig })
    });
    if (!res.ok) throw new Error('Failed to save chart');
    return res.json();
}

export async function deleteChart(sessionId, chartId) {
    const res = await fetch(`${BASE_URL}/pivot/delete/${chartId}?session_id=${sessionId}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete chart');
    return res.json();
}

export async function fetchReport(sessionId) {
    const res = await fetch(`${BASE_URL}/report?session_id=${sessionId}`);
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch report');
    }
    return res.json();
}

export async function fetchReportInsights(sessionId) {
    const res = await fetch(`${BASE_URL}/report/insights?session_id=${sessionId}`);
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch insights');
    }
    return res.json();
}
