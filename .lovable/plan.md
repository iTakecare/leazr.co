
# Remplacement du dropdown client par une modale de selection

## Probleme
Le dropdown inline pour la recherche client s'affiche mal dans la modale de tache (superposition, z-index, zone trop petite).

## Solution
Remplacer `ClientSearchInput` par un pattern modal identique a `AmbassadorSelector` deja present dans le projet : un bouton qui ouvre une 2e modale (Dialog) avec un champ de recherche `cmdk` (Command) et une liste filtrable de clients.

## Modifications

### `src/components/tasks/ClientSearchInput.tsx` -- Refonte complete

- Remplacer le dropdown custom par :
  - Un bouton/champ affichant le client selectionne (ou "Selectionner un client...")
  - Au clic, ouverture d'un `Dialog` contenant un `Command` (cmdk) avec :
    - `CommandInput` pour la recherche avec autocompletion
    - `CommandList` affichant les clients filtres
    - `CommandEmpty` pour le message "Aucun resultat"
    - Option "Aucun client" en tete de liste
  - Bouton X pour dissocier le client selectionne

- Pattern identique a `AmbassadorSelector.tsx` (Dialog + Command + CommandInput + CommandList + CommandItem)

### Aucun autre fichier modifie
- `TaskDialog.tsx` utilise deja `ClientSearchInput` avec les props `value` et `onChange` -- pas de changement necessaire.

## Details techniques

```
// Structure du nouveau composant
<div>
  <Label>Client lie</Label>
  {value && selectedName ? (
    // Affichage du client selectionne + bouton X
  ) : (
    // Bouton "Selectionner un client..." qui ouvre la modale
  )}
  <Dialog open={isOpen} onOpenChange={setIsOpen}>
    <DialogContent>
      <DialogHeader>Selectionner un client</DialogHeader>
      <Command>
        <CommandInput placeholder="Rechercher..." />
        <CommandList>
          <CommandEmpty>Aucun resultat</CommandEmpty>
          <CommandGroup>
            <CommandItem onSelect={handleClear}>Aucun client</CommandItem>
            {clients.map(c => <CommandItem onSelect={() => handleSelect(c)}>{c.name}</CommandItem>)}
          </CommandGroup>
        </CommandList>
      </Command>
    </DialogContent>
  </Dialog>
</div>
```

- La recherche Supabase reste identique (filtre `ilike` sur le nom)
- Le Dialog s'ouvre par-dessus la modale existante grace au z-index natif de Radix
