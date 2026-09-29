import React, { useState } from 'react';
import { Button, Typography, carterColors, CarterTextArea, CarterInput } from 'shyftlabs-dsl';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { X, Calendar } from 'lucide-react';
import { Dialog } from '@/lib/material-ui';

interface LeadMeetingModalProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (eventData: {
    subject: string;
    start_datetime: string;
    end_datetime: string;
    what_id?: string;
    who_id?: string;
    location?: string;
    description?: string;
    is_all_day?: boolean;
    reminder_datetime?: string;
  }) => Promise<void>;
  lead?: any;
  contact?: any;
  opportunity?: any;
  isLoading?: boolean;
}

const LeadMeetingModal: React.FC<LeadMeetingModalProps> = ({
  open,
  onClose,
  onSchedule,
  lead,
  contact,
  opportunity,
  isLoading = false,
}) => {
  const record = lead || contact || opportunity;
  const [isAllDay, setIsAllDay] = useState(false);

  // Default to 1 hour from now
  const getDefaultStartTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    return now.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
  };

  const getDefaultEndTime = () => {
    const start = new Date(getDefaultStartTime());
    start.setHours(start.getHours() + 1);
    return start.toISOString().slice(0, 16);
  };

  const initialValues = {
    subject: `Meeting with ${lead?.FirstName || ''} ${lead?.LastName || ''}`.trim() || 'Meeting',
    start_datetime: getDefaultStartTime(),
    end_datetime: getDefaultEndTime(),
    location: '',
    description: '',
    is_all_day: false,
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

  const handleSubmit = async (values: any) => {
    // Convert local datetime to ISO format for API
    const startDate = new Date(values.start_datetime);
    const endDate = new Date(values.end_datetime);
    
    await onSchedule({
      subject: values.subject,
      start_datetime: startDate.toISOString(),
      end_datetime: endDate.toISOString(),
      what_id: record?.Id, // Link to record
      location: values.location || undefined,
      description: values.description || undefined,
      is_all_day: isAllDay,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={24} color={carterColors['brand-600']} />
            <Typography variant="h1-semibold" color={carterColors['text-900']}>
              Schedule Meeting
            </Typography>
          </div>
          <Button
            variant="tertiary"
            size="small"
            icon={<X size={16} />}
            onClick={onClose}
          />
        </div>

        {/* Lead Information Display */}
        {record && (
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: carterColors['grey-100'], 
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <Typography variant="body-regular" color={carterColors['text-700']}>
              <strong>With:</strong> {record.FirstName} {record.LastName} {record.Email && `(${record.Email})`}
            </Typography>
          </div>
        )}

        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
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
                      checked={isAllDay}
                      onChange={(e) => {
                        setIsAllDay(e.target.checked);
                        if (e.target.checked) {
                          // Set to start of day for all-day events
                          const startDate = new Date(values.start_datetime);
                          startDate.setHours(0, 0, 0, 0);
                          setFieldValue('start_datetime', startDate.toISOString().slice(0, 16));
                          
                          const endDate = new Date(startDate);
                          endDate.setHours(23, 59, 59);
                          setFieldValue('end_datetime', endDate.toISOString().slice(0, 16));
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
                    placeholder="Meeting location (e.g., Conference Room A, Zoom, etc.)"
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
                    placeholder="Meeting agenda, notes, or description"
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
                    onClick={onClose}
                    disabled={isLoading}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="medium"
                    label="Schedule Meeting"
                    icon={<Calendar size={16} />}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </Dialog>
  );
};

export default LeadMeetingModal;
