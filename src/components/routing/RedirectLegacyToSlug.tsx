import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getCompanySlugForUser } from "@/services/companySlugService";

/**
 * Redirects legacy non-slug URLs to slug-based admin URLs
 * Supported patterns:
 * - /admin/invoicing
 * - /admin/invoicing/:id
 * - /admin/invoicing/:id/edit
 * - /contracts
 * - /contracts/:id
 */
export default function RedirectLegacyToSlug() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  useEffect(() => {
    const doRedirect = async () => {
      const slug = await getCompanySlugForUser();
      if (!slug) {
        console.warn("No company slug found for user; staying on legacy route");
        return;
      }

      const path = location.pathname;

      // Contracts legacy
      if (path.startsWith("/contracts")) {
        const id = params["id"] as string | undefined;
        const target = id
          ? `/${slug}/admin/contracts/${id}`
          : `/${slug}/admin/contracts`;
        navigate(target, { replace: true });
        return;
      }

      // Invoicing legacy
      if (path.startsWith("/admin/invoicing")) {
        const id = params["id"] as string | undefined;
        const isEdit = /\/edit$/.test(path);
        const base = `/${slug}/admin/invoicing`;
        const target = id ? `${base}/${id}${isEdit ? "/edit" : ""}` : base;
        navigate(target, { replace: true });
        return;
      }

      // Fallback: go to slugged dashboard
      navigate(`/${slug}/admin/dashboard`, { replace: true });
    };

    void doRedirect();
  }, [location.pathname, navigate, params]);

  // Minimal placeholder
  return null;
}
