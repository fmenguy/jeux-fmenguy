// app.jsx — orchestration : design canvas + plateau + écrans + Tweaks
//
// Le design canvas est l'enveloppe principale. Chaque artboard montre une
// vue distincte. Les Tweaks (panneau flottant) pilotent la variante de
// cadre, le thème, et la densité d'animation pour TOUTES les vues.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "frame": "runique",
  "legendaryStyle": "minimal",
  "animDensity": "off"
}/*EDITMODE-END*/;

const ANIM_DENSITY_VALUE = { off: 0, subtle: 0.5, normal: 1 };

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = React.useState("canvas"); // "canvas" | "intro" | "board"

  // Synchroniser le thème sur <html>
  React.useEffect(() => {
    document.documentElement.classList.toggle("ach-theme-light", t.theme === "light");
    document.documentElement.style.setProperty(
      "--ach-anim-density",
      String(ANIM_DENSITY_VALUE[t.animDensity] ?? 1)
    );
    document.documentElement.classList.toggle("ach-no-legendary-fx", t.legendaryStyle === "minimal");
  }, [t.theme, t.animDensity, t.legendaryStyle]);

  const density = ANIM_DENSITY_VALUE[t.animDensity] ?? 1;
  const frame = t.frame;

  // Cartes-vedettes pour les artboards d'anatomie / variantes
  const cardCommune    = window.ACH_CARDS.find((c) => c.id === "syl-archer");
  const cardRare       = window.ACH_CARDS.find((c) => c.id === "syl-veteran");
  const cardLegT1      = window.ACH_CARDS.find((c) => c.id === "syl-lilia");
  const cardLegT2      = window.ACH_CARDS.find((c) => c.id === "arc-sandara");
  const cardSpell      = window.ACH_CARDS.find((c) => c.id === "sort-sylvie");
  const cardThrorin    = window.ACH_CARDS.find((c) => c.id === "rem-throrin");
  const cardRunes      = window.ACH_CARDS.find((c) => c.id === "arc-runes");
  const cardGardeNain  = window.ACH_CARDS.find((c) => c.id === "rem-garde-nain");

  // Petit helper pour les artboards "vitrine carte" : fond bois + label
  const CardArtboard = ({ card, frameOverride, title, subtitle }) => (
    <div className="achrogemme ach-grain" style={{
      position: "relative",
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 18, padding: 24,
    }}>
      <AchCard card={card} frame={frameOverride || frame} />
      {(title || subtitle) && (
        <div style={{
          textAlign: "center",
          fontFamily: "var(--ach-font-body)",
          color: "var(--ach-parch-deep)",
        }}>
          {title && (
            <div style={{
              fontFamily: "var(--ach-font-title)",
              fontSize: 13,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ach-gold)",
              marginBottom: 4,
            }}>{title}</div>
          )}
          {subtitle && (
            <div style={{ fontSize: 11, lineHeight: 1.5, maxWidth: 240, textWrap: "pretty" }}>
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Vitrine "anatomie" annotée
  const AnatomyArtboard = () => (
    <div className="achrogemme ach-grain" style={{
      position: "relative", width: "100%", height: "100%",
      display: "grid",
      gridTemplateColumns: "1fr 280px",
      gap: 24, padding: 32, alignItems: "center",
    }}>
      <div style={{ display: "grid", placeItems: "center" }}>
        <AchCard card={cardLegT2} frame={frame} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: "var(--ach-font-body)", color: "var(--ach-parch)" }}>
        <div style={{
          fontFamily: "var(--ach-font-title)",
          fontSize: 18, letterSpacing: "0.1em",
          color: "var(--ach-gold-bright)", textTransform: "uppercase",
        }}>Anatomie</div>
        {[
          { k: "Coût",        v: "Gemmes à dépenser pour invoquer la carte." },
          { k: "ATQ · PV",    v: "Attaque et points de vie de l'unité." },
          { k: "± Gemmes max", v: "Bonus ou malus permanent sur la jauge de Gemmes." },
          { k: "Illustration", v: "Placeholder rayé, slot 4:3 prêt pour l'illustration future." },
          { k: "Bandeau nom",  v: "Cinzel italique doré. Couronne 👑 pour les légendaires." },
          { k: "Texte d'effet", v: "Capacités, mots-clés en gras doré." },
          { k: "Pied",         v: "Faction puis classe, séparés par un point doré." },
          { k: "Cristal",      v: "Marqueur latéral pour les légendaires Tome 2." },
        ].map((row) => (
          <div key={row.k} style={{ display: "grid", gridTemplateColumns: "94px 1fr", gap: 10 }}>
            <div style={{
              fontFamily: "var(--ach-font-title)",
              fontSize: 11, letterSpacing: "0.1em",
              color: "var(--ach-gold)", textTransform: "uppercase", textAlign: "right",
              borderRight: "0.5px solid var(--ach-gold-dim)", paddingRight: 10,
            }}>{row.k}</div>
            <div style={{ fontSize: 11.5, lineHeight: 1.55, textWrap: "pretty" }}>{row.v}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // Plateau plein écran (prototype principal)
  const PlateauArtboard = () => (
    <div className="achrogemme" style={{ position: "relative", width: "100%", height: "100%" }}>
      <AchBoard frame={frame} animDensity={density} />
    </div>
  );

  // Plateau mobile (portrait)
  const PlateauMobileArtboard = () => (
    <div className="achrogemme" style={{
      position: "relative", width: "100%", height: "100%",
      overflow: "hidden",
    }}>
      <div style={{
        width: "100%", height: "100%",
        transform: "scale(0.92)", transformOrigin: "top center",
      }}>
        <AchBoard frame={frame} animDensity={density} />
      </div>
    </div>
  );

  // Intro plein écran
  const IntroArtboard = () => (
    <div className="achrogemme" style={{ position: "relative", width: "100%", height: "100%" }}>
      <AchIntro onStart={() => {}} />
    </div>
  );

  // Phases de combat
  const PhasesArtboard = () => (
    <div className="achrogemme" style={{ position: "relative", width: "100%", height: "100%" }}>
      <AchCombatPhases />
    </div>
  );

  // Bandeau synergies isolé (showcase)
  const SynergiesArtboard = () => {
    const states = [
      { label: "0 unité posée",  counts: { elfe: 0, nain: 0, humain: 0, royal: 0 } },
      { label: "Mi-partie",     counts: { elfe: 2, nain: 1, humain: 1, royal: 0 } },
      { label: "Synergies actives", counts: { elfe: 4, nain: 2, humain: 3, royal: 3 } },
    ];
    return (
      <div className="achrogemme ach-grain" style={{
        position: "relative", width: "100%", height: "100%",
        padding: 28, display: "flex", flexDirection: "column", gap: 26, justifyContent: "center",
      }}>
        {states.map((s, i) => (
          <div key={i}>
            <div style={{
              fontFamily: "var(--ach-font-title)",
              fontSize: 11, letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ach-gold)",
              marginBottom: 10,
            }}>{s.label}</div>
            <AchSynergyBar counts={s.counts} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <DesignCanvas>
        {/* PROTOTYPE PRINCIPAL ----------------------------------- */}
        <DCSection
          id="plateau"
          title="Plateau jouable"
          subtitle="Le prototype : sélectionnez une carte de votre main puis cliquez un slot compatible. Cliquez Fin du tour pour la résolution animée."
        >
          <DCArtboard id="board-desktop" label="Plateau · desktop" width={1320} height={1260}>
            <PlateauArtboard />
          </DCArtboard>
          <DCArtboard id="board-mobile" label="Plateau · mobile (< 1100px)" width={420} height={1260}>
            <PlateauMobileArtboard />
          </DCArtboard>
        </DCSection>

        {/* ÉCRAN D'INTRO ------------------------------------------ */}
        <DCSection
          id="intro"
          title="Écran d'intro"
          subtitle="Titre, lore court, et call to action pour affronter Sylvie."
        >
          <DCArtboard id="intro-desktop" label="Intro · desktop" width={1280} height={740}>
            <IntroArtboard />
          </DCArtboard>
        </DCSection>

        {/* ANATOMIE DE CARTE -------------------------------------- */}
        <DCSection
          id="anatomy"
          title="Anatomie de carte"
          subtitle="Coût, ATQ, PV, ±Gemmes max, illustration, nom, texte, famille."
        >
          <DCArtboard id="anatomy-detail" label="Annotations" width={680} height={520}>
            <AnatomyArtboard />
          </DCArtboard>
          <DCArtboard id="anatomy-commune" label="Commune" width={300} height={460}>
            <CardArtboard
              card={cardCommune}
              title="Commune"
              subtitle="Cadre bois sobre, pas de halo, footer coloré par classe."
            />
          </DCArtboard>
          <DCArtboard id="anatomy-rare" label="Rare" width={300} height={460}>
            <CardArtboard
              card={cardRare}
              title="Rare"
              subtitle="Cadre plus clair, liseré argenté, second mot-clé."
            />
          </DCArtboard>
          <DCArtboard id="anatomy-legendaire-t1" label="Légendaire · Tome 1" width={300} height={460}>
            <CardArtboard
              card={cardLegT1}
              title="Légendaire · Tome 1"
              subtitle="Halo doré pulsé, entrelacs aux coins, couronne, badge ±Gemmes max."
            />
          </DCArtboard>
          <DCArtboard id="anatomy-legendaire-t2" label="Légendaire · Tome 2" width={300} height={460}>
            <CardArtboard
              card={cardLegT2}
              title="Légendaire · Tome 2"
              subtitle="Touche cristal énergétique sur les flancs, narratif vaisseau Éclatmaris."
            />
          </DCArtboard>
          <DCArtboard id="anatomy-spell" label="Sort légendaire" width={300} height={460}>
            <CardArtboard
              card={cardSpell}
              title="Sort"
              subtitle="Pas de stats ATQ ou PV, bandeau teinté, type Sort en pied."
            />
          </DCArtboard>
        </DCSection>

        {/* VARIATIONS DE CADRE ------------------------------------ */}
        <DCSection
          id="frames"
          title="Variations de cadre"
          subtitle="Trois pistes visuelles. Pilotable via le panneau Tweaks. La même carte rendue avec chaque cadre."
        >
          <DCArtboard id="frame-sobre" label="A · Sobre" width={300} height={460}>
            <CardArtboard card={cardThrorin} frameOverride="sobre"
              title="A · Sobre"
              subtitle="Cadre bois patiné minimal. La rareté fait le travail visuel." />
          </DCArtboard>
          <DCArtboard id="frame-vegetal" label="B · Végétal" width={300} height={460}>
            <CardArtboard card={cardThrorin} frameOverride="vegetal"
              title="B · Végétal"
              subtitle="Vrilles dorées aux coins, accent elfique sylvestre." />
          </DCArtboard>
          <DCArtboard id="frame-runique" label="C · Runique" width={300} height={460}>
            <CardArtboard card={cardThrorin} frameOverride="runique"
              title="C · Runique"
              subtitle="Liseré teal et vignettage sombre, presque ésotérique." />
          </DCArtboard>
        </DCSection>

        {/* CLASSES (3 par 3) -------------------------------------- */}
        <DCSection
          id="classes"
          title="Aperçu par classe"
          subtitle="Trois cartes par Marche : commune, rare, légendaire. Cadre piloté par les Tweaks."
        >
          <DCArtboard id="cls-sylvestre" label="Sylvestre" width={840} height={480}>
            <div className="achrogemme ach-grain" style={{
              position: "relative", width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: 24,
            }}>
              <AchCard card={_g("syl-archer")} frame={frame} />
              <AchCard card={_g("syl-veteran")} frame={frame} />
              <AchCard card={_g("syl-lilia")} frame={frame} />
            </div>
          </DCArtboard>
          <DCArtboard id="cls-arcanique" label="Arcanique" width={840} height={480}>
            <div className="achrogemme ach-grain" style={{
              position: "relative", width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: 24,
            }}>
              <AchCard card={_g("arc-apprenti")} frame={frame} />
              <AchCard card={_g("arc-runes")} frame={frame} />
              <AchCard card={_g("arc-sandara")} frame={frame} />
            </div>
          </DCArtboard>
          <DCArtboard id="cls-rempart" label="Rempart" width={840} height={480}>
            <div className="achrogemme ach-grain" style={{
              position: "relative", width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: 24,
            }}>
              <AchCard card={_g("rem-garde-nain")} frame={frame} />
              <AchCard card={_g("rem-throrin-jeune")} frame={frame} />
              <AchCard card={_g("rem-throrin")} frame={frame} />
            </div>
          </DCArtboard>
          <DCArtboard id="cls-sorts" label="Sortilèges" width={840} height={480}>
            <div className="achrogemme ach-grain" style={{
              position: "relative", width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 20, padding: 24,
            }}>
              <AchCard card={_g("sort-trait")} frame={frame} />
              <AchCard card={_g("sort-regen")} frame={frame} />
              <AchCard card={_g("sort-sylvie")} frame={frame} />
            </div>
          </DCArtboard>
        </DCSection>

        {/* BANDEAU SYNERGIES -------------------------------------- */}
        <DCSection
          id="synergies"
          title="Bandeau de synergies"
          subtitle="Chips dorées style TFT. Compteur format n / palier."
        >
          <DCArtboard id="syn-states" label="États" width={700} height={360}>
            <SynergiesArtboard />
          </DCArtboard>
        </DCSection>

        {/* PHASES DE COMBAT --------------------------------------- */}
        <DCSection
          id="phases"
          title="Phases de combat"
          subtitle="Tir, Combat, Magie, Morts. Boucles d'animation pour aperçu rapide."
        >
          <DCArtboard id="phases-grid" label="Boucle des 4 phases" width={920} height={620}>
            <PhasesArtboard />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks · Achrogemme">
        <TweakSection label="Thème" />
        <TweakRadio
          label="Mode"
          value={t.theme}
          options={[{ value: "dark", label: "Sombre" }, { value: "light", label: "Clair" }]}
          onChange={(v) => setTweak("theme", v)}
        />

        <TweakSection label="Cadre des cartes" />
        <TweakRadio
          label="Variante"
          value={t.frame}
          options={[
            { value: "sobre",   label: "Sobre" },
            { value: "vegetal", label: "Végétal" },
            { value: "runique", label: "Runique" },
          ]}
          onChange={(v) => setTweak("frame", v)}
        />

        <TweakSection label="Légendaires" />
        <TweakRadio
          label="Effet"
          value={t.legendaryStyle}
          options={[
            { value: "full",    label: "Complet" },
            { value: "minimal", label: "Minimal" },
          ]}
          onChange={(v) => setTweak("legendaryStyle", v)}
        />

        <TweakSection label="Animations" />
        <TweakRadio
          label="Densité"
          value={t.animDensity}
          options={[
            { value: "off",    label: "Off" },
            { value: "subtle", label: "Doux" },
            { value: "normal", label: "Plein" },
          ]}
          onChange={(v) => setTweak("animDensity", v)}
        />
      </TweaksPanel>
    </>
  );
}

function _g(id) {
  return window.ACH_CARDS.find((c) => c.id === id);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
