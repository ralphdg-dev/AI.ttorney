import { NetworkConfig } from "../utils/networkConfig";

export interface MaintenanceStatus {
  success: boolean;
  is_active: boolean;
  message: string;
  start_time: string | null;
  end_time: string | null;
}

export const maintenanceService = {
  async getStatus(): Promise<MaintenanceStatus> {
    const apiUrl = await NetworkConfig.getBestApiUrl();
    const resp = await fetch(`${apiUrl}/api/maintenance`, {
      headers: { "Content-Type": "application/json" },
    });
    if (!resp.ok) {
      return { success: true, is_active: false, message: "", start_time: null, end_time: null };
    }
    const data = (await resp.json()) as MaintenanceStatus;
    return data;
  },
};
