import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@universe/db";
import type { ProjectSummary } from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreateProjectDto } from "./dto/create-project.dto";

function daysRemaining(dueDate: Date | null): number | null {
  if (!dueDate) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((dueDate.getTime() - Date.now()) / msPerDay);
}

function toSummary(p: { id: string; referenceNumber: string; title: string; status: string; category: string; projectType: string; dueDate: Date | null; client: { name: string } | null }): ProjectSummary {
  return {
    id: p.id,
    referenceNumber: p.referenceNumber,
    title: p.title,
    status: p.status,
    category: p.category,
    projectType: p.projectType as ProjectSummary["projectType"],
    clientName: p.client?.name ?? null,
    dueDate: p.dueDate?.toISOString() ?? null,
    daysRemainingForSubmission: daysRemaining(p.dueDate),
  };
}

@Injectable()
export class ProjectsService {
  /** Every method here takes the requesting user and scopes to THEIR
   * organization only — see apps/api/src/common/tenant-scoped.ts. There is
   * no findAll() without a caller; that's intentional. */

  async findAll(user: RequestUser): Promise<ProjectSummary[]> {
    const projects = await prisma.project.findMany({
      where: tenantScope(user.organizationId),
      include: { client: true },
      orderBy: { updatedAt: "desc" },
    });
    return projects.map(toSummary);
  }

  async findOne(user: RequestUser, id: string): Promise<ProjectSummary> {
    const p = await prisma.project.findFirst({
      where: { id, ...tenantScope(user.organizationId) },
      include: { client: true },
    });
    if (!p) throw new NotFoundException(`Project ${id} not found`);
    return toSummary(p);
  }

  async create(user: RequestUser, dto: CreateProjectDto): Promise<ProjectSummary> {
    // If a clientId is supplied, verify it belongs to the caller's own
    // organization before attaching it — otherwise a crafted request could
    // link a project to another tenant's client record.
    if (dto.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: dto.clientId, ...tenantScope(user.organizationId) },
      });
      if (!client) throw new NotFoundException(`Client ${dto.clientId} not found in your organization`);
    }

    const p = await prisma.project.create({
      data: {
        organizationId: user.organizationId,
        referenceNumber: dto.referenceNumber,
        title: dto.title,
        category: dto.category,
        projectType: dto.projectType,
        clientId: dto.clientId,
        deliveryCountry: dto.deliveryCountry,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        productCategory: dto.productCategory,
        clientProductDescription: dto.clientProductDescription,
        quantity: dto.quantity,
      },
      include: { client: true },
    });

    return toSummary(p);
  }
}
