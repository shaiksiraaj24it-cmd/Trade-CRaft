import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, XCircle, Trophy, RotateCcw, ArrowRight } from "lucide-react";

export default function QuizPage() {
  const { courseId } = useParams();
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.entities.Course.get(courseId),
      api.entities.Quiz.filter({ course_id: courseId }, "order"),
    ]).then(([course, quizzes]) => setData({ course, quizzes }));
  }, [courseId]);

  if (!data) return <div className="py-20 text-center text-muted-foreground">Loading quiz…</div>;
  if (!data.quizzes.length) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild><Link to={`/courses/${courseId}`}><ArrowLeft className="mr-1 w-4 h-4" /> Back to course</Link></Button>
        <div className="py-20 text-center text-muted-foreground">No quiz questions for this course yet.</div>
      </div>
    );
  }

  const allAnswered = data.quizzes.every((q) => answers[q.id]);
  const score = data.quizzes.filter((q) => answers[q.id] === q.answer).length;
  const pct = Math.round((score / data.quizzes.length) * 100);

  const submit = async () => {
    setSaving(true);
    try {
      await api.entities.QuizAttempt.create({ course_id: courseId, score, total: data.quizzes.length });
    } finally {
      setSaving(false);
      setSubmitted(true);
    }
  };

  if (submitted) {
    const passed = pct >= 70;
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className={cn("mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full", passed ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
              <Trophy className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold">{pct}%</h1>
            <p className="mt-1 text-muted-foreground">You scored {score} out of {data.quizzes.length}</p>
            <p className={cn("mt-3 text-sm font-medium", passed ? "text-emerald-600" : "text-amber-600")}>
              {passed ? "Great job! You passed this quiz." : "Keep practicing — review the lessons and try again."}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {data.quizzes.map((q, i) => {
            const correct = answers[q.id] === q.answer;
            return (
              <Card key={q.id}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    {correct ? <CheckCircle2 className="mt-0.5 w-5 h-5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 w-5 h-5 shrink-0 text-rose-500" />}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{i + 1}. {q.question}</div>
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">Your answer: </span>
                        <span className={correct ? "font-medium text-emerald-600" : "font-medium text-rose-500"}>{answers[q.id] || "—"}</span>
                      </div>
                      {!correct && (
                        <div className="mt-1 text-sm"><span className="text-muted-foreground">Correct: </span><span className="font-medium text-emerald-600">{q.answer}</span></div>
                      )}
                      {q.explanation && <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => { setAnswers({}); setSubmitted(false); }}><RotateCcw className="mr-2 w-4 h-4" /> Try again</Button>
          <Button asChild><Link to="/dashboard">Back to dashboard <ArrowRight className="ml-2 w-4 h-4" /></Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link to={`/courses/${courseId}`}><ArrowLeft className="mr-1 w-4 h-4" /> Back to course</Link>
      </Button>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{data.course?.title} Quiz</h1>
        <p className="mt-1 text-muted-foreground">Answer all {data.quizzes.length} questions, then submit to see your score.</p>
      </div>

      <div className="space-y-4">
        {data.quizzes.map((q, i) => (
          <Card key={q.id}>
            <CardContent className="p-5">
              <div className="mb-3 font-medium">{i + 1}. {q.question}</div>
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const selected = answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors",
                        selected ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-accent/40"
                      )}
                    >
                      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30")}>
                        {selected && <CheckCircle2 className="w-3 h-3" />}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={submit} disabled={!allAnswered || saving} className="w-full">
        {saving ? "Submitting…" : "Submit answers"}
      </Button>
    </div>
  );
}