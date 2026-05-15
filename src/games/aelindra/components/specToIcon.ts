/* ============================================
   AELINDRA · components/specToIcon.ts
   Mappe un Spec de héros vers un identifiant d'icône.
   ============================================ */

export function specToIcon(spec: string | undefined): string {
  switch (spec) {
    case 'guerrier': return 'warrior';
    case 'archer':
    case 'explorer': return 'archer';
    case 'offensive': return 'mage';
    case 'guardian': return 'guardian';
    case 'spy': return 'spy';
    case 'healer': return 'healer';
    case 'monk': return 'monk';
    case 'bard': return 'bard';
    case 'entrave': return 'ensnarer';
    default: return 'warrior';
  }
}
