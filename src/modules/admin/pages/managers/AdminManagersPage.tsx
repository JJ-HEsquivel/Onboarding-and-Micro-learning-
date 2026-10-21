import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useCurrentUser } from '@/app/session/useSession';
import { Alert } from '@/shared/components/Alert';
import { Avatar } from '@/shared/components/Avatar';
import { Button } from '@/shared/components/Button';
import { Modal } from '@/shared/components/Modal';
import { PageHeader } from '@/shared/components/PageHeader';
import { StatCard } from '@/shared/components/StatCard';
import { PROGRAM_RULES } from '@/shared/constants/program';
import { useAsync } from '@/shared/hooks/useAsync';
import { getInitials } from '@/shared/lib/format';
import {
  loadManagersOverview,
  revertPromotion,
  type ManagerSummary,
  type PromotionCandidate,
} from '@/services/promotion.service';
import { CandidatesTable } from './components/CandidatesTable';
import { ManagersTable } from './components/ManagersTable';
import { PromoteModal } from './components/PromoteModal';
import { TransferTeamModal } from './components/TransferTeamModal';
import './AdminManagersPage.css';

type Dialog =
  | { kind: 'promote'; candidate: PromotionCandidate }
  | { kind: 'transfer'; manager: ManagerSummary }
  | { kind: 'revert'; manager: ManagerSummary }
  | null;

const HOW_IT_WORKS = [
  [
    'Requisito',
    PROGRAM_RULES.requireCompletedOnboardingForPromotion
      ? 'El colaborador debe tener su inducción completada: todos sus documentos aprobados.'
      : 'Cualquier colaborador activo puede ascender.',
  ],
  ['Cuenta de Manager', 'Recibe el rol Manager: puede ingresar con ese perfil y aparece en «Manager responsable».'],
  ['Equipo', 'Puede recibir un equipo inicial: los colaboradores elegidos (y sus validaciones pendientes) pasan a reportarle.'],
  ['Historial', 'Su rol de Colaborador queda como historial y deja de contar en los indicadores. Se registra la evidencia del cambio.'],
] as const;

