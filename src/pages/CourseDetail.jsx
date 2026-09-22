import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Clock, ArrowRight, ListChecks, ArrowLeft, Youtube, ExternalLink } from "lucide-react";

const youtubeId = (url) => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
};

export default function CourseDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.entities.Course.get(id),
      api.entities.Lesson.filter({ course_id: id }, "order"),
      api.entities.LessonProgress.filter({ completed: true }),
      api.entities.Quiz.filter({ course_id: id }, "order"),
    ]).then(([course, lessons, progress, quizzes]) => {
      setData({ course, lessons, progress, quizzes });
    });
  }, [id]);

  if (!data) return <div className="py-20 text-center text-muted-foreground">Loading course…</div>;
  if (!data.course) return <div className="py-20 text-center text-muted-foreground">Course not found.</div>;

  const completedIds = new Set(data.progress.map((p) => p.lesson_id));
  const done = data.lessons.filter((l) => completedIds.has(l.id)).length;
  const pct = data.lessons.length ? Math.round((done / data.lessons.length) * 100) : 0;
  const firstUnfinished = data.lessons.find((l) => !completedIds.has(l.id));

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link to="/courses"><ArrowLeft className="mr-1 w-4 h-4" /> All courses</Link>
      </Button>

      <Card className="overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-3xl">{data.course.icon || "📚"}</div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{data.course.title}</h1>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">{data.course.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="secondary">{data.course.level}</Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{data.course.duration}</span>
                  <span className="text-xs text-muted-foreground">· {data.lessons.length} lessons</span>
                </div>
              </div>
            </div>
            {firstUnfinished ? (
              <Button asChild className="shrink-0"><Link to={`/lesson/${firstUnfinished.id}`}>Continue <ArrowRight className="ml-2 w-4 h-4" /></Link></Button>
            ) : (
              <Button asChild variant="outline" className="shrink-0"><Link to={`/quiz/${id}`}>Take quiz <ListChecks className="ml-2 w-4 h-4" /></Link></Button>
            )}
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Course progress</span><span className="font-medium">{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {(() => {
        const ytId = youtubeId(data.course.youtube_link);
        if (!ytId) return null;
        return (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
                <div className="flex items-center gap-2 text-sm font-medium"><Youtube className="w-4 h-4 text-rose-500" /> Course video</div>
                <a href={data.course.youtube_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">Watch on YouTube <ExternalLink className="w-3 h-3" /></a>
              </div>
              <div className="aspect-video w-full bg-black">
                <iframe className="h-full w-full" src={`https://www.youtube.com/embed/${ytId}`} title={data.course.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen frameBorder="0" />
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Lessons</h2>
        <div className="space-y-2">
          {data.lessons.map((l, i) => {
            const complete = completedIds.has(l.id);
            return (
              <Link key={l.id} to={`/lesson/${l.id}`}>
                <Card className="transition-colors hover:bg-accent/40">
                  <CardContent className="flex items-center gap-4 p-4">
                    {complete ? (
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">{i + 1}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{l.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{l.duration} · {l.description}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {data.quizzes.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <ListChecks className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium">Test your knowledge</div>
                <div className="text-xs text-muted-foreground">{data.quizzes.length} questions in this course quiz</div>
              </div>
            </div>
            <Button asChild><Link to={`/quiz/${id}`}>Take quiz</Link></Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}