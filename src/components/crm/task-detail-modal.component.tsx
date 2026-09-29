import React, { useMemo } from 'react';
import { Button, Typography, carterColors } from 'shyftlabs-dsl';
import { X, Phone, Mail, Clock, User, FileText, Calendar } from 'lucide-react';
import useSWR from 'swr';
import { Dialog } from '@/lib/material-ui';
import SalesforceService from '@/services/crm/salesforce/salesforce.service';
import useAccount from '@/contexts/account/account-data.hook';
import DateTimeParser from '@/lib/date-time-parser';

interface TaskDetailModalProps {
  open: boolean;
  onClose: () => void;
  taskId: string | null;
  onUpdated?: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  open,
  onClose,
  taskId,
}) => {
  const salesforceService = useMemo(() => new SalesforceService(), []);
  useAccount();

  // Fetch task details - query by task ID
  const { data: task, isLoading } = useSWR(
    taskId ? `task-${taskId}` : null,
    async () => {
      if (!taskId) return null;
      try {
        const query = `SELECT Id, Subject, Status, Priority, CallType, CallDurationInSeconds, ` +
          `Description, ActivityDate, CreatedDate, LastModifiedDate, WhatId, WhoId ` +
          `FROM Task WHERE Id = '${taskId}'`;
        const result = await salesforceService.executeQuery(query);
        if (result?.records && result.records.length > 0) {
          return result.records[0];
        }
        return null;
      } catch (error) {
        console.error('Error fetching task:', error);
        return null;
      }
    },
    {
      revalidateOnFocus: false,
    }
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const estTimeZone = 'America/New_York';
      const dateMoment = DateTimeParser.tz(dateString, estTimeZone);
      return dateMoment.format('MMM D, YYYY, h:mm A') + ' EST';
    } catch {
      return dateString;
    }
  };

  const formatDateOnly = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const dateMoment = DateTimeParser(dateString);
      return dateMoment.format('MMM D, YYYY');
    } catch {
      return dateString;
    }
  };

  // Check if this is an email
  const subject = task?.Subject || '';
  const description = task?.Description || '';
  const isEmail = subject.startsWith('Email: ') || 
                  (!task?.CallType && (description.includes('To:') || description.includes('From:')));
  
  const displaySubject = isEmail && subject.startsWith('Email: ')
    ? subject.substring(7) // Remove "Email: " prefix
    : subject;

  // Extract email addresses from description
  const emailInfo: { to?: string; from?: string } = {};
  if (description) {
    const toMatch = description.match(/To:\s*([^\n]+)/);
    const fromMatch = description.match(/From:\s*([^\n]+)/);
    if (toMatch) emailInfo.to = toMatch[1].trim();
    if (fromMatch) emailInfo.from = fromMatch[1].trim();
  }

  // Get the rest of description (after email addresses)
  const emailBody = description
    ? description.split('\n\n').slice(emailInfo.to || emailInfo.from ? 1 : 0).join('\n\n')
    : '';

  if (!open || !taskId) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isEmail ? (
              <Mail size={24} color={carterColors['light-blue']} />
            ) : (
              <Phone size={24} color={carterColors['brand-600']} />
            )}
            <Typography variant="h1-semibold" color={carterColors['text-900']}>
              {isEmail ? 'Email Details' : 'Call Details'}
            </Typography>
          </div>
          <Button
            variant="tertiary"
            size="small"
            icon={<X size={16} />}
            onClick={onClose}
          />
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Typography variant="body-regular" color={carterColors['text-500']}>
              Loading...
            </Typography>
          </div>
        ) : !task ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Typography variant="body-regular" color={carterColors['red-700']}>
              Task not found
            </Typography>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Subject */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FileText size={16} color={carterColors['text-500']} />
                <Typography variant="body-semibold" color={carterColors['text-700']}>
                  Subject
                </Typography>
              </div>
              <Typography variant="body-regular" color={carterColors['text-900']}>
                {displaySubject || 'N/A'}
              </Typography>
            </div>

            {/* Date & Time */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Clock size={16} color={carterColors['text-500']} />
                <Typography variant="body-semibold" color={carterColors['text-700']}>
                  {isEmail ? 'Sent' : 'Date & Time'}
                </Typography>
              </div>
              <Typography variant="body-regular" color={carterColors['text-900']}>
                {task.CreatedDate ? formatDate(task.CreatedDate) : 
                 task.ActivityDate ? formatDateOnly(task.ActivityDate) : 'N/A'}
              </Typography>
            </div>

            {/* Activity Date (if different from CreatedDate) */}
            {task.ActivityDate && task.CreatedDate && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Calendar size={16} color={carterColors['text-500']} />
                  <Typography variant="body-semibold" color={carterColors['text-700']}>
                    Activity Date
                  </Typography>
                </div>
                <Typography variant="body-regular" color={carterColors['text-900']}>
                  {formatDateOnly(task.ActivityDate)}
                </Typography>
              </div>
            )}

            {/* Email Addresses (for emails) */}
            {isEmail && (emailInfo.to || emailInfo.from) && (
              <>
                {emailInfo.to && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Mail size={16} color={carterColors['text-500']} />
                      <Typography variant="body-semibold" color={carterColors['text-700']}>
                        To
                      </Typography>
                    </div>
                    <Typography variant="body-regular" color={carterColors['text-900']}>
                      {emailInfo.to}
                    </Typography>
                  </div>
                )}
                {emailInfo.from && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Mail size={16} color={carterColors['text-500']} />
                      <Typography variant="body-semibold" color={carterColors['text-700']}>
                        From
                      </Typography>
                    </div>
                    <Typography variant="body-regular" color={carterColors['text-900']}>
                      {emailInfo.from}
                    </Typography>
                  </div>
                )}
              </>
            )}

            {/* Call Type (for calls) */}
            {!isEmail && task.CallType && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Phone size={16} color={carterColors['text-500']} />
                  <Typography variant="body-semibold" color={carterColors['text-700']}>
                    Call Type
                  </Typography>
                </div>
                <Typography variant="body-regular" color={carterColors['text-900']}>
                  {task.CallType}
                </Typography>
              </div>
            )}

            {/* Duration (for calls) */}
            {!isEmail && task.CallDurationInSeconds && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Clock size={16} color={carterColors['text-500']} />
                  <Typography variant="body-semibold" color={carterColors['text-700']}>
                    Duration
                  </Typography>
                </div>
                <Typography variant="body-regular" color={carterColors['text-900']}>
                  {Math.floor(task.CallDurationInSeconds / 60)} minutes {task.CallDurationInSeconds % 60} seconds
                </Typography>
              </div>
            )}

            {/* Status */}
            {task.Status && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <User size={16} color={carterColors['text-500']} />
                  <Typography variant="body-semibold" color={carterColors['text-700']}>
                    Status
                  </Typography>
                </div>
                <Typography variant="body-regular" color={carterColors['text-900']}>
                  {task.Status}
                </Typography>
              </div>
            )}

            {/* Priority */}
            {task.Priority && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <User size={16} color={carterColors['text-500']} />
                  <Typography variant="body-semibold" color={carterColors['text-700']}>
                    Priority
                  </Typography>
                </div>
                <Typography variant="body-regular" color={carterColors['text-900']}>
                  {task.Priority}
                </Typography>
              </div>
            )}

            {/* Description / Email Body */}
            {(emailBody || (!isEmail && task.Description)) && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <FileText size={16} color={carterColors['text-500']} />
                  <Typography variant="body-semibold" color={carterColors['text-700']}>
                    {isEmail ? 'Email Body' : 'Notes'}
                  </Typography>
                </div>
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: carterColors['grey-100'],
                    borderRadius: '8px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  <Typography variant="body-regular" color={carterColors['text-900']}>
                    {isEmail ? emailBody : task.Description}
                  </Typography>
                </div>
              </div>
            )}

            {/* Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button
                variant="secondary"
                size="medium"
                label="Close"
                onClick={onClose}
              />
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default TaskDetailModal;
