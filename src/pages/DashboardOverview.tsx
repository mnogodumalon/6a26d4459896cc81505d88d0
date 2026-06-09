import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichSchichtplan } from '@/lib/enrich';
import type { EnrichedSchichtplan } from '@/types/enriched';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconSun, IconMoon, IconUserPlus, IconUsers, IconCalendar, IconPencil, IconTrash } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { de } from 'date-fns/locale';
import { parseISO, format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import { CalendarWidget, type CalendarEvent } from '@/components/widgets/CalendarWidget';
import {
  RecordOverlay,
  RecordHeader,
  RecordSection,
  RecordField,
  RecordAttachments,
  useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { SchichtplanDialog } from '@/components/dialogs/SchichtplanDialog';
import { MitarbeitendeDialog } from '@/components/dialogs/MitarbeitendeDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { StatCard } from '@/components/StatCard';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

const APPGROUP_ID = '6a26d4459896cc81505d88d0';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const {
    schichtplan, mitarbeitende,
    mitarbeitendeMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedSchichtplan = enrichSchichtplan(schichtplan, { mitarbeitendeMap });

  // --- Dialog state ---
  const [schichtplanDialogOpen, setSchichtplanDialogOpen] = useState(false);
  const [editingSchicht, setEditingSchicht] = useState<EnrichedSchichtplan | null>(null);
  const [mitarbeitendeDialogOpen, setMitarbeitendeDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedSchichtplan | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);

  // --- Overlay ---
  const overlay = useRecordOverlayStack<{ type: string; id: string }>();

  // --- Calendar events ---
  const events = useMemo<CalendarEvent[]>(() => {
    const evs: CalendarEvent[] = [];
    for (const s of enrichedSchichtplan) {
      if (!s.fields.datum) continue;
      const dateStr = s.fields.datum.slice(0, 10);
      // Frühschicht 07:00–14:00
      evs.push({
        id: `frueh:${s.record_id}`,
        start: `${dateStr}T07:00`,
        end: `${dateStr}T14:00`,
        allDay: false,
        title: s.mitarbeiter_fruehschichtName || 'Frühschicht (unbesetzt)',
        subtitle: '07:00 – 14:00',
        tone: s.mitarbeiter_fruehschichtName ? 'primary' : 'warning',
      });
      // Spätschicht 14:00–21:00
      evs.push({
        id: `spaet:${s.record_id}`,
        start: `${dateStr}T14:00`,
        end: `${dateStr}T21:00`,
        allDay: false,
        title: s.mitarbeiter_spaetschichtName || 'Spätschicht (unbesetzt)',
        subtitle: '14:00 – 21:00',
        tone: s.mitarbeiter_spaetschichtName ? 'success' : 'warning',
      });
    }
    return evs;
  }, [enrichedSchichtplan]);

  // --- Stats ---
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const thisWeekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const thisWeekSchichten = enrichedSchichtplan.filter(s => {
    if (!s.fields.datum) return false;
    const d = parseISO(s.fields.datum.slice(0, 10));
    return thisWeekDates.some(wd => isSameDay(wd, d));
  });
  const besetzt = thisWeekSchichten.reduce((acc, s) => {
    if (s.mitarbeiter_fruehschichtName) acc++;
    if (s.mitarbeiter_spaetschichtName) acc++;
    return acc;
  }, 0);
  const totalSlots = thisWeekSchichten.length * 2;
  const unbesetzt = totalSlots - besetzt;
  const todaySchicht = enrichedSchichtplan.find(s => {
    if (!s.fields.datum) return false;
    return isToday(parseISO(s.fields.datum.slice(0, 10)));
  });

  // --- Handlers ---
  const handleEventClick = useCallback((ev: CalendarEvent) => {
    const [, id] = ev.id.split(':');
    overlay.replace({ type: 'schichtplan', id });
  }, [overlay]);

  const handleEmptyClick = useCallback((date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setDefaultDate(dateStr);
    setEditingSchicht(null);
    setSchichtplanDialogOpen(true);
  }, []);

  const handleEdit = useCallback((s: EnrichedSchichtplan) => {
    setEditingSchicht(s);
    setSchichtplanDialogOpen(true);
    overlay.close();
  }, [overlay]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteSchichtplanEntry(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  }, [deleteTarget, fetchAll]);

  // The overlay record
  const overlaySchicht = overlay.top
    ? enrichedSchichtplan.find(s => s.record_id === overlay.top!.id)
    : undefined;

  // ALL hooks above — now early returns are safe
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Mitarbeitende"
          value={String(mitarbeitende.length)}
          description="Gesamt"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Schichten diese Woche"
          value={String(totalSlots)}
          description={`${besetzt} besetzt, ${unbesetzt} offen`}
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Frühschicht heute"
          value={todaySchicht?.mitarbeiter_fruehschichtName || '—'}
          description="07:00 – 14:00"
          icon={<IconSun size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Spätschicht heute"
          value={todaySchicht?.mitarbeiter_spaetschichtName || '—'}
          description="14:00 – 21:00"
          icon={<IconMoon size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => { setEditingSchicht(null); setDefaultDate(undefined); setSchichtplanDialogOpen(true); }}
        >
          <IconCalendar size={14} className="mr-1.5 shrink-0" />
          Schicht planen
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setMitarbeitendeDialogOpen(true)}
        >
          <IconUserPlus size={14} className="mr-1.5 shrink-0" />
          Mitarbeiter erfassen
        </Button>
      </div>

      {/* Week calendar — board layout shows day-columns (one column per day) */}
      <div className="rounded-2xl overflow-hidden border border-border">
        <CalendarWidget
          events={events}
          defaultView="week"
          weekLayout="board"
          locale={de}
          dayStartHour={7}
          dayEndHour={21}
          weekStartsOn={1}
          views={['week', 'day', 'month', 'agenda']}
          onEventClick={handleEventClick}
          onEmptyClick={handleEmptyClick}
          renderEvent={(ev) => {
            const isFrueh = ev.id.startsWith('frueh:');
            return (
              <div className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md w-full ${
                ev.tone === 'primary'
                  ? 'bg-blue-500/15 text-blue-700'
                  : ev.tone === 'success'
                  ? 'bg-green-500/15 text-green-700'
                  : 'bg-amber-500/15 text-amber-700'
              }`}>
                {isFrueh
                  ? <IconSun size={12} className="shrink-0" />
                  : <IconMoon size={12} className="shrink-0" />}
                <span className="truncate">{ev.title}</span>
              </div>
            );
          }}
        />
      </div>

      {/* Mitarbeiterliste */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-secondary flex items-center justify-between">
          <h2 className="font-semibold text-sm">Mitarbeitende</h2>
          <span className="text-xs text-muted-foreground">{mitarbeitende.length} Einträge</span>
        </div>
        {mitarbeitende.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <IconUsers size={36} className="text-muted-foreground" stroke={1.5} />
            <p className="text-sm text-muted-foreground">Noch keine Mitarbeitenden erfasst</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {mitarbeitende.map(m => (
              <li key={m.record_id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {(m.fields.vorname?.[0] ?? '') + (m.fields.nachname?.[0] ?? '')}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{[m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ') || '—'}</p>
                  {m.fields.bemerkung && <p className="text-xs text-muted-foreground truncate">{m.fields.bemerkung}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dialogs */}
      <SchichtplanDialog
        open={schichtplanDialogOpen}
        onClose={() => { setSchichtplanDialogOpen(false); setEditingSchicht(null); setDefaultDate(undefined); }}
        onSubmit={async (fields) => {
          if (editingSchicht) {
            await LivingAppsService.updateSchichtplanEntry(editingSchicht.record_id, fields);
          } else {
            await LivingAppsService.createSchichtplanEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editingSchicht
          ? editingSchicht.fields
          : defaultDate
            ? { datum: defaultDate }
            : undefined}
        recordId={editingSchicht?.record_id}
        mitarbeitendeList={mitarbeitende}
        enablePhotoScan={AI_PHOTO_SCAN['Schichtplan']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Schichtplan']}
      />

      <MitarbeitendeDialog
        open={mitarbeitendeDialogOpen}
        onClose={() => setMitarbeitendeDialogOpen(false)}
        onSubmit={async (fields) => {
          await LivingAppsService.createMitarbeitendeEntry(fields);
          fetchAll();
        }}
        enablePhotoScan={AI_PHOTO_SCAN['Mitarbeitende']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Mitarbeitende']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Schicht löschen"
        description={`Schicht am ${deleteTarget ? formatDate(deleteTarget.fields.datum) : ''} wirklich löschen?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Record overlay on event click */}
      <RecordOverlay open={overlay.open} onClose={overlay.close} ariaLabel="Schicht">
        {overlaySchicht && (
          <>
            <RecordHeader
              title={formatDate(overlaySchicht.fields.datum)}
              subtitle="Rezeption"
              meta={
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(overlaySchicht)}>
                    <IconPencil size={14} className="mr-1 shrink-0" /> Bearbeiten
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setDeleteTarget(overlaySchicht); overlay.close(); }}>
                    <IconTrash size={14} className="mr-1 shrink-0 text-destructive" />
                    <span className="text-destructive">Löschen</span>
                  </Button>
                </div>
              }
            />
            <RecordSection title="Schichten" cols={2}>
              <RecordField
                label="Frühschicht (07:00–14:00)"
                value={overlaySchicht.mitarbeiter_fruehschichtName || '—'}
              />
              <RecordField
                label="Spätschicht (14:00–21:00)"
                value={overlaySchicht.mitarbeiter_spaetschichtName || '—'}
              />
            </RecordSection>
            {overlaySchicht.fields.notiz && (
              <RecordSection title="Notiz">
                <RecordField label="Notiz" value={overlaySchicht.fields.notiz} />
              </RecordSection>
            )}
            <RecordAttachments appId={APP_IDS.SCHICHTPLAN} recordId={overlaySchicht.record_id} />
          </>
        )}
      </RecordOverlay>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-44" />
      </div>
      <Skeleton className="h-96 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
