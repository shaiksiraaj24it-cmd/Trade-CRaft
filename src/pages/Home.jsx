import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ListChecks, Trophy, ArrowRight, GraduationCap, TrendingUp } from "lucide-react";

export default function Home() {
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.entities.Course.list("order"),
      api.entities.Lesson.list("order"),
      api.entities.LessonProgress.filter({ completed: true }),
      api.entities.QuizAttempt.list("-created_date", 5),
    ]).then(([courses, lessons, progress, attempts]) => {
      setData({ courses, lessons, progress, attempts });
    });
  }, []);

  if (!data) return <div className="py-20 text-center text-muted-foreground">Loading your dashboard…</div>;

  const { courses, lessons, progress, attempts } = data;
  const completedIds = new Set(progress.map((p) => p.lesson_id));
  const completedCount = completedIds.size;
  const totalLessons = lessons.length;
  const overallPct = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;
  const bestScore = attempts.reduce((m, a) => Math.max(m, a.total ? Math.round((a.score / a.total) * 100) : 0), 0);

  const courseProgress = courses.map((c) => {
    const courseLessons = lessons.filter((l) => l.course_id === c.id);
    const done = courseLessons.filter((l) => completedIds.has(l.id)).length;
    return { course: c, total: courseLessons.length, done, pct: courseLessons.length ? Math.round((done / courseLessons.length) * 100) : 0 };
  });

  const nextLesson = lessons.find((l) => !completedIds.has(l.id));

  const stats = [
    { label: "Lessons completed", value: `${completedCount}/${totalLessons}`, icon: BookOpen, tone: "text-emerald-600 bg-emerald-50" },
    { label: "Overall progress", value: `${overallPct}%`, icon: GraduationCap, tone: "text-blue-600 bg-blue-50" },
    { label: "Quiz attempts", value: attempts.length, icon: ListChecks, tone: "text-amber-600 bg-amber-50" },
    { label: "Best quiz score", value: `${bestScore}%`, icon: Trophy, tone: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your learning dashboard</h1>
        <p className="mt-1 text-muted-foreground">Track your progress and continue where you left off.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold leading-none">{value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Continue learning */}
      {nextLesson && (
        <Card className="overflow-hidden border-primary/20">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Continue learning</div>
              <h3 className="mt-1 text-xl font-semibold">{nextLesson.title}</h3>
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{nextLesson.description}</p>
            </div>
            <Button asChild className="shrink-0">
              <Link to={`/lesson/${nextLesson.id}`}>Resume <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Course progress */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your courses</h2>
          <Button variant="ghost" size="sm" asChild><Link to="/courses">View all <ArrowRight className="ml-1 w-4 h-4" /></Link></Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {courseProgress.map(({ course, total, done, pct }) => (
            <Card key={course.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{course.icon || "📚"}</span>
                    <div>
                      <CardTitle className="text-base">{course.title}</CardTitle>
                      <div className="text-xs text-muted-foreground">{course.level} · {course.duration}</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{done} of {total} lessons</span>
                  <span className="font-medium">{pct}%</span>
                </div>
                <Progress value={pct} className="h-2" />
                <Button variant="outline" size="sm" className="mt-2 w-full" asChild>
                  <Link to={`/courses/${course.id}`}>{pct === 100 ? "Review course" : "Continue"}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent quiz attempts */}
      {attempts.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Recent quiz attempts</h2>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {attempts.map((a) => {
                const course = courses.find((c) => c.id === a.course_id);
                const pct = a.total ? Math.round((a.score / a.total) * 100) : 0;
                return (
                  <div key={a.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{course?.title || "Course quiz"}</div>
                        <div className="text-xs text-muted-foreground">{a.score}/{a.total} correct</div>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-rose-500"}`}>{pct}%</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}