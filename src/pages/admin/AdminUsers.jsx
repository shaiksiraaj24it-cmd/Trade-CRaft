import React, { useEffect, useState } from "react";
import { api } from "@/api/apiClient";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Users, Search, Trash2, Shield, User as UserIcon, UserPlus } from "lucide-react";

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => {
    setLoading(true);
    api.entities.User.list().then(setUsers).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const filtered = users.filter((u) =>
    !query || (u.email || "").toLowerCase().includes(query.toLowerCase()) || (u.full_name || "").toLowerCase().includes(query.toLowerCase())
  );

  const changeRole = async (u, role) => {
    try {
      await api.entities.User.update(u.id, { role });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
    } catch (e) {
      alert(e.message || "Failed to update role");
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.entities.User.delete(confirmDelete.id);
      setUsers((prev) => prev.filter((x) => x.id !== confirmDelete.id));
    } catch (e) {
      alert(e.message || "Failed to delete user");
    } finally {
      setConfirmDelete(null);
    }
  };

  const sendInvite = async () => {
    setInviteBusy(true);
    setInviteMsg("");
    try {
      await api.users.inviteUser(inviteEmail.trim(), inviteRole);
      setInviteMsg(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      load();
    } catch (e) {
      setInviteMsg(e.message || "Failed to send invite");
    } finally {
      setInviteBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-muted-foreground">Manage who can access the app and their roles.</p>
        </div>
        <Button onClick={() => { setInviteOpen(true); setInviteMsg(""); }}>
          <UserPlus className="mr-2 w-4 h-4" /> Invite user
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users…" className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground">Loading users…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No users found.</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <div key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                        {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          {u.full_name || u.email}
                          {isMe && <Badge variant="outline" className="text-[10px]">You</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex rounded-lg border border-border p-0.5">
                        <button
                          onClick={() => changeRole(u, "user")}
                          disabled={isMe}
                          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${u.role === "user" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                        >
                          <UserIcon className="w-3 h-3" /> User
                        </button>
                        <button
                          onClick={() => changeRole(u, "admin")}
                          disabled={isMe}
                          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${u.role === "admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                        >
                          <Shield className="w-3 h-3" /> Admin
                        </button>
                      </div>
                      <Button variant="ghost" size="icon" disabled={isMe} onClick={() => setConfirmDelete(u)} className="text-rose-500 hover:text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="w-3.5 h-3.5" /> {users.length} total · {users.filter((u) => u.role === "admin").length} admins
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a user</DialogTitle>
            <DialogDescription>Send an invitation email. They'll join with the role you choose.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input type="email" placeholder="user@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <div className="flex rounded-lg border border-border p-0.5">
              <button onClick={() => setInviteRole("user")} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${inviteRole === "user" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>User</button>
              <button onClick={() => setInviteRole("admin")} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${inviteRole === "admin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Admin</button>
            </div>
            {inviteMsg && <p className="text-sm text-muted-foreground">{inviteMsg}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Close</Button>
            <Button onClick={sendInvite} disabled={!inviteEmail.trim() || inviteBusy}>{inviteBusy ? "Sending…" : "Send invite"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              This will permanently remove {confirmDelete?.email} from the app. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={doDelete}>Delete user</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}