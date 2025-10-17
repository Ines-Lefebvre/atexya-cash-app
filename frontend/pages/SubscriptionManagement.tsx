import React, { useEffect, useState } from "react";
import backend from "~backend/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Download, ExternalLink } from "lucide-react";

interface Subscription {
  id: string;
  stripe_subscription_id: string;
  customer_email: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  trial_end?: string;
}

interface Invoice {
  id: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  invoice_pdf?: string;
  hosted_invoice_url?: string;
  created_at: string;
  paid_at?: string;
}

export default function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerEmail, setCustomerEmail] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const email = new URLSearchParams(window.location.search).get("email");
    if (email) {
      setCustomerEmail(email);
      loadData(email);
    } else {
      setLoading(false);
    }
  }, []);

  async function loadData(email: string) {
    try {
      const [subsResponse, invoicesResponse] = await Promise.all([
        backend.subscription.listSubscriptions({ customer_email: email }),
        backend.subscription.listInvoices({ customer_email: email }),
      ]);

      setSubscriptions(subsResponse.subscriptions);
      setInvoices(invoicesResponse.invoices);
    } catch (error) {
      console.error("Failed to load subscription data:", error);
      toast({
        title: "Error",
        description: "Failed to load subscription data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelSubscription(subscriptionId: string) {
    try {
      await backend.subscription.cancelSubscription({
        subscription_id: subscriptionId,
        cancel_at_period_end: true,
      });

      toast({
        title: "Success",
        description: "Subscription will be cancelled at the end of the billing period",
      });

      loadData(customerEmail);
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    }
  }

  async function handleOpenPortal() {
    try {
      const response = await backend.subscription.createPortalSession({
        customer_email: customerEmail,
        return_url: window.location.href,
      });

      window.location.href = response.url;
    } catch (error) {
      console.error("Failed to open portal:", error);
      toast({
        title: "Error",
        description: "Failed to open customer portal",
        variant: "destructive",
      });
    }
  }

  async function handleDownloadInvoice(invoiceId: string) {
    try {
      const response = await backend.subscription.downloadInvoice({ id: invoiceId });
      window.open(response.pdf_url, "_blank");
    } catch (error) {
      console.error("Failed to download invoice:", error);
      toast({
        title: "Error",
        description: "Failed to download invoice",
        variant: "destructive",
      });
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      trialing: "secondary",
      past_due: "destructive",
      canceled: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.replace("_", " ")}
      </Badge>
    );
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
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
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!customerEmail) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">No customer email provided</h1>
        <p className="text-muted-foreground">
          Please access this page with a valid customer email parameter
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subscription Management</h1>
        <p className="text-muted-foreground">{customerEmail}</p>
      </div>

      <div className="space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Active Subscriptions</h2>
            <Button onClick={handleOpenPortal} variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              Manage in Portal
            </Button>
          </div>

          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No active subscriptions
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((sub) => (
                <Card key={sub.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Subscription</CardTitle>
                        <CardDescription>{sub.stripe_subscription_id}</CardDescription>
                      </div>
                      {getStatusBadge(sub.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current period:</span>
                        <span>
                          {formatDate(sub.current_period_start)} -{" "}
                          {formatDate(sub.current_period_end)}
                        </span>
                      </div>
                      {sub.trial_end && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Trial ends:</span>
                          <span>{formatDate(sub.trial_end)}</span>
                        </div>
                      )}
                      {sub.cancel_at_period_end && (
                        <div className="flex justify-between text-destructive">
                          <span>Cancels at period end</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  {!sub.cancel_at_period_end && sub.status === "active" && (
                    <CardFooter>
                      <Button
                        variant="destructive"
                        onClick={() => handleCancelSubscription(sub.id)}
                      >
                        Cancel Subscription
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div>
          <h2 className="text-2xl font-semibold mb-4">Invoices</h2>

          {invoices.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">No invoices</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <Card key={invoice.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>
                          {formatPrice(invoice.amount_due, invoice.currency)}
                        </CardTitle>
                        <CardDescription>
                          {formatDate(invoice.created_at)}
                        </CardDescription>
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                  </CardHeader>
                  <CardFooter className="gap-2">
                    {invoice.invoice_pdf && (
                      <Button
                        variant="outline"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                    )}
                    {invoice.hosted_invoice_url && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(invoice.hosted_invoice_url, "_blank")}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View Invoice
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
