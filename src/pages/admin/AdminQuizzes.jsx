import React, { useEffect, useState } from "react";
import { api } from "@/api/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ListChecks } from "lucide-react";

const empty = { course_id: "", question: "", options: ["", "", "", ""], answer: "", explanation: "" };

export default function AdminQuizzes() {
  const [courses, setCourses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.entities.Course.list("order"), api.entities.Quiz.list("order")])
      .then(([c, q]) => { setCourses(c); setQuizzes(q); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew = (courseId) => setForm({ ...empty, course_id: courseId || "" }) || setEditing({});
  const openEdit = (q) => setForm({ ...q, options: q.options?.length ? q.options : ["", "", "", ""] }) || setEditing(q);

  const setOption = (i, v) => setForm((f) => { const o = [...f.options]; o[i] = v; return { ...f, options: o }; });

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, options: form.options.map((o) => o.trim()).filter(Boolean) };
      if (!payload.course_id || !payload.question || payload.options.length < 2 || !payload.answer) {
        alert("Course, question, at least 2 options and the correct answer are required.");
        setSaving(false); return;
      }
      if (editing.id) await api.entities.Quiz.update(editing.id, payload);
      else await api.entities.Quiz.create(payload);
      setEditing(null); load();
    } catch (e) { alert(e.message || "Failed to save"); } finally { setSaving(false); }
  };

  const doDelete = async () => {
    try { await api.entities.Quiz.delete(confirmDelete.id); setConfirmDelete(null); load(); }
    catch (e) { alert(e.message || "Failed to delete"); }
  };

  const courseName = (id) => courses.find((c) => c.id === id)?.title || "Unknown";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quizzes</h1>
          <p className="mt-1 text-muted-foreground">Create and edit quiz questions for each course.</p>
        </div>
        <Button onClick={() => openNew()}><Plus className="mr-2 w-4 h-4" /> Add question</Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Loading…</div>
      ) : courses.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">Create a course first before adding quiz questions.</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {courses.map((c) => {
            const qs = quizzes.filter((q) => q.course_id === c.id);
            return (
              <Card key={c.id}>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{c.icon || "📚"}</span>
                      <span className="font-semibold">{c.title}</span>
                      <Badge variant="secondary" className="font-normal">{qs.length} questions</Badge>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openNew(c.id)}><Plus className="mr-1 w-3.5 h-3.5" /> Add</Button>
                  </div>
                  {qs.length === 0 ? (
                    <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><ListChecks className="w-4 h-4" /> No questions yet.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {qs.map((q, i) => (
                        <div key={q.id} className="flex items-start justify-between gap-3 p-4">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{i + 1}. {q.question}</div>
                            <div className="mt-1 text-xs text-emerald-600">Answer: {q.answer}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(q)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setConfirmDelete(q)} className="text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit question" : "Add question"}</DialogTitle>
            <DialogDescription>Set the course, options and the correct answer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Course</Label>
              <Select value={form.course_id} onValueChange={(v) => setForm((f) => ({ ...f, course_id: v, answer: "" }))}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>{courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Question</Label><Textarea value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} rows={2} /></div>
            <div className="space-y-1.5">
              <Label>Options</Label>
              <div className="space-y-2">
                {form.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={o} onChange={(e) => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                    {form.options.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => setForm((f) => ({ ...f, options: f.options.filter((_, j) => j !== i) }))} className="text-rose-500"><Trash2 className="w-4 h-4" /></Button>}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setForm((f) => ({ ...f, options: [...f.options, ""] }))}><Plus className="mr-1 w-3.5 h-3.5" /> Add option</Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Correct answer</Label>
              <Select value={form.answer} onValueChange={(v) => setForm((f) => ({ ...f, answer: v }))}>
                <SelectTrigger><SelectValue placeholder="Select the correct option" /></SelectTrigger>
                <SelectContent>{form.options.filter(Boolean).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Explanation</Label><Textarea value={form.explanation} onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save question"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete question?</DialogTitle><DialogDescription>This question will be removed.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button><Button variant="destructive" onClick={doDelete}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}