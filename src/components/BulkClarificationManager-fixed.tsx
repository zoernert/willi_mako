import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  FileText,
  Loader2
} from 'lucide-react';

interface BulkClarificationItem {
  id?: string;
  itemIndex: number;
  title: string;
  description: string;
  referenceData: Record<string, any>;
  status: 'offen' | 'in_bearbeitung' | 'wartet_auf_antwort' | 'abgeschlossen';
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface BulkClarification {
  id?: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  teamId: string;
  marketPartnerId?: string;
  items: BulkClarificationItem[];
  createdAt?: string;
  createdBy?: string;
}

interface BulkClarificationManagerProps {
  clarificationId?: string;
  teamId: string;
  onSave?: (clarification: BulkClarification) => void;
  readOnly?: boolean;
}

const BulkClarificationManager: React.FC<BulkClarificationManagerProps> = ({
  clarificationId,
  teamId,
  onSave,
  readOnly = false
}) => {
  const [clarification, setClarification] = useState<BulkClarification>({
    title: '',
    description: '',
    category: 'general',
    priority: 'normal',
    teamId,
    items: []
  });

  const [items, setItems] = useState<BulkClarificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<BulkClarificationItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [newItem, setNewItem] = useState<Partial<BulkClarificationItem>>({
    title: '',
    description: '',
    referenceData: {},
    status: 'offen'
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const [stats, setStats] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    if (clarificationId) {
      loadClarification();
      loadItems();
    }
  }, [clarificationId, pagination.page, statusFilter]);

  const loadClarification = async () => {
    if (!clarificationId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/clarifications/${clarificationId}`);
      if (response.ok) {
        const data = await response.json();
        setClarification(data);
      } else {
        setError('Fehler beim Laden der Bulk-Klärung');
      }
    } catch (err) {
      setError('Netzwerkfehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    if (!clarificationId) return;

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(statusFilter && { status: statusFilter })
      });

      const response = await fetch(`/api/clarifications/${clarificationId}/bulk-items?${params}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
        setPagination(data.pagination);
        setStats(data.stats);
      } else {
        setError('Fehler beim Laden der Einträge');
      }
    } catch (err) {
      setError('Netzwerkfehler beim Laden der Einträge');
    }
  };

  const handleSave = async () => {
    if (!clarification.title || clarification.items.length === 0) {
      setError('Titel und mindestens ein Eintrag sind erforderlich');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/clarifications/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clarification),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (onSave) {
          onSave(result.clarification);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Fehler beim Speichern');
      }
    } catch (err) {
      setError('Netzwerkfehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = () => {
    if (!newItem.title) {
      setError('Titel ist erforderlich');
      return;
    }

    const item: BulkClarificationItem = {
      itemIndex: clarification.items.length + 1,
      title: newItem.title!,
      description: newItem.description || '',
      referenceData: newItem.referenceData || {},
      status: newItem.status as any || 'offen'
    };

    setClarification(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));

    setNewItem({
      title: '',
      description: '',
      referenceData: {},
      status: 'offen'
    });

    setShowAddDialog(false);
    setError(null);
  };

  const handleRemoveItem = (index: number) => {
    setClarification(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index).map((item, i) => ({
        ...item,
        itemIndex: i + 1
      }))
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'abgeschlossen':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_bearbeitung':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'wartet_auf_antwort':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'abgeschlossen':
        return 'default';
      case 'in_bearbeitung':
        return 'secondary';
      case 'wartet_auf_antwort':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      {!clarificationId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Neue Bulk-Klärung erstellen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Titel</label>
                <Input
                  value={clarification.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setClarification(prev => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Titel der Bulk-Klärung"
                  disabled={readOnly}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kategorie</label>
                <Select
                  value={clarification.category}
                  onValueChange={(value: string) =>
                    setClarification(prev => ({ ...prev, category: value }))
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Allgemein</SelectItem>
                    <SelectItem value="billing">Abrechnung</SelectItem>
                    <SelectItem value="supplier_change">Lieferantenwechsel</SelectItem>
                    <SelectItem value="metering">Messstellenbetrieb</SelectItem>
                    <SelectItem value="technical">Technisch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Beschreibung</label>
              <Textarea
                value={clarification.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setClarification(prev => ({ ...prev, description: e.target.value }))
                }
                placeholder="Beschreibung der Bulk-Klärung"
                rows={3}
                disabled={readOnly}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {clarificationId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {clarification.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-600">
                  {stats.offen || 0}
                </div>
                <div className="text-sm text-gray-800">Offen</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.in_bearbeitung || 0}
                </div>
                <div className="text-sm text-blue-800">In Bearbeitung</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.wartet_auf_antwort || 0}
                </div>
                <div className="text-sm text-yellow-800">Wartet auf Antwort</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {stats.abgeschlossen || 0}
                </div>
                <div className="text-sm text-green-800">Abgeschlossen</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Einträge ({clarificationId ? pagination.total : clarification.items.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              {!readOnly && !clarificationId && (
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Eintrag hinzufügen
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Neuen Eintrag hinzufügen</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Titel *</label>
                        <Input
                          value={newItem.title || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setNewItem(prev => ({ ...prev, title: e.target.value }))
                          }
                          placeholder="Titel des Eintrags"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Beschreibung</label>
                        <Textarea
                          value={newItem.description || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setNewItem(prev => ({ ...prev, description: e.target.value }))
                          }
                          placeholder="Beschreibung"
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowAddDialog(false)}
                        >
                          Abbrechen
                        </Button>
                        <Button onClick={handleAddItem}>
                          Hinzufügen
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Items List */}
          <div className="space-y-2">
            {(clarificationId ? items : clarification.items).map((item, index) => (
              <div key={item.id || index} className="flex items-center gap-4 p-3 border rounded hover:bg-gray-50">
                <div className="flex-1">
                  <div className="font-medium">{item.title}</div>
                  {item.description && (
                    <div className="text-sm text-gray-600 truncate">{item.description}</div>
                  )}
                </div>

                <div className="w-32">
                  <Badge variant={getStatusBadgeVariant(item.status) as any} className="text-xs">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(item.status)}
                      {item.status.replace('_', ' ')}
                    </div>
                  </Badge>
                </div>

                <div className="w-20 flex gap-1">
                  {!readOnly && !clarificationId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {(clarificationId ? items : clarification.items).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Noch keine Einträge vorhanden
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {!clarificationId && !readOnly && (
        <div className="flex justify-end gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Bulk-Klärung erstellen
          </Button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default BulkClarificationManager;
