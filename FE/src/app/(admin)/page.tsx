import type { Metadata } from "next";
import { TRANSACTIONS_PER_STAFF_HOUR } from "@/const/txns-per-staff-hour";

export const metadata: Metadata = {
  title: "Configurations",
  description: "Configurations page",
};

export default function Configurations() {
  return (
    <div>
      TRANSACTIONS_PER_STAFF_HOUR: {TRANSACTIONS_PER_STAFF_HOUR}
    </div>
  );
}
