import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, TestTube, Mail, Settings, CheckCircle, XCircle } from 'lucide-react';

interface TeamEmailConfig {
  teamId: string;
  teamName: string;
  autoProcessingEnabled: boolean;
  imapHost: string;
  imapPort: number;
  imapUseSSL: boolean;
  imapUsername: string;
  outboundEmailAddress: string;
  processingRules: Record<string, any>;
  lastProcessedUid?: string;
  lastProcessedAt?: string;
  status?: string;
}

interface ProcessingStatus {
  teamId: string;
  imapConnected: boolean;
  queueStats: Record<string, number>;
  recentEmails: any[];
  lastUpdate: string;
}

interface TeamEmailConfigProps {
  teamId: string;
  onSave?: (config: TeamEmailConfig) => void;
}

const TeamEmailConfig: React.FC<TeamEmailConfigProps> = ({ teamId, onSave }) => {
  const [config, setConfig] = useState<TeamEmailConfig>({
    teamId,
    teamName: '',
    autoProcessingEnabled: false,
    imapHost: '',
    imapPort: 993,
    imapUseSSL: true,
    imapUsername: '',
    outboundEmailAddress: '',
    processingRules: {}
  });

  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [imapPassword, setImapPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
    loadStatus();
    
    // Refresh status every 30 seconds
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, [teamId]);

  const loadConfig = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/email-config`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      } else {
        setError('Fehler beim Laden der Konfiguration');
      }
    } catch (err) {
      setError('Netzwerkfehler beim Laden der Konfiguration');
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/email-processing/status`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Error loading status:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const saveData = {
        ...config,
        imapPassword: imapPassword || undefined
      };

      const response = await fetch(`/api/teams/${teamId}/email-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });

      if (response.ok) {
        const result = await response.json();
        setConfig(result.config);
        setImapPassword(''); // Clear password after save
        
        if (onSave) {
          onSave(result.config);
        }
        
        // Reload status after save
        setTimeout(loadStatus, 2000);
        
        setTestResult({ success: true, message: 'Konfiguration erfolgreich gespeichert' });
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

  const handleTest = async () => {
    if (!config.imapHost || !config.imapUsername || !imapPassword) {
      setTestResult({ 
        success: false, 
        message: 'Host, Benutzername und Passwort sind für den Test erforderlich' 
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`/api/teams/${teamId}/email-config/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imapHost: config.imapHost,
          imapPort: config.imapPort,
          imapUseSSL: config.imapUseSSL,
          imapUsername: config.imapUsername,
          imapPassword: imapPassword,
        }),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (err) {
      setTestResult({ 
        success: false, 
        message: 'Netzwerkfehler beim Testen der Verbindung' 
      });
    } finally {
      setTesting(false);
    }
  };

  const handleRetryFailed = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}/email-processing/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult({ success: true, message: result.message });
        setTimeout(loadStatus, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error);
      }
    } catch (err) {
      setError('Fehler beim Wiederholen der Verarbeitung');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className=\"flex items-center justify-center p-8\">
          <Loader2 className=\"h-8 w-8 animate-spin\" />
          <span className=\"ml-2\">Lade Konfiguration...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className=\"space-y-6\">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className=\"flex items-center gap-2\">
            <Settings className=\"h-5 w-5\" />
            E-Mail-Konfiguration für {config.teamName || 'Team'}
          </CardTitle>
        </CardHeader>
        <CardContent className=\"space-y-6\">
          {/* Enable/Disable */}
          <div className=\"flex items-center justify-between\">
            <div>
              <label className=\"text-sm font-medium\">Automatische E-Mail-Verarbeitung</label>
              <p className=\"text-xs text-gray-500\">
                Aktiviert die automatische Überwachung des IMAP-Postfachs
              </p>
            </div>
            <Switch
              checked={config.autoProcessingEnabled}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, autoProcessingEnabled: checked }))
              }
            />
          </div>

          {/* IMAP Configuration */}
          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
            <div>
              <label className=\"text-sm font-medium\">IMAP-Host</label>
              <Input
                value={config.imapHost}
                onChange={(e) => setConfig(prev => ({ ...prev, imapHost: e.target.value }))}
                placeholder=\"imap.example.com\"
              />
            </div>
            <div>
              <label className=\"text-sm font-medium\">Port</label>
              <Input
                type=\"number\"
                value={config.imapPort}
                onChange={(e) => setConfig(prev => ({ ...prev, imapPort: parseInt(e.target.value) || 993 }))}
              />
            </div>
            <div>
              <label className=\"text-sm font-medium\">Benutzername</label>
              <Input
                value={config.imapUsername}
                onChange={(e) => setConfig(prev => ({ ...prev, imapUsername: e.target.value }))}
                placeholder=\"email@example.com\"
              />
            </div>
            <div>
              <label className=\"text-sm font-medium\">Passwort</label>
              <div className=\"relative\">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={imapPassword}
                  onChange={(e) => setImapPassword(e.target.value)}
                  placeholder=\"Nur bei Änderung eingeben\"
                />
                <Button
                  type=\"button\"
                  variant=\"ghost\"
                  size=\"sm\"
                  className=\"absolute right-0 top-0 h-full px-3\"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </Button>
              </div>
            </div>
          </div>

          <div className=\"flex items-center gap-2\">
            <Switch
              checked={config.imapUseSSL}
              onCheckedChange={(checked) => 
                setConfig(prev => ({ ...prev, imapUseSSL: checked }))
              }
            />
            <label className=\"text-sm font-medium\">SSL/TLS verwenden</label>
          </div>

          {/* Outbound Email */}
          <div>
            <label className=\"text-sm font-medium\">Absender-E-Mail-Adresse</label>
            <Input
              value={config.outboundEmailAddress}
              onChange={(e) => setConfig(prev => ({ ...prev, outboundEmailAddress: e.target.value }))}
              placeholder=\"team@example.com\"
            />
            <p className=\"text-xs text-gray-500 mt-1\">
              E-Mail-Adresse für ausgehende Klärfall-Nachrichten
            </p>
          </div>

          {/* Action Buttons */}
          <div className=\"flex gap-2\">
            <Button onClick={handleTest} disabled={testing} variant=\"outline\">
              {testing ? (
                <Loader2 className=\"h-4 w-4 animate-spin mr-2\" />
              ) : (
                <TestTube className=\"h-4 w-4 mr-2\" />
              )}
              Verbindung testen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className=\"h-4 w-4 animate-spin mr-2\" />
              ) : (
                <Settings className=\"h-4 w-4 mr-2\" />
              )}
              Speichern
            </Button>
          </div>

          {/* Test Result */}
          {testResult && (
            <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className=\"flex items-center gap-2\">
                {testResult.success ? (
                  <CheckCircle className=\"h-4 w-4 text-green-600\" />
                ) : (
                  <XCircle className=\"h-4 w-4 text-red-600\" />
                )}
                <AlertDescription>{testResult.message}</AlertDescription>
              </div>
            </Alert>
          )}

          {/* Error Alert */}
          {error && (
            <Alert className=\"border-red-200 bg-red-50\">
              <XCircle className=\"h-4 w-4 text-red-600\" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Status Card */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className=\"flex items-center gap-2\">
              <Mail className=\"h-5 w-5\" />
              E-Mail-Verarbeitungsstatus
              <Badge variant={status.imapConnected ? 'default' : 'destructive'}>
                {status.imapConnected ? 'Verbunden' : 'Getrennt'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className=\"space-y-4\">
            {/* Queue Statistics */}
            <div>
              <h4 className=\"font-medium mb-2\">Verarbeitungsstatistiken (24h)</h4>
              <div className=\"grid grid-cols-2 md:grid-cols-4 gap-4\">
                <div className=\"text-center p-3 bg-blue-50 rounded\">
                  <div className=\"text-2xl font-bold text-blue-600\">
                    {status.queueStats.PENDING || 0}
                  </div>
                  <div className=\"text-sm text-blue-800\">Warteschlange</div>
                </div>
                <div className=\"text-center p-3 bg-green-50 rounded\">
                  <div className=\"text-2xl font-bold text-green-600\">
                    {status.queueStats.COMPLETED || 0}
                  </div>
                  <div className=\"text-sm text-green-800\">Erfolgreich</div>
                </div>
                <div className=\"text-center p-3 bg-red-50 rounded\">
                  <div className=\"text-2xl font-bold text-red-600\">
                    {status.queueStats.FAILED || 0}
                  </div>
                  <div className=\"text-sm text-red-800\">Fehlgeschlagen</div>
                </div>
                <div className=\"text-center p-3 bg-gray-50 rounded\">
                  <div className=\"text-2xl font-bold text-gray-600\">
                    {status.queueStats.SKIPPED || 0}
                  </div>
                  <div className=\"text-sm text-gray-800\">Übersprungen</div>
                </div>
              </div>
            </div>

            {/* Retry Failed Button */}
            {(status.queueStats.FAILED || 0) > 0 && (
              <Button onClick={handleRetryFailed} variant=\"outline\" size=\"sm\">
                Fehlgeschlagene E-Mails wiederholen ({status.queueStats.FAILED})
              </Button>
            )}

            {/* Recent Emails */}
            {status.recentEmails.length > 0 && (
              <div>
                <h4 className=\"font-medium mb-2\">Letzte E-Mails</h4>
                <div className=\"space-y-2\">
                  {status.recentEmails.slice(0, 5).map((email, index) => (
                    <div key={index} className=\"flex items-center justify-between p-2 bg-gray-50 rounded text-sm\">
                      <div className=\"flex-1 truncate\">
                        <div className=\"font-medium truncate\">{email.email_subject}</div>
                        <div className=\"text-gray-500 truncate\">{email.email_from}</div>
                      </div>
                      <div className=\"flex items-center gap-2\">
                        <Badge 
                          variant={
                            email.processing_status === 'COMPLETED' ? 'default' :
                            email.processing_status === 'FAILED' ? 'destructive' :
                            email.processing_status === 'PENDING' ? 'secondary' : 'outline'
                          }
                          className=\"text-xs\"
                        >
                          {email.processing_status}
                        </Badge>
                        {email.clarification_title && (
                          <span className=\"text-xs text-blue-600 truncate max-w-32\">
                            → {email.clarification_title}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className=\"text-xs text-gray-500\">
              Letztes Update: {new Date(status.lastUpdate).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamEmailConfig;
