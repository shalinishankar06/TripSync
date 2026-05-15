import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListItineraryItems,
  useCreateItineraryItem,
  useUpdateItineraryItem,
  useDeleteItineraryItem,
  getListItineraryItemsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, MapPin, Clock, Hotel, Utensils, Car, Activity, X, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";

const ITEM_TYPES = [
  { value: "activity", label: "Activity", icon: Activity },
  { value: "hotel", label: "Hotel", icon: Hotel },
  { value: "restaurant", label: "Restaurant", icon: Utensils },
  { value: "transport", label: "Transport", icon: Car },
  { value: "other", label: "Other", icon: MapPin },
];

const typeIcon = (type: string) => {
  const t = ITEM_TYPES.find((t) => t.value === type);
  const Icon = t?.icon ?? MapPin;
  return <Icon className="h-4 w-4" />;
};

const typeColor: Record<string, string> = {
  activity: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  hotel: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  restaurant: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  transport: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const itemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.string().min(1),
  day: z.coerce.number().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface Props {
  tripId: number;
  trip: { startDate: string; endDate: string };
}

export default function TripItinerary({ tripId, trip }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);

  const { data: items, isLoading } = useListItineraryItems(tripId, {
    query: { enabled: !!tripId, queryKey: getListItineraryItemsQueryKey(tripId) },
  });
  const createItem = useCreateItineraryItem();
  const updateItem = useUpdateItineraryItem();
  const deleteItem = useDeleteItineraryItem();

  const daysCount = Math.max(1, Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { title: "", type: "activity", day: 1, startTime: "", endTime: "", location: "", notes: "" },
  });

  const openCreate = () => {
    setEditingItem(null);
    form.reset({ title: "", type: "activity", day: 1, startTime: "", endTime: "", location: "", notes: "" });
    setOpen(true);
  };

  const openEdit = (item: NonNullable<typeof items>[0]) => {
    setEditingItem(item.id);
    form.reset({
      title: item.title,
      type: item.type,
      day: item.day,
      startTime: item.startTime ?? "",
      endTime: item.endTime ?? "",
      location: item.location ?? "",
      notes: item.notes ?? "",
    });
    setOpen(true);
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListItineraryItemsQueryKey(tripId) });

  const onSubmit = (values: ItemFormValues) => {
    const cleanData = {
      ...values,
      startTime: values.startTime || undefined,
      endTime: values.endTime || undefined,
      location: values.location || undefined,
      notes: values.notes || undefined,
    };
    if (editingItem) {
      updateItem.mutate(
        { id: editingItem, data: cleanData },
        {
          onSuccess: () => { invalidate(); setOpen(false); toast({ title: "Item updated" }); },
          onError: () => toast({ title: "Error", variant: "destructive" }),
        }
      );
    } else {
      createItem.mutate(
        { id: tripId, data: cleanData },
        {
          onSuccess: () => { invalidate(); setOpen(false); form.reset(); toast({ title: "Item added" }); },
          onError: () => toast({ title: "Error", variant: "destructive" }),
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteItem.mutate(
      { id },
      {
        onSuccess: () => { invalidate(); toast({ title: "Item removed" }); },
        onError: () => toast({ title: "Error", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{daysCount}-day itinerary</p>
        <Button size="sm" onClick={openCreate} data-testid="button-add-item">
          <Plus className="h-4 w-4 mr-1.5" />Add Item
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Itinerary Item"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="e.g. Tanah Lot Temple Visit" {...field} data-testid="input-item-title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {ITEM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="day" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day</FormLabel>
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={String(field.value)}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {days.map((d) => <SelectItem key={d} value={String(d)}>Day {d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="startTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="endTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl><Input placeholder="e.g. Ubud, Bali" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea rows={2} className="resize-none" {...field} /></FormControl>
                </FormItem>
              )} />
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={createItem.isPending || updateItem.isPending} className="flex-1">
                  {editingItem ? "Save Changes" : "Add Item"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {days.map((day) => {
            const dayItems = items?.filter((i) => i.day === day) ?? [];
            const dayDate = addDays(new Date(trip.startDate), day - 1);
            return (
              <div key={day}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shrink-0">
                    {day}
                  </div>
                  <div>
                    <span className="font-semibold text-sm">Day {day}</span>
                    <span className="text-muted-foreground text-xs ml-2">{format(dayDate, "EEEE, MMM d")}</span>
                  </div>
                </div>
                {dayItems.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground ml-10">
                    No activities planned. <button onClick={openCreate} className="text-primary hover:underline">Add one</button>
                  </div>
                ) : (
                  <div className="space-y-2 ml-10">
                    {dayItems.map((item) => (
                      <Card key={item.id} className="group" data-testid={`card-itinerary-${item.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`p-1.5 rounded-md shrink-0 ${typeColor[item.type] ?? typeColor.other}`}>
                                {typeIcon(item.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm">{item.title}</p>
                                  {item.startTime && (
                                    <span className="flex items-center text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3 mr-0.5" />
                                      {item.startTime}{item.endTime ? ` – ${item.endTime}` : ""}
                                    </span>
                                  )}
                                </div>
                                {item.location && (
                                  <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                                    <MapPin className="h-3 w-3 mr-0.5" />{item.location}
                                  </div>
                                )}
                                {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)} data-testid={`button-edit-item-${item.id}`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)} data-testid={`button-delete-item-${item.id}`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
