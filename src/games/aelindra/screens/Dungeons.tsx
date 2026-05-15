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

const MOCK_DUNGEONS: DungeonEntry[] = [
  {
    name: 'Le Gouffre des Origines',
    desc: 'Cinq paliers dans les profondeurs. Un héros offert à chaque descente.',
    tag: 'tag-tuto',
    tagText: 'TUTORIEL',
    new: true,
    icon: 'dungeon',
    floor: 'Palier IV',
    state: 'tut',
  },
  {
    name: 'Forêt Maudite',
    desc: '8 étages · Ennemis sylvestres. Requiert Palier I du Gouffre.',
    tag: 'tag-floor',
    tagText: '8 ÉTAGES',
    icon: 'rune',
    floor: '0 / 8',
    state: 'open',
  },
  {
    name: 'Mines de Fer Noir',
    desc: '10 étages · Golems et créatures de pierre. Palier II requis.',
    tag: 'tag-floor',
    tagText: '10 ÉTAGES',
    icon: 'rune',
    floor: '—',
    state: 'open',
  },
  {
    name: 'Tour des Ombres',
    desc: '12 étages · Nécromanciens. Palier III requis.',
    tag: 'tag-locked',
    tagText: 'VERROUILLÉ',
    icon: 'lock',
    floor: '—',
    state: 'locked',
  },
];

interface DungeonsProps {
  dungeons?: DungeonEntry[];
  gold?: number;
  onBack?: () => void;
  onEnterDungeon?: (dungeonName: string) => void;
}

export function Dungeons({
  dungeons = MOCK_DUNGEONS,
  gold = 320,
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
