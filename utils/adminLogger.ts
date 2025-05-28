// utils/adminLogger.ts
import { SupabaseClient } from "@supabase/supabase-js";

export class AdminLogger {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async logExport(adminId: string, exportType: string, recordCount: number) {
    try {
      await this.supabase.from("admin_activity_logs").insert({
        admin_id: adminId,
        action: exportType,
        details: {
          records_exported: recordCount,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to log export:", error);
    }
  }

  async logAccess(adminId: string, page: string) {
    try {
      await this.supabase.from("admin_activity_logs").insert({
        admin_id: adminId,
        action: "page_access",
        details: {
          page,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to log access:", error);
    }
  }

  async logAction(adminId: string, action: string, details: any) {
    try {
      await this.supabase.from("admin_activity_logs").insert({
        admin_id: adminId,
        action,
        details: {
          ...details,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to log action:", error);
    }
  }
}
