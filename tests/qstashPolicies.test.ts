import { describe, expect, it } from "vitest";
import { ACCOUNT_DELETION_FLOW_CONTROL } from "../server/utils/qstash/policies";

describe("QStash flow-control policies", () => {
  it("keeps account deletion bounded without serializing all privacy work", () => {
    expect(ACCOUNT_DELETION_FLOW_CONTROL).toEqual({
      key: "account-deletion",
      parallelism: 2,
    });
  });
});
