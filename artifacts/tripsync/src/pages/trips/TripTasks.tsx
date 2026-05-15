import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, CheckCircle2, Circle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const statusIcon = (status: string) => {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "in_progress") return <Clock className="h-4 w-4 text-blue-500" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
};

const priorityBadge: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
};

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.string().min(1),
  priority: z.string().min(1),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface Props { tripId: number }

export default function TripTasks({ tripId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: tasks, isLoading } = useListTasks(tripId, {
    query: { enabled: !!tripId, queryKey: getListTasksQueryKey(tripId) },
  });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", description: "", status: "pending", priority: "medium", assignedTo: "", dueDate: "" },
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset({ title: "", description: "", status: "pending", priority: "medium", assignedTo: "", dueDate: "" });
    setOpen(true);
  };

  const openEdit = (t: NonNullable<typeof tasks>[0]) => {
    setEditingId(t.id);
    form.reset({
      title: t.title,
      description: t.description ?? "",
      status: t.status,
      priority: t.priority,
      assignedTo: t.assignedTo ?? "",
      dueDate: t.dueDate ?? "",
    });
    setOpen(true);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(tripId) });

  const onSubmit = (values: TaskFormValues) => {
    const data = {
      ...values,
      description: values.description || undefined,
      assignedTo: values.assignedTo || undefined,
      dueDate: values.dueDate || undefined,
    };
    if (editingId) {
      updateTask.mutate({ id: editingId, data }, {
        onSuccess: () => { invalidate(); setOpen(false); toast({ title: "Task updated" }); },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      });
    } else {
      createTask.mutate({ id: tripId, data }, {
        onSuccess: () => { invalidate(); setOpen(false); form.reset(); toast({ title: "Task created" }); },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      });
    }
  };

  const toggleDone = (task: NonNullable<typeof tasks>[0]) => {
    const newStatus = task.status === "done" ? "pending" : "done";
    updateTask.mutate({ id: task.id, data: { status: newStatus } }, {
      onSuccess: () => invalidate(),
    });
  };

  const handleDelete = (id: number) => {
    deleteTask.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "Task deleted" }); },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  const grouped = {
    pending: tasks?.filter((t) => t.status === "pending") ?? [],
    in_progress: tasks?.filter((t) => t.status === "in_progress") ?? [],
    done: tasks?.filter((t) => t.status === "done") ?? [],
  };

  const TaskCard = ({ task }: { task: NonNullable<typeof tasks>[0] }) => (
    <Card key={task.id} className={`group ${task.status === "done" ? "opacity-60" : ""}`} data-testid={`card-task-${task.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button onClick={() => toggleDone(task)} className="mt-0.5 shrink-0 hover:scale-110 transition-transform">
            {statusIcon(task.status)}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`font-medium text-sm ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityBadge[task.priority] ?? priorityBadge.low}`}>
                {task.priority}
              </span>
            </div>
            {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
              {task.assignedTo && <span>Assigned to <strong className="text-foreground">{task.assignedTo}</strong></span>}
              {task.dueDate && <span>Due {task.dueDate}</span>}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(task)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(task.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{tasks?.length ?? 0} tasks</p>
        <Button size="sm" onClick={openCreate} data-testid="button-add-task">
          <Plus className="h-4 w-4 mr-1.5" />Add Task
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="e.g. Book cooking class" {...field} data-testid="input-task-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea rows={2} className="resize-none" {...field} /></FormControl>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="assignedTo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <FormControl><Input placeholder="Name" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={createTask.isPending || updateTask.isPending} className="flex-1">
                  {editingId ? "Save" : "Create Task"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : tasks?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm mb-3">No tasks yet. Keep track of what needs doing.</p>
            <Button size="sm" variant="outline" onClick={openCreate}>Add your first task</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: "pending", label: "Pending", items: grouped.pending },
            { key: "in_progress", label: "In Progress", items: grouped.in_progress },
            { key: "done", label: "Done", items: grouped.done },
          ].map(({ key, label, items }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                {statusIcon(key)}
                <span className="text-sm font-semibold">{label}</span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <div className="border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">Empty</div>
              ) : (
                items.map((t) => <TaskCard key={t.id} task={t} />)
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
