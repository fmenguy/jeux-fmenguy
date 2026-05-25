import { useState } from 'react';

interface Props { onClose: (playerName?: string) => void; }

interface Step {
  title: string;
  body: JSX.Element;
}

const STEPS: Step[] = [
  {
    title: 'Bienvenue dans Achrogemme',
    body: (
      <>
        <p>Achrogemme est un jeu de cartes face à face. Tu affrontes Sylvie à travers <b>trois Marches</b> : la Sylvestre (forêts), l'Arcanique (plaines), et le Rempart (forteresses).</p>
        <p>Objectif : réduire les <b>Points de Vie</b> de ton adversaire à zéro.</p>
      </>
    ),
  },
  {
    title: 'La réserve de Gemmes',
    body: (
      <>
        <p>Les <span className="ach-tuto-key">💎 Gemmes</span> sont ta monnaie d'invocation. Tu en vois la réserve à côté de ton Champion en bas.</p>
        <p>Au tour 1, tu as <b>1 Gemme</b>. À chaque tour, tu en gagnes une de plus, jusqu'à <b>8 maximum</b>. Les Gemmes non utilisées se perdent à la fin du tour.</p>
        <p>Chaque carte que tu poses coûte un certain nombre de Gemmes (chiffre dans l'étoile en haut à gauche de la carte).</p>
        <p>Certaines cartes spéciales (Druide, Méditant) donnent <b>+1 Gemme max permanente</b> tant qu'elles vivent. D'autres très puissantes (Champion-Tonnerre, Doyen mage) coûtent <b>-1 Gemme max</b>. C'est le contrat : tu paies en économie pour leur puissance.</p>
      </>
    ),
  },
  {
    title: 'Les trois Marches',
    body: (
      <>
        <p>Chaque Marche n'accepte qu'une classe de personnage :</p>
        <ul>
          <li><span style={{color:'#7fc674'}}>🏹 Sylvestre</span> : Archers qui tirent direct sur le Champion adverse</li>
          <li><span style={{color:'#7fb4e8'}}>✨ Arcanique</span> : Mages qui soignent ton Champion à chaque tour</li>
          <li><span style={{color:'#d49058'}}>⚔ Rempart</span> : Guerriers qui encaissent et bloquent</li>
        </ul>
        <p>Sur chaque Marche, jusqu'à <b>3 unités par côté</b> (avant, milieu, arrière). Place ton tank à l'avant, ton archer à l'arrière.</p>
      </>
    ),
  },
  {
    title: 'Anatomie d\'une carte',
    body: (
      <>
        <p>Sur chaque carte :</p>
        <ul>
          <li><b>★ Coût</b> en Gemmes (étoile teal en haut à gauche)</li>
          <li><b>⚔ ATQ</b> en dégâts par tour (en haut à droite)</li>
          <li><b>❤ PV</b> points de vie (sous l'ATQ)</li>
          <li><b>±💎</b> bonus ou malus de Gemmes max (badge à côté)</li>
          <li><b>Nom</b> et <b>texte d'effet</b> au centre</li>
          <li><b>Faction · Classe</b> en pied de carte</li>
          <li><b>👑</b> couronne sur les légendaires (personnages du roman)</li>
        </ul>
        <p>Les cartes <b>jouables</b> sont entourées d'un halo doré. Les <b>non-jouables</b> (coût trop élevé) sont assombries.</p>
      </>
    ),
  },
  {
    title: 'Phase de combat',
    body: (
      <>
        <p>Quand tu cliques <b>Fin du tour</b>, Sylvie joue, puis le combat se résout en 4 phases :</p>
        <ol>
          <li>🏹 <b>Tir (Perce)</b> : les unités avec <b>Perce X</b> infligent X dégâts directs au Champion adverse (en plus de leur combat)</li>
          <li>⚔ <b>Combat</b> : pour chaque Marche, somme ATQ allié vs ennemi. <b>Tes unités encaissent en premier</b>, dans l'ordre Garde → Avant → Milieu → Arrière. Seul le <b>débordement</b> touche ton Champion</li>
          <li>✨ <b>Magie</b> : les Mages soignent ton Champion</li>
          <li>☠ <b>Morts</b> : les unités à 0 PV tombent</li>
        </ol>
        <p>Conséquence : <b>défends chaque Marche</b>. Une Marche vide laisse passer toute l'ATQ adverse sur ton Champion.</p>
      </>
    ),
  },
  {
    title: 'Synergies de faction',
    body: (
      <>
        <p>Les <b>synergies</b> (chips dorées en haut et bas) s'activent quand tu as plusieurs unités d'une même faction :</p>
        <ul>
          <li><b>Peuple Elfe</b> (2) : +1 ATQ aux Elfes</li>
          <li><b>Clan Nain</b> (2) : +1 PV aux Nains</li>
          <li><b>Royaumes Humains</b> (3) : +1 Gemme max</li>
          <li><b>Alliance d'Achronia</b> (Aldarian + Throrin) : +5 PV max au Champion</li>
        </ul>
        <p>Compose ton board pour les déclencher.</p>
      </>
    ),
  },
  {
    title: 'Trinités : la voie élite',
    body: (
      <>
        <p>Si tu poses sur le board <b>1 Archer + 1 Mage + 1 Guerrier de la même faction</b> en même temps, tu actives une <b>Trinité</b> :</p>
        <ul>
          <li>☘ <b>Trinité Elfe</b> → Éclair du Roi Elfe (5 dégâts directs au Champion)</li>
          <li>⚒ <b>Trinité Naine</b> → Mortier des Forges (7 dégâts directs)</li>
          <li>🏰 <b>Trinité Humaine</b> → Charge de la Couronne (6 dégâts directs)</li>
        </ul>
        <p>Au <b>prochain tour</b> après l'activation, une carte <span style={{color:'#c98aff'}}>Élite</span> (sortilège violet) apparaît dans ta main. Elle <b>ignore les unités adverses</b> et frappe direct le Champion.</p>
        <p>Une copie par partie. Une fois utilisée, elle est consommée.</p>
      </>
    ),
  },
  {
    title: 'Et toi, qui es-tu ?',
    body: (
      <>
        <p>Avant ton premier duel contre Sylvie, indique le nom sous lequel tu veux entrer dans la légende d'Achronia.</p>
        <p>Tu peux laisser vide pour rester anonyme sous le nom de <i>Voyageur</i>.</p>
        <p className="ach-tuto-hint">Tu retrouveras ce tutoriel à tout moment via le bouton <b>⚙ Options</b> en bas à droite. Bonne partie. Skarn t'observe.</p>
      </>
    ),
  },
];

export function Tutorial({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const total = STEPS.length;
  const current = STEPS[step];
  const isLast = step === total - 1;
  const isFirst = step === 0;

  const finish = () => {
    const trimmed = name.trim().slice(0, 24);
    onClose(trimmed.length > 0 ? trimmed : undefined);
  };

  const next = () => {
    if (isLast) finish();
    else setStep((s) => s + 1);
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish();
    }
  };

  return (
    <div className="ach-tuto-overlay" role="dialog" aria-modal="true">
      <div className="ach-tuto-modal">
        <div className="ach-tuto-progress">
          {STEPS.map((_, i) => (
            <span key={i} className={`ach-tuto-dot ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''}`} />
          ))}
        </div>
        <h2 className="ach-tuto-title">{current.title}</h2>
        <div className="ach-tuto-body">
          {current.body}
          {isLast && (
            <div className="ach-tuto-name">
              <label htmlFor="ach-tuto-name-input" className="ach-tuto-name-label">Ton nom :</label>
              <input
                id="ach-tuto-name-input"
                type="text"
                className="ach-tuto-name-input"
                placeholder="Voyageur"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={24}
                autoFocus
              />
            </div>
          )}
        </div>
        <div className="ach-tuto-footer">
          <span className="ach-tuto-step-count">{step + 1} / {total}</span>
          <div className="ach-tuto-actions">
            <button className="ach-side__btn-ghost-mini" onClick={() => onClose()}>passer</button>
            {!isFirst && (
              <button className="ach-side__btn ach-side__btn--ghost" onClick={prev}>Précédent</button>
            )}
            <button className="ach-side__btn" onClick={next}>
              {isLast ? (name.trim().length > 0 ? 'Entrer' : 'Rester Voyageur') : 'Suivant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
