import React, { useEffect, useState } from "react";
import { getQueuedMutations, replayQueuedMutations, resolveConflict, QueuedMutation } from "../../offline/queue";
import { PageHeader } from "../../components/system/PageHeader";
import { ListItem } from "../../components/system/ListItem";
import { EmptyState } from "../../components/system/EmptyState";

export default function SyncQueuePage() {
  const [queue, setQueue] = useState<QueuedMutation[]>([]);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const loadQueue = () => setQueue(getQueuedMutations());

  useEffect(() => {
    loadQueue();
  }, []);

  const syncNow = async () => {
    const res = await replayQueuedMutations();
    setSyncStatus(`تمت محاولة إرسال ${res.attempted} طلب، المتبقي ${res.pending}`);
    loadQueue();
  };

  const resolveItem = (id: string) => {
    resolveConflict(id);
    loadQueue();
  };

  return (
    <div className="page">
      <PageHeader
        title="المزامنة"
        subtitle="الطلبات المعلقة عند العمل دون اتصال."
        actions={
          <button className="btn btn-primary" type="button" onClick={syncNow}>
            إعادة المحاولة
          </button>
        }
      />
      {syncStatus ? <div className="card">{syncStatus}</div> : null}
      {queue.length ? (
        <div className="list">
          {queue.map((item) => (
            <ListItem
              key={item.id}
              title={`${item.type} • ${item.method}`}
              subtitle={new Date(item.createdAt).toLocaleString("ar-EG")}
              meta={
                <span className="chip">
                  {item.conflict ? "تعارض" : item.endpoint}
                </span>
              }
              action={
                item.conflict ? (
                  <button className="btn btn-secondary" type="button" onClick={() => resolveItem(item.id)}>
                    حل التعارض
                  </button>
                ) : null
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد معاملات معلّقة" description="كل العمليات مزامنة بنجاح." />
      )}
    </div>
  );
}
