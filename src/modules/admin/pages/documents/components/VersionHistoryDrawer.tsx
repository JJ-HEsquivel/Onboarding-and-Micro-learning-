import { useCallback } from 'react';
import { FileText } from 'lucide-react';
import { Alert } from '@/shared/components/Alert';
import { Badge } from '@/shared/components/Badge';
import { Drawer } from '@/shared/components/Drawer';
import { useAsync } from '@/shared/hooks/useAsync';
import { formatDate } from '@/shared/lib/dates';
import type { ManagedDocument } from '@/shared/types/content';
import { listVersions } from '@/services/documentVersion.service';
import { CHANGE_LEVEL_LABEL, DOCUMENT_STATUS_LABEL } from '@/modules/admin/content/contentLabels';

interface VersionHistoryDrawerProps {
  document: ManagedDocument;
  onClose: () => void;
}

/** Historial de versiones de un documento (jsi_documentversion), de la más reciente a la más antigua. */
export function VersionHistoryDrawer({ document, onClose }: VersionHistoryDrawerProps) {
  const loadVersions = useCallback(() => listVersions(document.id), [document.id]);
  const versions = useAsync(loadVersions);
  const status = DOCUMENT_STATUS_LABEL[document.status];

  return (
    <Drawer
      title={document.title}
      leading={<FileText size={22} />}
      subtitle={
        <p className="doc-cell__meta">
          {document.code} · versión actual {document.version} · <Badge tone={status.tone}>{status.label}</Badge>
        </p>
      }
      onClose={onClose}
    >
      <h3 className="section-label">Historial de versiones</h3>
      {versions.loading && <p className="cell-muted">Cargando historial…</p>}
      {versions.error && <Alert tone="danger">No se pudo leer el historial. {versions.error.message}</Alert>}
      {versions.data?.length === 0 && (
        <p className="cell-muted">
          Este documento se cargó antes de que existiera el historial: su versión {document.version} es la primera registrada.
        </p>
      )}
      {versions.data && versions.data.length > 0 && (
        <ol className="version-history">
          {versions.data.map((entry) => (
            <li key={entry.id} className="version-history__item">
              <div className="version-history__header">
                <strong>v{entry.version}</strong>
                <Badge tone={entry.level === 'major' ? 'warning' : 'neutral'}>{CHANGE_LEVEL_LABEL[entry.level]}</Badge>
                <span className="cell-muted">{formatDate(entry.releaseDate)}</span>
              </div>
              {entry.details && <p>{entry.details}</p>}
            </li>
          ))}
        </ol>
      )}
    </Drawer>
  );
}
