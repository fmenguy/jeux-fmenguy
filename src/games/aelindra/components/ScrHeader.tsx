/* ============================================
   AELINDRA · components/ScrHeader.tsx
   En-tête partagé avec bouton retour + titre + monnaies
   ============================================ */

import { Icon } from './Icons';

interface ScrHeaderProps {
  title: string;
  gold?: number | null;
  orb?: number | null;
  onBack?: () => void;
}

export function ScrHeader({ title, gold, orb, onBack }: ScrHeaderProps) {
  return (
    <div className="sh">
      <button className="bk" onClick={onBack}>
        <Icon id="back" className="ico" /> RETOUR
      </button>
      <div className="st">{title}</div>
      {gold != null && (
        <div className="scurr curr--gold">
          <Icon id="coin" className="ico sym sym--gold" />
          <span className="val">{gold}</span>
        </div>
      )}
      {orb != null && (
        <div className="scurr curr--orb">
          <Icon id="orb" className="ico sym sym--orb" />
          <span className="val">{orb}</span>
        </div>
      )}
      {gold == null && orb == null && <div style={{ width: 24 }} />}
    </div>
  );
}
