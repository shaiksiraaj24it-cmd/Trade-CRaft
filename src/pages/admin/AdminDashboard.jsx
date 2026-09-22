import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, GraduationCap, ListChecks, LineChart, Users, ArrowRight } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      api.entities.Course.list(),
      api.entities.Lesson.list(),
      api.entities.Quiz.list(),
      api.entities.Stock.list(),
      api.entities.User.list(),
    ]).then(([courses, lessons, quizzes, stocks, users]) => {
      setStats({
        courses: courses.length,
        lessons: lessons.length,
        quizzes: quizzes.length,
        stocks: stocks.length,
        users: users.length,
        admins: users.filter((u) => u.role === "admin").length,
      });
    });
  }, []);

  if (!stats) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;

  const cards = [
    { label: "Courses", value: stats.courses, icon: GraduationCap, to: "/admin/courses", tone: "text-emerald-600 bg-emerald-50" },
    { label: "Lessons", value: stats.lessons, icon: BookOpen, to: "/admin/courses", tone: "text-blue-600 bg-blue-50" },
    { label: "Quiz questions", value: stats.quizzes, icon: ListChecks, to: "/admin/quizzes", tone: "text-amber-600 bg-amber-50" },
    { label: "Stocks", value: stats.stocks, icon: LineChart, to: "/admin/stocks", tone: "text-purple-600 bg-purple-50" },
    { label: "Users", value: stats.users, icon: Users, to: "/admin/users", tone: "text-rose-600 bg-rose-50" },
    { label: "Admins", value: stats.admins, icon: Users, to: "/admin/users", tone: "text-teal-600 bg-teal-50" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin overview</h1>
        <p className="mt-1 text-muted-foreground">Manage the learning library, stock data and users.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, to, tone }) => (
          <Link key={label} to={to}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-bold leading-none">{value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{label}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-1 font-semibold">Quick actions</h2>
          <p className="mb-4 text-sm text-muted-foreground">Jump straight to a management screen.</p>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/courses" className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Manage courses</Link>
            <Link to="/admin/quizzes" className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Manage quizzes</Link>
            <Link to="/admin/stocks" className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Manage stocks</Link>
            <Link to="/admin/users" className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Manage users</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}