export default function AdminManagersPage() {
  const admin = useCurrentUser();
  const overview = useAsync(loadManagersOverview);
  const [dialog, setDialog] = useState<Dialog>(null);
  // "?ascender=<id>" abre el ascenso de ese colaborador (viene desde su ficha).
  const [searchParams, setSearchParams] = useSearchParams();
  const promoteParam = searchParams.get('ascender');
  const [notice, setNotice] = useState<string | null>(null);
  const [reverting, setReverting] = useState(false);
  const [revertError, setRevertError] = useState<string | null>(null);

  const data = overview.data;
  const close = () => {
    setDialog(null);
    if (promoteParam) setSearchParams({}, { replace: true });
  };
  const linkedCandidate = promoteParam ? data?.candidates.find((c) => c.id === promoteParam && !c.ineligibleReason) : undefined;
  const activeDialog: Dialog = dialog ?? (linkedCandidate ? { kind: 'promote', candidate: linkedCandidate } : null);
  const done = (message: string) => {
    close();
    setNotice(message);
    overview.reload();
  };

  const handleRevert = async (manager: ManagerSummary) => {
    setReverting(true);
    setRevertError(null);
    try {
      await revertPromotion(manager, admin);
      done(`${manager.fullName} vuelve a ingresar como colaborador.`);
    } catch (err) {
      setRevertError(err instanceof Error ? err.message : String(err));
    } finally {
      setReverting(false);
    }
  };

  const eligible = data?.candidates.filter((c) => !c.ineligibleReason).length ?? 0;
  const promoted = data?.managers.filter((m) => m.origin === 'promotion').length ?? 0;

  return (
    <>
      <PageHeader
        title="Managers y ascensos"
        description="Quién gestiona equipos, quién puede ascender a Manager y cómo se transfieren los equipos."
      />

      <div className="managers-page">
        {notice && (
          <Alert tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        )}
        {overview.error && (
          <Alert tone="danger">
            No se pudo cargar la información. {overview.error.message}{' '}
            <Button variant="ghost" onClick={overview.reload}>
              Reintentar
            </Button>
          </Alert>
        )}
        {overview.loading && !data && <p className="page-loading">Cargando…</p>}

        {data && (
          <>
            <div className="managers-page__stats">
              <StatCard label="Administradores" value={data.admins.length} caption="Gestionan la plataforma y los ascensos" />
              <StatCard
                label="Managers"
                value={data.managers.length}
                caption={`${data.managers.length - promoted} base · ${promoted} por ascenso`}
              />
              <StatCard label="Elegibles para ascenso" value={eligible} caption="Con la inducción completada" />
              <StatCard label="Sin Manager válido" value={data.collaboratorsWithoutManager} caption="Colaboradores a reasignar" />
            </div>

            <section className="card managers-page__section">
              <h2>Cómo funciona un ascenso</h2>
              <p className="managers-page__subtitle">Solo un Administrador puede ascender a un colaborador</p>
              <ol className="how-it-works">
                {HOW_IT_WORKS.map(([title, detail], i) => (
                  <li key={title}>
                    <span className="how-it-works__number">{i + 1}</span>
                    <strong>{title}</strong>
                    <p>{detail}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="card">
              <header className="managers-page__header">
                <h2>Managers</h2>
                <p>Equipos a cargo y estado de su gente</p>
              </header>
              <ManagersTable
                managers={data.managers}
                onTransfer={(manager) => setDialog({ kind: 'transfer', manager })}
                onRevert={(manager) => {
                  setRevertError(null);
                  setDialog({ kind: 'revert', manager });
                }}
              />
            </section>

            <section className="card">
              <header className="managers-page__header">
                <h2>Candidatos a ascenso</h2>
                <p>Colaboradores registrados y si cumplen el requisito</p>
              </header>
              <CandidatesTable candidates={data.candidates} onPromote={(candidate) => setDialog({ kind: 'promote', candidate })} />
            </section>

            <section className="card managers-page__section">
              <h2>Administradores</h2>
              <p className="managers-page__subtitle">Cuentas con acceso total</p>
              <ul className="managers-page__admins">
                {data.admins.map((a) => (
                  <li key={a.id} className="person-cell">
                    <Avatar initials={getInitials(a.fullName)} size="sm" />
                    <div>
                      <p className="person-cell__name">{a.fullName}</p>
                      <p className="person-cell__subtitle">{a.jobTitle}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>

      {data && activeDialog?.kind === 'promote' && (
        <PromoteModal
          candidate={activeDialog.candidate}
          areas={data.areas}
          otherCollaborators={data.candidates.filter((c) => c.id !== activeDialog.candidate.id)}
          admin={admin}
          onClose={close}
          onPromoted={(name, teamSize) =>
            done(`${name} ya puede ingresar como Manager${teamSize ? ` con ${teamSize} colaborador(es) a cargo` : ''}.`)
          }
        />
      )}

      {data && activeDialog?.kind === 'transfer' && (
        <TransferTeamModal
          manager={activeDialog.manager}
          team={data.candidates.filter((c) => c.managerId === activeDialog.manager.id)}
          destinations={data.managers.filter((m) => m.id !== activeDialog.manager.id)}
          onClose={close}
          onTransferred={(count, destination) => done(`${count} colaborador(es) ahora reportan a ${destination}.`)}
        />
      )}

      {activeDialog?.kind === 'revert' && (
        <Modal
          title={`Revertir el ascenso de ${activeDialog.manager.fullName}`}
          description="Volverá a ingresar como colaborador con su cargo anterior."
          onClose={reverting ? () => undefined : close}
          footer={
            <>
              <Button variant="ghost" onClick={close} disabled={reverting}>
                Cancelar
              </Button>
              <Button onClick={() => handleRevert(activeDialog.manager)} disabled={reverting}>
                {reverting ? 'Revirtiendo…' : 'Revertir ascenso'}
              </Button>
            </>
          }
        >
          <p>Se cierra su rol de Manager y se reactiva su rol de Colaborador. El cambio queda registrado como evidencia.</p>
          {revertError && <Alert tone="danger">{revertError}</Alert>}
        </Modal>
      )}
    </>
  );
}
