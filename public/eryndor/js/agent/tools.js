/**
 * Tool schemas (Anthropic `tool_use` format) exposed to the AI agents.
 *
 * Each tool's side-effects are implemented in agent/action-executor.js.
 */

export const TOOLS = [
    {
        name: 'build',
        description: 'Construit un bâtiment de ton territoire. Le moteur choisit le meilleur emplacement selon l\'indice donné. Coûts déduits si la construction réussit.',
        input_schema: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: [
                        'HOUSE', 'FARM', 'BARRACKS', 'FORGE', 'SAWMILL', 'MINE', 'PORT',
                        'WATCHTOWER', 'ARCHERY_RANGE', 'ROAD', 'WALL', 'TOWER',
                        'COLONY', 'MARKET', 'TEMPLE', 'GRANARY'
                    ],
                    description: 'Type de bâtiment à construire'
                },
                hint: {
                    type: 'string',
                    enum: ['near_water', 'near_forest', 'near_iron', 'near_stone', 'border', 'center', 'cluster', 'between_me_and_enemy'],
                    description: 'Indice de placement. Facultatif.'
                }
            },
            required: ['type']
        }
    },
    {
        name: 'train',
        description: 'Met en file N villageois pour les former en unités militaires. Requiert Barracks (SOLDIER/CAVALRY) ou Archery Range (ARCHER/SCOUT). Coûts déduits par unité.',
        input_schema: {
            type: 'object',
            properties: {
                unit_type: {
                    type: 'string',
                    enum: ['SOLDIER', 'ARCHER', 'CAVALRY', 'SCOUT']
                },
                count: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10,
                    default: 1
                }
            },
            required: ['unit_type']
        }
    },
    {
        name: 'research',
        description: 'Lance une recherche technologique. Un seul projet à la fois. Coût initial en or (30% du coût total).',
        input_schema: {
            type: 'object',
            properties: {
                tech_id: {
                    type: 'string',
                    enum: [
                        'agriculture', 'mining', 'trade',
                        'ironWorking', 'archery', 'cavalry',
                        'writing', 'philosophy', 'masonry',
                        'shipbuilding', 'cartography',
                        'herbalism', 'animalHusbandry'
                    ]
                }
            },
            required: ['tech_id']
        }
    },
    {
        name: 'set_jobs',
        description: 'Réassigne N villageois civils vers un métier. Les villageois choisis sont ceux aux meilleures compétences pour le métier.',
        input_schema: {
            type: 'object',
            properties: {
                job: {
                    type: 'string',
                    enum: ['gatherer', 'farmer', 'builder', 'warrior', 'hunter', 'fisher', 'breeder']
                },
                count: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 30
                }
            },
            required: ['job', 'count']
        }
    },
    {
        name: 'attack',
        description: 'Ordonne à N unités militaires de converger vers une cible ennemie. Les unités entrent en combat automatiquement à portée.',
        input_schema: {
            type: 'object',
            properties: {
                target: {
                    type: 'string',
                    enum: ['enemy_castle', 'enemy_villagers', 'nearest_enemy'],
                    default: 'nearest_enemy'
                },
                unit_count: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 30,
                    default: 5
                }
            }
        }
    },
    {
        name: 'declare_war',
        description: 'Déclare la guerre à la faction adverse. Effet réciproque. Conquête automatique à élimination totale.',
        input_schema: { type: 'object', properties: {} }
    },
    {
        name: 'offer_peace',
        description: 'Met fin à la guerre avec l\'adversaire. Les deux factions redeviennent neutres.',
        input_schema: { type: 'object', properties: {} }
    },
    {
        name: 'found_colony',
        description: 'Fonde une colonie distante (20+ tuiles du centre). Requiert 15 villageois, coûte wood:150, stone:100, food:200. Étend territoire et population max.',
        input_schema: { type: 'object', properties: {} }
    },
    {
        name: 'trade',
        description: 'Troque de l\'or contre une ressource via le marché. Requiert un MARKET.',
        input_schema: {
            type: 'object',
            properties: {
                resource: { type: 'string', enum: ['food', 'wood', 'stone', 'iron'] },
                give_gold: { type: 'integer', minimum: 10, maximum: 200 },
                get_amount: { type: 'integer', minimum: 5, maximum: 200 }
            },
            required: ['resource', 'give_gold', 'get_amount']
        }
    },
    {
        name: 'end_turn',
        description: 'Termine ton tour immédiatement. Appelle-le quand tu n\'as plus d\'action utile à effectuer.',
        input_schema: { type: 'object', properties: {} }
    }
];
