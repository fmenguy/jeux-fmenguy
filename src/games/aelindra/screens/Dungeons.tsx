/* ============================================
   AELINDRA · screens/Dungeons.tsx
   Écran 02 : Liste des donjons
   ============================================ */

import { Icon } from '../components/Icons';
import { ScrHeader } from '../components/ScrHeader';

interface DungeonEntry {
  name: string;
  desc: string;
  tag: string;
  tagText: string;
  new?: boolean;
  icon: string;
  floor: string;
  state: 'tut' | 'open' | 'locked';
}

interface DungeonsProps {
  dungeons?: DungeonEntry[];
  gold?: number;
  onBack?: () => void;
  onEnterDungeon?: (dungeonName: string) => void;
}

export function Dungeons({
  dungeons = [],
  gold = 0,
  onBack,
  onEnterDungeon,
}: DungeonsProps) {
  return (
    <div className="scr on" id="s-dungeons">
      <ScrHeader title="DONJONS" gold={gold} onBack={onBack} />
      <div className="dlist">
        {dungeons.map((d, i) => (
          <div
            key={i}
            className={`dc ${d.state === 'tut' ? 'dc-tut' : ''} ${d.state === 'locked' ? 'dc-locked' : ''}`}
            onClick={() => d.state !== 'locked' && onEnterDungeon?.(d.name)}
          >
            <div className="dc-ic">
              <Icon id={d.icon} />
            </div>
            <div className="dc-inf">
              <div className="dc-nm">{d.name}</div>
              <div className="dc-ds">{d.desc}</div>
              <div className="tags">
                <span className={`tag ${d.tag}`}>{d.tagText}</span>
                <span className="tag tag-floor">{d.floor}</span>
                {d.state === 'tut' && (
                  <span className="tag tag-reward">+30 ◆ par palier</span>
                )}
              </div>
            </div>
            {d.new && (
              <span
                className="badge-new"
                style={{ position: 'absolute', top: 8, right: 8 }}
              >
                NOUVEAU
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
