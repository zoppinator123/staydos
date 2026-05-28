"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  inviteMember,
  removeMember,
  updateMemberRole,
  resendInvite,
  type MemberRow,
  type MemberRole,
} from "@/lib/admin/members-actions";
import { useToast } from "@/components/ui/Toast";

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

interface Props {
  members: MemberRow[];
  currentUserId: string;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function roleBadgeClasses(role: MemberRole): string {
  switch (role) {
    case "admin":
      return "bg-accent/15 text-foreground border-accent/30";
    case "viewer":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-surface-alt text-foreground border-border";
  }
}

export function MembersTab({ members, currentUserId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { addToast } = useToast();

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("member");

  // Remove confirmation
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null);

  // Search/filter
  const [query, setQuery] = useState("");

  const filtered = members.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      m.email.toLowerCase().includes(q) ||
      (m.full_name ?? "").toLowerCase().includes(q)
    );
  });

  function handleInvite() {
    const email = inviteEmail.trim();
    if (!email) return;
    startTransition(async () => {
      try {
        await inviteMember({
          email,
          role: inviteRole,
          full_name: inviteName.trim() || undefined,
        });
        addToast(`Invitation sent to ${email}`, "success");
        setInviteOpen(false);
        setInviteEmail("");
        setInviteName("");
        setInviteRole("member");
        router.refresh();
      } catch (err) {
        addToast(`Could not invite: ${errMsg(err)}`, "error");
      }
    });
  }

  function handleRoleChange(member: MemberRow, role: MemberRole) {
    if (member.role === role) return;
    startTransition(async () => {
      try {
        await updateMemberRole({ user_id: member.id, role });
        addToast(`${member.email} is now ${role}`, "success");
        router.refresh();
      } catch (err) {
        addToast(`Could not update role: ${errMsg(err)}`, "error");
      }
    });
  }

  function handleResend(member: MemberRow) {
    startTransition(async () => {
      try {
        await resendInvite(member.email);
        addToast(`Re-sent invite to ${member.email}`, "success");
      } catch (err) {
        addToast(`Could not resend: ${errMsg(err)}`, "error");
      }
    });
  }

  function handleRemove() {
    const target = removeTarget;
    if (!target) return;
    startTransition(async () => {
      try {
        await removeMember(target.id);
        addToast(`${target.email} has been removed`, "success");
        setRemoveTarget(null);
        router.refresh();
      } catch (err) {
        addToast(`Could not remove member: ${errMsg(err)}`, "error");
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Members <span className="text-muted-foreground">({members.length})</span>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            People with access to this workspace. Invite teammates by email.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-3.5 w-3.5" />
          Invite member
        </Button>
      </div>

      {/* Search */}
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or email…"
        aria-label="Search members"
      />

      {/* Table */}
      <div className="rounded-card border border-border bg-surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt border-b border-border">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Joined</th>
              <th className="px-4 py-2">Last sign-in</th>
              <th className="px-4 py-2 w-32 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  {query ? "No members match your search." : "No members yet."}
                </td>
              </tr>
            ) : (
              filtered.map((m) => {
                const isSelf = m.id === currentUserId;
                const initials = (
                  m.full_name?.trim()?.[0] ?? m.email[0] ?? "?"
                ).toUpperCase();
                const neverSignedIn = !m.last_sign_in_at;
                return (
                  <tr
                    key={m.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground shrink-0">
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {m.full_name ?? m.email.split("@")[0]}
                            {isSelf && (
                              <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {m.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={m.role}
                        disabled={isSelf || pending}
                        onChange={(e) =>
                          handleRoleChange(m, e.target.value as MemberRole)
                        }
                        className={`rounded-md border px-2 py-1 text-xs font-medium ${roleBadgeClasses(
                          m.role
                        )} disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(m.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {neverSignedIn ? (
                        <span className="inline-flex items-center rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning border border-warning/20">
                          Invited — pending
                        </span>
                      ) : (
                        formatDate(m.last_sign_in_at)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {neverSignedIn && (
                          <button
                            onClick={() => handleResend(m)}
                            disabled={pending}
                            title="Resend invitation"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setRemoveTarget(m)}
                          disabled={isSelf || pending}
                          title={isSelf ? "You can't remove yourself" : "Remove member"}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite a teammate"
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Email address <span className="text-danger">*</span>
            </label>
            <Input
              autoFocus
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@stayd.co"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Full name (optional)
            </label>
            <Input
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as MemberRole)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
            >
              <option value="admin">Admin — full access</option>
              <option value="member">Member — can edit tasks</option>
              <option value="viewer">Viewer — read-only</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Staydos will email an invitation link. The invitee creates their
            password on first sign-in.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={pending || !inviteEmail.trim()}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Send invite
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove confirmation */}
      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove member"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground">
            Are you sure you want to remove{" "}
            <strong>{removeTarget?.email}</strong> from this workspace? They
            will lose access immediately. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRemove}
              disabled={pending}
              className="bg-danger text-white hover:bg-danger/90"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
