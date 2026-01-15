import { useEffect, useMemo, useState } from 'react';
import { getLatestLocations, getLocationTrail } from '../api/telemetry';
import { buildGoogleMapsUrl, buildOpenStreetMapUrl } from '../utils/mapLinks';

const formatTime = value => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ar-EG');
};

export default function RepLiveMapPage() {
  const [locations, setLocations] = useState([]);
  const [selectedRepId, setSelectedRepId] = useState(null);
  const [trail, setTrail] = useState([]);
  const [loading, setLoading] = useState(false);

  const selectedRep = useMemo(
    () => locations.find(item => String(item.rep_id) === String(selectedRepId)) || null,
    [locations, selectedRepId],
  );

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await getLatestLocations();
        if (active) {
          setLocations(data);
          if (!selectedRepId && data.length > 0) {
            setSelectedRepId(data[0].rep_id);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedRepId]);

  useEffect(() => {
    let active = true;
    const loadTrail = async () => {
      if (!selectedRepId) {
        setTrail([]);
        return;
      }
      const data = await getLocationTrail(selectedRepId, 15);
      if (active) setTrail(data);
    };
    loadTrail();
    return () => {
      active = false;
    };
  }, [selectedRepId]);

  return (
    <div className="page">
      <div className="card">
        <div className="section-title">خريطة المندوبين المباشرة</div>
        <p className="muted">آخر موقع مستلم لكل مندوب + مسار آخر الحركة عند التحديد.</p>
        {loading ? <div className="muted">جاري التحديث...</div> : null}
        {locations.length === 0 ? (
          <div className="muted" style={{ marginTop: 12 }}>
            لا توجد بيانات موقع حالياً.
          </div>
        ) : (
          <div className="table" style={{ marginTop: 12 }}>
            <div className="table-row table-head">
              <div>المندوب</div>
              <div>آخر تحديث</div>
              <div>الدقة (م)</div>
              <div>روابط</div>
            </div>
            {locations.map(item => (
              <div
                key={item.id}
                className="table-row"
                onClick={() => setSelectedRepId(item.rep_id)}
                style={{ cursor: 'pointer' }}
              >
                <div>{item.rep_name || `مندوب #${item.rep_id}`}</div>
                <div>{formatTime(item.ts)}</div>
                <div>{item.accuracy_m ? Math.round(item.accuracy_m) : '—'}</div>
                <div>
                  <a
                    className="btn btn-secondary"
                    href={buildOpenStreetMapUrl(item.lat, item.lng)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    OSM
                  </a>
                  <a
                    className="btn btn-secondary"
                    style={{ marginInlineStart: 8 }}
                    href={buildGoogleMapsUrl(item.lat, item.lng)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-title">مسار المندوب</div>
        <div className="muted">
          {selectedRep
            ? `آخر 15 نقطة لـ ${selectedRep.rep_name || `مندوب #${selectedRep.rep_id}`}`
            : 'اختر مندوباً لعرض المسار.'}
        </div>
        {trail.length === 0 ? (
          <div className="muted" style={{ marginTop: 12 }}>
            لا توجد نقاط مسار حالياً.
          </div>
        ) : (
          <div className="table" style={{ marginTop: 12 }}>
            <div className="table-row table-head">
              <div>الوقت</div>
              <div>الموقع</div>
              <div>الدقة (م)</div>
            </div>
            {trail.map(point => (
              <div key={point.id} className="table-row">
                <div>{formatTime(point.ts)}</div>
                <div>
                  {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                </div>
                <div>{point.accuracy_m ? Math.round(point.accuracy_m) : '—'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
