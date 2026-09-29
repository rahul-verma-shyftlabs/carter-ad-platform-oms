import { getOmsSession } from '@/lib/oms-session';
import logger from '@/common/logger';

type TMediaType = {
  downloadUrl?: string;
  signedUrl?: string;
  url?: string;
};

export default class MediaService {
  async uploadMedia(mediaFile: File, fileName?: string): Promise<TMediaType> {
    try {
      const session = getOmsSession();
      const formData = new FormData();
      formData.append('file', mediaFile, fileName || mediaFile.name);
      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          ...(session.rmnToken ? { Authorization: `Bearer ${session.rmnToken}` } : {}),
        },
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Upload failed (${response.status})`);
      }
      return (await response.json()) as TMediaType;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }
}
