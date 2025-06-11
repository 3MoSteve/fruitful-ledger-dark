
import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, MapPin, Calendar, Euro, User, Package, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DebtEntry {
  id: string;
  personName: string;
  product: 'Fruit' | 'Vegetable';
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
  const [currentView, setCurrentView] = useState<'home' | 'list' | 'form' | 'lookup'>('home');
  const [debtEntries, setDebtEntries] = useState<DebtEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DebtEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [lookupId, setLookupId] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<DebtEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<DebtEntry | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    personName: '',
    product: 'Fruit' as 'Fruit' | 'Vegetable',
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

    // Load data from localStorage (simulating JSON files)
    const savedEntries = localStorage.getItem('debtEntries');
    const savedLogs = localStorage.getItem('logs');
    
    if (savedEntries) {
      const entries = JSON.parse(savedEntries);
      setDebtEntries(entries);
      setFilteredEntries(entries);
    }
    
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
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
          // Fallback to default location if geolocation fails
          setFormData(prev => ({ ...prev, location: '557' }));
        }
      );
    }
  }, []);

  useEffect(() => {
    // Filter entries based on search term
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

  const saveData = (entries: DebtEntry[], newLogs: LogEntry[]) => {
    localStorage.setItem('debtEntries', JSON.stringify(entries));
    localStorage.setItem('logs', JSON.stringify(newLogs));
  };

  const addLog = (action: 'create' | 'update' | 'delete', entryId: string, details: string) => {
    const newLog: LogEntry = {
      timestamp: Date.now(),
      action,
      entryId,
      details
    };
    const updatedLogs = [...logs, newLog];
    setLogs(updatedLogs);
    return updatedLogs;
  };

  const handleAdminLogin = () => {
    if (password === 'IB0o') {
      localStorage.setItem('adminKey', 'IB0o');
      setIsAdmin(true);
      setCurrentView('home');
      toast({
        title: "Access granted",
        description: "Welcome to admin panel",
      });
    } else {
      toast({
        title: "Access denied",
        description: "Invalid password",
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

    let updatedEntries: DebtEntry[];
    let logDetails: string;

    if (editingEntry) {
      updatedEntries = debtEntries.map(e => e.id === editingEntry.id ? entry : e);
      logDetails = `Updated debt entry for ${entry.personName} - €${entry.amount}`;
      const newLogs = addLog('update', entry.id, logDetails);
      saveData(updatedEntries, newLogs);
      toast({
        title: "Entry updated",
        description: logDetails,
      });
    } else {
      updatedEntries = [...debtEntries, entry];
      logDetails = `Created debt entry for ${entry.personName} - €${entry.amount}`;
      const newLogs = addLog('create', entry.id, logDetails);
      saveData(updatedEntries, newLogs);
      toast({
        title: "Entry created",
        description: logDetails,
      });
    }

    setDebtEntries(updatedEntries);
    setCurrentView('list');
    setEditingEntry(null);
    setFormData({
      personName: '',
      product: 'Fruit',
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
    const newLogs = addLog('delete', entry.id, logDetails);
    
    setDebtEntries(updatedEntries);
    saveData(updatedEntries, newLogs);
    
    toast({
      title: "Entry deleted",
      description: logDetails,
    });
  };

  // Login/Lookup View (Non-admin)
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
        <div className="max-w-md mx-auto space-y-6 pt-20">
          <div className="text-center mb-8">
            <Package className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Produce Debt Tracker</h1>
            <p className="text-blue-200">Fresh fruits & vegetables business</p>
          </div>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Search className="w-5 h-5" />
                Lookup Your Debt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Enter your 6-character ID"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
                maxLength={6}
              />
              <Button onClick={handleLookup} className="w-full bg-blue-600 hover:bg-blue-700">
                Search
              </Button>
              
              {lookupResult && (
                <Card className="bg-slate-700/50 border-slate-600 mt-4">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-200">Name:</span>
                        <span className="text-white font-medium">{lookupResult.personName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-blue-200">Product:</span>
                        <Badge variant={lookupResult.product === 'Fruit' ? 'default' : 'secondary'}>
                          {lookupResult.product}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-blue-200">Amount:</span>
                        <span className="text-white font-bold">€{lookupResult.amount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-blue-200">Date:</span>
                        <span className="text-white">{lookupResult.date}</span>
                      </div>
                      {lookupResult.dueDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-blue-200">Due:</span>
                          <span className="text-white">{lookupResult.dueDate}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="Admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
                />
                <Button onClick={handleAdminLogin} variant="outline" className="w-full">
                  Admin Access
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
    <nav className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-8 h-8 text-blue-400" />
            <h1 className="text-xl font-bold text-white">Debt Tracker</h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant={currentView === 'home' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('home')}
            >
              Home
            </Button>
            <Button
              variant={currentView === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentView('list')}
            >
              Debts
            </Button>
            <Button
              variant={currentView === 'form' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setCurrentView('form'); setEditingEntry(null); }}
            >
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );

  const renderHome = () => (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Debts</p>
                <p className="text-3xl font-bold text-white">{debtEntries.length}</p>
              </div>
              <FileText className="w-12 h-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-600 to-green-700 border-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Total Amount</p>
                <p className="text-3xl font-bold text-white">
                  €{debtEntries.reduce((sum, entry) => sum + entry.amount, 0).toFixed(2)}
                </p>
              </div>
              <Euro className="w-12 h-12 text-green-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Recent Logs</p>
                <p className="text-3xl font-bold text-white">{logs.length}</p>
              </div>
              <Calendar className="w-12 h-12 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Debts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {debtEntries.slice(-5).reverse().map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{entry.personName}</p>
                    <p className="text-slate-400 text-sm">{entry.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">€{entry.amount}</p>
                    <Badge variant={entry.product === 'Fruit' ? 'default' : 'secondary'} className="text-xs">
                      {entry.product}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.slice(-5).reverse().map((log, index) => (
                <div key={index} className="p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-white text-sm">{log.details}</p>
                  <p className="text-slate-400 text-xs">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderList = () => (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Debt Entries</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <Input
              placeholder="Search by name, amount, or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
            <Button onClick={() => { setCurrentView('form'); setEditingEntry(null); }}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEntries.map((entry) => (
          <Card key={entry.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-bold">{entry.personName}</h3>
                  <p className="text-slate-400 text-sm">ID: {entry.id}</p>
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
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Product:</span>
                  <Badge variant={entry.product === 'Fruit' ? 'default' : 'secondary'}>
                    {entry.product}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Amount:</span>
                  <span className="text-white font-bold">€{entry.amount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Quantity:</span>
                  <span className="text-white">{entry.quantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Date:</span>
                  <span className="text-white">{entry.date}</span>
                </div>
                {entry.dueDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Due:</span>
                    <span className="text-white">{entry.dueDate}</span>
                  </div>
                )}
                {entry.note && (
                  <div className="mt-2 p-2 bg-slate-700/50 rounded">
                    <p className="text-slate-300 text-sm">{entry.note}</p>
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
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">
            {editingEntry ? 'Edit Debt Entry' : 'New Debt Entry'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-white text-sm font-medium">Person Name *</label>
                <Input
                  value={formData.personName}
                  onChange={(e) => setFormData({...formData, personName: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
              
              <div>
                <label className="text-white text-sm font-medium">Product *</label>
                <select
                  value={formData.product}
                  onChange={(e) => setFormData({...formData, product: e.target.value as 'Fruit' | 'Vegetable'})}
                  className="w-full p-2 bg-slate-700 border border-slate-600 text-white rounded-md"
                  required
                >
                  <option value="Fruit">Fruit</option>
                  <option value="Vegetable">Vegetable</option>
                </select>
              </div>
              
              <div>
                <label className="text-white text-sm font-medium">Quantity *</label>
                <Input
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="e.g., 2kg, 5 pieces"
                  required
                />
              </div>
              
              <div>
                <label className="text-white text-sm font-medium">Amount (€) *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>
              
              <div>
                <label className="text-white text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              
              <div>
                <label className="text-white text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            <div>
              <label className="text-white text-sm font-medium">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Location or coordinates"
              />
            </div>
            
            <div>
              <label className="text-white text-sm font-medium">Note</label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                className="w-full p-2 bg-slate-700 border border-slate-600 text-white rounded-md"
                rows={3}
                placeholder="Additional notes..."
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                {editingEntry ? 'Update Entry' : 'Create Entry'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCurrentView('list')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {renderNavigation()}
      {currentView === 'home' && renderHome()}
      {currentView === 'list' && renderList()}
      {currentView === 'form' && renderForm()}
    </div>
  );
};

export default DebtTrackingApp;
