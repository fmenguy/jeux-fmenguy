/* ============================================
   AELINDRA · components/TopBar.tsx
   Barre profil + monnaies — composant smart
   ============================================ */

import { useState } from 'react';
import { Icon } from './Icons';
import { useGameState } from '../state/GameContext';
import { PlayerModal } from './PlayerModal';

export function TopBar() {
  const state = useGameState();
  const [modalOpen, setModalOpen] = useState(false);

  const { playerName, gold, orbs, authUser } = state;
  const initial = playerName[0]?.toUpperCase() ?? 'A';

  return (
    <>
      <div className="topbar">
        <div className="pname-wrap" onClick={() => setModalOpen(true)} role="button" tabIndex={0}>
          <div className="pav">
            {authUser?.photoURL
              ? <img src={authUser.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : initial
            }
          </div>
          <span className="pnm">{playerName}</span>
          {authUser
            ? <span className="pav-synced" title="Sauvegarde cloud active">☁</span>
            : <Icon id="edit" className="ico edit-ico" />
          }
        </div>

        <div className="currs">
          <div className="curr curr--gold">
            <Icon id="coin" className="ico sym sym--gold" />
            <span className="val">{gold}</span>
          </div>
          <div className="curr curr--orb">
            <Icon id="orb" className="ico sym sym--orb" />
            <span className="val">{orbs}</span>
          </div>
        </div>
      </div>

      {modalOpen && <PlayerModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
