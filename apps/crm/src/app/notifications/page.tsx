"use client";

import Link from "next/link";
import { NotificationsView } from "@universe/ui";
import { apiClient } from "../../lib/apiClient";

export default function NotificationsPage() {
  return <NotificationsView api={apiClient} LinkComponent={Link} currentApp="crm" />;
}
