import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateTrip,
  getListTripsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(1, "Trip name is required"),
  destination: z.string().min(1, "Destination is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  budget: z.coerce.number().min(0, "Budget must be positive"),
  currency: z.string().min(1, "Currency is required"),
  description: z.string().optional(),
  coverImage: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const CURRENCIES = [
  "USD",
  "VND",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "SGD",
  "INR",
  "THB",
  "IDR",

];

export default function NewTrip() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createTrip = useCreateTrip();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      destination: "",
      startDate: "",
      endDate: "",
      budget: 0,
      currency: "USD",
      description: "",
      coverImage: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    createTrip.mutate(
      { data: values },
      {
        onSuccess: (trip) => {
          queryClient.invalidateQueries({
            queryKey: getListTripsQueryKey(),
          });

          toast({
            title: "Trip created!",
            description: `${trip.name} is ready to plan.`,
          });

          setLocation(`/trips/${trip.id}`);
        },

        onError: () => {
          toast({
            title: "Error",
            description: "Failed to create trip.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/trips">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            New Trip
          </h1>

          <p className="text-muted-foreground">
            Plan your next adventure
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Plane className="h-5 w-5 text-primary" />
            </div>

            <div>
              <CardTitle>Trip Details</CardTitle>

              <CardDescription>
                Fill in the basics — you can always edit later
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trip Name</FormLabel>

                    <FormControl>
                      <Input
                        data-testid="input-name"
                        placeholder="e.g. Bali Summer Escape"
                        {...field}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>

                    <FormControl>
                      <Input
                        data-testid="input-destination"
                        placeholder="e.g. Bali, Indonesia"
                        {...field}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>

                      <FormControl>
                        <Input
                          data-testid="input-start-date"
                          type="date"
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>

                      <FormControl>
                        <Input
                          data-testid="input-end-date"
                          type="date"
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Budget</FormLabel>

                        <FormControl>
                          <Input
                            data-testid="input-budget"
                            type="number"
                            min={0}
                            step={100}
                            {...field}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>

                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>

                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Description{" "}
                      <span className="text-muted-foreground font-normal">
                        (optional)
                      </span>
                    </FormLabel>

                    <FormControl>
                      <Textarea
                        data-testid="textarea-description"
                        placeholder="What's this trip about?"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coverImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image URL</FormLabel>

                    <FormControl>
                      <Input
                        placeholder="Paste image URL here"
                        {...field}
                      />
                    </FormControl>

                    {field.value && (
                      <img
                        src={field.value}
                        alt="Preview"
                        className="mt-3 h-40 w-full object-cover rounded-lg"
                      />
                    )}

                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={createTrip.isPending}
                  data-testid="button-submit"
                  className="flex-1"
                >
                  {createTrip.isPending
                    ? "Creating..."
                    : "Create Trip"}
                </Button>

                <Button variant="outline" asChild>
                  <Link href="/trips">Cancel</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}