import { Injectable } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { ContactSummary } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { tenantScope } from "../common/tenant-scoped";

function toSummary(c: { id: string; name: string; email: string | null; phone: string | null; title: string | null; partnerId: string; partner: { name: string } }): ContactSummary {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    title: c.title,
    partnerId: c.partnerId,
    partnerName: c.partner.name,
  };
}

/**
 * Contact (packages/db/prisma/schema.prisma) is a Partner's point-of-
 * contact — it previously had no API surface of its own at all, so the
 * project Team & Contacts picker (POST /projects/:id/contacts) had
 * nothing to list from. This is deliberately a minimal, read-only
 * finder — org-scoped via withTenantContext/tenantScope, same convention
 * as every other list endpoint (dbo.contacts carries Row-Level Security,
 * see infra/sql/row-level-security.sql) — not a full Contacts CRUD
 * module; creating/editing a Partner's own contacts remains out of scope
 * here.
 */
@Injectable()
export class ContactsService {
  async findAll(user: RequestUser): Promise<ContactSummary[]> {
    const contacts = await withTenantContext(user.organizationId, (tx) =>
      tx.contact.findMany({
        where: tenantScope(user.organizationId),
        include: { partner: true },
        orderBy: { name: "asc" },
      }),
    );
    return contacts.map(toSummary);
  }
}
