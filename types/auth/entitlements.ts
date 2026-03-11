export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export interface Entitlement {
  plan: "free" | "monthly" | "yearly";
  subscription_status: SubscriptionStatus;
  cancel_at_period_end: boolean;
  current_period_end?: string;
  canceled_at?: string;
}

export interface MeUser {
  id: string;
  email: string;
  entitlement: Entitlement;
}

export type MeState =
  | { status: "loading" }
  | { status: "logged-out" }
  | { status: "logged-in"; user: MeUser };