
import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, MapPin, Calendar, Euro, User, Package, FileText, Copy, Download, CheckSquare, Square, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DebtEntry {
  id: string;
  personName: string;
  product: 'Otto' | 'Kobika' | 'Dibinger' | 'Anderes';
  quantity: string;
  amount: number;
  location: string;
  note?: string;
  dueDate?: string;
  date: string;
  timestamp: number;
}

interface LogEntry {
  timestamp: number;
  action: 'create' | 'update' | 'delete';
  entryId: string;
  details: string;
  oldState?: any;
  newState?: any;
}

interface Request {
  id: string;
  message: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined';
  response?: string;
  adminNotes?: string;
}

const generateId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const DebtTrackingApp = () => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [currentView, setCurrentView] = useState<'home' | 'list' | 'form' | 'lookup' | 'requests'>('home');
  const [debtEntries, setDebtEntries] = useState<DebtEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DebtEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lookupId, setLookupId] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<DebtEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<DebtEntry | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [userRequest, setUserRequest] = useState<string>('');
  const [downloadAsJSON, setDownloadAsJSON] = useState<boolean>(true);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    personName: '',
    product: 'Otto' as 'Otto' | 'Kobika' | 'Dibinger' | 'Anderes',
    quantity: '',
    amount: '',
    location: '557',
    note: '',
    dueDate: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    // Check for admin access
    const adminKey = localStorage.getItem('adminKey');
    if (adminKey === 'IB0o') {
      setIsAdmin(true);
    }

    // Load data from localStorage
    const savedEntries = localStorage.getItem('debtEntries');
    const savedLogs = localStorage.getItem('logs');
    const savedRequests = localStorage.getItem('requests');
    
    if (savedEntries) {
      const entries = JSON.parse(savedEntries);
      setDebtEntries(entries);
      setFilteredEntries(entries);
    }
    
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    }

    if (savedRequests) {
      setRequests(JSON.parse(savedRequests));
    }

    // Try to get geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            location: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
          }));
        },
        () => {
          setFormData(prev => ({ ...prev, location: '557' }));
        }
      );
    }
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = debtEntries.filter(entry =>
        entry.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.amount.toString().includes(searchTerm) ||
        entry.date.includes(searchTerm) ||
        entry.product.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEntries(filtered);
    } else {
      setFilteredEntries(debtEntries);
    }
  }, [searchTerm, debtEntries]);

  const saveData = (entries: DebtEntry[], newLogs: LogEntry[], newRequests?: Request[]) => {
    localStorage.setItem('debtEntries', JSON.stringify(entries));
    localStorage.setItem('logs', JSON.stringify(newLogs));
    if (newRequests) {
      localStorage.setItem('requests', JSON.stringify(newRequests));
    }
  };

  const addLog = (action: 'create' | 'update' | 'delete', entryId: string, details: string, oldState?: any, newState?: any) => {
    const newLog: LogEntry = {
      timestamp: Date.now(),
      action,
      entryId,
      details,
      oldState,
      newState
    };
    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    return updatedLogs;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `ID ${text} copied to clipboard`,
    });
  };

  const handleAdminLogin = () => {
    if (password === 'IB0o') {
      localStorage.setItem('adminKey', 'IB0o');
      setIsAdmin(true);
      setCurrentView('home');
      toast({
        title: "Access granted",
        description: "Welcome to the system",
      });
    } else {
      toast({
        title: "Access denied",
        description: "Invalid credentials",
        variant: "destructive",
      });
    }
  };

  const handleLookup = () => {
    const entry = debtEntries.find(e => e.id === lookupId);
    if (entry) {
      setLookupResult(entry);
      toast({
        title: "Entry found",
        description: `Debt entry for ${entry.personName}`,
      });
    } else {
      setLookupResult(null);
      toast({
        title: "Not found",
        description: "No entry found with this ID",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.personName || !formData.quantity || !formData.amount) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Check if person already exists and combine amounts
    const existingEntry = debtEntries.find(entry => 
      entry.personName.toLowerCase() === formData.personName.toLowerCase() && 
      entry.product === formData.product &&
      !editingEntry
    );

    let updatedEntries: DebtEntry[];
    let logDetails: string;
    let newLogs: LogEntry[];

    if (existingEntry && !editingEntry) {
      // Combine with existing entry
      const oldState = { ...existingEntry };
      const combinedEntry: DebtEntry = {
        ...existingEntry,
        amount: existingEntry.amount + parseFloat(formData.amount),
        quantity: `${existingEntry.quantity} + ${formData.quantity}`,
        note: existingEntry.note ? `${existingEntry.note}; ${formData.note}` : formData.note,
        timestamp: Date.now()
      };
      
      updatedEntries = debtEntries.map(e => e.id === existingEntry.id ? combinedEntry : e);
      logDetails = `Combined debt for ${combinedEntry.personName} - Added €${formData.amount} (Total: €${combinedEntry.amount})`;
      newLogs = addLog('update', combinedEntry.id, logDetails, oldState, combinedEntry);
      
      toast({
        title: "Entry combined",
        description: logDetails,
      });
    } else {
      const entry: DebtEntry = {
        id: editingEntry?.id || generateId(),
        personName: formData.personName,
        product: formData.product,
        quantity: formData.quantity,
        amount: parseFloat(formData.amount),
        location: formData.location,
        note: formData.note,
        dueDate: formData.dueDate,
        date: formData.date,
        timestamp: Date.now()
      };

      if (editingEntry) {
        const oldState = { ...editingEntry };
        updatedEntries = debtEntries.map(e => e.id === editingEntry.id ? entry : e);
        logDetails = `Updated debt entry for ${entry.personName} - €${entry.amount}`;
        newLogs = addLog('update', entry.id, logDetails, oldState, entry);
        toast({
          title: "Entry updated",
          description: logDetails,
        });
      } else {
        updatedEntries = [...debtEntries, entry];
        logDetails = `Created debt entry for ${entry.personName} - €${entry.amount}`;
        newLogs = addLog('create', entry.id, logDetails, null, entry);
        toast({
          title: "Entry created",
          description: logDetails,
        });
      }
    }

    setDebtEntries(updatedEntries);
    saveData(updatedEntries, newLogs);
    setCurrentView('list');
    setEditingEntry(null);
    setFormData({
      personName: '',
      product: 'Otto',
      quantity: '',
      amount: '',
      location: formData.location,
      note: '',
      dueDate: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleEdit = (entry: DebtEntry) => {
    setEditingEntry(entry);
    setFormData({
      personName: entry.personName,
      product: entry.product,
      quantity: entry.quantity,
      amount: entry.amount.toString(),
      location: entry.location,
      note: entry.note || '',
      dueDate: entry.dueDate || '',
      date: entry.date
    });
    setCurrentView('form');
  };

  const handleDelete = (entry: DebtEntry) => {
    const updatedEntries = debtEntries.filter(e => e.id !== entry.id);
    const logDetails = `Deleted debt entry for ${entry.personName} - €${entry.amount}`;
    const newLogs = addLog('delete', entry.id, logDetails, entry, null);
    
    setDebtEntries(updatedEntries);
    saveData(updatedEntries, newLogs);
    
    toast({
      title: "Entry deleted",
      description: logDetails,
    });
  };

  const handleUserRequest = () => {
    if (!userRequest.trim()) return;

    const newRequest: Request = {
      id: generateId(),
      message: userRequest,
      timestamp: Date.now(),
      status: 'pending'
    };

    const updatedRequests = [...requests, newRequest];
    setRequests(updatedRequests);
    localStorage.setItem('requests', JSON.stringify(updatedRequests));
    
    setUserRequest('');
    toast({
      title: "Request submitted",
      description: `Your request ID: ${newRequest.id}`,
    });
  };

  const handleRequestAction = (requestId: string, action: 'accept' | 'decline', response?: string) => {
    const updatedRequests = requests.map(req => 
      req.id === requestId 
        ? { ...req, status: action === 'accept' ? 'accepted' : 'declined', response }
        : req
    );
    setRequests(updatedRequests);
    localStorage.setItem('requests', JSON.stringify(updatedRequests));
    
    toast({
      title: `Request ${action}ed`,
      description: `Request ${requestId} has been ${action}ed`,
    });
  };

  const getOverdueEntries = () => {
    const today = new Date().toISOString().split('T')[0];
    return debtEntries.filter(entry => {
      if (!entry.dueDate) return true; // No due date means overdue
      return entry.dueDate < today;
    });
  };

  const downloadData = () => {
    const data = {
      debtEntries,
      logs,
      requests,
      exportDate: new Date().toISOString()
    };

    if (downloadAsJSON) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debt-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // HTML Viewer
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Ibo mit 2,5 Kibilo - Data Export</title>
    <style>
        body { 
            background: #0a0a0a; 
            color: #00ff00; 
            font-family: 'Courier New', monospace; 
            margin: 20px; 
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { 
            text-align: center; 
            border: 2px solid #ff0000; 
            padding: 20px; 
            margin-bottom: 30px;
            background: linear-gradient(45deg, #1a0000, #000000);
        }
        .section { 
            border: 1px solid #333; 
            margin: 20px 0; 
            padding: 15px; 
            background: #111;
            box-shadow: 0 0 10px rgba(255, 0, 0, 0.3);
        }
        .section h2 { 
            color: #ff0000; 
            border-bottom: 1px solid #ff0000; 
            padding-bottom: 10px; 
            cursor: pointer;
        }
        .data { 
            display: none; 
            margin-top: 15px; 
        }
        .data.active { display: block; }
        .entry { 
            border: 1px solid #444; 
            margin: 10px 0; 
            padding: 10px; 
            background: #0d0d0d;
        }
        .entry-id { color: #ffff00; font-weight: bold; }
        .amount { color: #00ffff; font-weight: bold; }
        .overdue { color: #ff4444; }
        button { 
            background: #ff0000; 
            color: #fff; 
            border: none; 
            padding: 5px 10px; 
            cursor: pointer; 
            margin: 5px;
            font-family: inherit;
        }
        button:hover { background: #cc0000; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔴 Ibo mit 2,5 Kibilo 🔴</h1>
            <p>Data Export - ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="section">
            <h2 onclick="toggle('debts')">💀 Debt Entries (${data.debtEntries.length})</h2>
            <div id="debts" class="data">
                ${data.debtEntries.map(entry => `
                    <div class="entry">
                        <div class="entry-id">ID: ${entry.id}</div>
                        <div><strong>Name:</strong> ${entry.personName}</div>
                        <div><strong>Product:</strong> ${entry.product}</div>
                        <div><strong>Amount:</strong> <span class="amount">€${entry.amount}</span></div>
                        <div><strong>Quantity:</strong> ${entry.quantity}</div>
                        <div><strong>Date:</strong> ${entry.date}</div>
                        ${entry.dueDate ? `<div class="${entry.dueDate < new Date().toISOString().split('T')[0] ? 'overdue' : ''}"><strong>Due:</strong> ${entry.dueDate}</div>` : ''}
                        ${entry.note ? `<div><strong>Note:</strong> ${entry.note}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2 onclick="toggle('logs')">📝 Activity Logs (${data.logs.length})</h2>
            <div id="logs" class="data">
                ${data.logs.map(log => `
                    <div class="entry">
                        <div><strong>Action:</strong> ${log.action.toUpperCase()}</div>
                        <div><strong>Details:</strong> ${log.details}</div>
                        <div><strong>Time:</strong> ${new Date(log.timestamp).toLocaleString()}</div>
                        ${log.oldState ? `<div><strong>Old State:</strong> <pre>${JSON.stringify(log.oldState, null, 2)}</pre></div>` : ''}
                        ${log.newState ? `<div><strong>New State:</strong> <pre>${JSON.stringify(log.newState, null, 2)}</pre></div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2 onclick="toggle('requests')">📨 User Requests (${data.requests.length})</h2>
            <div id="requests" class="data">
                ${data.requests.map(req => `
                    <div class="entry">
                        <div class="entry-id">ID: ${req.id}</div>
                        <div><strong>Status:</strong> ${req.status.toUpperCase()}</div>
                        <div><strong>Message:</strong> ${req.message}</div>
                        <div><strong>Time:</strong> ${new Date(req.timestamp).toLocaleString()}</div>
                        ${req.response ? `<div><strong>Response:</strong> ${req.response}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    </div>

    <script>
        function toggle(id) {
            const element = document.getElementById(id);
            element.classList.toggle('active');
        }
    </script>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debt-tracker-viewer-${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Download complete",
      description: `Data exported as ${downloadAsJSON ? 'JSON' : 'HTML'}`,
    });
  };

  // Login/Lookup View (Non-admin)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black p-4" style={{
        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255, 0, 0, 0.1) 0%, transparent 50%), 
                         radial-gradient(circle at 75% 75%, rgba(0, 255, 0, 0.05) 0%, transparent 50%)`
      }}>
        <div className="max-w-md mx-auto space-y-6 pt-20">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4 animate-pulse">💀</div>
            <h1 className="text-4xl font-bold text-red-500 mb-2 font-mono tracking-wider">
              Ibo mit 2,5 Kibilo
            </h1>
            <p className="text-green-400 font-mono text-sm tracking-wide">[DEBT_TRACKING_SYSTEM]</p>
            <div className="mt-4 text-xs text-gray-500 font-mono">
              &gt; INITIALIZING... ██████████ 100%
            </div>
          </div>

          <Card className="bg-black/80 border-red-600 shadow-lg shadow-red-900/50">
            <CardHeader className="border-b border-red-800">
              <CardTitle className="text-green-400 flex items-center gap-2 font-mono">
                <Search className="w-5 h-5" />
                [LOOKUP_MODULE]
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <Input
                placeholder="[ENTER_6_CHAR_ID]"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value.toUpperCase())}
                className="bg-gray-900 border-green-600 text-green-400 font-mono tracking-wider placeholder:text-gray-600"
                maxLength={6}
              />
              <Button 
                onClick={handleLookup} 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-mono tracking-wide border border-red-500"
              >
                &gt; EXECUTE_SEARCH
              </Button>
              
              {lookupResult && (
                <Card className="bg-gray-900/80 border-green-600 mt-4 shadow-lg shadow-green-900/30">
                  <CardContent className="pt-4">
                    <div className="space-y-3 font-mono text-sm">
                      <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                        <span className="text-gray-400">[NAME]:</span>
                        <span className="text-white font-bold">{lookupResult.personName}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                        <span className="text-gray-400">[PRODUCT]:</span>
                        <Badge className="bg-red-800 text-white border-red-600">
                          {lookupResult.product}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                        <span className="text-gray-400">[DEBT]:</span>
                        <span className="text-red-400 font-bold text-lg">€{lookupResult.amount}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                        <span className="text-gray-400">[DATE]:</span>
                        <span className="text-white">{lookupResult.date}</span>
                      </div>
                      {lookupResult.dueDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">[DUE]:</span>
                          <span className={`${lookupResult.dueDate < new Date().toISOString().split('T')[0] ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                            {lookupResult.dueDate}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black/80 border-green-600 shadow-lg shadow-green-900/50">
            <CardHeader className="border-b border-green-800">
              <CardTitle className="text-green-400 font-mono text-sm">[USER_REQUEST_MODULE]</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <textarea
                placeholder="[ENTER_REQUEST_MESSAGE]"
                value={userRequest}
                onChange={(e) => setUserRequest(e.target.value)}
                className="w-full p-3 bg-gray-900 border border-green-600 text-green-400 font-mono text-sm rounded-md resize-none"
                rows={4}
              />
              <Button 
                onClick={handleUserRequest}
                disabled={!userRequest.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-black font-mono tracking-wide"
              >
                &gt; SUBMIT_REQUEST
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-black/80 border-gray-600">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="[ADMIN_ACCESS_KEY]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-900 border-gray-600 text-gray-400 font-mono"
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                />
                <Button 
                  onClick={handleAdminLogin} 
                  variant="outline" 
                  className="w-full border-red-600 text-red-400 hover:bg-red-950 font-mono"
                >
                  &gt; ADMIN_LOGIN
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Admin Views
  const renderNavigation = () => (
    <nav className="bg-black/90 backdrop-blur-sm border-b border-red-600 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl animate-pulse">💀</div>
            <h1 className="text-xl font-bold text-red-500 font-mono">Ibo mit 2,5 Kibilo</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant={currentView === 'home' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('home')}
              className="font-mono"
            >
              HOME
            </Button>
            <Button
              variant={currentView === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('list')}
              className="font-mono"
            >
              DEBTS
            </Button>
            <Button
              variant={currentView === 'form' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setCurrentView('form'); setEditingEntry(null); }}
              className="font-mono"
            >
              <Plus className="w-4 h-4 mr-1" />
              NEW
            </Button>
            <Button
              variant={currentView === 'requests' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('requests')}
              className="font-mono"
            >
              REQUESTS
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );

  const renderHome = () => {
    const overdueEntries = getOverdueEntries();
    
    return (
      <div className="max-w-6xl mx-auto p-6">
        {/* Download Section */}
        <Card className="mb-6 bg-black/80 border-red-600">
          <CardHeader>
            <CardTitle className="text-red-400 font-mono">[DATA_EXPORT]</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setDownloadAsJSON(!downloadAsJSON)}
                  className="text-green-400"
                >
                  {downloadAsJSON ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </button>
                <span className="text-green-400 font-mono">JSON</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setDownloadAsJSON(!downloadAsJSON)}
                  className="text-green-400"
                >
                  {!downloadAsJSON ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </button>
                <span className="text-green-400 font-mono">HTML_VIEWER</span>
              </div>
              <Button 
                onClick={downloadData}
                className="bg-red-600 hover:bg-red-700 font-mono"
              >
                <Download className="w-4 h-4 mr-2" />
                DOWNLOAD
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-red-900 to-red-950 border-red-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-200 font-mono">[TOTAL_DEBTS]</p>
                  <p className="text-3xl font-bold text-white font-mono">{debtEntries.length}</p>
                </div>
                <FileText className="w-12 h-12 text-red-300" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-900 to-green-950 border-green-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-200 font-mono">[TOTAL_AMOUNT]</p>
                  <p className="text-3xl font-bold text-white font-mono">
                    €{debtEntries.reduce((sum, entry) => sum + entry.amount, 0).toFixed(2)}
                  </p>
                </div>
                <Euro className="w-12 h-12 text-green-300" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-900 to-yellow-950 border-yellow-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-200 font-mono">[OVERDUE]</p>
                  <p className="text-3xl font-bold text-white font-mono">{overdueEntries.length}</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-yellow-300" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-900 to-purple-950 border-purple-600">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 font-mono">[REQUESTS]</p>
                  <p className="text-3xl font-bold text-white font-mono">{requests.filter(r => r.status === 'pending').length}</p>
                </div>
                <Calendar className="w-12 h-12 text-purple-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-black/80 border-red-600">
            <CardHeader>
              <CardTitle className="text-red-400 font-mono">[RECENT_DEBTS]</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {debtEntries.slice(-5).reverse().map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                    <div>
                      <p className="text-white font-bold font-mono">{entry.personName}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-gray-400 text-sm font-mono">{entry.date}</p>
                        <button 
                          onClick={() => copyToClipboard(entry.id)}
                          className="text-green-400 hover:text-green-300"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <span className="text-green-400 text-xs font-mono">{entry.id}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 font-bold font-mono">€{entry.amount}</p>
                      <Badge className="bg-red-800 text-white border-red-600 text-xs font-mono">
                        {entry.product}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black/80 border-yellow-600">
            <CardHeader>
              <CardTitle className="text-yellow-400 font-mono flex items-center gap-2">
                <Clock className="w-5 h-5" />
                [OVERDUE_DEBTS]
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overdueEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="p-3 bg-red-900/30 rounded-lg border border-red-600">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold font-mono">{entry.personName}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-red-400 text-xs font-mono animate-pulse">
                            {entry.dueDate ? `DUE: ${entry.dueDate}` : 'NO_DUE_DATE'}
                          </span>
                          <button 
                            onClick={() => copyToClipboard(entry.id)}
                            className="text-green-400 hover:text-green-300"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-red-400 font-bold font-mono">€{entry.amount}</p>
                        <Badge className="bg-red-800 text-white border-red-600 text-xs font-mono">
                          {entry.product}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Card className="bg-black/80 border-green-600">
            <CardHeader>
              <CardTitle className="text-green-400 font-mono">[ACTIVITY_LOG]</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.slice(-5).reverse().map((log, index) => (
                  <div key={index} className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                    <p className="text-white text-sm font-mono">{log.details}</p>
                    <p className="text-gray-400 text-xs font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                    {log.oldState && log.newState && (
                      <div className="mt-2 text-xs">
                        <span className="text-red-400 font-mono">OLD: €{log.oldState.amount || 'N/A'}</span>
                        <span className="text-green-400 font-mono ml-4">NEW: €{log.newState.amount || 'N/A'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderList = () => (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <h2 className="text-2xl font-bold text-red-400 font-mono">[DEBT_ENTRIES]</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <Input
              placeholder="[SEARCH_QUERY]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-900 border-green-600 text-green-400 font-mono"
            />
            <Button onClick={() => { setCurrentView('form'); setEditingEntry(null); }}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEntries.map((entry) => (
          <Card key={entry.id} className="bg-black/80 border-red-600 hover:border-red-400 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-bold font-mono">{entry.personName}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-400 text-sm font-mono">ID:</p>
                    <button 
                      onClick={() => copyToClipboard(entry.id)}
                      className="text-green-400 hover:text-green-300 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span className="font-mono text-sm">{entry.id}</span>
                    </button>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(entry)}>
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(entry)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 font-mono text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">[PRODUCT]:</span>
                  <Badge className="bg-red-800 text-white border-red-600">
                    {entry.product}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">[AMOUNT]:</span>
                  <span className="text-red-400 font-bold">€{entry.amount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">[QUANTITY]:</span>
                  <span className="text-white">{entry.quantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">[DATE]:</span>
                  <span className="text-white">{entry.date}</span>
                </div>
                {entry.dueDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">[DUE]:</span>
                    <span className={entry.dueDate < new Date().toISOString().split('T')[0] ? 'text-red-400 animate-pulse' : 'text-white'}>
                      {entry.dueDate}
                    </span>
                  </div>
                )}
                {entry.note && (
                  <div className="mt-2 p-2 bg-gray-900/50 rounded border border-gray-700">
                    <p className="text-gray-300 text-sm">{entry.note}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderForm = () => (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="bg-black/80 border-red-600">
        <CardHeader>
          <CardTitle className="text-red-400 font-mono">
            {editingEntry ? '[EDIT_DEBT_ENTRY]' : '[NEW_DEBT_ENTRY]'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-green-400 text-sm font-mono">[PERSON_NAME] *</label>
                <Input
                  value={formData.personName}
                  onChange={(e) => setFormData({...formData, personName: e.target.value})}
                  className="bg-gray-900 border-green-600 text-green-400 font-mono"
                  required
                />
              </div>
              
              <div>
                <label className="text-green-400 text-sm font-mono">[PRODUCT] *</label>
                <select
                  value={formData.product}
                  onChange={(e) => setFormData({...formData, product: e.target.value as 'Otto' | 'Kobika' | 'Dibinger' | 'Anderes'})}
                  className="w-full p-2 bg-gray-900 border border-green-600 text-green-400 rounded-md font-mono"
                  required
                >
                  <option value="Otto">Otto</option>
                  <option value="Kobika">Kobika</option>
                  <option value="Dibinger">Dibinger</option>
                  <option value="Anderes">Anderes</option>
                </select>
              </div>
              
              <div>
                <label className="text-green-400 text-sm font-mono">[QUANTITY] *</label>
                <Input
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  className="bg-gray-900 border-green-600 text-green-400 font-mono"
                  placeholder="e.g., 2kg, 5 pieces"
                  required
                />
              </div>
              
              <div>
                <label className="text-green-400 text-sm font-mono">[AMOUNT] (€) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="bg-gray-900 border-green-600 text-green-400 font-mono"
                  required
                />
              </div>
              
              <div>
                <label className="text-green-400 text-sm font-mono">[DATE]</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="bg-gray-900 border-green-600 text-green-400 font-mono"
                />
              </div>
              
              <div>
                <label className="text-green-400 text-sm font-mono">[DUE_DATE]</label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  className="bg-gray-900 border-green-600 text-green-400 font-mono"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            <div>
              <label className="text-green-400 text-sm font-mono">[LOCATION]</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="bg-gray-900 border-green-600 text-green-400 font-mono"
                placeholder="Location or coordinates"
              />
            </div>
            
            <div>
              <label className="text-green-400 text-sm font-mono">[NOTE]</label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                className="w-full p-2 bg-gray-900 border border-green-600 text-green-400 rounded-md font-mono"
                rows={3}
                placeholder="Additional notes..."
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 font-mono">
                {editingEntry ? 'UPDATE_ENTRY' : 'CREATE_ENTRY'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCurrentView('list')}
                className="border-gray-600 text-gray-400 hover:bg-gray-800 font-mono"
              >
                CANCEL
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  const renderRequests = () => (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-red-400 font-mono mb-6">[USER_REQUESTS]</h2>
      
      <div className="space-y-4">
        {requests.map((request) => (
          <Card key={request.id} className="bg-black/80 border-green-600">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-400 font-mono text-sm">ID: {request.id}</span>
                    <Badge 
                      className={`font-mono ${
                        request.status === 'pending' ? 'bg-yellow-800 text-yellow-200' :
                        request.status === 'accepted' ? 'bg-green-800 text-green-200' :
                        'bg-red-800 text-red-200'
                      }`}
                    >
                      {request.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-white font-mono mb-2">{request.message}</p>
                  <p className="text-gray-400 text-xs font-mono">
                    {new Date(request.timestamp).toLocaleString()}
                  </p>
                  {request.response && (
                    <div className="mt-3 p-2 bg-gray-900/50 rounded border border-gray-700">
                      <p className="text-green-400 font-mono text-sm">[RESPONSE]: {request.response}</p>
                    </div>
                  )}
                </div>
                
                {request.status === 'pending' && (
                  <div className="flex gap-2 ml-4">
                    <Button 
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 font-mono"
                      onClick={() => {
                        const response = prompt('Accept with notes (optional):');
                        handleRequestAction(request.id, 'accept', response || undefined);
                      }}
                    >
                      ACCEPT
                    </Button>
                    <Button 
                      size="sm"
                      variant="destructive"
                      className="font-mono"
                      onClick={() => {
                        const reason = prompt('Decline reason (optional):');
                        handleRequestAction(request.id, 'decline', reason || undefined);
                      }}
                    >
                      DECLINE
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {requests.length === 0 && (
          <Card className="bg-black/80 border-gray-600">
            <CardContent className="p-8 text-center">
              <p className="text-gray-400 font-mono">[NO_REQUESTS_FOUND]</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black" style={{
      backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255, 0, 0, 0.1) 0%, transparent 50%), 
                       radial-gradient(circle at 75% 75%, rgba(0, 255, 0, 0.05) 0%, transparent 50%)`
    }}>
      {renderNavigation()}
      {currentView === 'home' && renderHome()}
      {currentView === 'list' && renderList()}
      {currentView === 'form' && renderForm()}
      {currentView === 'requests' && renderRequests()}
    </div>
  );
};

export default DebtTrackingApp;
