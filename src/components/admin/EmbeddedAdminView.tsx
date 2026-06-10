import React, { Suspense, lazy } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import AdminCreateOfferSwitch from "@/components/routing/AdminCreateOfferSwitch";
import { EmbeddedViewContext } from "@/context/EmbeddedViewContext";

// Pages embarquées dans la colonne de droite du Centre d'appels.
// Mêmes composants que les routes admin de App.tsx — rendus ici dans un
// MemoryRouter imbriqué, ce qui remplace l'ancienne iframe : intégration
// native (styles partagés, pas de second chargement, taille naturelle) tout
// en restant ISOLÉ du routeur principal — naviguer ici ne fait jamais tomber
// l'appel en cours.
const Clients = lazy(() => import("@/pages/Clients"));
const ClientDetail = lazy(() => import("@/pages/ClientDetail"));
const AdminOfferDetail = lazy(() => import("@/pages/AdminOfferDetail"));
const ContractDetail = lazy(() => import("@/pages/ContractDetail"));

function Fallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[300px] text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-2" />
      Chargement…
    </div>
  );
}

// `url` is a path like `/{companySlug}/admin/offers/{id}?embed=1` — exactly
// what PhoneCallCenter already builds for the iframe src. The `embed=1` query
// makes Layout render the page bare (no sidebar), and the route patterns mirror
// App.tsx so useParams(companySlug, id) + useCompanySlugAccess resolve normally.
export default function EmbeddedAdminView({ url }: { url: string }) {
  return (
    <EmbeddedViewContext.Provider value={true}>
      <MemoryRouter initialEntries={[url]}>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/:companySlug/admin/clients" element={<Layout><Clients /></Layout>} />
          <Route path="/:companySlug/admin/clients/:id" element={<Layout><ClientDetail /></Layout>} />
          <Route path="/:companySlug/admin/offers/:id" element={<Layout><AdminOfferDetail /></Layout>} />
          <Route path="/:companySlug/admin/contracts/:id" element={<Layout><ContractDetail /></Layout>} />
          <Route path="/:companySlug/admin/create-offer" element={<Layout><AdminCreateOfferSwitch /></Layout>} />
          <Route path="*" element={<Fallback />} />
        </Routes>
      </Suspense>
      </MemoryRouter>
    </EmbeddedViewContext.Provider>
  );
}
