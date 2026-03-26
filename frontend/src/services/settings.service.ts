import axiosInstance from '@/utils/axiosConfig';

export interface PlatformBankSettingsDto {
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  instruction?: string | null;
}

export const settingsService = {
  async getPlatformBankSettings() {
    const { data } = await axiosInstance.get('/settings/platform-bank');
    return data as PlatformBankSettingsDto & { id?: string };
  },
  async updatePlatformBankSettings(payload: PlatformBankSettingsDto) {
    const { data } = await axiosInstance.put('/settings/platform-bank', payload);
    return data as PlatformBankSettingsDto & { id?: string };
  }
};
