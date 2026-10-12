import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_BASE } from "@/lib/config";
import Footer from "../../components/Footer";

export default function PublicOrganizationProfile() {
  const { id } = useParams();

  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrganization() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE}/api/organizations/public`,
          {
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message || "Байгууллагын мэдээлэл авахад алдаа гарлаа."
          );
        }

        const organizations = Array.isArray(data)
          ? data
          : Array.isArray(data?.organizations)
            ? data.organizations
            : [];

        const selected = organizations.find(
          (item) => String(item.id) === String(id)
        );

        if (!selected) {
          throw new Error("Байгууллага олдсонгүй.");
        }

        setOrganization(selected);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadOrganization();

    return () => controller.abort();
  }, [id]);

  return (
    <div className="publicOrganizationPage">
      <main className="publicOrganizationMain">
        <div className="publicOrganizationContainer">
          <Link to="/organization">
            ← Байгууллагууд
          </Link>

          {loading ? (
            <p>Байгууллагын мэдээлэл ачаалж байна...</p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : organization ? (
            <section className="publicOrganizationHeader">
              {organization.logo_url && (
                <img
                  src={organization.logo_url}
                  alt={organization.name}
                  className="publicOrganizationLogo"
                />
              )}

              <h1>{organization.name}</h1>

              <p>
                {organization.description ||
                  "Байгууллагын танилцуулга оруулаагүй байна."}
              </p>

              {organization.address && (
                <p>Хаяг: {organization.address}</p>
              )}

              {organization.website && (
                <p>
                  <a
                    href={
                      /^https?:\/\//i.test(organization.website)
                        ? organization.website
                        : `https://${organization.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Вэб сайт
                  </a>
                </p>
              )}

              <div className="publicOrganizationStats">
                <span>
                  {Number(organization.followers_count || 0)} дагагч
                </span>
                <span>
                  {Number(organization.active_events_count || 0)} эвэнт
                </span>
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}