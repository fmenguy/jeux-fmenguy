export const TECH_TREE = {
    economy: {
        name: 'Économie', icon: '💰',
        techs: [
            { id: 'agriculture', name: 'Agriculture', cost: 100, duration: 200, icon: '🌾', description: 'Améliore la production des fermes et permet de nouvelles cultures.', prerequisites: [] },
            { id: 'mining', name: 'Exploitation minière', cost: 150, duration: 250, icon: '⛏️', description: 'Permet de construire des mines et améliore l\'extraction de ressources.', prerequisites: [] },
            { id: 'trade', name: 'Commerce', cost: 200, duration: 300, icon: '🏪', description: 'Permet de construire des marchés et d\'échanger des ressources.', prerequisites: ['mining'] }
        ]
    },
    military: {
        name: 'Militaire', icon: '⚔️',
        techs: [
            { id: 'ironWorking', name: 'Travail du fer', cost: 120, duration: 220, icon: '🔨', description: 'Permet de forger des armes en fer et améliore les unités militaires.', prerequisites: [] },
            { id: 'archery', name: 'Archerie', cost: 180, duration: 280, icon: '🏹', description: 'Permet de former des archers et de construire des camps d\'archerie.', prerequisites: ['ironWorking'] },
            { id: 'cavalry', name: 'Cavalerie', cost: 250, duration: 350, icon: '🐴', description: 'Permet de former des cavaliers, unités rapides et puissantes.', prerequisites: ['ironWorking'] }
        ]
    },
    culture: {
        name: 'Culture', icon: '📜',
        techs: [
            { id: 'writing', name: 'Écriture', cost: 80, duration: 180, icon: '✒️', description: 'Accélère la recherche et permet de stocker les connaissances.', prerequisites: [] },
            { id: 'philosophy', name: 'Philosophie', cost: 160, duration: 260, icon: '🎓', description: 'Améliore le moral du peuple et débloque de nouvelles recherches.', prerequisites: ['writing'] },
            { id: 'masonry', name: 'Maçonnerie', cost: 140, duration: 240, icon: '🧱', description: 'Permet de construire des murs en pierre et améliore les bâtiments défensifs.', prerequisites: ['mining'] }
        ]
    },
    navigation: {
        name: 'Navigation', icon: '⚓',
        techs: [
            { id: 'shipbuilding', name: 'Construction navale', cost: 160, duration: 280, icon: '🚢', description: 'Permet de construire des ports et des bateaux plus efficaces.', prerequisites: [] },
            { id: 'cartography', name: 'Cartographie', cost: 200, duration: 300, icon: '🗺️', description: 'Révèle la carte et améliore l\'exploration.', prerequisites: ['shipbuilding'] }
        ]
    },
    nature: {
        name: 'Nature', icon: '🌿',
        techs: [
            { id: 'herbalism', name: 'Herboristerie', cost: 100, duration: 200, icon: '🌿', description: 'Les forêts fournissent de la nourriture supplémentaire.', prerequisites: [] },
            { id: 'animalHusbandry', name: 'Élevage', cost: 140, duration: 240, icon: '🐄', description: 'Les animaux se reproduisent plus vite et produisent plus.', prerequisites: ['herbalism'] }
        ]
    }
};
