import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowRight, BookOpen } from "lucide-react";

export default function Courses() {
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.entities.Course.list("order"),
      api.entities.Lesson.list("order"),
      api.entities.LessonProgress.filter({ completed: true }),
    ]).then(([courses, lessons, progress]) => {
      setData({ courses, lessons, progress });
    });
  }, []);

  if (!data) return <div className="py-20 text-center text-muted-foreground">Loading courses…</div>;

  const completedIds = new Set(data.progress.map((p) => p.lesson_id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
        <p className="mt-1 text-muted-foreground">Pick a course and start learning. Your progress is saved automatically.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {data.courses.map((c) => {
          const courseLessons = data.lessons.filter((l) => l.course_id === c.id);
          const done = courseLessons.filter((l) => completedIds.has(l.id)).length;
          const pct = courseLessons.length ? Math.round((done / courseLessons.length) * 100) : 0;
          return (
            <Card key={c.id} className="overflow-hidden transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-2xl">{c.icon || "📚"}</div>
                    <div>
                      <CardTitle className="text-lg">{c.title}</CardTitle>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="font-normal">{c.level}</Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{c.duration}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{c.description}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{courseLessons.length} lessons</span>
                    <span className="font-medium">{pct}% complete</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
                <Link to={`/courses/${c.id}`} className="inline-flex items-center text-sm font-medium text-primary hover:underline">
                  {pct === 100 ? "Review course" : pct > 0 ? "Continue" : "Start course"} <ArrowRight className="ml-1 w-4 h-4" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}