import React, { useMemo, useState } from 'react';
import { Typography, carterColors } from 'shyftlabs-dsl';
import { Calendar, MapPin, Clock, FileText } from 'lucide-react';
import useSWR from 'swr';
import SalesforceService from '@/services/crm/salesforce/salesforce.service';
import MeetingDetailModal from '@/components/crm/meeting-detail-modal.component';
import styles from '../styles/crm.module.scss';

interface CRMMeetingsProps {
  recordId: string; // Salesforce ID (Lead, Contact, Opportunity, Account)
  onRefresh?: () => void;
  refreshTrigger?: number; // Trigger refresh when this value changes
}

const CRMMeetings: React.FC<CRMMeetingsProps> = ({
  recordId,
  onRefresh,
  refreshTrigger,
}) => {
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  // Fetch events/meetings
  const { data: eventsData, mutate, isLoading, error } = useSWR(
    recordId ? [`crm-events-${recordId}`, recordId, refreshTrigger] : null,
    () => salesforceService.getRecordEvents(recordId, 50),
    {
      revalidateOnFocus: false,
    }
  );

  const events = eventsData?.records || [];

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  const formatTimeRange = (startDate: string, endDate: string, isAllDay?: boolean) => {
    if (isAllDay) {
      return 'All Day';
    }
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const startTime = start.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const endTime = end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${startTime} - ${endTime}`;
    } catch {
      return `${startDate} - ${endDate}`;
    }
  };

  const getEventDate = (startDate: string) => {
    try {
      const date = new Date(startDate);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return startDate;
    }
  };

  return (
    <div className={styles.comments_container}>
      <div className={styles.comments_header}>
        <Typography variant="body-large-semibold" color={carterColors['text-900']}>
          Meetings ({events.length})
        </Typography>
      </div>

      <div className={styles.comments_list}>
        {isLoading ? (
          <div className={styles.loading_state}>
            <Typography variant="body-regular" color={carterColors['text-600']}>
              Loading meetings...
            </Typography>
          </div>
        ) : error ? (
          <div className={styles.empty_state}>
            <Typography variant="body-regular" color={carterColors['red-700']}>
              Failed to load meetings. Please try again.
            </Typography>
          </div>
        ) : events.length === 0 ? (
          <div className={styles.empty_state}>
            <Calendar size={24} color={carterColors['text-400']} style={{ marginBottom: '8px' }} />
            <Typography variant="body-regular" color={carterColors['text-400']}>
              No meetings scheduled yet.
            </Typography>
          </div>
        ) : (
          events.map((event: any) => (
            <div 
              key={event.Id} 
              className={styles.chatter_feed_item}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedMeetingId(event.Id)}
            >
              <div className={styles.chatter_feed_item_header}>
                <div className={styles.chatter_feed_author}>
                  <div className={styles.chatter_feed_avatar_fallback}>
                    <Calendar size={20} color={carterColors['brand-600']} />
                  </div>
                  <div className={styles.chatter_feed_author_info}>
                    <Typography variant="body-semibold" color={carterColors['text-900']}>
                      {event.Subject || 'Meeting'}
                    </Typography>
                    <Typography variant="caption-regular" color={carterColors['text-400']}>
                      {event.StartDateTime ? getEventDate(event.StartDateTime) : 'No date'}
                    </Typography>
                  </div>
                </div>
              </div>

              <div className={styles.chatter_feed_content} style={{ marginTop: '12px' }}>
                {event.StartDateTime && event.EndDateTime && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Clock size={16} color={carterColors['text-500']} />
                    <Typography variant="body-regular" color={carterColors['text-700']}>
                      {formatTimeRange(event.StartDateTime, event.EndDateTime, event.IsAllDayEvent)}
                    </Typography>
                  </div>
                )}

                {event.Location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <MapPin size={16} color={carterColors['text-500']} />
                    <Typography variant="body-regular" color={carterColors['text-700']}>
                      {event.Location}
                    </Typography>
                  </div>
                )}

                {event.Description && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '8px' }}>
                    <FileText size={16} color={carterColors['text-500']} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      <Typography variant="body-regular" color={carterColors['text-700']}>
                      {event.Description.length > 150 ? `${event.Description.substring(0, 150)}...` : event.Description}
                    </Typography>
                    </div>
                  </div>
                )}

                {event.CreatedDate && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${carterColors['grey-200']}` }}>
                    <Typography variant="caption-regular" color={carterColors['text-400']}>
                      Created: {formatDate(event.CreatedDate)}
                    </Typography>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Meeting Detail Modal */}
      <MeetingDetailModal
        open={!!selectedMeetingId}
        onClose={() => setSelectedMeetingId(null)}
        meetingId={selectedMeetingId}
        onUpdated={() => {
          mutate();
          onRefresh?.();
        }}
        onDeleted={() => {
          mutate();
          onRefresh?.();
          setSelectedMeetingId(null);
        }}
      />
    </div>
  );
};

export default CRMMeetings;
