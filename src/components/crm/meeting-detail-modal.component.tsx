import React, { useState, useMemo } from 'react';
import { Button, Typography, carterColors, CarterTextArea, CarterInput } from 'shyftlabs-dsl';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { X, Calendar, Clock, MapPin, FileText, Edit, Trash2 } from 'lucide-react';
import useSWR from 'swr';
import { Dialog } from '@/lib/material-ui';
import SalesforceService from '@/services/crm/salesforce/salesforce.service';
import { showAlert } from '@/redux/actions';
import ConfirmationModal from './confirmation-modal.component';

interface MeetingDetailModalProps {
  open: boolean;
  onClose: () => void;
  meetingId: string | null;
  onUpdated?: () => void;
  onDeleted?: () => void;
}

const MeetingDetailModal: React.FC<MeetingDetailModalProps> = ({
  open,
  onClose,
  meetingId,
  onUpdated,
  onDeleted,
}) => {
  const salesforceService = useMemo(() => new SalesforceService(), []);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch meeting details
  const { data: meeting, mutate, isLoading } = useSWR(
    meetingId ? `meeting-${meetingId}` : null,
    () => salesforceService.getEvent(meetingId!),
    {
      revalidateOnFocus: false,
    }
  );

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

  const formatDateTimeLocal = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Convert to local timezone and format as YYYY-MM-DDTHH:mm
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
  };

  const handleSave = async (values: any) => {
    if (!meetingId) return;
    
    setIsSaving(true);
    try {
      // Convert local datetime to ISO format for API
      const startDate = new Date(values.start_datetime);
      const endDate = new Date(values.end_datetime);
      
      await salesforceService.updateEvent(meetingId, {
        subject: values.subject,
        start_datetime: startDate.toISOString(),
        end_datetime: endDate.toISOString(),
        location: values.location || undefined,
        description: values.description || undefined,
        is_all_day: values.is_all_day,
      });
      
      showAlert({
        variant: 'success',
        title: 'Meeting updated successfully',
      });
      
      setIsEditMode(false);
      await mutate();
      onUpdated?.();
    } catch (err: any) {
      showAlert({
        variant: 'warning',
        title: err?.message || 'Failed to update meeting',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!meetingId) return;
    
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    try {
      await salesforceService.deleteEvent(meetingId);
      showAlert({
        variant: 'success',
        title: 'Meeting deleted successfully',
      });
      onClose();
      onDeleted?.();
    } catch (err: any) {
      showAlert({
        variant: 'warning',
        title: err?.message || 'Failed to delete meeting',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const validationSchema = Yup.object().shape({
    subject: Yup.string().required('Subject is required'),
    start_datetime: Yup.string().required('Start date and time is required'),
    end_datetime: Yup.string()
      .required('End date and time is required')
      .test('is-after-start', 'End time must be after start time', function(value) {
        const { start_datetime } = this.parent;
        if (!start_datetime || !value) return true;
        return new Date(value) > new Date(start_datetime);
      }),
    location: Yup.string().nullable(),
    description: Yup.string().nullable(),
  });

  if (!open || !meetingId) return null;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={24} color={carterColors['brand-600']} />
            <Typography variant="h1-semibold" color={carterColors['text-900']}>
              {isEditMode ? 'Edit Meeting' : 'Meeting Details'}
            </Typography>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!isEditMode && meeting && (
              <>
                <Button
                  variant="secondary"
                  size="small"
                  icon={<Edit size={16} />}
                  label="Edit"
                  onClick={handleEdit}
                  disabled={isLoading}
                />
                <Button
                  variant="tertiary"
                  size="small"
                  icon={<Trash2 size={16} />}
                  onClick={handleDeleteClick}
                  disabled={isLoading || isDeleting}
                  style={{ 
                    backgroundColor: carterColors['red-700'], 
                    color: carterColors['white'],
                    borderColor: carterColors['red-700'],
                  }}
                />
              </>
            )}
            <Button
              variant="tertiary"
              size="small"
              icon={<X size={16} />}
              onClick={onClose}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Typography variant="body-regular" color={carterColors['text-600']}>
              Loading meeting details...
            </Typography>
          </div>
        ) : !meeting ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Typography variant="body-regular" color={carterColors['red-700']}>
              Failed to load meeting details.
            </Typography>
          </div>
        ) : isEditMode ? (
          <Formik
            initialValues={{
              subject: meeting.Subject || '',
              start_datetime: meeting.StartDateTime ? formatDateTimeLocal(meeting.StartDateTime) : '',
              end_datetime: meeting.EndDateTime ? formatDateTimeLocal(meeting.EndDateTime) : '',
              location: meeting.Location || '',
              description: meeting.Description || '',
              is_all_day: meeting.IsAllDayEvent || false,
            }}
            validationSchema={validationSchema}
            onSubmit={handleSave}
          >
            {({ values, errors, touched, setFieldValue }) => (
              <Form>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        Subject <span style={{ color: carterColors['red-500'] }}>*</span>
                      </Typography>
                    </label>
                    <Field
                      as={CarterInput}
                      name="subject"
                      placeholder="Meeting subject"
                      fullWidth
                      error={touched.subject && errors.subject ? String(errors.subject) : undefined}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '8px' }}>
                        <Typography variant="body-semibold" color={carterColors['text-900']}>
                          Start Date & Time <span style={{ color: carterColors['red-500'] }}>*</span>
                        </Typography>
                      </label>
                      <Field
                        as={CarterInput}
                        name="start_datetime"
                        type="datetime-local"
                        fullWidth
                        error={touched.start_datetime && errors.start_datetime ? String(errors.start_datetime) : undefined}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '8px' }}>
                        <Typography variant="body-semibold" color={carterColors['text-900']}>
                          End Date & Time <span style={{ color: carterColors['red-500'] }}>*</span>
                        </Typography>
                      </label>
                      <Field
                        as={CarterInput}
                        name="end_datetime"
                        type="datetime-local"
                        fullWidth
                        error={touched.end_datetime && errors.end_datetime ? String(errors.end_datetime) : undefined}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="checkbox"
                        checked={values.is_all_day}
                        onChange={(e) => {
                          setFieldValue('is_all_day', e.target.checked);
                          if (e.target.checked) {
                            const startDate = new Date(values.start_datetime);
                            startDate.setHours(0, 0, 0, 0);
                            setFieldValue('start_datetime', formatDateTimeLocal(startDate.toISOString()));
                            
                            const endDate = new Date(startDate);
                            endDate.setHours(23, 59, 59);
                            setFieldValue('end_datetime', formatDateTimeLocal(endDate.toISOString()));
                          }
                        }}
                      />
                      <Typography variant="body-regular" color={carterColors['text-900']}>
                        All Day Event
                      </Typography>
                    </label>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        Location
                      </Typography>
                    </label>
                    <Field
                      as={CarterInput}
                      name="location"
                      placeholder="Meeting location"
                      fullWidth
                      error={touched.location && errors.location ? String(errors.location) : undefined}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        Description
                      </Typography>
                    </label>
                    <Field
                      as={CarterTextArea}
                      name="description"
                      placeholder="Meeting description"
                      rows={6}
                      fullWidth
                      error={touched.description && errors.description ? String(errors.description) : undefined}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                    <Button
                      variant="secondary"
                      size="medium"
                      label="Cancel"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="medium"
                      label="Save Changes"
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </Form>
            )}
          </Formik>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Meeting Subject */}
            <div style={{ marginBottom: '8px' }}>
              <Typography variant="h2-semibold" color={carterColors['text-900']}>
                {meeting.Subject || 'Meeting'}
              </Typography>
            </div>

            {/* Date & Time */}
            {meeting.StartDateTime && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Clock size={20} color={carterColors['text-500']} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '4px' }}>
                    <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Date & Time
                  </Typography>
                  </div>
                  <Typography variant="body-regular" color={carterColors['text-700']}>
                    {meeting.IsAllDayEvent ? (
                      <>
                        {new Date(meeting.StartDateTime).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })} - All Day
                      </>
                    ) : (
                      formatDate(meeting.StartDateTime) + 
                      (meeting.EndDateTime ? ` - ${formatDate(meeting.EndDateTime)}` : '')
                    )}
                  </Typography>
                </div>
              </div>
            )}

            {/* Location */}
            {meeting.Location && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <MapPin size={20} color={carterColors['text-500']} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '4px' }}>
                    <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Location
                  </Typography>
                  </div>
                  <Typography variant="body-regular" color={carterColors['text-700']}>
                    {meeting.Location}
                  </Typography>
                </div>
              </div>
            )}

            {/* Description */}
            {meeting.Description && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <FileText size={20} color={carterColors['text-500']} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: '4px' }}>
                    <Typography variant="caption-regular" color={carterColors['text-600']}>
                    Description
                  </Typography>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    <Typography variant="body-regular" color={carterColors['text-700']}>
                    {meeting.Description}
                  </Typography>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div style={{ 
              marginTop: '16px', 
              paddingTop: '16px', 
              borderTop: `1px solid ${carterColors['grey-200']}` 
            }}>
              {meeting.CreatedDate && (
                <Typography variant="caption-regular" color={carterColors['text-400']}>
                  Created: {formatDate(meeting.CreatedDate)}
                </Typography>
              )}
              {meeting.LastModifiedDate && meeting.LastModifiedDate !== meeting.CreatedDate && (
                <div style={{ marginTop: '4px' }}>
                  <Typography variant="caption-regular" color={carterColors['text-400']}>
                  Last Modified: {formatDate(meeting.LastModifiedDate)}
                </Typography>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </Dialog>

      {/* Delete Confirmation Modal - rendered outside main dialog */}
      <ConfirmationModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Meeting"
        message="Are you sure you want to delete this meeting? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
};

export default MeetingDetailModal;
