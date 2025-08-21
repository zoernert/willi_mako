# Anleitung: Integration der verknüpften Klärfälle in Chat- und Notiz-Komponenten

## Übersicht

Diese Anleitung beschreibt, wie die neue `LinkedClarifications`-Komponente in die bestehenden Chat- und Notiz-Komponenten integriert wird, um anzuzeigen, wenn ein Chat oder eine Notiz mit einem Klärfall verknüpft ist.

## Voraussetzungen

- Die neue `LinkedClarifications`-Komponente wurde implementiert
- Die Backend-Routen zum Abrufen verknüpfter Klärfälle wurden erstellt
- Die Frontend-Services wurden entsprechend erweitert

## Integration in die Chat-Komponente

1. Öffnen Sie die Hauptchat-Komponente (z.B. `/app-legacy/src/components/Chat/ChatDetail.tsx` oder ähnlich)

2. Importieren Sie die neue Komponente:
   ```tsx
   import { LinkedClarifications } from '../BilateralClarifications/LinkedClarifications';
   ```

3. Fügen Sie die Komponente an geeigneter Stelle ein, zum Beispiel unterhalb der Chat-Header-Informationen:
   ```tsx
   {/* Chat-Header und Informationen */}
   <ChatHeader title={chatTitle} participants={participants} />
   
   {/* Verknüpfte Klärfälle anzeigen */}
   <LinkedClarifications 
     sourceType="CHAT"
     sourceId={chatId}
     onNavigate={() => {
       // Optional: Chat-Fenster schließen oder andere Aktionen
     }}
   />
   
   {/* Chat-Nachrichten */}
   <ChatMessages messages={messages} />
   ```

## Integration in die Notiz-Komponente

1. Öffnen Sie die Notiz-Detail-Komponente (z.B. `/app-legacy/src/components/Notes/NoteDetail.tsx` oder ähnlich)

2. Importieren Sie die neue Komponente:
   ```tsx
   import { LinkedClarifications } from '../BilateralClarifications/LinkedClarifications';
   ```

3. Fügen Sie die Komponente an geeigneter Stelle ein, zum Beispiel nach dem Notizinhalt:
   ```tsx
   {/* Notiz-Inhalt */}
   <NoteContent content={note.content} />
   
   {/* Tags und Metadaten */}
   <NoteTags tags={note.tags} />
   
   {/* Verknüpfte Klärfälle anzeigen */}
   <LinkedClarifications 
     sourceType="NOTE"
     sourceId={note.id}
     onNavigate={() => {
       // Optional: Notiz-Fenster schließen oder andere Aktionen
     }}
   />
   ```

## Testen

Nach der Integration sollten Sie die Funktionalität testen:

1. Erstellen Sie einen neuen Klärfall im Status "INTERNAL"
2. Fügen Sie einen Chat als Kontext hinzu
3. Fügen Sie eine Notiz als Kontext hinzu
4. Öffnen Sie den Chat und prüfen Sie, ob der verknüpfte Klärfall angezeigt wird
5. Öffnen Sie die Notiz und prüfen Sie, ob der verknüpfte Klärfall angezeigt wird
6. Klicken Sie auf den verknüpften Klärfall, um zu überprüfen, ob die Navigation funktioniert

## Hinweis

Die `LinkedClarifications`-Komponente zeigt nichts an, wenn keine verknüpften Klärfälle vorhanden sind, sodass sie in der Benutzeroberfläche nur sichtbar wird, wenn tatsächlich Verknüpfungen bestehen.
