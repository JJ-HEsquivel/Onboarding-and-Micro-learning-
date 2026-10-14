import { Award } from 'lucide-react';
import { Avatar } from '@/shared/components/Avatar';
import { Button } from '@/shared/components/Button';
import { CollaboratorStatusBadge } from '@/shared/components/CollaboratorStatusBadge';
import { getInitials } from '@/shared/lib/format';
import type { PromotionCandidate } from '@/services/promotion.service';

interface CandidatesTableProps {
  candidates: PromotionCandidate[];
  onPromote: (candidate: PromotionCandidate) => void;
}

export function CandidatesTable({ candidates, onPromote }: CandidatesTableProps) {
  if (candidates.length === 0) return <p className="managers-page__empty">Todavía no hay colaboradores registrados.</p>;

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th>Colaborador</th>
            <th>Área</th>
            <th>Manager actual</th>
            <th>Documentos</th>
            <th>Promedio</th>
            <th>Estado</th>
            <th>
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.id}>
              <td>
                <div className="person-cell">
                  <Avatar initials={getInitials(c.fullName)} size="sm" />
                  <div>
                    <p className="person-cell__name">{c.fullName}</p>
                    <p className="person-cell__subtitle">{c.jobTitle}</p>
                  </div>
                </div>
              </td>
              <td>{c.areaName}</td>
              <td>{c.managerName}</td>
              <td>
                {c.documentsApproved}/{c.documentsTotal}
              </td>
              <td>{c.averageScore === null ? '—' : `${c.averageScore}%`}</td>
              <td>
                <CollaboratorStatusBadge status={c.status} />
              </td>
              <td>
                {c.ineligibleReason ? (
                  <span className="managers-page__reason">{c.ineligibleReason}</span>
                ) : (
                  <Button onClick={() => onPromote(c)}>
                    <Award size={16} />
                    Ascender a Manager
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
