import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListTripMembers,
  useAddTripMember,
  useRemoveTripMember,
  getListTripMembersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { UserPlus, Trash2, Crown, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const roleIcon: Record<string, React.ReactNode> = {
  owner: <Crown className="h-3.5 w-3.5 text-yellow-500" />,
  admin: <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />,
  member: <User className="h-3.5 w-3.5 text-muted-foreground" />,
};

const roleColor: Record<string, string> = {
  owner: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  member: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

const memberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  role: z.enum(["admin", "member"]),
});

type MemberFormValues = z.infer<typeof memberSchema>;

interface Props { tripId: number }

export default function TripMembers({ tripId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: members, isLoading } = useListTripMembers(tripId, {
    query: { enabled: !!tripId, queryKey: getListTripMembersQueryKey(tripId) },
  });
  const addMember = useAddTripMember();
  const removeMember = useRemoveTripMember();

  const form = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: "", email: "", role: "member" },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListTripMembersQueryKey(tripId) });

  const onSubmit = (values: MemberFormValues) => {
    addMember.mutate({ id: tripId, data: values }, {
      onSuccess: () => { invalidate(); setOpen(false); form.reset(); toast({ title: "Member added!" }); },
      onError: () => toast({ title: "Error", description: "Failed to add member.", variant: "destructive" }),
    });
  };

  const handleRemove = (memberId: number, name: string) => {
    if (!confirm(`Remove ${name} from this trip?`)) return;
    removeMember.mutate({ tripId, memberId }, {
      onSuccess: () => { invalidate(); toast({ title: `${name} removed` }); },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{members?.length ?? 0} members</p>
        <Button size="sm" onClick={() => { form.reset(); setOpen(true); }} data-testid="button-add-member">
          <UserPlus className="h-4 w-4 mr-1.5" />Invite Member
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Invite Member</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="e.g. Sam Chen" {...field} data-testid="input-member-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="sam@example.com" {...field} data-testid="input-member-email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin — can edit everything</SelectItem>
                      <SelectItem value="member">Member — can view and add</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={addMember.isPending} className="flex-1">
                  {addMember.isPending ? "Adding..." : "Add Member"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : members?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm mb-3">No members yet. Invite your travel companions.</p>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Invite someone</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {members?.map((member) => (
            <Card key={member.id} className="group" data-testid={`card-member-${member.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-semibold text-primary text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{member.name}</p>
                        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${roleColor[member.role] ?? roleColor.member}`}>
                          {roleIcon[member.role]}
                          {member.role}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{member.email} · Joined {format(new Date(member.joinedAt), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                  {member.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemove(member.id, member.name)}
                      data-testid={`button-remove-member-${member.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
