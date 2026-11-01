// Classes Tailwind réutilisées dans l'interface (mobile d'abord)
export const ui = {
  page: 'min-h-screen bg-stone-100 font-sans text-base text-neutral-900',
  entete: 'sticky top-0 z-10 flex items-center justify-between bg-vert px-4 py-3.5 text-white',
  titreEntete: 'text-lg font-semibold',
  etat: 'text-xs',
  contenu: 'mx-auto grid max-w-xl gap-3 p-3',
  carte: 'rounded-xl bg-white p-4 shadow-sm',
  titre: 'mb-3 text-base font-semibold',
  label: 'mt-2 mb-1 block text-sm text-neutral-600',
  champ: 'min-h-12 w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-base',
  boutonPrincipal:
    'mt-2 min-h-12 w-full rounded-lg bg-vert px-4 text-base text-white disabled:opacity-60',
  boutonSecondaire: 'min-h-12 w-full rounded-lg bg-vert-clair px-4 text-base text-vert',
  boutonRetirer: 'min-h-12 rounded-lg bg-rouge-clair text-lg text-rouge',
  ligne: 'mb-2 grid grid-cols-[1fr_84px_48px] gap-2',
  erreur: 'mt-2 min-h-5 text-sm text-red-700',
  commande: 'border-t border-neutral-200 py-3 first:border-t-0',
  produits: 'my-1.5 mb-2.5 leading-relaxed',
  statut: 'text-sm text-neutral-600',
  vide: 'text-neutral-500',
};
