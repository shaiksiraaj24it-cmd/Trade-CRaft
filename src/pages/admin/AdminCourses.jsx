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
import { Plus, Pencil, Trash2, GraduationCap, BookOpen, ChevronRight, ArrowLeft } from "lucide-react";

const emptyCourse = { title: "", description: "", level: "Beginner", duration: "", icon: "📚", order: 0, youtube_link: "" };
const emptyLesson = { title: "", description: "", duration: "", order: 0, sections: [{ heading: "", content: "", points: [] }], key_points: [] };

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // course dialog
  const [courseEditing, setCourseEditing] = useState(null);
  const [courseForm, setCourseForm] = useState(emptyCourse);
  const [courseSaving, setCourseSaving] = useState(false);
  const [confirmCourseDelete, setConfirmCourseDelete] = useState(null);

  // lesson dialog
  const [lessonEditing, setLessonEditing] = useState(null);
  const [lessonForm, setLessonForm] = useState(emptyLesson);
  const [lessonSaving, setLessonSaving] = useState(false);
  const [confirmLessonDelete, setConfirmLessonDelete] = useState(null);

  const loadCourses = () => {
    setLoading(true);
    api.entities.Course.list("order").then((c) => { setCourses(c); if (!selectedCourse && c.length) setSelectedCourse(c[0]); })
      .finally(() => setLoading(false));
  };
  useEffect(loadCourses, []);

  const loadLessons = (courseId) => {
    if (!courseId) { setLessons([]); return; }
    api.entities.Lesson.filter({ course_id: courseId }, "order").then(setLessons);
  };
  useEffect(() => { if (selectedCourse) loadLessons(selectedCourse.id); }, [selectedCourse?.id]);

  // Course CRUD
  const openNewCourse = () => { setCourseForm(emptyCourse); setCourseEditing({}); };
  const openEditCourse = (c) => { setCourseForm({ ...c, order: c.order ?? 0, youtube_link: c.youtube_link || "" }); setCourseEditing(c); };
  const saveCourse = async () => {
    setCourseSaving(true);
    try {
      if (courseEditing.id) await api.entities.Course.update(courseEditing.id, courseForm);
      else await api.entities.Course.create(courseForm);
      setCourseEditing(null); loadCourses();
    } catch (e) { alert(e.message || "Failed to save course"); } finally { setCourseSaving(false); }
  };
  const deleteCourse = async () => {
    try {
      const courseLessons = await api.entities.Lesson.filter({ course_id: confirmCourseDelete.id });
      await Promise.all(courseLessons.map((l) => api.entities.Lesson.delete(l.id)));
      await api.entities.Course.delete(confirmCourseDelete.id);
      setConfirmCourseDelete(null);
      if (selectedCourse?.id === confirmCourseDelete.id) setSelectedCourse(null);
      loadCourses();
    } catch (e) { alert(e.message || "Failed to delete course"); }
  };

  // Lesson CRUD
  const openNewLesson = () => { setLessonForm({ ...emptyLesson, sections: [{ heading: "", content: "", points: [] }] }); setLessonEditing({}); };
  const openEditLesson = (l) => {
    setLessonForm({
      ...l,
      order: l.order ?? 0,
      sections: l.sections?.length ? l.sections.map((s) => ({ ...s, points: s.points || [] })) : [{ heading: "", content: "", points: [] }],
      key_points: l.key_points || [],
    });
    setLessonEditing(l);
  };
  const saveLesson = async () => {
    setLessonSaving(true);
    try {
      const payload = {
        course_id: selectedCourse.id,
        title: lessonForm.title,
        description: lessonForm.description,
        duration: lessonForm.duration,
        order: Number(lessonForm.order) || 0,
        sections: lessonForm.sections.filter((s) => s.heading || s.content || (s.points && s.points.length)),
        key_points: lessonForm.key_points,
      };
      if (lessonEditing.id) await api.entities.Lesson.update(lessonEditing.id, payload);
      else await api.entities.Lesson.create(payload);
      setLessonEditing(null); loadLessons(selectedCourse.id);
    } catch (e) { alert(e.message || "Failed to save lesson"); } finally { setLessonSaving(false); }
  };
  const deleteLesson = async () => {
    try { await api.entities.Lesson.delete(confirmLessonDelete.id); setConfirmLessonDelete(null); loadLessons(selectedCourse.id); }
    catch (e) { alert(e.message || "Failed to delete"); }
  };

  const setSection = (i, patch) => setLessonForm((f) => { const s = [...f.sections]; s[i] = { ...s[i], ...patch }; return { ...f, sections: s }; });
  const addSection = () => setLessonForm((f) => ({ ...f, sections: [...f.sections, { heading: "", content: "", points: [] }] }));
  const removeSection = (i) => setLessonForm((f) => ({ ...f, sections: f.sections.filter((_, j) => j !== i) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses & Lessons</h1>
          <p className="mt-1 text-muted-foreground">Build the learning library. Select a course to manage its lessons.</p>
        </div>
        <Button onClick={openNewCourse}><Plus className="mr-2 w-4 h-4" /> Add course</Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Course list */}
          <div className="space-y-2 lg:col-span-1">
            {courses.length === 0 ? (
              <Card><CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><GraduationCap className="w-8 h-8" /><span>No courses yet.</span></CardContent></Card>
            ) : (
              courses.map((c) => (
                <Card key={c.id} className={`cursor-pointer transition-colors ${selectedCourse?.id === c.id ? "border-primary ring-1 ring-primary" : "hover:bg-accent/30"}`} onClick={() => setSelectedCourse(c)}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <span className="text-xl">{c.icon || "📚"}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{c.level} · {c.duration}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Lessons panel */}
          <div className="lg:col-span-2">
            {!selectedCourse ? (
              <Card><CardContent className="flex h-full items-center justify-center py-16 text-muted-foreground">Select a course to manage its lessons.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{selectedCourse.icon}</span>
                      <div>
                        <div className="font-semibold">{selectedCourse.title}</div>
                        <div className="text-xs text-muted-foreground">{selectedCourse.description}</div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditCourse(selectedCourse)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setConfirmCourseDelete(selectedCourse)} className="text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-2 text-sm font-medium"><BookOpen className="w-4 h-4" /> Lessons <Badge variant="secondary" className="font-normal">{lessons.length}</Badge></div>
                    <Button size="sm" onClick={openNewLesson}><Plus className="mr-1 w-3.5 h-3.5" /> Add lesson</Button>
                  </div>
                  {lessons.length === 0 ? (
                    <div className="px-4 pb-8 text-sm text-muted-foreground">No lessons yet. Add the first lesson.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {lessons.map((l, i) => (
                        <div key={l.id} className="flex items-start justify-between gap-3 p-4">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{i + 1}. {l.title}</div>
                            <div className="truncate text-xs text-muted-foreground">{l.duration} · {l.description}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditLesson(l)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setConfirmLessonDelete(l)} className="text-rose-500"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Course dialog */}
      <Dialog open={!!courseEditing} onOpenChange={(o) => !o && setCourseEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{courseEditing?.id ? "Edit course" : "Add course"}</DialogTitle><DialogDescription>Course details shown across the app.</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={courseForm.title} onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Textarea value={courseForm.description} onChange={(e) => setCourseForm((f) => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Level</Label>
                <Select value={courseForm.level} onValueChange={(v) => setCourseForm((f) => ({ ...f, level: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Beginner">Beginner</SelectItem><SelectItem value="Intermediate">Intermediate</SelectItem><SelectItem value="Advanced">Advanced</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Duration</Label><Input value={courseForm.duration} onChange={(e) => setCourseForm((f) => ({ ...f, duration: e.target.value }))} placeholder="45 min" /></div>
              <div className="space-y-1.5"><Label>Icon (emoji)</Label><Input value={courseForm.icon} onChange={(e) => setCourseForm((f) => ({ ...f, icon: e.target.value }))} placeholder="📚" /></div>
              <div className="space-y-1.5"><Label>Order</Label><Input type="number" value={courseForm.order} onChange={(e) => setCourseForm((f) => ({ ...f, order: Number(e.target.value) }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>YouTube link</Label><Input value={courseForm.youtube_link} onChange={(e) => setCourseForm((f) => ({ ...f, youtube_link: e.target.value }))} placeholder="https://youtu.be/..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCourseEditing(null)}>Cancel</Button><Button onClick={saveCourse} disabled={!courseForm.title || courseSaving}>{courseSaving ? "Saving…" : "Save course"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson dialog */}
      <Dialog open={!!lessonEditing} onOpenChange={(o) => !o && setLessonEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{lessonEditing?.id ? "Edit lesson" : "Add lesson"}</DialogTitle><DialogDescription>Lesson content for {selectedCourse?.title}.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={lessonForm.title} onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={lessonForm.description} onChange={(e) => setLessonForm((f) => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Duration</Label><Input value={lessonForm.duration} onChange={(e) => setLessonForm((f) => ({ ...f, duration: e.target.value }))} placeholder="10 min" /></div>
              <div className="space-y-1.5"><Label>Order</Label><Input type="number" value={lessonForm.order} onChange={(e) => setLessonForm((f) => ({ ...f, order: Number(e.target.value) }))} /></div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label>Sections</Label><Button type="button" variant="outline" size="sm" onClick={addSection}><Plus className="mr-1 w-3.5 h-3.5" /> Section</Button></div>
              {lessonForm.sections.map((s, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Section {i + 1}</span>
                    {lessonForm.sections.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => removeSection(i)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                  </div>
                  <Input value={s.heading} onChange={(e) => setSection(i, { heading: e.target.value })} placeholder="Heading" />
                  <Textarea value={s.content} onChange={(e) => setSection(i, { content: e.target.value })} placeholder="Content paragraph" rows={2} />
                  <Textarea value={(s.points || []).join("\n")} onChange={(e) => setSection(i, { points: e.target.value.split("\n").filter(Boolean) })} placeholder="Bullet points (one per line)" rows={3} />
                </div>
              ))}
            </div>

            <div className="space-y-1.5"><Label>Key takeaways (one per line)</Label><Textarea value={lessonForm.key_points.join("\n")} onChange={(e) => setLessonForm((f) => ({ ...f, key_points: e.target.value.split("\n").filter(Boolean) }))} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setLessonEditing(null)}>Cancel</Button><Button onClick={saveLesson} disabled={!lessonForm.title || lessonSaving}>{lessonSaving ? "Saving…" : "Save lesson"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirms */}
      <Dialog open={!!confirmCourseDelete} onOpenChange={(o) => !o && setConfirmCourseDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete course?</DialogTitle><DialogDescription>{confirmCourseDelete?.title} and all its lessons will be permanently removed.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmCourseDelete(null)}>Cancel</Button><Button variant="destructive" onClick={deleteCourse}>Delete course</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!confirmLessonDelete} onOpenChange={(o) => !o && setConfirmLessonDelete(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete lesson?</DialogTitle><DialogDescription>{confirmLessonDelete?.title} will be removed.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmLessonDelete(null)}>Cancel</Button><Button variant="destructive" onClick={deleteLesson}>Delete lesson</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}