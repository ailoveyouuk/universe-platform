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
    // link a project to another tenant's partner record. Client is now a
    // role (PartnerRoleType.CLIENT) on the shared Partner model rather than
    // its own Prisma model — see schema rework, 2026-09-24.
    if (dto.clientId) {
      const client = await prisma.partner.findFirst({
        where: { id: dto.clientId, ...tenantScope(user.organizationId) },
      });
      if (!client) throw new NotFoundException(`Client ${dto.clientId} not found in your organization`);
    }

    // Project is now a header only; the fields the old flat model held for
    // "the item being procured" (product description/category/quantity)
    // live on ProjectLine instead. Creating a project still creates one
    // initial line alongside the header in a single call, matching the
    // existing single-page intake UX — see CreateProjectLineDto.
    const p = await prisma.project.create({
      data: {
        organizationId: user.organizationId,
        referenceNumber: dto.referenceNumber,
        title: dto.title,
        category: dto.category,
        projectType: dto.projectType,
        clientId: dto.clientId,
        donorReference: dto.donorReference,
        deliveryCountryCode: dto.deliveryCountryCode,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        ...(dto.firstLine
          ? {
              lines: {
                create: {
                  organizationId: user.organizationId,
                  clientProductDescription: dto.firstLine.clientProductDescription,
                  productCategory: dto.firstLine.productCategory,
                  quantity: dto.firstLine.quantity,
                },
              },
            }
          : {}),
      },
      include: { client: true },
    });

    return toSummary(p);
  }
}
