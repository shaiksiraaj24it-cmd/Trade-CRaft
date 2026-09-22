import React, { useEffect, useState } from "react";
import { api } from "@/api/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, LineChart } from "lucide-react";

const empty = { symbol: "", name: "", sector: "", price: "", previous_price: "", market_cap: "", pe: "", dividend: "", description: "" };

export default function AdminStocks() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // stock or {} for new
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => { setLoading(true); api.entities.Stock.list("symbol").then(setStocks).finally(() => setLoading(false)); };
  useEffect(load, []);

  const openNew = () => { setForm(empty); setEditing({}); };
  const openEdit = (s) => { setForm({ ...s, price: s.price ?? "", previous_price: s.previous_price ?? "", pe: s.pe ?? "" }); setEditing(s); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: form.price === "" ? null : Number(form.price),
        previous_price: form.previous_price === "" ? null : Number(form.previous_price),
        pe: form.pe === "" ? null : Number(form.pe),
      };
      if (editing.id) await api.entities.Stock.update(editing.id, payload);
      else await api.entities.Stock.create(payload);
      setEditing(null);
      load();
    } catch (e) {
      alert(e.message || "Failed to save stock");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    try { await api.entities.Stock.delete(confirmDelete.id); setConfirmDelete(null); load(); }
    catch (e) { alert(e.message || "Failed to delete"); }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stocks</h1>
          <p className="mt-1 text-muted-foreground">Manage the stock data shown in the explorer.</p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 w-4 h-4" /> Add stock</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground">Loading…</div>
          ) : stocks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <LineChart className="w-8 h-8" /><span>No stocks yet. Add your first one.</span>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {stocks.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-muted text-sm font-bold">{s.symbol}</div>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.sector} · ₹{s.price} · P/E {s.pe ?? "—"}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(s)} className="text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit stock" : "Add stock"}</DialogTitle>
            <DialogDescription>Fill in the company details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Symbol *</Label><Input value={form.symbol} onChange={(e) => set("symbol", e.target.value)} placeholder="TCS" /></div>
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Tata Consultancy Services" /></div>
            <div className="space-y-1.5"><Label>Sector</Label><Input value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="Information Technology" /></div>
            <div className="space-y-1.5"><Label>Market Cap</Label><Input value={form.market_cap} onChange={(e) => set("market_cap", e.target.value)} placeholder="12.5 Lakh Cr" /></div>
            <div className="space-y-1.5"><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="3450" /></div>
            <div className="space-y-1.5"><Label>Previous Price (₹)</Label><Input type="number" value={form.previous_price} onChange={(e) => set("previous_price", e.target.value)} placeholder="3400" /></div>
            <div className="space-y-1.5"><Label>P/E Ratio</Label><Input type="number" value={form.pe} onChange={(e) => set("pe", e.target.value)} placeholder="28.5" /></div>
            <div className="space-y-1.5"><Label>Dividend</Label><Input value={form.dividend} onChange={(e) => set("dividend", e.target.value)} placeholder="1.25%" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={!form.symbol || !form.name || saving}>{saving ? "Saving…" : "Save stock"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete stock?</DialogTitle><DialogDescription>{confirmDelete?.name} will be removed from the explorer.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button><Button variant="destructive" onClick={doDelete}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}