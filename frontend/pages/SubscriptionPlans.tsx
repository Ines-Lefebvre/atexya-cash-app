import React, { useEffect, useState } from "react";
import backend from "~backend/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Plan {
  id: string;
  name: string;
  description: string;
  stripe_product_id: string;
  is_active: boolean;
  features: string[];
  prices: Price[];
}

interface Price {
  id: string;
  amount: number;
  currency: string;
  billing_interval: string;
  billing_interval_count: number;
  trial_period_days?: number;
}

export default function SubscriptionPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterval, setSelectedInterval] = useState<"month" | "year">("month");
  const { toast } = useToast();

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const response = await backend.subscription.listPlans();
      setPlans(response.plans);
    } catch (error) {
      console.error("Failed to load plans:", error);
      toast({
        title: "Error",
        description: "Failed to load subscription plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(priceId: string) {
    try {
      const response = await backend.subscription.createSubscription({
        customer_email: "",
        price_id: priceId,
        success_url: `${window.location.origin}/subscription/success`,
        cancel_url: `${window.location.origin}/subscription/plans`,
      });

      window.location.href = response.sessionUrl;
    } catch (error) {
      console.error("Failed to create subscription:", error);
      toast({
        title: "Error",
        description: "Failed to start subscription process",
        variant: "destructive",
      });
    }
  }

  function formatPrice(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Select the perfect plan for your business
        </p>

        <div className="flex justify-center gap-2">
          <Button
            variant={selectedInterval === "month" ? "default" : "outline"}
            onClick={() => setSelectedInterval("month")}
          >
            Monthly
          </Button>
          <Button
            variant={selectedInterval === "year" ? "default" : "outline"}
            onClick={() => setSelectedInterval("year")}
          >
            Annual
            <Badge variant="secondary" className="ml-2">
              Save 20%
            </Badge>
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const price = plan.prices.find(
            (p) => p.billing_interval === selectedInterval
          );

          if (!price) return null;

          return (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    {formatPrice(price.amount, price.currency)}
                  </span>
                  <span className="text-muted-foreground">
                    /{selectedInterval}
                  </span>
                </div>

                {price.trial_period_days && (
                  <Badge variant="outline" className="mb-4">
                    {price.trial_period_days} day free trial
                  </Badge>
                )}

                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(price.id)}
                >
                  Subscribe
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
