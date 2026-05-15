import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useGetTripBalances,
  getListExpensesQueryKey,
  getGetTripBalancesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const CATEGORIES = [
  { value: "accommodation", label: "Accommodation" },
  { value: "food", label: "Food & Drink" },
  { value: "transport", label: "Transport" },
  { value: "activities", label: "Activities" },
  { value: "shopping", label: "Shopping" },
  { value: "other", label: "Other" },
];

const SPLIT_TYPES = [
  { value: "equal", label: "Split Equally" },
  { value: "custom", label: "Custom Split" },
];

const categoryColor: Record<string, string> = {
  accommodation: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  food: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  transport: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  activities: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  shopping: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const expenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  currency: z.string().min(1),
  category: z.string().min(1),
  paidBy: z.string().min(1, "Paid by is required"),
  splitType: z.string().min(1),
  notes: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface Props {
  tripId: number;
  trip: { currency: string };
}

export default function TripExpenses({ tripId, trip }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: expenses, isLoading } = useListExpenses(tripId, {
    query: { enabled: !!tripId, queryKey: getListExpensesQueryKey(tripId) },
  });
  const { data: balances } = useGetTripBalances(tripId, {
    query: { enabled: !!tripId, queryKey: getGetTripBalancesQueryKey(tripId) },
  });

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { title: "", amount: 0, currency: trip.currency, category: "other", paidBy: "", splitType: "equal", notes: "" },
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset({ title: "", amount: 0, currency: trip.currency, category: "other", paidBy: "", splitType: "equal", notes: "" });
    setOpen(true);
  };

  const openEdit = (e: NonNullable<typeof expenses>[0]) => {
    setEditingId(e.id);
    form.reset({ title: e.title, amount: e.amount, currency: e.currency, category: e.category, paidBy: e.paidBy, splitType: e.splitType, notes: e.notes ?? "" });
    setOpen(true);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey(tripId) });
    queryClient.invalidateQueries({ queryKey: getGetTripBalancesQueryKey(tripId) });
    queryClient.invalidateQueries({ queryKey: ["trips", tripId, "summary"] as const });
  };

  const onSubmit = (values: ExpenseFormValues) => {
    const data = { ...values, notes: values.notes || undefined };
    if (editingId) {
      updateExpense.mutate({ id: editingId, data }, {
        onSuccess: () => { invalidate(); setOpen(false); toast({ title: "Expense updated" }); },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      });
    } else {
      createExpense.mutate({ id: tripId, data }, {
        onSuccess: () => { invalidate(); setOpen(false); form.reset(); toast({ title: "Expense added" }); },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: number) => {
    deleteExpense.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "Expense deleted" }); },
      onError: () => toast({ title: "Error", variant: "destructive" }),
    });
  };

  const totalSpent = expenses?.reduce((s, e) => s + e.amount, 0) ?? 0;

  return (
    <div className="space-y-5">
      {/* Balances */}
      {balances && balances.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {balances.map((b) => (
                <div key={b.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50" data-testid={`balance-${b.name}`}>
                  <div>
                    <p className="font-medium text-sm">{b.name}</p>
                    <p className="text-xs text-muted-foreground">Paid {trip.currency} {b.paid.toFixed(2)}</p>
                  </div>
                  <div className={`flex items-center gap-1 font-semibold text-sm ${b.balance > 0 ? "text-green-600 dark:text-green-400" : b.balance < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                    {b.balance > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : b.balance < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                    {b.balance > 0 ? "+" : ""}{b.balance.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {expenses?.length ?? 0} expenses · Total: <strong>{trip.currency} {totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
        </p>
        <Button size="sm" onClick={openCreate} data-testid="button-add-expense">
          <Plus className="h-4 w-4 mr-1.5" />Add Expense
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Input placeholder="e.g. Hotel breakfast" {...field} data-testid="input-expense-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl><Input type="number" step="0.01" min={0} {...field} data-testid="input-expense-amount" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="currency" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="splitType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Split</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {SPLIT_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="paidBy" render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid By</FormLabel>
                  <FormControl><Input placeholder="Name of person who paid" {...field} data-testid="input-expense-paid-by" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={2} className="resize-none" {...field} /></FormControl>
                </FormItem>
              )} />
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={createExpense.isPending || updateExpense.isPending} className="flex-1">
                  {editingId ? "Save Changes" : "Add Expense"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : expenses?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm mb-3">No expenses recorded yet.</p>
            <Button size="sm" onClick={openCreate} variant="outline">Add your first expense</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenses?.map((expense) => (
            <Card key={expense.id} className="group" data-testid={`card-expense-${expense.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-md shrink-0 ${categoryColor[expense.category] ?? categoryColor.other}`}>
                      {CATEGORIES.find((c) => c.value === expense.category)?.label ?? expense.category}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{expense.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Paid by <span className="font-medium">{expense.paidBy}</span>
                        {" · "}{expense.splitType === "equal" ? "Split equally" : "Custom split"}
                        {expense.notes && ` · ${expense.notes}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="font-bold text-sm">{expense.currency} {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(expense.createdAt), "MMM d")}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(expense)} data-testid={`button-edit-expense-${expense.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(expense.id)} data-testid={`button-delete-expense-${expense.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
