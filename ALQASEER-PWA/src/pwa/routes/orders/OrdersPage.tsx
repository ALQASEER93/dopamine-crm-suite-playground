import React, { FormEvent, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { createOrder, getCustomers, getProducts } from "../../api/client";
import { Customer, OrderItem, Product } from "../../api/types";
import { enqueueMutation } from "../../offline/queue";

type OrderForm = {
  customerId: string;
  items: OrderItem[];
  notes?: string;
};

export default function OrdersPage() {
  const location = useLocation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<OrderForm>({
    customerId: (location.state as any)?.customerId || "",
    items: [{ productId: "", quantity: 1 }],
  });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [customersData, productsData] = await Promise.all([getCustomers(), getProducts()]);
        setCustomers(customersData);
        setProducts(productsData);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const updateItem = (index: number, changes: Partial<OrderItem>) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], ...changes };
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { productId: "", quantity: 1 }] }));
  };

  const handleSubmit = async (evt: FormEvent) => {
    evt.preventDefault();
    setLoading(true);
    setMessage(null);

    const payload = {
      customerId: form.customerId,
      items: form.items.filter((item) => item.productId && item.quantity > 0),
      notes: form.notes,
    };

    if (!payload.customerId || !payload.items.length) {
      setMessage("يجب اختيار عميل ومنتج واحد على الأقل.");
      setLoading(false);
      return;
    }

    try {
      if (navigator.onLine) {
        await createOrder(payload);
        setMessage("تم إرسال الطلب.");
      } else {
        enqueueMutation({
          endpoint: "orders",
          method: "POST",
          payload,
          type: "order",
        });
        setMessage("تم حفظ الطلب وسيتم إرساله عند توفر الاتصال.");
      }
      setForm({ customerId: "", items: [{ productId: "", quantity: 1 }], notes: "" });
    } catch (err) {
      setMessage("تعذّر حفظ الطلب.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <div className="section-title">طلب سريع</div>
        <form onSubmit={handleSubmit}>
          <div>
            <label>العميل</label>
            <select value={form.customerId} onChange={(e) => setForm((s) => ({ ...s, customerId: e.target.value }))} required>
              <option value="">اختر</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} • {c.type === "doctor" ? "طبيب" : "صيدلية"}
                </option>
              ))}
            </select>
          </div>

          <div className="list">
            {form.items.map((item, idx) => (
              <div key={idx} className="list-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
                <label>المنتج</label>
                <select value={item.productId} onChange={(e) => updateItem(idx, { productId: e.target.value })} required>
                  <option value="">اختر المنتج</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <label>الكمية</label>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                  required
                />
              </div>
            ))}
          </div>

          <button type="button" onClick={addItem}>
            إضافة منتج آخر
          </button>
          <textarea
            placeholder="ملاحظات اختيارية"
            value={form.notes}
            onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            rows={2}
          />
          {message ? <div className="muted">{message}</div> : null}
          <button type="submit" disabled={loading}>
            {loading ? "يتم الإرسال..." : "إرسال الطلب"}
          </button>
        </form>
      </div>
    </div>
  );
}
