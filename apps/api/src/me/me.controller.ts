import { BadRequestException, Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";

const THEMES = ["light", "dark", "system"] as const;

/**
 * Lets a frontend app find out who's signed in and what they can do —
 * used by the Admin app to decide whether to show the organization picker
 * (platform staff) or lock the invite form to the caller's own org.
 */
@Controller("me")
@UseGuards(EntraAuthGuard)
export class MeController {
  @Get()
  me(@CurrentUser() user: RequestUser) {
    return user;
  }

  /**
   * The caller's own personal preferences (2026-10-31). Only ever updates the
   * caller's own row, and only the fields listed here; nothing else about the
   * account can be changed through this route.
   */
  @Patch("preferences")
  async updatePreferences(@CurrentUser() user: RequestUser, @Body() body: { themePreference?: unknown }) {
    const theme = body?.themePreference;
    if (!THEMES.includes(theme as (typeof THEMES)[number])) throw new BadRequestException("themePreference must be light, dark or system.");
    const run = <T>(fn: (tx: any) => Promise<T>) => (user.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(user.organizationId, fn));
    await run((tx) => tx.user.update({ where: { id: user.id }, data: { themePreference: theme as string } }));
    return { themePreference: theme };
  }
}
