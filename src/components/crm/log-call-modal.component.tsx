import React from 'react';
import { Button, Typography, carterColors, CarterTextArea, CarterInput, CarterSelect } from 'shyftlabs-dsl';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { X, Phone } from 'lucide-react';
import { Dialog } from '@/lib/material-ui';
import useAccount from '@/contexts/account/account-data.hook';
import DateTimeParser from '@/lib/date-time-parser';

interface LogCallModalProps {
  open: boolean;
  onClose: () => void;
  onLogCall: (callData: {
    subject: string;
    what_id?: string;
    who_id?: string;
    status?: string;
    priority?: string;
    call_type?: string;
    call_duration?: number;
    description?: string;
    call_date?: string;
  }) => Promise<void>;
  lead?: any;
  contact?: any;
  opportunity?: any;
  isLoading?: boolean;
}

const LogCallModal: React.FC<LogCallModalProps> = ({
  open,
  onClose,
  onLogCall,
  lead,
  contact,
  opportunity,
  isLoading = false,
}) => {
  const { timeZone } = useAccount();
  
  const record = lead || contact || opportunity;
  
  // Default to now in user's timezone
  const getDefaultCallTime = () => {
    const now = DateTimeParser.tz(timeZone);
    // Format: YYYY-MM-DDTHH:mm (datetime-local format)
    const year = now.year();
    const month = String(now.month() + 1).padStart(2, '0');
    const day = String(now.date()).padStart(2, '0');
    const hours = String(now.hour()).padStart(2, '0');
    const minutes = String(now.minute()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const initialValues = {
    subject: record 
      ? `Call with ${record?.FirstName || ''} ${record?.LastName || ''}`.trim() || 'Call'
      : 'Call',
    call_date: getDefaultCallTime(),
    call_type: 'Outbound',
    status: 'Completed',
    priority: 'Normal',
    call_duration: '',
    description: '',
  };

  const validationSchema = Yup.object().shape({
    subject: Yup.string().required('Subject is required'),
    call_date: Yup.string().required('Call date and time is required'),
    call_type: Yup.string().required('Call type is required'),
    status: Yup.string().required('Status is required'),
    priority: Yup.string().required('Priority is required'),
    call_duration: Yup.number().min(0, 'Duration must be 0 or greater').nullable(),
    description: Yup.string().nullable(),
  });

  const handleSubmit = async (values: any) => {
    // Convert datetime-local value (which is in user's local timezone) to ISO format
    // datetime-local format: YYYY-MM-DDTHH:mm
    // Parse it in the user's timezone and convert to ISO
    const callDate = DateTimeParser.tz(values.call_date, timeZone);
    
    await onLogCall({
      subject: values.subject,
      what_id: record?.Id, // Link to record
      call_type: values.call_type,
      status: values.status,
      priority: values.priority,
      call_duration: values.call_duration ? parseInt(values.call_duration, 10) : undefined,
      description: values.description || undefined,
      call_date: callDate.toISOString(),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Phone size={24} color={carterColors['brand-600']} />
            <Typography variant="h1-semibold" color={carterColors['text-900']}>
              Log a Call
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
        {lead && (
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
                    placeholder="Call subject"
                    fullWidth
                    error={touched.subject && errors.subject ? String(errors.subject) : undefined}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>
                    <Typography variant="body-semibold" color={carterColors['text-900']}>
                      Call Date & Time <span style={{ color: carterColors['red-500'] }}>*</span>
                    </Typography>
                  </label>
                  <Field
                    as={CarterInput}
                    name="call_date"
                    type="datetime-local"
                    fullWidth
                    error={touched.call_date && errors.call_date ? String(errors.call_date) : undefined}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        Call Type <span style={{ color: carterColors['red-500'] }}>*</span>
                      </Typography>
                    </label>
                    <CarterSelect
                      id="call_type"
                      value={values.call_type || ''}
                      onChange={({ target }) => {
                        setFieldValue('call_type', target.value);
                      }}
                      options={[
                        { label: 'Outbound', value: 'Outbound' },
                        { label: 'Inbound', value: 'Inbound' },
                        { label: 'Internal', value: 'Internal' },
                      ]}
                    />
                    {touched.call_type && errors.call_type && (
                      <div style={{ marginTop: '4px' }}>
                        <Typography variant="caption-regular" color={carterColors['red-500']}>
                          {String(errors.call_type)}
                        </Typography>
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        Status <span style={{ color: carterColors['red-500'] }}>*</span>
                      </Typography>
                    </label>
                    <CarterSelect
                      id="status"
                      value={values.status || ''}
                      onChange={({ target }) => {
                        setFieldValue('status', target.value);
                      }}
                      options={[
                        { label: 'Completed', value: 'Completed' },
                        { label: 'Not Started', value: 'Not Started' },
                        { label: 'In Progress', value: 'In Progress' },
                        { label: 'Waiting on someone else', value: 'Waiting on someone else' },
                        { label: 'Deferred', value: 'Deferred' },
                      ]}
                    />
                    {touched.status && errors.status && (
                      <div style={{ marginTop: '4px' }}>
                        <Typography variant="caption-regular" color={carterColors['red-500']}>
                          {String(errors.status)}
                        </Typography>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        Priority <span style={{ color: carterColors['red-500'] }}>*</span>
                      </Typography>
                    </label>
                    <CarterSelect
                      id="priority"
                      value={values.priority || ''}
                      onChange={({ target }) => {
                        setFieldValue('priority', target.value);
                      }}
                      options={[
                        { label: 'High', value: 'High' },
                        { label: 'Normal', value: 'Normal' },
                        { label: 'Low', value: 'Low' },
                      ]}
                    />
                    {touched.priority && errors.priority && (
                      <div style={{ marginTop: '4px' }}>
                        <Typography variant="caption-regular" color={carterColors['red-500']}>
                          {String(errors.priority)}
                        </Typography>
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px' }}>
                      <Typography variant="body-semibold" color={carterColors['text-900']}>
                        Duration (seconds)
                      </Typography>
                    </label>
                    <Field
                      as={CarterInput}
                      name="call_duration"
                      type="number"
                      min="0"
                      placeholder="e.g., 300"
                      fullWidth
                      error={touched.call_duration && errors.call_duration ? String(errors.call_duration) : undefined}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px' }}>
                    <Typography variant="body-semibold" color={carterColors['text-900']}>
                      Call Notes
                    </Typography>
                  </label>
                  <Field
                    as={CarterTextArea}
                    name="description"
                    placeholder="Enter call notes, discussion points, or outcomes"
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
                    label="Log Call"
                    icon={<Phone size={16} />}
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

export default LogCallModal;
