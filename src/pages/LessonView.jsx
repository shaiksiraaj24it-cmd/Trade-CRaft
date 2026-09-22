import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/api/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft, ArrowRight, Clock, CheckCircle, ListChecks } from "lucide-react";

export default function LessonView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [allLessons, setAllLessons] = useState([]);
  const [progress, setProgress] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    setLesson(null);
    Promise.all([
      api.entities.Lesson.get(id),
      api.entities.LessonProgress.filter({ lesson_id: id }),
    ]).then(async ([l, prog]) => {
      setLesson(l);
      setProgress(prog[0] || null);
      if (l?.course_id) {
        const siblings = await api.entities.Lesson.filter({ course_id: l.course_id }, "order");
        setAllLessons(siblings);
      }
    }).catch(() => setError(true));
  }, [id]);

  const markComplete = async () => {
    if (!lesson) return;
    setSaving(true);
    try {
      if (progress?.id) {
        const updated = await api.entities.LessonProgress.update(progress.id, { completed: true, completed_date: new Date().toISOString() });
        setProgress(updated);
      } else {
        const created = await api.entities.LessonProgress.create({ lesson_id: lesson.id, completed: true, completed_date: new Date().toISOString() });
        setProgress(created);
      }
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="py-20 text-center text-muted-foreground">Couldn't load this lesson. Please try again.</div>;
  if (!lesson) return <div className="py-20 text-center text-muted-foreground">Loading lesson…</div>;
  if (!lesson.id) return <div className="py-20 text-center text-muted-foreground">Lesson not found.</div>;

  const idx = allLessons.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? allLessons[idx - 1] : null;
  const next = idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : null;
  const isComplete = progress?.completed;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link to={`/courses/${lesson.course_id}`}><ArrowLeft className="mr-1 w-4 h-4" /> Back to course</Link>
        </Button>
        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{lesson.duration}</span>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{lesson.title}</h1>
        <p className="mt-2 text-muted-foreground">{lesson.description}</p>
      </div>

      <div className="space-y-6">
        {(lesson.sections || []).map((s, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <h2 className="mb-3 text-lg font-semibold">{s.heading}</h2>
              {s.content && <p className="text-sm leading-relaxed text-muted-foreground">{s.content}</p>}
              {s.points && s.points.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {s.points.map((p, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle className="mt-0.5 w-4 h-4 shrink-0 text-emerald-600" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {lesson.key_points && lesson.key_points.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-emerald-700">Key takeaways</h3>
            <ul className="space-y-2">
              {lesson.key_points.map((k, i) => (
                <li key={i} className="flex items-start gap-2 text-sm"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />{k}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          onClick={markComplete}
          disabled={saving || isComplete}
          className={isComplete ? "" : "bg-emerald-600 hover:bg-emerald-700"}
          variant={isComplete ? "outline" : "default"}
        >
          {isComplete ? (<><CheckCircle2 className="mr-2 w-4 h-4" /> Completed</>) : (saving ? "Saving…" : "Mark as complete")}
        </Button>
        <div className="flex gap-2">
          {prev && <Button variant="ghost" asChild><Link to={`/lesson/${prev.id}`}><ArrowLeft className="mr-1 w-4 h-4" /> Previous</Link></Button>}
          {next ? (
            <Button asChild><Link to={`/lesson/${next.id}`}>Next lesson <ArrowRight className="ml-2 w-4 h-4" /></Link></Button>
          ) : (
            <Button asChild variant="secondary"><Link to={`/quiz/${lesson.course_id}`}><ListChecks className="mr-2 w-4 h-4" /> Take the quiz</Link></Button>
          )}
        </div>
      </div>
    </div>
  );
}