/* ============================================
   AELINDRA · components/TopBar.tsx
   Barre du haut avec profil joueur + monnaies
   ============================================ */

import { Icon } from './Icons';

interface TopBarProps {
  name?: string;
  initial?: string;
  gold?: number;
  orb?: number;
}

export function TopBar({ name = 'Aldwyn', initial = 'A', gold = 320, orb = 64 }: TopBarProps) {
  return (
    <div className="topbar">
      <div className="pname-wrap">
        <div className="pav">{initial}</div>
        <span className="pnm">{name}</span>
        <Icon id="edit" className="ico edit-ico" />
      </div>
      <div className="currs">
        <div className="curr curr--gold">
          <Icon id="coin" className="ico sym sym--gold" />
          <span className="val">{gold}</span>
        </div>
        <div className="curr curr--orb">
          <Icon id="orb" className="ico sym sym--orb" />
          <span className="val">{orb}</span>
        </div>
      </div>
    </div>
  );
}
