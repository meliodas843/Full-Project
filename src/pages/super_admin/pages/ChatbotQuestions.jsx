import { useCallback, useEffect, useState } from "react";
import { FiCheck, FiRotateCcw, FiTrash2 } from "react-icons/fi";
import AdminShell from "../components/AdminShell";
import Toast from "../components/Toast";
import useToast from "../hooks/useToast";
import { apiFetch } from "../../../lib/api";
import { formatDateTime, fromTs, timeAgo } from "../adminUtils";

const TABS = [
  { key: "unanswered", label: "Хариулаагүй" },
  { key: "answered", label: "Хариулсан" },
  { key: "resolved", label: "Шийдсэн" },
];

const EMPTY = {
  unanswered: "Хариулаагүй асуулт алга. 🎉",
  answered: "Хариулсан асуулт алга.",
  resolved: "Шийдсэн асуулт алга.",
};

// Questions asked in the chat assistant "Шилүүс" and the answer it gave.
// For unanswered ones the super admin adds the answer to
// public/chatbot/knowledge.json, then marks them done.
export default function ChatbotQuestions() {
  const [status, setStatus] = useState("unanswered");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const { toast, show: showToast, hide: hideToast } = useToast();

  const load = useCallback(async () => {
    try {
      setData(await apiFetch(`/api/admin/chatbot-questions?status=${status}`));
      setError("");
    } catch (err) {
      setError(err.message || "Асуултуудыг ачаалж чадсангүй.");
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(row, request) {
    setBusyId(row.id);
    try {
      const res = await request();
      showToast(res?.message || "Хадгаллаа.");
      await load();
    } catch (err) {
      showToast(err.message || "Алдаа гарлаа.", "error");
    } finally {
      setBusyId(null);
    }
  }

  const setResolved = (row, resolved) =>
    act(row, () => apiFetch(`/api/admin/chatbot-questions/${row.id}`, { method: "PATCH", body: { resolved } }));

  const remove = (row) => {
    if (!window.confirm(`«${row.question}» асуултыг устгах уу?`)) return;
    act(row, () => apiFetch(`/api/admin/chatbot-questions/${row.id}`, { method: "DELETE" }));
  };

  const rows = data?.rows || [];
  const counts = data?.counts;

  return (
    <AdminShell crumb="Супер админ / Агуулга" title="Чатбот асуултууд">
      {error ? <div className="saError">{error}</div> : null}

      <div className="saLogSummary">
        <span className="amber">
          <strong>{counts?.unanswered ?? 0}</strong> хариулаагүй
        </span>
        <span>
          <strong>{counts?.answered ?? 0}</strong> хариулсан
        </span>
        <span>
          <strong>{counts?.resolved ?? 0}</strong> шийдсэн
        </span>
        <span>
          Хадгалах хугацаа <strong>{data?.keepDays ?? 90} хоног</strong>
        </span>
      </div>

      <section className="saCard">
        <div className="saCbHead">
          <p>
            Шилүүсээс асуусан бүх асуулт, түүний өгсөн хариулт. Хариулаагүй асуултын хариултыг{" "}
            <code>public/chatbot/knowledge.json</code>-д нэмээд «Шийдсэн» гэж тэмдэглэнэ үү. Олон удаа асуусан нь эхэнд
            харагдана.
          </p>
          <div className="saSegment">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={status === tab.key ? "active" : ""}
                onClick={() => setStatus(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {data && !rows.length ? (
          <div className="saEmpty">{EMPTY[status]}</div>
        ) : (
          <div className="saTableWrap">
            <table className="saTable">
              <thead>
                <tr>
                  <th>{status === "answered" ? "Асуулт · хариулт" : "Асуулт"}</th>
                  <th>Удаа</th>
                  <th>Сүүлд асуусан</th>
                  <th aria-label="Үйлдэл" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="saCell2">
                        <strong className="saCbQuestion">{row.question}</strong>
                        {row.answer ? (
                          <p className="saCbAnswer" title={row.answer}>
                            {row.answer}
                          </p>
                        ) : null}
                        <span>{row.page || "—"}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`saBadge ${row.ask_count > 1 ? "purple" : ""}`}>{row.ask_count}</span>
                    </td>
                    <td title={formatDateTime(fromTs(row.last_ts))}>{timeAgo(fromTs(row.last_ts))}</td>
                    <td>
                      <div className="saCbActions">
                        {status === "unanswered" ? (
                          <button type="button" className="saButton" disabled={busyId === row.id} onClick={() => setResolved(row, true)}>
                            <FiCheck /> Шийдсэн
                          </button>
                        ) : null}
                        {status === "resolved" ? (
                          <button type="button" className="saButton" disabled={busyId === row.id} onClick={() => setResolved(row, false)}>
                            <FiRotateCcw /> Буцаах
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="saButton danger"
                          disabled={busyId === row.id}
                          onClick={() => remove(row)}
                          aria-label="Устгах"
                          title="Устгах"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Toast toast={toast} onClose={hideToast} />
    </AdminShell>
  );
}
