import { Entitlement } from "~/types/auth/entitlements";

  function isPaid(entitlement: Entitlement) {
    entitlement &&
    entitlement.subscription_status === "active" &&
    ["monthly", "yearly"].includes(entitlement.plan);
  }