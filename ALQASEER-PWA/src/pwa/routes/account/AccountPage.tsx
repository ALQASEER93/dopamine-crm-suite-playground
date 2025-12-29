import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../api/client";
import { getQueueMeta, getQueuedMutations, replayQueuedMutations } from "../../offline/queue";
import { useAuthStore } from "../../state/auth";
import { useNavigate } from "react-router-dom";

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  const refreshQueue = () => {
    setQueueCount(getQueuedMutations().length);
    const meta = getQueueMeta();
    setLastSyncAt(meta.lastSyncAt ?? null);
  };

  useEffect(() => {
    refreshQueue();
  }, []);

  const syncNow = async () => {
    const res = await replayQueuedMutations();
    refreshQueue();
    setSyncResult(`\u062a\u0645\u062a \u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0632\u0627\u0645\u0646\u0629 ${res.attempted}\u060c \u0627\u0644\u0645\u062a\u0628\u0642\u064a ${res.pending}`);
  };

  return (
    <div className="page">
      <div className="card">
        <div className="section-title">\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u0633\u0627\u0628</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div>\u0627\u0644\u0627\u0633\u0645: {user?.name || "\u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631"}</div>
          <div>\u0627\u0644\u0628\u0631\u064a\u062f: {user?.email || "\u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631"}</div>
          <div>\u0627\u0644\u062f\u0648\u0631: {user?.role || "\u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631"}</div>
          <div>\u0627\u0644\u062e\u0627\u062f\u0645: {API_BASE_URL}</div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">\u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629 \u062f\u0648\u0646 \u0627\u062a\u0635\u0627\u0644</div>
        <div className="muted">\u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u0645\u0639\u0644\u0642\u0629: {queueCount}</div>
        <div className="muted">
          \u0622\u062e\u0631 \u0645\u0632\u0627\u0645\u0646\u0629: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "\u0644\u0645 \u062a\u062a\u0645 \u0628\u0639\u062f"}
        </div>
        <button type="button" onClick={syncNow}>
          \u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0622\u0646
        </button>
        {syncResult ? <div className="muted">{syncResult}</div> : null}
      </div>

      <div className="card">
        <div className="section-title">\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c</div>
        <button type="button" onClick={logout}>
          \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c
        </button>
      </div>
    </div>
  );
}
